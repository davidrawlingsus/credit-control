const express = require('express');
const { executeQuery } = require('../config/database');
const stripeService = require('../services/stripe-service');
const gmailService = require('../services/gmail-service');
const aiEmailService = require('../services/ai-email-service');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/test/health
 * Quick health check for testing
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await executeQuery('SELECT datetime("now") as current_time');
    
    // Test Stripe connection
    let stripeStatus = 'unknown';
    try {
      const testInvoice = await stripeService.getOverdueInvoices();
      stripeStatus = 'connected';
    } catch (error) {
      stripeStatus = 'error';
      logger.error('Stripe connection test failed:', error.message);
    }

    // Test Gmail connection
    let gmailStatus = 'unknown';
    try {
      await gmailService.testConnection();
      gmailStatus = 'connected';
    } catch (error) {
      gmailStatus = 'error';
      logger.error('Gmail connection test failed:', error.message);
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        current_time: dbResult.rows[0].current_time,
      },
      stripe: {
        status: stripeStatus,
        secret_key_configured: !!process.env.STRIPE_SECRET_KEY,
        webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
      gmail: {
        status: gmailStatus,
        user_configured: !!process.env.GMAIL_USER,
        company_email_configured: !!process.env.COMPANY_EMAIL,
      },
      environment: {
        node_env: process.env.NODE_ENV,
        port: process.env.PORT,
      },
    });
  } catch (error) {
    logger.error('Test health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test/stripe-invoices
 * Test Stripe invoice fetching
 */
router.get('/stripe-invoices', async (req, res) => {
  try {
    const overdueInvoices = await stripeService.getOverdueInvoices();
    
    res.json({
      success: true,
      count: overdueInvoices.length,
      invoices: overdueInvoices.slice(0, 5), // Return first 5 for testing
      message: `Found ${overdueInvoices.length} overdue invoices`,
    });
  } catch (error) {
    logger.error('Stripe invoice test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/test/sync-invoices
 * Test invoice syncing with database
 */
router.post('/sync-invoices', async (req, res) => {
  try {
    const result = await stripeService.syncInvoices();
    
    res.json({
      success: true,
      result,
      message: `Synced ${result.synced} new invoices, updated ${result.updated} existing invoices`,
    });
  } catch (error) {
    logger.error('Invoice sync test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test/database
 * Test database queries
 */
router.get('/database', async (req, res) => {
  try {
    // Test basic queries
    const tables = await executeQuery(`
      SELECT name as table_name 
      FROM sqlite_master 
      WHERE type='table'
      ORDER BY name
    `);

    const invoiceCount = await executeQuery('SELECT COUNT(*) as count FROM invoices');
    const overdueCount = await executeQuery("SELECT COUNT(*) as count FROM invoices WHERE status = 'overdue'");

    res.json({
      success: true,
      tables: tables.rows.map(row => row.table_name),
      invoice_count: invoiceCount.rows[0].count,
      overdue_count: overdueCount.rows[0].count,
    });
  } catch (error) {
    logger.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test/sample-invoice
 * Get a sample invoice for testing
 */
router.get('/sample-invoice', async (req, res) => {
  try {
    const { rows } = await executeQuery(`
      SELECT * FROM invoices 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: 'No invoices found in database. Try running /api/test/sync-invoices first.',
      });
    }

    res.json({
      success: true,
      invoice: rows[0],
    });
  } catch (error) {
    logger.error('Sample invoice test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/test/environment
 * Check environment variables
 */
router.get('/environment', (req, res) => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'missing',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'missing',
    GMAIL_USER: process.env.GMAIL_USER ? 'configured' : 'missing',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    COMPANY_NAME: process.env.COMPANY_NAME ? 'configured' : 'missing',
    COMPANY_EMAIL: process.env.COMPANY_EMAIL ? 'configured' : 'missing',
  };

  const missingVars = Object.entries(envVars)
    .filter(([key, value]) => value === 'missing')
    .map(([key]) => key);

  res.json({
    success: true,
    environment_variables: envVars,
    missing_variables: missingVars,
    all_configured: missingVars.length === 0,
  });
});

/**
 * GET /api/test/gmail
 * Test Gmail service connection
 */
router.get('/gmail', async (req, res) => {
  try {
    const result = await gmailService.testConnection();
    
    res.json({
      success: true,
      result,
      message: 'Gmail service connection test successful',
    });
  } catch (error) {
    logger.error('Gmail test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/test/send-test-email
 * Send a test email
 */
router.post('/send-test-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, body',
      });
    }

    const result = await gmailService.sendEmail(to, subject, body);
    
    res.json({
      success: true,
      result,
      message: 'Test email sent successfully',
    });
  } catch (error) {
    logger.error('Send test email failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/test/send-chase-preview
 * Send a chase email preview
 */
router.post('/send-chase-preview', async (req, res) => {
  try {
    // Get a sample invoice
    const { rows } = await executeQuery(`
      SELECT * FROM invoices 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No invoices found. Sync invoices first.',
      });
    }

    const invoice = rows[0];
    const adminEmail = process.env.GMAIL_USER || 'david@rawlings.us';
    
    // Create sample email content
    const emailContent = {
      subject: `Payment Reminder - Invoice ${invoice.stripe_invoice_id}`,
      body: `Dear ${invoice.customer_name || 'Valued Customer'},

I hope this email finds you well. I wanted to follow up regarding invoice ${invoice.stripe_invoice_id} for $${invoice.amount} which was due on ${invoice.due_date}.

We haven't received payment yet, and I wanted to ensure everything is in order. If you have any questions about this invoice or need to discuss payment arrangements, please don't hesitate to reach out.

You can make payment directly through our secure payment portal: {payment_link}

Thank you for your prompt attention to this matter.

Best regards,
David's Credit Control Bot`
    };

    const result = await gmailService.sendPreviewEmail(invoice, emailContent, adminEmail);
    
    res.json({
      success: true,
      result,
      message: 'Chase email preview sent successfully',
    });
  } catch (error) {
    logger.error('Send chase preview failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/test/ai-generate
 * Generate AI chase email for the most recent invoice (or specified invoice_id)
 * Body: { invoice_id?: number, send_preview?: boolean, to?: string }
 */
router.post('/ai-generate', async (req, res) => {
  try {
    const { invoice_id: invoiceId, send_preview: sendPreview, to } = req.body || {};

    let invoice;
    if (invoiceId) {
      const { rows } = await executeQuery('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, error: `Invoice ${invoiceId} not found` });
      }
      invoice = rows[0];
    } else {
      const { rows } = await executeQuery(`
        SELECT * FROM invoices 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      if (!rows || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No invoices found. Sync invoices first.' });
      }
      invoice = rows[0];
    }

    // Fetch Stripe payment link
    let paymentLink = null;
    try {
      paymentLink = await stripeService.getPaymentLink(invoice.stripe_invoice_id);
    } catch (e) {
      logger.warn('Failed to fetch Stripe payment link; proceeding without it.', { error: e.message });
    }

    const emailContent = await aiEmailService.generateChaseEmail(invoice, {
      payment_link: paymentLink || '{payment_link}',
    });

    const responsePayload = {
      success: true,
      invoice: {
        id: invoice.id,
        stripe_invoice_id: invoice.stripe_invoice_id,
        customer_email: invoice.customer_email,
        overdue_days: invoice.overdue_days,
        amount: invoice.amount,
        due_date: invoice.due_date,
      },
      ai: {
        model: emailContent.model,
        subject: emailContent.subject,
        body: emailContent.body,
      },
      payment_link: paymentLink,
    };

    if (sendPreview) {
      const adminEmail = to || process.env.TEST_EMAIL_RECIPIENT || 'david@rawlings.us';
      const result = await gmailService.sendPreviewEmail(invoice, emailContent, adminEmail, { paymentLink });
      responsePayload.preview = { sent_to: adminEmail, ...result };
    }

    res.json(responsePayload);
  } catch (error) {
    logger.error('AI generate endpoint failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
