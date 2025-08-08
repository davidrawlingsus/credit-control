# Railway Quick Setup Guide

## 🚀 Quick Start with Railway

This guide will get your credit control app deployed on Railway in minutes.

## Prerequisites

1. **GitHub Repository**
   - Push your code to GitHub
   - Ensure it's public or connected to Railway

2. **External API Keys**
   - Stripe API keys
   - Gmail API credentials  
   - OpenAI API key

## Step-by-Step Setup

### Step 1: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your credit-control repository
5. Railway will automatically detect it's a Node.js project

### Step 2: Add PostgreSQL Database

1. In your Railway project dashboard
2. Click "New Service" → "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL database automatically
4. The `DATABASE_URL` will be automatically injected into your app

### Step 3: Configure Environment Variables

In your Railway project dashboard, go to "Variables" and add:

```env
# App Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
API_URL=https://your-railway-app.railway.app/api

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gmail Configuration
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=stella.m@rawlings.us

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# JWT Authentication
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=stella.m@rawlings.us
SMTP_PASS=your_app_password
SMTP_SECURE=false

# Company Information
COMPANY_NAME=Rawlings US
COMPANY_EMAIL=stella.m@rawlings.us
COMPANY_WEBSITE=https://rawlings.us

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Step 4: Deploy

1. Railway will automatically deploy when you push to your main branch
2. Or manually trigger deployment from the Railway dashboard
3. Check the "Logs" tab to monitor the deployment

### Step 5: Verify Deployment

1. Check your app URL in Railway dashboard
2. Test the health endpoint: `https://your-app.railway.app/api/health`
3. Verify database connection and migrations

## Railway CLI (Optional)

Install Railway CLI for easier management:

```bash
npm install -g @railway/cli
railway login
railway link
```

### Useful CLI Commands

```bash
# View logs
railway logs

# Connect to database
railway connect

# Set environment variables
railway variables set NODE_ENV=production

# Deploy manually
railway up
```

## Custom Domain Setup

1. In Railway dashboard, go to your app service
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Railway will provide SSL certificate automatically
5. Update environment variables with your domain

## Monitoring Your App

### Real-Time Logs
- Go to your app service in Railway dashboard
- Click "Logs" tab
- View real-time application logs

### Metrics
- CPU and memory usage
- Request/response times
- Error rates
- Database performance

### Health Checks
Railway will automatically check your app at `/api/health`

## Troubleshooting

### Common Issues

**Build Failures**
- Check Railway logs for build errors
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

**Database Connection Issues**
- Verify DATABASE_URL is set correctly
- Check database service is running
- Ensure migrations run successfully

**Environment Variable Issues**
- Verify all required variables are set
- Check variable names match your code
- Restart service after variable changes

### Debugging Commands

```bash
# View logs
railway logs

# Connect to database
railway connect

# SSH into service
railway shell
```

## Next Steps

1. **Set up Stripe Webhooks**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-app.railway.app/api/webhooks/stripe`
   - Select events: `invoice.payment_succeeded`, `invoice.payment_failed`

2. **Configure Gmail API**
   - Set up OAuth 2.0 credentials
   - Generate refresh token
   - Update environment variables

3. **Test the Application**
   - Create test invoices in Stripe
   - Verify email generation and sending
   - Test the approval workflow

## Cost Optimization

### Railway Pricing
- **Free Tier**: $5 credit/month
- **Pay-as-you-go**: $0.000463 per second
- **Database**: $0.000463 per second

### Optimization Tips
1. Use free tier for development
2. Monitor resource usage
3. Scale down during low traffic
4. Optimize database queries

## Support

- **Railway Documentation**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Community Forums**: Available through Railway dashboard

---

Your credit control app is now ready to run on Railway! 🎉 