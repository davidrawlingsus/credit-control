const { Pool } = require('pg');
const { logger } = require('../utils/logger');

// Use SQLite for local development, PostgreSQL for production
const useSQLite = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;

let pool = null;

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
function createPool() {
  if (!pool) {
    pool = new Pool(dbConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Handle pool connection
    pool.on('connect', () => {
      logger.debug('New client connected to database');
    });
  }
  return pool;
}

// Connect to database
async function connectDatabase() {
  try {
    if (useSQLite) {
      // Use SQLite for local development
      const sqliteDb = require('./database-sqlite');
      await sqliteDb.connectDatabase();
      logger.info('SQLite database connected successfully');
      return true;
    } else {
      // Use PostgreSQL for production
      const client = await createPool().connect();
      logger.info('PostgreSQL database connected successfully');
      client.release();
      return true;
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

// Get database client
async function getClient() {
  if (useSQLite) {
    const sqliteDb = require('./database-sqlite');
    return sqliteDb.db();
  }
  return createPool().connect();
}

// Execute query with error handling
async function executeQuery(query, params = []) {
  if (useSQLite) {
    const sqliteDb = require('./database-sqlite');
    return sqliteDb.executeQuery(query, params);
  }
  
  const client = await getClient();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run database migrations
async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    
    // Create migrations table if it doesn't exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, '../database/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.info('No migrations directory found, skipping migrations');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const { rows: executedMigrations } = await executeQuery(
      'SELECT name FROM migrations ORDER BY executed_at'
    );
    const executedMigrationNames = executedMigrations.map(row => row.name);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.includes(file)) {
        logger.info(`Running migration: ${file}`);
        
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        await executeQuery(migrationSQL);
        
        // Record migration as executed
        await executeQuery(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        
        logger.info(`Migration completed: ${file}`);
      }
    }
    
    logger.info('All migrations completed successfully');
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
    const { rows } = await executeQuery(
      'SELECT COUNT(*) as count FROM email_templates'
    );
    
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
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (overdue_day, template_name) DO NOTHING
      `, [
        template.overdue_day,
        template.template_name,
        template.subject_line,
        template.template_text,
        true
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
        VALUES ($1, $2, $3)
        ON CONFLICT (overdue_day) DO NOTHING
      `, [schedule.overdue_day, schedule.template_id, true]);
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
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO NOTHING
      `, [config.key, config.value, config.description]);
    }

    logger.info('Database seeded successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

// Initialize database (run migrations and seed)
async function initializeDatabase() {
  try {
    await connectDatabase();
    await runMigrations();
    await seedDatabase();
    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}

module.exports = {
  connectDatabase,
  getClient,
  executeQuery,
  runMigrations,
  seedDatabase,
  initializeDatabase,
  closeDatabase,
  pool: () => pool,
};
