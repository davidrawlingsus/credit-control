const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const aiEmailService = require('./ai-email-service');
const gmailService = require('./gmail-service');
const stripeService = require('./stripe-service');

/**
 * Service to process overdue invoices and send chase emails at prescribed intervals
 */
class ChaseService {
  constructor() {
    this.nowProvider = () => new Date();
  }

  async getAppConfigMap() {
    const { rows } = await executeQuery('SELECT key, value FROM app_config');
    const map = new Map();
    for (const row of rows || []) {
      map.set(row.key, row.value);
    }
    return map;
  }

  /**
   * Determine minimum interval in hours based on days overdue
   * - >= 10 days: 24h (every day)
   * - >= 7 days: 48h (every 2 days)
   * - >= 5 days: 72h (every 3 days)
   * - < 5 days: null (do not chase yet)
   */
  getIntervalHoursForOverdueDays(daysOverdue) {
    if (daysOverdue >= 10) return 24;
    if (daysOverdue >= 7) return 48;
    if (daysOverdue >= 5) return 72;
    return null;
  }

  parseDateOnly(dateStr) {
    // Expecting YYYY-MM-DD; fall back to Date parse
    try {
      if (!dateStr) return null;
      const [y, m, d] = String(dateStr).split('-').map((s) => parseInt(s, 10));
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(Date.UTC(y, m - 1, d));
      }
      const t = new Date(dateStr);
      return isNaN(t.getTime()) ? null : t;
    } catch (_) {
      return null;
    }
  }

  diffHours(a, b) {
    return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60);
  }

  async selectCandidateInvoices() {
    // Fetch invoices that are unpaid/overdue with due_date in the past
    const { rows } = await executeQuery(`
      SELECT id, stripe_invoice_id, stripe_customer_id, customer_email, customer_name,
             amount, currency, due_date, status, overdue_days, last_chase_date, chase_count
      FROM invoices
      WHERE status IN ('unpaid', 'overdue')
        AND due_date < CURRENT_DATE
    `);
    return rows || [];
  }

  computeDaysOverdue(invoice) {
    // Prefer DB's overdue_days if set and sane; otherwise compute from due_date
    const now = this.nowProvider();
    if (typeof invoice.overdue_days === 'number' && invoice.overdue_days >= 0) {
      return invoice.overdue_days;
    }
    const due = this.parseDateOnly(invoice.due_date);
    if (!due) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.floor((now.getTime() - due.getTime()) / msPerDay);
    return Math.max(0, days);
  }

  async maybeSendChase(invoice, configMap, paymentLink = null, options = {}) {
    const now = this.nowProvider();
    const daysOverdue = this.computeDaysOverdue(invoice);
    const requiredIntervalHours = this.getIntervalHoursForOverdueDays(daysOverdue);

    if (requiredIntervalHours == null) {
      logger.debug?.('Skipping (below threshold)', { invoice_id: invoice.id, daysOverdue });
      return false;
    }

    const chaseEnabled = (configMap.get('chase_enabled') || 'true') !== 'false';
    if (!chaseEnabled) {
      logger.info('Chasing disabled via app_config.chase_enabled');
      return false;
    }

    // Respect paused flag unless bypassed
    if (!options.bypassPaused && (invoice.chase_paused === 1 || invoice.chase_paused === true)) {
      logger.info('Skipping (chasing paused on invoice)', { invoice_id: invoice.id });
      return false;
    }

    const maxChaseCount = parseInt(configMap.get('max_chase_count') || '4', 10);
    const currentCount = parseInt(invoice.chase_count || 0, 10);
    if (!isNaN(maxChaseCount) && currentCount >= maxChaseCount) {
      logger.info('Skipping (max chase count reached)', { invoice_id: invoice.id, currentCount, maxChaseCount });
      return false;
    }

    // Enforce minimum interval since last chase
    if (!options.bypassInterval && invoice.last_chase_date) {
      const last = new Date(invoice.last_chase_date);
      if (!isNaN(last.getTime())) {
        const hoursSince = this.diffHours(now, last);
        if (hoursSince < requiredIntervalHours - 0.01) {
          logger.debug?.('Skipping (interval not elapsed)', { invoice_id: invoice.id, hoursSince, requiredIntervalHours });
          return false;
        }
      }
    }

    // Generate content and send
    if (!paymentLink) {
      try {
        paymentLink = await stripeService.getPaymentLink(invoice.stripe_invoice_id);
      } catch (e) {
        logger.warn('Failed to fetch Stripe payment link; proceeding without it.', { error: e.message });
      }
    }
    const emailContent = await aiEmailService.generateChaseEmail({
      stripe_invoice_id: invoice.stripe_invoice_id,
      customer_email: invoice.customer_email,
      customer_name: invoice.customer_name,
      amount: invoice.amount,
      due_date: invoice.due_date,
      overdue_days: daysOverdue,
    }, { payment_link: paymentLink || '{payment_link}' });

    await gmailService.sendChaseEmail(
      {
        stripe_invoice_id: invoice.stripe_invoice_id,
        customer_email: invoice.customer_email,
        customer_name: invoice.customer_name,
      },
      emailContent,
      { paymentLink }
    );

    // Record chase and update invoice
    await executeQuery(`
      INSERT INTO chase_emails (invoice_id, template_id, overdue_day, generated_text, subject_line, sent_at, status, sent_to)
      VALUES ($1, NULL, $2, $3, $4, CURRENT_TIMESTAMP, 'sent', $5)
    `, [invoice.id, daysOverdue, emailContent.body, emailContent.subject, invoice.customer_email]);

    await executeQuery(`
      UPDATE invoices
      SET last_chase_date = CURRENT_TIMESTAMP,
          chase_count = COALESCE(chase_count, 0) + 1,
          overdue_days = $1,
          status = 'overdue',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [daysOverdue, invoice.id]);

    logger.info('Chase email sent', { invoice_id: invoice.id, daysOverdue, intervalHours: requiredIntervalHours });
    return true;
  }

  async processOverdueChasing() {
    try {
      const configMap = await this.getAppConfigMap();
      const invoices = await this.selectCandidateInvoices();

      let sentCount = 0;
      for (const invoice of invoices) {
        try {
          // Payment link fetching can be integrated here in future
          const sent = await this.maybeSendChase(invoice, configMap, null);
          if (sent) sentCount += 1;
        } catch (err) {
          logger.error('Failed to process chase for invoice', { invoice_id: invoice.id, error: err.message });
        }
      }

      logger.info(`Chase processing complete. Sent ${sentCount} chasers.`);
      return { sent: sentCount, totalCandidates: invoices.length };
    } catch (error) {
      logger.error('Chase processing failed', error);
      throw error;
    }
  }
}

module.exports = new ChaseService();


