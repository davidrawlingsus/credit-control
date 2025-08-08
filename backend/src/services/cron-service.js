const cron = require('node-cron');
const { logger } = require('../utils/logger');

class CronService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all cron jobs
   */
  async initializeCronJobs() {
    try {
      // Check if cron is enabled
      const cronEnabled = process.env.CRON_ENABLED !== 'false';
      
      if (!cronEnabled) {
        logger.info('Cron jobs disabled by environment variable');
        return;
      }

      // Schedule invoice sync job (every hour)
      this.scheduleInvoiceSync();
      
      // Schedule overdue check job (every 6 hours)
      this.scheduleOverdueCheck();
      
      // Schedule email generation job (every 4 hours)
      this.scheduleEmailGeneration();

      logger.info('Cron jobs initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cron jobs:', error);
      throw error;
    }
  }

  /**
   * Schedule invoice sync job
   */
  scheduleInvoiceSync() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running scheduled invoice sync...');
        const stripeService = require('./stripe-service');
        await stripeService.syncInvoices();
        logger.info('Invoice sync completed');
      } catch (error) {
        logger.error('Invoice sync job failed:', error);
      }
    }, {
      scheduled: false,
    });

    job.start();
    this.jobs.push({ name: 'invoice-sync', job });
    logger.info('Invoice sync job scheduled (every hour)');
  }

  /**
   * Schedule overdue check job
   */
  scheduleOverdueCheck() {
    const job = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Running scheduled overdue check...');
        const chaseService = require('./chase-service');
        await chaseService.processOverdueChasing();
        logger.info('Overdue check completed');
      } catch (error) {
        logger.error('Overdue check job failed:', error);
      }
    }, {
      scheduled: false,
    });

    job.start();
    this.jobs.push({ name: 'overdue-check', job });
    logger.info('Overdue check job scheduled (every 6 hours)');
  }

  /**
   * Schedule email generation job
   */
  scheduleEmailGeneration() {
    const job = cron.schedule('0 */4 * * *', async () => {
      try {
        logger.info('Running scheduled email generation...');
        // TODO: Implement email generation logic
        logger.info('Email generation completed');
      } catch (error) {
        logger.error('Email generation job failed:', error);
      }
    }, {
      scheduled: false,
    });

    job.start();
    this.jobs.push({ name: 'email-generation', job });
    logger.info('Email generation job scheduled (every 4 hours)');
  }

  /**
   * Stop all cron jobs
   */
  stopAllJobs() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    });
    this.jobs = [];
  }

  /**
   * Get status of all cron jobs
   */
  getJobStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running,
    }));
  }
}

// Create singleton instance
const cronService = new CronService();

// Initialize cron jobs
async function initializeCronJobs() {
  await cronService.initializeCronJobs();
}

module.exports = {
  cronService,
  initializeCronJobs,
};
