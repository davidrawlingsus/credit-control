const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const aiEmailService = require('../services/ai-email-service');
const { logger } = require('../utils/logger');
const chaseService = require('../services/chase-service');

function computeNextChaseInfo(invoice) {
  const now = new Date();
  const last = invoice.last_chase_date ? new Date(invoice.last_chase_date) : null;
  const daysOverdue = Number.isFinite(invoice.overdue_days) ? invoice.overdue_days : 0;

  // Mirror policy in chase-service
  let hoursInterval = null;
  if (daysOverdue >= 10) hoursInterval = 24;
  else if (daysOverdue >= 7) hoursInterval = 48;
  else if (daysOverdue >= 5) hoursInterval = 72;

  if (hoursInterval == null) {
    return { next_chase_date: null, days_until_next_chase: null };
  }

  let nextDate;
  if (last) {
    nextDate = new Date(last.getTime() + hoursInterval * 60 * 60 * 1000);
  } else {
    // If never chased, can send immediately per policy; set next = now
    nextDate = now;
  }

  const daysUntil = Math.max(0, Math.ceil((nextDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  return { next_chase_date: nextDate.toISOString(), days_until_next_chase: daysUntil };
}

// GET /api/invoices/overdue
router.get('/overdue', async (req, res) => {
  try {
    const { rows } = await executeQuery(`
      SELECT id, stripe_invoice_id, customer_email, customer_name, amount, currency,
             due_date, status, overdue_days, last_chase_date, chase_count,
             COALESCE(chase_paused, 0) AS chase_paused
      FROM invoices
      WHERE status IN ('unpaid', 'overdue') AND due_date < CURRENT_DATE
      ORDER BY due_date ASC
    `);

    const invoices = (rows || []).map((inv) => ({
      ...inv,
      ...computeNextChaseInfo(inv),
      links: {
        previous_chasers: `/api/invoices/${inv.id}/chase-emails`,
        next_chaser_preview: `/api/invoices/${inv.id}/next-chaser-preview`,
      },
      chase_paused: !!inv.chase_paused,
    }));

    res.json({ success: true, data: { invoices, total: invoices.length } });
  } catch (error) {
    logger.error('Failed to fetch overdue invoices:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

// GET /api/invoices/:id/chase-emails
router.get('/:id/chase-emails', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await executeQuery(`
      SELECT id, overdue_day, subject_line AS subject, generated_text AS body, sent_at, status
      FROM chase_emails
      WHERE invoice_id = $1
      ORDER BY COALESCE(sent_at, created_at) DESC
    `, [id]);

    res.json({ success: true, data: { chase_emails: rows || [], total: rows?.length || 0 } });
  } catch (error) {
    logger.error('Failed to fetch chase emails for invoice:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

// GET /api/invoices/:id/next-chaser-preview
router.get('/:id/next-chaser-preview', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await executeQuery('SELECT * FROM invoices WHERE id = $1', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    const invoice = rows[0];

    const { next_chase_date } = computeNextChaseInfo(invoice);
    const paymentLink = null; // could be fetched via Stripe if desired
    const ai = await aiEmailService.generateChaseEmail(invoice, { payment_link: paymentLink || '{payment_link}' });

    res.json({ success: true, data: { overdue_days: invoice.overdue_days, next_chase_date, subject: ai.subject, body: ai.body, payment_link: paymentLink } });
  } catch (error) {
    logger.error('Failed to generate next chaser preview:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

// POST /api/invoices/:id/pause { paused: boolean }
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const paused = !!(req.body?.paused);
    await executeQuery('UPDATE invoices SET chase_paused = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [paused ? 1 : 0, id]);
    res.json({ success: true, data: { id: Number(id), chase_paused: paused } });
  } catch (error) {
    logger.error('Failed to update pause state:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

// POST /api/invoices/:id/expedite
router.post('/:id/expedite', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await executeQuery('SELECT * FROM invoices WHERE id = $1', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    const invoice = rows[0];

    // Bypass paused and interval checks, but still respect max_chase_count
    const configRows = await executeQuery('SELECT key, value FROM app_config');
    const configMap = new Map((configRows.rows || []).map(r => [r.key, r.value]));
    const sent = await chaseService.maybeSendChase(invoice, configMap, null, { bypassPaused: true, bypassInterval: true });

    res.json({ success: true, data: { sent } , message: sent ? 'Next chaser sent' : 'No chaser sent (max count or other gate)'});
  } catch (error) {
    logger.error('Failed to expedite next chaser:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
