const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [{ rows: invCount }, { rows: overdueCount }, { rows: amountOverdue }, { rows: pendingEmails }] = await Promise.all([
      executeQuery('SELECT COUNT(*)::int AS total FROM invoices'),
      executeQuery("SELECT COUNT(*)::int AS total FROM invoices WHERE status IN ('unpaid','overdue') AND due_date < CURRENT_DATE"),
      executeQuery("SELECT COALESCE(SUM(amount),0) AS total FROM invoices WHERE status IN ('unpaid','overdue') AND due_date < CURRENT_DATE"),
      executeQuery("SELECT COUNT(*)::int AS total FROM chase_emails WHERE status = 'pending'")
    ]);

    res.json({
      success: true,
      data: {
        total_invoices: invCount[0]?.total || 0,
        overdue_invoices: overdueCount[0]?.total || 0,
        total_amount_overdue: String(amountOverdue[0]?.total || 0),
        pending_approvals: pendingEmails[0]?.total || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
