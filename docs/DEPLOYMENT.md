# Deployment Guide

## Overview

This guide covers deploying the Credit Control System to Railway with PostgreSQL database, Gmail OAuth2 integration, and proper environment configuration.

## Prerequisites

### Required Accounts
- **Railway**: For hosting and database
- **Stripe**: For invoice data and webhooks
- **Google Cloud**: For Gmail OAuth2 credentials
- **OpenAI**: For AI email generation (planned)

### Required Setup
- Node.js 18+ development environment
- Git repository with the project code
- Stripe account with API keys
- Gmail account for OAuth2 setup

## 🚀 Railway Deployment

### Step 1: Railway Project Setup

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub account
   - Create new project

2. **Connect Repository**
   - Click "Deploy from GitHub repo"
   - Select your credit-control repository
   - Railway will automatically detect the Node.js app

3. **Configure Build Settings**
   - Railway will use the `railway.json` configuration
   - Build command: `npm run build`
   - Start command: `npm start`

### Step 2: Database Setup

1. **Add PostgreSQL Service**
   - In Railway dashboard, click "New Service"
   - Select "PostgreSQL"
   - Railway will provision a PostgreSQL database

2. **Get Database URL**
   - Copy the PostgreSQL connection URL
   - Add it to environment variables as `DATABASE_URL`

### Step 3: Environment Variables

Configure these environment variables in Railway dashboard:

#### App Configuration
```bash
NODE_ENV=production
PORT=3001
COMPANY_NAME=Credit Control
COMPANY_EMAIL=credit-control@rawlings.us
COMPANY_PHONE=1-800-CREDIT-1
COMPANY_WEBSITE=https://rawlings.us
```

#### Database
```bash
DATABASE_URL=postgresql://user:pass@host:port/database
```

#### Stripe Configuration
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Gmail OAuth2 Configuration
```bash
GMAIL_CLIENT_ID=your_oauth2_client_id
GMAIL_CLIENT_SECRET=your_oauth2_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=david@rawlings.us
```

#### OpenAI Configuration (Planned)
```bash
OPENAI_API_KEY=sk-...
```

### Step 4: Gmail OAuth2 Setup

1. **Google Cloud Console Setup**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Select project: `credit-control-app`
   - Enable Gmail API: APIs & Services > Library > Gmail API

2. **Create OAuth2 Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: `https://your-domain.railway.app/auth/callback`

3. **Configure OAuth Consent Screen**
   - Go to APIs & Services > OAuth consent screen
   - User Type: "External"
   - App name: "Credit Control System"
   - Add scopes: `https://www.googleapis.com/auth/gmail.send`
   - Add test users: `david@rawlings.us`

4. **Get OAuth2 Tokens**
   - Use the setup script: `node setup-gmail-simple-oauth.js`
   - Follow the authorization flow
   - Copy the refresh token to Railway environment variables

### Step 5: Stripe Webhook Setup

1. **Configure Webhook Endpoint**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://your-domain.railway.app/api/webhooks/stripe`
   - Select events: `invoice.payment_succeeded`, `invoice.payment_failed`

2. **Get Webhook Secret**
   - Copy the webhook signing secret
   - Add to Railway as `STRIPE_WEBHOOK_SECRET`

### Step 6: Deploy and Test

1. **Deploy Application**
   - Push changes to GitHub main branch
   - Railway will automatically deploy
   - Monitor deployment logs

2. **Run Database Migrations**
   ```bash
   # Via Railway CLI or dashboard
   npm run migrate
   ```

3. **Test Deployment**
   ```bash
   # Health check
   curl https://your-domain.railway.app/api/health
   
   # Test Gmail connection
   curl https://your-domain.railway.app/api/test/gmail
   
   # Send test email
   curl -X POST https://your-domain.railway.app/api/test/send-test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"david@rawlings.us","subject":"Deployment Test","body":"System is live!"}'
   ```

## 🔧 Environment-Specific Configuration

### Development Environment
```bash
NODE_ENV=development
DATABASE_URL=sqlite:./dev.db
PORT=3001
```

### Production Environment
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
PORT=3001
```

## 📊 Monitoring and Logging

### Railway Monitoring
- **Metrics**: CPU, memory, network usage
- **Logs**: Real-time application logs
- **Alerts**: Automatic scaling and error notifications

### Application Monitoring
- **Health Checks**: `/api/health` endpoint
- **Error Tracking**: Winston structured logging
- **Performance**: Response time monitoring

### Email Monitoring
- **Delivery Tracking**: Gmail API message IDs
- **Bounce Handling**: Failed email detection
- **Rate Limiting**: Respect Gmail API limits

## 🔐 Security Configuration

### Environment Variables
- **Sensitive Data**: All API keys in Railway secrets
- **Database**: Encrypted connection strings
- **OAuth2**: Secure token storage

### HTTPS Configuration
- **Automatic**: Railway provides HTTPS certificates
- **Headers**: Security headers via Helmet middleware
- **CORS**: Configured for production domains

### API Security
- **Rate Limiting**: 100 requests/minute per IP
- **Input Validation**: All inputs sanitized
- **Error Handling**: No sensitive data in error responses

## 🚀 Scaling Configuration

### Automatic Scaling
- **Railway**: Automatic scaling based on traffic
- **Database**: PostgreSQL connection pooling
- **Email**: Queue system for high volume

### Performance Optimization
- **Caching**: Redis for frequently accessed data
- **Compression**: Gzip compression enabled
- **CDN**: Static assets via CDN (planned)

## 🔄 CI/CD Pipeline

### GitHub Integration
1. **Repository**: Connect GitHub repo to Railway
2. **Auto-deploy**: Deploy on push to main branch
3. **Environment**: Separate environments for staging/production

### Deployment Process
```bash
# Local development
npm run dev

# Staging deployment
git push origin staging

# Production deployment
git push origin main
```

## 📋 Post-Deployment Checklist

### ✅ Core Functionality
- [ ] Health check endpoint responding
- [ ] Database migrations completed
- [ ] Stripe webhook receiving events
- [ ] Gmail OAuth2 authentication working
- [ ] Test email sent successfully

### ✅ Security
- [ ] Environment variables configured
- [ ] HTTPS certificates active
- [ ] API rate limiting enabled
- [ ] Error logging configured

### ✅ Monitoring
- [ ] Railway metrics visible
- [ ] Application logs accessible
- [ ] Health check monitoring
- [ ] Error alerting configured

### ✅ Email System
- [ ] Professional persona configured
- [ ] Preview emails working
- [ ] Chase emails functional
- [ ] Email tracking enabled

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database connection
curl https://your-domain.railway.app/api/test/health
```

#### Gmail Authentication
```bash
# Test Gmail connection
curl https://your-domain.railway.app/api/test/gmail
```

#### Stripe Integration
```bash
# Check Stripe configuration
curl https://your-domain.railway.app/api/test/stripe-invoices
```

### Log Analysis
```bash
# View Railway logs
railway logs

# Filter for errors
railway logs | grep ERROR
```

### Environment Debugging
```bash
# Check environment variables
curl https://your-domain.railway.app/api/test/environment
```

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [PostgreSQL on Railway](https://docs.railway.app/reference/postgresql)

---

**Status**: ✅ Gmail OAuth2 setup complete, Railway deployment configured, ready for production use. 