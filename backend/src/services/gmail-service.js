const { google } = require('googleapis');
const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class GmailService {
  constructor() {
    this.auth = null;
    this.gmail = null;
    this.credentialsPath = path.join(__dirname, '../../gmail-oauth.json');
    this.tokenPath = path.join(__dirname, '../../gmail-token.json');
  }

  /**
   * Initialize Gmail API authentication using OAuth2
   */
  async initialize() {
    try {
      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      if (fs.existsSync(this.tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        this.auth.setCredentials(tokens);
      } else {
        throw new Error('Gmail tokens not found. Run the OAuth2 setup first.');
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      logger.info('Gmail service initialized successfully with OAuth2');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Gmail service:', error);
      throw error;
    }
  }

  /**
   * Send plain text email using Gmail API
   */
  async sendEmail(to, subject, body, options = {}) {
    try {
      if (!this.gmail) {
        await this.initialize();
      }

      const fromName = process.env.COMPANY_NAME || 'Credit Control';
      const fromEmail = process.env.COMPANY_EMAIL || 'credit-control@rawlings.us';
      const replyTo = process.env.COMPANY_EMAIL || 'credit-control@rawlings.us';

      const textBody = options.text ?? this.convertToText(body, options.vars || {});

      const raw = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Reply-To: ${replyTo}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        textBody,
      ].join('\r\n');

      const encodedMessage = Buffer.from(raw)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      logger.info(`Email sent successfully to ${to}`, {
        messageId: response.data.id,
        threadId: response.data.threadId,
        from: `${fromName} <${fromEmail}>`,
        subject,
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send chase email (plain text) with simple signature
   */
  async sendChaseEmail(invoice, emailContent, options = {}) {
    try {
      const subject = emailContent.subject || `Payment Reminder - Invoice ${invoice.stripe_invoice_id}`;
      const vars = { payment_link: options.paymentLink };

      const signature = [
        '',
        'Best regards,',
        "David's Credit Control Bot",
        process.env.COMPANY_NAME || 'Rawlings MI Ltd',
      ].join('\n');

      const textBody = this.convertToText(emailContent.body, vars) + '\n' + signature;

      // Test mode routing: in non-production, unless explicitly disabled, send to TEST_EMAIL_RECIPIENT/admin instead of customer
      const isProd = process.env.NODE_ENV === 'production';
      const emailTestMode = (process.env.EMAIL_TEST_MODE || (!isProd ? 'true' : 'false')) !== 'false';
      // Default test recipient set to David unless TEST_EMAIL_RECIPIENT overrides
      const adminFallback = process.env.TEST_EMAIL_RECIPIENT || 'david@rawlings.us';
      const recipientEmail = emailTestMode && adminFallback ? adminFallback : invoice.customer_email;

      if (emailTestMode && adminFallback) {
        logger.warn(`Email test mode is ON. Rerouting chase to admin instead of customer.`, {
          original_to: invoice.customer_email,
          rerouted_to: recipientEmail,
        });
      }

      return await this.sendEmail(
        recipientEmail,
        subject,
        textBody,
        { text: textBody, vars }
      );
    } catch (error) {
      logger.error('Failed to send chase email:', error);
      throw error;
    }
  }

  /**
   * Send preview email (plain text): exactly what customer would receive
   */
  async sendPreviewEmail(invoice, emailContent, adminEmail, options = {}) {
    try {
      const subject = `[PREVIEW] ${emailContent.subject || `Payment Reminder - Invoice ${invoice.stripe_invoice_id}`}`;
      const vars = { payment_link: options.paymentLink };

      const signature = [
        '',
        'Best regards,',
        "David's Credit Control Bot",
        process.env.COMPANY_NAME || 'Rawlings MI Ltd',
      ].join('\n');

      const customerText = this.convertToText(emailContent.body, vars) + '\n' + signature;

      return await this.sendEmail(
        adminEmail,
        subject,
        customerText,
        { text: customerText, vars }
      );
    } catch (error) {
      logger.error('Failed to send preview email:', error);
      throw error;
    }
  }

  /**
   * Convert content to plain text, sanitize markdown/HTML, and substitute variables
   */
  convertToText(text, vars = {}) {
    let result = String(text || '');

    // Substitute {payment_link} with plain URL
    if (vars.payment_link) {
      const url = String(vars.payment_link);
      result = result.replace(/\{payment_link\}/g, url);
    }

    // Convert markdown links [text](url) -> url
    result = result.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$2');

    // Strip any remaining HTML tags
    result = result.replace(/<[^>]+>/g, '');

    // Remove markdown bold/italic
    result = result.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/_(.*?)_/g, '$1');

    // Normalize whitespace lines
    result = result.replace(/\r\n/g, '\n').replace(/\t/g, '  ');

    return result.trim();
  }

  async testConnection() {
    try {
      if (!this.gmail) {
        await this.initialize();
      }

      const profile = await this.gmail.users.getProfile({ userId: 'me' });

      logger.info('Gmail connection test successful', {
        email: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
        persona: {
          name: process.env.COMPANY_NAME || 'Credit Control',
          email: process.env.COMPANY_EMAIL || 'credit-control@rawlings.us',
          phone: process.env.COMPANY_PHONE || '1-800-CREDIT-1',
        },
      });

      return {
        success: true,
        email: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
        persona: {
          name: process.env.COMPANY_NAME || 'Credit Control',
          email: process.env.COMPANY_EMAIL || 'credit-control@rawlings.us',
          phone: process.env.COMPANY_PHONE || '1-800-CREDIT-1',
        },
      };
    } catch (error) {
      logger.error('Gmail connection test failed:', error);
      throw error;
    }
  }
}

module.exports = new GmailService();
