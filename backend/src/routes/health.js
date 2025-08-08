const express = require('express');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint for Railway monitoring
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    let dbStatus = 'healthy';
    try {
      await executeQuery('SELECT 1');
    } catch (error) {
      dbStatus = 'unhealthy';
      logger.error('Database health check failed:', error);
    }

    // Check environment variables
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'GMAIL_USER',
      'OPENAI_API_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    const healthStatus = {
      status: dbStatus === 'healthy' && missingEnvVars.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbStatus,
        environment: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
      ...(missingEnvVars.length > 0 && {
        missing_environment_variables: missingEnvVars,
      }),
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/health/detailed
 * Detailed health check with more information
 */
router.get('/detailed', async (req, res) => {
  try {
    // Database detailed check
    let dbDetails = {};
    try {
      const { rows } = await executeQuery(`
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices
        FROM invoices
      `);
      dbDetails = rows[0];
    } catch (error) {
      dbDetails = { error: error.message };
    }

    // System information
    const systemInfo = {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      uptime: process.uptime(),
    };

    // Environment information
    const envInfo = {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      database_url: process.env.DATABASE_URL ? 'configured' : 'missing',
      stripe_key: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
      gmail_user: process.env.GMAIL_USER ? 'configured' : 'missing',
      openai_key: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbDetails,
      system: systemInfo,
      environment: envInfo,
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;
