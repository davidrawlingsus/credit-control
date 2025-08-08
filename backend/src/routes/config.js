const express = require('express');
const router = express.Router();

// Placeholder route - will be implemented later
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Config endpoint - coming soon',
  });
});

module.exports = router;
