const Stripe = require('stripe');
const { logger } = require('../utils/logger');
const { executeQuery } = require('../config/database');

// Initialize Stripe with your live credentials
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

class StripeService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Get all overdue invoices from Stripe
   */
  async getOverdueInvoices() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get invoices from Stripe
      const invoices = await stripe.invoices.list({
        limit: 100,
        created: {
          gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
        },
        status: 'open',
      });

      const overdueInvoices = [];

      for (const invoice of invoices.data) {
        // Check if invoice is overdue
        if (invoice.due_date && invoice.due_date < Math.floor(now.getTime() / 1000)) {
          const overdueDays = Math.floor((now.getTime() / 1000 - invoice.due_date) / (24 * 60 * 60));
          
          if (overdueDays > 0) {
            // Get customer details
            const customer = await stripe.customers.retrieve(invoice.customer);
            
            overdueInvoices.push({
              stripe_invoice_id: invoice.id,
              stripe_customer_id: invoice.customer,
              customer_email: customer.email,
              customer_name: customer.name,
              amount: invoice.amount_due / 100, // Convert from cents
              currency: invoice.currency,
              due_date: new Date(invoice.due_date * 1000).toISOString().split('T')[0],
              overdue_days: overdueDays,
              status: 'overdue',
              created_at: new Date(invoice.created * 1000).toISOString(),
            });
          }
        }
      }

      this.logger.info(`Found ${overdueInvoices.length} overdue invoices`);
      return overdueInvoices;
    } catch (error) {
      this.logger.error('Error fetching overdue invoices from Stripe:', error);
      throw error;
    }
  }

  /**
   * Sync invoices with local database
   */
  async syncInvoices() {
    try {
      const overdueInvoices = await this.getOverdueInvoices();
      let syncedCount = 0;
      let updatedCount = 0;

      for (const invoice of overdueInvoices) {
        // Check if invoice already exists in database
        const existingInvoice = await executeQuery(
          'SELECT * FROM invoices WHERE stripe_invoice_id = $1',
          [invoice.stripe_invoice_id]
        );

        if (existingInvoice.rows.length === 0) {
          // Insert new invoice
          await executeQuery(`
            INSERT INTO invoices (
              stripe_invoice_id, stripe_customer_id, customer_email, customer_name,
              amount, currency, due_date, status, overdue_days, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            invoice.stripe_invoice_id,
            invoice.stripe_customer_id,
            invoice.customer_email,
            invoice.customer_name,
            invoice.amount,
            invoice.currency,
            invoice.due_date,
            invoice.status,
            invoice.overdue_days,
            invoice.created_at,
          ]);
          syncedCount++;
        } else {
          // Update existing invoice
          await executeQuery(`
            UPDATE invoices 
            SET customer_email = $1, customer_name = $2, amount = $3, 
                overdue_days = $4, status = $5, updated_at = CURRENT_TIMESTAMP
            WHERE stripe_invoice_id = $6
          `, [
            invoice.customer_email,
            invoice.customer_name,
            invoice.amount,
            invoice.overdue_days,
            invoice.status,
            invoice.stripe_invoice_id,
          ]);
          updatedCount++;
        }
      }

      this.logger.info(`Synced ${syncedCount} new invoices, updated ${updatedCount} existing invoices`);
      return { synced: syncedCount, updated: updatedCount };
    } catch (error) {
      this.logger.error('Error syncing invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice details from Stripe
   */
  async getInvoiceDetails(stripeInvoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(stripeInvoiceId, {
        expand: ['customer', 'payment_intent'],
      });

      return {
        id: invoice.id,
        customer_email: invoice.customer.email,
        customer_name: invoice.customer.name,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        due_date: new Date(invoice.due_date * 1000).toISOString().split('T')[0],
        status: invoice.status,
        payment_intent_id: invoice.payment_intent?.id,
        created: new Date(invoice.created * 1000).toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error fetching invoice details for ${stripeInvoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Update invoice status when payment is received
   */
  async updateInvoiceStatus(stripeInvoiceId, status, paidDate = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (paidDate) {
        updateData.paid_date = paidDate;
      }

      await executeQuery(`
        UPDATE invoices 
        SET status = $1, paid_date = $2, updated_at = $3
        WHERE stripe_invoice_id = $4
      `, [status, paidDate, updateData.updated_at, stripeInvoiceId]);

      this.logger.info(`Updated invoice ${stripeInvoiceId} status to ${status}`);
    } catch (error) {
      this.logger.error(`Error updating invoice status for ${stripeInvoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw error;
    }
  }

  /**
   * Process Stripe webhook events
   */
  async processWebhookEvent(event) {
    try {
      this.logger.logStripe('info', `Processing webhook event: ${event.type}`, event);

      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object);
          break;
        default:
          this.logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error('Error processing webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(invoice) {
    try {
      const paidDate = new Date().toISOString();
      
      await this.updateInvoiceStatus(invoice.id, 'paid', paidDate);
      
      // Stop chasing this invoice
      await executeQuery(`
        UPDATE chase_emails 
        SET status = 'cancelled' 
        WHERE invoice_id = (SELECT id FROM invoices WHERE stripe_invoice_id = $1)
        AND status = 'pending'
      `, [invoice.id]);

      this.logger.logInvoice('info', 'Payment received, stopped chasing invoice', {
        stripe_invoice_id: invoice.id,
        customer_email: invoice.customer_email,
        amount: invoice.amount_due / 100,
      });
    } catch (error) {
      this.logger.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(invoice) {
    try {
      await this.updateInvoiceStatus(invoice.id, 'unpaid');
      
      this.logger.logInvoice('warn', 'Payment failed for invoice', {
        stripe_invoice_id: invoice.id,
        customer_email: invoice.customer_email,
        amount: invoice.amount_due / 100,
      });
    } catch (error) {
      this.logger.error('Error handling payment failed:', error);
      throw error;
    }
  }

  /**
   * Handle new invoice creation
   */
  async handleInvoiceCreated(invoice) {
    try {
      // Check if invoice should be tracked
      if (invoice.due_date) {
        const invoiceData = {
          stripe_invoice_id: invoice.id,
          stripe_customer_id: invoice.customer,
          customer_email: invoice.customer_email,
          customer_name: invoice.customer_name,
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          due_date: new Date(invoice.due_date * 1000).toISOString().split('T')[0],
          status: invoice.status,
          overdue_days: 0,
        };

        await executeQuery(`
          INSERT INTO invoices (
            stripe_invoice_id, stripe_customer_id, customer_email, customer_name,
            amount, currency, due_date, status, overdue_days
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (stripe_invoice_id) DO NOTHING
        `, [
          invoiceData.stripe_invoice_id,
          invoiceData.stripe_customer_id,
          invoiceData.customer_email,
          invoiceData.customer_name,
          invoiceData.amount,
          invoiceData.currency,
          invoiceData.due_date,
          invoiceData.status,
          invoiceData.overdue_days,
        ]);

        this.logger.logInvoice('info', 'New invoice created and tracked', invoiceData);
      }
    } catch (error) {
      this.logger.error('Error handling invoice created:', error);
      throw error;
    }
  }

  /**
   * Get payment link for invoice
   */
  async getPaymentLink(stripeInvoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(stripeInvoiceId);
      
      if (invoice.hosted_invoice_url) {
        return invoice.hosted_invoice_url;
      }

      // Create payment link if not exists
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{
          price_data: {
            currency: invoice.currency,
            product_data: {
              name: `Invoice ${invoice.number}`,
            },
            unit_amount: invoice.amount_due,
          },
          quantity: 1,
        }],
        after_completion: { type: 'redirect', redirect: { url: process.env.FRONTEND_URL } },
      });

      return paymentLink.url;
    } catch (error) {
      this.logger.error(`Error getting payment link for ${stripeInvoiceId}:`, error);
      throw error;
    }
  }
}

module.exports = new StripeService();
