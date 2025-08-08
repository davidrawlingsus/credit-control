# Railway Deployment Guide

## Overview

Railway is an excellent choice for deploying the credit control application. It provides:
- Built-in PostgreSQL database
- Automatic deployments from Git
- Easy environment variable management
- SSL certificates included
- Global CDN
- Real-time logs and monitoring

## Prerequisites

1. **Railway Account**
   - Sign up at https://railway.app
   - Connect your GitHub account

2. **GitHub Repository**
   - Push your code to GitHub
   - Ensure the repository is public or connected to Railway

3. **External Services Setup**
   - Stripe account and API keys
   - Gmail API credentials
   - OpenAI API key

## Railway Setup

### 1. Create New Project

1. **Login to Railway**
   - Go to https://railway.app
   - Click "New Project"

2. **Connect Repository**
   - Select "Deploy from GitHub repo"
   - Choose your credit-control repository
   - Railway will automatically detect it's a Node.js project

### 2. Add PostgreSQL Database

1. **Add Database Service**
   - In your Railway project dashboard
   - Click "New Service" → "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL database

2. **Get Database URL**
   - Click on the PostgreSQL service
   - Go to "Connect" tab
   - Copy the `DATABASE_URL` from the environment variables

### 3. Configure Environment Variables

In your Railway project dashboard, go to "Variables" and add:

```env
# App Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
API_URL=https://your-railway-app.railway.app/api

# Database (Railway will auto-inject DATABASE_URL)
# DATABASE_URL is automatically provided by Railway

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

### 4. Configure Railway Settings

#### Railway.json Configuration
Create a `railway.json` file in your project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Package.json Scripts
Ensure your `package.json` has the correct start script:

```json
{
  "scripts": {
    "start": "cd backend && npm start",
    "build": "npm run build:backend",
    "build:backend": "cd backend && npm run build",
    "postinstall": "npm run build"
  }
}
```

### 5. Database Migration

Railway will automatically run your application, but you need to set up the database:

1. **Add Migration Script**
   - In Railway dashboard, go to your app service
   - Add a custom domain if needed
   - The database will be automatically connected

2. **Run Migrations**
   - Railway will run your start command
   - Ensure your app runs migrations on startup

### 6. Custom Domain (Optional)

1. **Add Custom Domain**
   - In Railway dashboard, go to your app service
   - Click "Settings" → "Domains"
   - Add your custom domain
   - Railway will provide SSL certificate automatically

2. **Update Environment Variables**
   - Update `FRONTEND_URL` and `CORS_ORIGIN` with your custom domain

## Deployment Process

### 1. Automatic Deployments

Railway automatically deploys when you push to your main branch:

```bash
# Make changes to your code
git add .
git commit -m "feat: add invoice chase system"
git push origin main

# Railway will automatically deploy
```

### 2. Manual Deployments

You can also trigger manual deployments:

1. Go to Railway dashboard
2. Click on your app service
3. Click "Deploy" button

### 3. Environment-Specific Deployments

For different environments (staging, production):

1. **Create Multiple Services**
   - Create separate Railway projects for staging/production
   - Use different environment variables

2. **Branch-Based Deployments**
   - Connect different branches to different Railway projects
   - Use GitHub Actions for more complex workflows

## Monitoring and Logs

### 1. Real-Time Logs

Railway provides real-time logs:

1. Go to your app service in Railway dashboard
2. Click "Logs" tab
3. View real-time application logs

### 2. Metrics and Monitoring

Railway provides:
- CPU and memory usage
- Request/response times
- Error rates
- Database performance

### 3. Health Checks

Configure health check endpoint in your app:

```javascript
// backend/src/routes/health.js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Database Management

### 1. Railway PostgreSQL Features

Railway PostgreSQL provides:
- Automatic backups
- Connection pooling
- Performance monitoring
- Easy scaling

### 2. Database Access

1. **Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   railway connect
   ```

2. **Direct Connection**
   - Get connection string from Railway dashboard
   - Use any PostgreSQL client

### 3. Database Migrations

Ensure your app runs migrations on startup:

```javascript
// backend/src/config/database.js
import { migrate } from './migrations';

async function initializeDatabase() {
  try {
    await migrate();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}
```

## Environment Variables Management

### 1. Railway Environment Variables

Railway makes it easy to manage environment variables:

1. **Dashboard Management**
   - Go to your service in Railway dashboard
   - Click "Variables" tab
   - Add/edit variables

2. **CLI Management**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set STRIPE_SECRET_KEY=sk_live_...
   ```

### 2. Variable Groups

Organize variables by environment:

```bash
# Development
railway variables set --environment development NODE_ENV=development

# Production
railway variables set --environment production NODE_ENV=production
```

## Scaling and Performance

### 1. Automatic Scaling

Railway can automatically scale your application:

1. **Enable Auto-Scaling**
   - In Railway dashboard, go to your service
   - Click "Settings" → "Scaling"
   - Enable auto-scaling

2. **Resource Limits**
   - Set minimum and maximum instances
   - Configure CPU and memory limits

### 2. Performance Optimization

1. **Database Optimization**
   - Use connection pooling
   - Implement caching with Redis
   - Optimize database queries

2. **Application Optimization**
   - Enable compression
   - Use CDN for static assets
   - Implement caching strategies

## Security Best Practices

### 1. Environment Variables

- Never commit sensitive data to Git
- Use Railway's encrypted environment variables
- Rotate API keys regularly

### 2. Database Security

- Railway PostgreSQL is automatically secured
- Use connection pooling
- Implement proper authentication

### 3. Application Security

- Use HTTPS (Railway provides automatically)
- Implement rate limiting
- Validate all inputs
- Use secure headers

## Troubleshooting

### 1. Common Issues

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

### 2. Debugging

**View Logs**
```bash
railway logs
```

**Connect to Database**
```bash
railway connect
```

**SSH into Service**
```bash
railway shell
```

## Cost Optimization

### 1. Railway Pricing

Railway offers:
- Free tier for development
- Pay-as-you-go pricing
- Automatic scaling

### 2. Cost Optimization Tips

1. **Use Free Tier for Development**
   - Keep development environment on free tier
   - Use paid tier only for production

2. **Optimize Resource Usage**
   - Monitor CPU and memory usage
   - Scale down during low traffic
   - Use efficient database queries

3. **Database Optimization**
   - Use connection pooling
   - Implement caching
   - Optimize queries

## Migration from Other Platforms

### 1. From Heroku

1. **Export Environment Variables**
   ```bash
   heroku config --app your-app > env.txt
   ```

2. **Import to Railway**
   - Copy variables from env.txt
   - Add to Railway environment variables

3. **Update Database**
   - Export data from Heroku PostgreSQL
   - Import to Railway PostgreSQL

### 2. From Vercel/Netlify

1. **Separate Backend**
   - Deploy backend to Railway
   - Keep frontend on Vercel/Netlify
   - Update API URLs

2. **Environment Variables**
   - Copy environment variables
   - Update CORS settings

## Support and Resources

### 1. Railway Documentation
- https://docs.railway.app
- https://railway.app/docs

### 2. Community
- Railway Discord: https://discord.gg/railway
- GitHub Discussions

### 3. Support
- Railway support through dashboard
- Community forums
- Documentation and guides 