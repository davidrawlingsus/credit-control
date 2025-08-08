# Credit Control Backend - Quick Test Guide

## 🚀 Quick Start Testing

This guide will help you test the backend we've built with your Stripe integration.

## Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL** database (local or Railway)
3. **Environment variables** configured

## Step 1: Setup Environment

1. **Copy environment file:**
   ```bash
   cp ../env.example .env
   ```

2. **Update .env with your values:**
   - Your Stripe credentials are already in env.example
   - Add your database URL
   - Add other required variables

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Step 4: Test the API

### Basic Health Check
```bash
curl http://localhost:3001/api/health
```

### Test Environment Variables
```bash
curl http://localhost:3001/api/test/environment
```

### Test Database Connection
```bash
curl http://localhost:3001/api/test/database
```

### Test Stripe Integration
```bash
curl http://localhost:3001/api/test/stripe-invoices
```

### Sync Invoices with Database
```bash
curl -X POST http://localhost:3001/api/test/sync-invoices
```

## 🧪 Test Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Railway health check |
| `/api/test/health` | GET | Comprehensive health check |
| `/api/test/environment` | GET | Check environment variables |
| `/api/test/database` | GET | Test database connection |
| `/api/test/stripe-invoices` | GET | Fetch overdue invoices from Stripe |
| `/api/test/sync-invoices` | POST | Sync Stripe invoices to database |
| `/api/test/sample-invoice` | GET | Get sample invoice from database |

## 🔍 What to Look For

### Successful Health Check Response:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": {
    "status": "connected",
    "current_time": "2024-01-15 10:30:00"
  },
  "stripe": {
    "status": "connected",
    "secret_key_configured": true,
    "webhook_secret_configured": true
  }
}
```

### Successful Stripe Test Response:
```json
{
  "success": true,
  "count": 5,
  "invoices": [
    {
      "stripe_invoice_id": "in_1234567890",
      "customer_email": "customer@example.com",
      "amount": 1500.00,
      "overdue_days": 3
    }
  ],
  "message": "Found 5 overdue invoices"
}
```

## 🐛 Troubleshooting

### Database Connection Issues
- Check your `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists and is accessible

### Stripe Connection Issues
- Verify `STRIPE_SECRET_KEY` is correct
- Check if you have overdue invoices in Stripe
- Ensure your Stripe account has the required permissions

### Environment Variable Issues
- Run `/api/test/environment` to see missing variables
- Copy values from `env.example` to `.env`

## 📊 Expected Results

1. **Health Check**: Should show "healthy" status
2. **Environment**: Should show all required variables configured
3. **Database**: Should show tables created and connection working
4. **Stripe**: Should find overdue invoices (if any exist)
5. **Sync**: Should sync invoices to local database

## 🚀 Next Steps

Once testing is successful:

1. **Deploy to Railway** using the Railway guide
2. **Add email services** (Gmail + OpenAI)
3. **Build the frontend** dashboard
4. **Set up webhooks** in Stripe dashboard

## 📝 Notes

- The server includes placeholder routes for all endpoints
- Database migrations run automatically on startup
- Stripe integration uses your live credentials
- All logs are structured and searchable
