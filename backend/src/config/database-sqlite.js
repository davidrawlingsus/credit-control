const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('../utils/logger');

let db = null;

// Database configuration for SQLite
const dbPath = path.join(__dirname, '../../data/credit_control.db');

// Create database directory if it doesn't exist
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
        reject(err);
      } else {
        logger.info('SQLite database connected successfully');
        resolve();
      }
    });
  });
}

// Execute query with error handling
function executeQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
}

// Run database migrations
async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    
    // Create migrations table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create invoices table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stripe_invoice_id TEXT UNIQUE NOT NULL,
        stripe_customer_id TEXT,
        customer_email TEXT NOT NULL,
        customer_name TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'unpaid',
        overdue_days INTEGER DEFAULT 0,
        last_chase_date DATETIME,
        chase_count INTEGER DEFAULT 0,
        chase_paused BOOLEAN DEFAULT 0,
        paid_date DATETIME,
        stripe_payment_intent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure chase_paused column exists (for older databases)
    try {
      const { rows: pragma } = await executeQuery(`PRAGMA table_info('invoices')`);
      const hasPaused = (pragma || []).some((c) => c.name === 'chase_paused');
      if (!hasPaused) {
        await executeQuery(`ALTER TABLE invoices ADD COLUMN chase_paused BOOLEAN DEFAULT 0`);
        logger.info('Added invoices.chase_paused column');
      }
    } catch (e) {
      logger.warn('Could not verify/add invoices.chase_paused column (may already exist)', e.message || e);
    }

    // Create email_templates table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        overdue_day INTEGER NOT NULL,
        template_name TEXT NOT NULL,
        subject_line TEXT NOT NULL,
        template_text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(overdue_day, template_name)
      )
    `);

    // Create chase_emails table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS chase_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        template_id INTEGER,
        overdue_day INTEGER NOT NULL,
        generated_text TEXT NOT NULL,
        subject_line TEXT NOT NULL,
        sent_at DATETIME,
        status TEXT DEFAULT 'pending',
        approved_by TEXT,
        approved_at DATETIME,
        sent_to TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
      )
    `);

    // Create app_config table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_log table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        user_email TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create chase_schedule table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS chase_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        overdue_day INTEGER NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT 1,
        template_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Seed database with initial data
async function seedDatabase() {
  try {
    logger.info('Seeding database...');
    
    // Check if database is already seeded
    const { rows } = await executeQuery('SELECT COUNT(*) as count FROM email_templates');
    
    if (parseInt(rows[0].count) > 0) {
      logger.info('Database already seeded, skipping...');
      return;
    }

    // Insert default email templates
    const defaultTemplates = [
      {
        overdue_day: 1,
        template_name: 'First Reminder',
        subject_line: 'Payment Reminder - Invoice #{invoice_number}',
        template_text: `Dear {customer_name},

I hope this email finds you well. I wanted to follow up regarding invoice #{invoice_number} for {amount} which was due on {due_date}.

We haven't received payment yet, and I wanted to ensure everything is in order. If you have any questions about this invoice or need to discuss payment arrangements, please don't hesitate to reach out.

You can make payment directly through our secure payment portal: {payment_link}

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`
      },
      {
        overdue_day: 3,
        template_name: 'Second Reminder',
        subject_line: 'Urgent: Payment Overdue - Invoice #{invoice_number}',
        template_text: `Dear {customer_name},

I'm writing to remind you that invoice #{invoice_number} for {amount} is now {overdue_days} days overdue. The original due date was {due_date}.

To avoid any late fees or service interruptions, please process payment as soon as possible. You can make payment securely here: {payment_link}

If you're experiencing any financial difficulties, please contact us immediately to discuss payment arrangements.

We value our relationship and want to work with you to resolve this matter promptly.

Best regards,
{company_name}`
      },
      {
        overdue_day: 5,
        template_name: 'Third Reminder',
        subject_line: 'Final Notice: Payment Required - Invoice #{invoice_number}',
        template_text: `Dear {customer_name},

This is our final notice regarding invoice #{invoice_number} for {amount}, which is now {overdue_days} days overdue.

If payment is not received within 48 hours, we will be forced to take further action, which may include:
- Late fees and interest charges
- Collection proceedings
- Service suspension

Please make immediate payment here: {payment_link}

If you need to discuss this matter, please contact us immediately.

Best regards,
{company_name}`
      },
      {
        overdue_day: 7,
        template_name: 'Final Warning',
        subject_line: 'URGENT: Immediate Payment Required - Invoice #{invoice_number}',
        template_text: `Dear {customer_name},

This is an urgent final notice regarding invoice #{invoice_number} for {amount}, which is now {overdue_days} days overdue.

This matter requires immediate attention. If payment is not received within 24 hours, we will:
- Apply late fees and interest charges
- Initiate collection proceedings
- Suspend all services

To avoid these consequences, please make immediate payment: {payment_link}

This is your final opportunity to resolve this matter before further action is taken.

Best regards,
{company_name}`
      }
    ];

    for (const template of defaultTemplates) {
      await executeQuery(`
        INSERT INTO email_templates (overdue_day, template_name, subject_line, template_text, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [
        template.overdue_day,
        template.template_name,
        template.subject_line,
        template.template_text,
        1
      ]);
    }

    // Insert default chase schedule
    const chaseSchedule = [
      { overdue_day: 1, template_id: 1 },
      { overdue_day: 3, template_id: 2 },
      { overdue_day: 5, template_id: 3 },
      { overdue_day: 7, template_id: 4 }
    ];

    for (const schedule of chaseSchedule) {
      await executeQuery(`
        INSERT INTO chase_schedule (overdue_day, template_id, is_active)
        VALUES (?, ?, ?)
      `, [schedule.overdue_day, schedule.template_id, 1]);
    }

    // Insert default app configuration
    const appConfig = [
      { key: 'chase_enabled', value: 'true', description: 'Whether automatic chasing is enabled' },
      { key: 'max_chase_count', value: '4', description: 'Maximum number of chase emails per invoice' },
      { key: 'chase_interval_hours', value: '24', description: 'Hours between chase checks' },
      { key: 'gmail_user', value: process.env.GMAIL_USER || '', description: 'Gmail account for sending emails' },
      { key: 'stripe_webhook_secret', value: process.env.STRIPE_WEBHOOK_SECRET || '', description: 'Stripe webhook secret for verification' },
      { key: 'openai_api_key', value: process.env.OPENAI_API_KEY || '', description: 'OpenAI API key for email generation' }
    ];

    for (const config of appConfig) {
      await executeQuery(`
        INSERT INTO app_config (key, value, description)
        VALUES (?, ?, ?)
      `, [config.key, config.value, config.description]);
    }

    logger.info('Database seeded successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

// Connect to database
async function connectDatabase() {
  try {
    await initializeDatabase();
    await runMigrations();
    await seedDatabase();
    logger.info('Database initialization completed');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Close database connection
async function closeDatabase() {
  if (db) {
    return new Promise((resolve) => {
      db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
        } else {
          logger.info('Database connection closed');
        }
        resolve();
      });
    });
  }
}

module.exports = {
  connectDatabase,
  executeQuery,
  runMigrations,
  seedDatabase,
  closeDatabase,
  db: () => db,
};
