const express = require('express');
const router = express.Router();

// Placeholder route - will be implemented later
router.post('/stripe', (req, res) => {
  res.json({
    success: true,
    message: 'Stripe webhook endpoint - coming soon',
  });
});

module.exports = router;
