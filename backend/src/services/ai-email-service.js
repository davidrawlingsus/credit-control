const OpenAI = require('openai');
const { logger } = require('../utils/logger');

class AiEmailService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY is not set; AI email generation will be disabled.');
      this.client = null;
      return;
    }
    const clientOptions = { apiKey: process.env.OPENAI_API_KEY };
    if (process.env.OPENAI_ORG_ID) {
      clientOptions.organization = process.env.OPENAI_ORG_ID;
    }
    this.client = new OpenAI(clientOptions);
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  deriveFirstName(invoice) {
    const corporateKeywords = /(llc|inc\.?|ltd\.?|plc|gmbh|pty|company|co\.?|corporation|limited|sa|ag)/i;
    const name = (invoice.customer_name || '').trim();
    if (name && !corporateKeywords.test(name)) {
      const first = name.split(/\s+/)[0];
      if (first && /[a-z]/i.test(first)) {
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
    const email = (invoice.customer_email || '').trim();
    const local = email.split('@')[0] || '';
    const guess = local.split(/[._+\-]/)[0] || '';
    if (guess) {
      return guess.charAt(0).toUpperCase() + guess.slice(1);
    }
    return 'there';
  }

  stripSignature(text) {
    // Remove common closings and any following lines
    const patterns = [
      /\n+best regards[,\s]*[\s\S]*$/i,
      /\n+kind regards[,\s]*[\s\S]*$/i,
      /\n+regards[,\s]*[\s\S]*$/i,
      /\n+thanks[,\s]*[\s\S]*$/i,
    ];
    let result = String(text || '');
    for (const re of patterns) {
      result = result.replace(re, '');
    }
    return result.trim();
  }

  buildPrompt(invoice, options = {}) {
    const companyName = process.env.COMPANY_NAME || 'Credit Control';
    const personaName = "David's Credit Control Bot";
    const tone = options.tone || this.selectTone(invoice.overdue_days || 0);
    const paymentLink = options.payment_link || '{payment_link}';
    const firstName = options.customer_first_name || this.deriveFirstName(invoice);

    const amountStr = typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : String(invoice.amount);

    return `You are an assistant that drafts concise, professional, and friendly credit control emails for a very small business.
- Company/Persona: ${companyName} — signed as ${personaName}.
- Audience: Business customers who have overdue invoices.
- Tone: ${tone}. Avoid sounding corporate or aggressive. Keep it human, brief, and polite.
- Greeting: Start the email body with exactly: "Dear ${firstName}," (do not use the company name or a generic greeting).
- Clarity: Make it explicitly clear within the first one or two sentences that the invoice is payable to ${companyName} (use wording like “our invoice” and mention ${companyName} by name).
- Subject: Keep ~80 chars max and, if it fits naturally, include ${companyName}.
- IMPORTANT: Do NOT include any closing/signature; the system will append: "Best regards,\\nDavid's Credit Control Bot\\n${companyName}".

Write a subject and an email body for this invoice:
- Customer first name: ${firstName}
- Customer email: ${invoice.customer_email || 'unknown'}
- Invoice number: ${invoice.stripe_invoice_id}
- Amount due (USD): ${amountStr}
- Due date: ${invoice.due_date || 'unknown'}
- Overdue days: ${invoice.overdue_days || 0}
- Payment link: ${paymentLink}

Constraints:
- Subject: max ~80 characters.
- Body: 120–220 words max, short paragraphs, clear call-to-action with the payment link.
- Do NOT include any signature or sign-off.
- Do NOT include placeholders other than the given {payment_link} if needed.

Return strict JSON with keys: subject, body.`;
  }

  selectTone(overdueDays) {
    if (overdueDays <= 1) return 'warm and friendly reminder';
    if (overdueDays <= 3) return 'polite and clear follow-up';
    if (overdueDays <= 7) return 'firm but courteous';
    return 'firm and concise, still courteous';
  }

  async generateChaseEmail(invoice, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY.');
    }

    const systemPrompt = 'You generate concise, professional credit control emails for a small company.';
    const userPrompt = this.buildPrompt(invoice, options);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: options.temperature ?? 0.4,
      });

      try {
        logger.info('OpenAI chat.completions.create success', {
          openai_id: response.id,
          model: response.model || this.model,
          usage: response.usage || null,
        });
      } catch (_) {}

      const content = response.choices?.[0]?.message?.content || '{}';
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        logger.warn('AI response was not valid JSON; attempting fallback parse.');
        parsed = { subject: 'Payment reminder', body: content };
      }

      if (!parsed.subject || !parsed.body) {
        throw new Error('AI response missing required fields (subject/body).');
      }

      const cleanedBody = this.stripSignature(parsed.body);

      return {
        subject: String(parsed.subject).trim(),
        body: String(cleanedBody).trim(),
        model: this.model,
        openai: { id: response.id, usage: response.usage || null },
      };
    } catch (error) {
      logger.error('AI email generation failed:', error);
      throw error;
    }
  }
}

module.exports = new AiEmailService();
