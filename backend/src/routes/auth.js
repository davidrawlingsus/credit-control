const express = require('express');
const router = express.Router();

// Placeholder route - will be implemented later
router.post('/login', (req, res) => {
  res.json({
    success: true,
    message: 'Auth endpoint - coming soon',
  });
});

module.exports = router;
