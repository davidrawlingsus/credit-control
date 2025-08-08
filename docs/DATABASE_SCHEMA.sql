-- Credit Control App Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE invoice_status AS ENUM ('paid', 'unpaid', 'overdue', 'cancelled');
CREATE TYPE email_status AS ENUM ('pending', 'approved', 'sent', 'cancelled');
CREATE TYPE chase_frequency AS ENUM ('daily', 'weekly', 'custom');

-- Invoices table - stores all invoice data from Stripe
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'unpaid',
    overdue_days INTEGER DEFAULT 0,
    last_chase_date TIMESTAMP,
    chase_count INTEGER DEFAULT 0,
    paid_date TIMESTAMP,
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates for different chase scenarios
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    overdue_day INTEGER NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    subject_line VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(overdue_day, template_name)
);

-- Chase emails tracking
CREATE TABLE chase_emails (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES email_templates(id),
    overdue_day INTEGER NOT NULL,
    generated_text TEXT NOT NULL,
    subject_line VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP,
    status email_status DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    sent_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuration settings
CREATE TABLE app_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for tracking all actions
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255),
    entity_id INTEGER,
    user_email VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chase schedule configuration
CREATE TABLE chase_schedule (
    id SERIAL PRIMARY KEY,
    overdue_day INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    template_id INTEGER REFERENCES email_templates(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(overdue_day)
);

-- Indexes for performance
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_overdue_days ON invoices(overdue_days);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_chase_emails_status ON chase_emails(status);
CREATE INDEX idx_chase_emails_invoice_id ON chase_emails(invoice_id);
CREATE INDEX idx_chase_emails_created_at ON chase_emails(created_at);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chase_emails_updated_at BEFORE UPDATE ON chase_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chase_schedule_updated_at BEFORE UPDATE ON chase_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (overdue_day, template_name, subject_line, template_text) VALUES
(1, 'First Reminder', 'Payment Reminder - Invoice #{invoice_number}', 
'Dear {customer_name},

I hope this email finds you well. I wanted to follow up regarding invoice #{invoice_number} for {amount} which was due on {due_date}.

We haven''t received payment yet, and I wanted to ensure everything is in order. If you have any questions about this invoice or need to discuss payment arrangements, please don''t hesitate to reach out.

You can make payment directly through our secure payment portal: {payment_link}

Thank you for your prompt attention to this matter.

Best regards,
{company_name}'),

(3, 'Second Reminder', 'Urgent: Payment Overdue - Invoice #{invoice_number}',
'Dear {customer_name},

I''m writing to remind you that invoice #{invoice_number} for {amount} is now {overdue_days} days overdue. The original due date was {due_date}.

To avoid any late fees or service interruptions, please process payment as soon as possible. You can make payment securely here: {payment_link}

If you''re experiencing any financial difficulties, please contact us immediately to discuss payment arrangements.

We value our relationship and want to work with you to resolve this matter promptly.

Best regards,
{company_name}'),

(5, 'Third Reminder', 'Final Notice: Payment Required - Invoice #{invoice_number}',
'Dear {customer_name},

This is our final notice regarding invoice #{invoice_number} for {amount}, which is now {overdue_days} days overdue.

If payment is not received within 48 hours, we will be forced to take further action, which may include:
- Late fees and interest charges
- Collection proceedings
- Service suspension

Please make immediate payment here: {payment_link}

If you need to discuss this matter, please contact us immediately.

Best regards,
{company_name}'),

(7, 'Final Warning', 'URGENT: Immediate Payment Required - Invoice #{invoice_number}',
'Dear {customer_name},

This is an urgent final notice regarding invoice #{invoice_number} for {amount}, which is now {overdue_days} days overdue.

This matter requires immediate attention. If payment is not received within 24 hours, we will:
- Apply late fees and interest charges
- Initiate collection proceedings
- Suspend all services

To avoid these consequences, please make immediate payment: {payment_link}

This is your final opportunity to resolve this matter before further action is taken.

Best regards,
{company_name}');

-- Insert default chase schedule
INSERT INTO chase_schedule (overdue_day, template_id) VALUES
(1, 1),
(3, 2),
(5, 3),
(7, 4);

-- Insert default app configuration
INSERT INTO app_config (key, value, description) VALUES
('chase_enabled', 'true', 'Whether automatic chasing is enabled'),
('max_chase_count', '4', 'Maximum number of chase emails per invoice'),
('chase_interval_hours', '24', 'Hours between chase checks'),
('gmail_user', '', 'Gmail account for sending emails'),
('stripe_webhook_secret', '', 'Stripe webhook secret for verification'),
('openai_api_key', '', 'OpenAI API key for email generation'); 