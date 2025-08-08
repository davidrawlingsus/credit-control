# Credit Control System

A professional credit control application that automatically monitors overdue invoices in Stripe and sends chase emails through a dedicated Gmail persona.

## 🎯 Features

- **Automated Invoice Monitoring**: Periodically checks Stripe for overdue invoices
- **Professional Email Persona**: Sends plain‑text emails from your company name (e.g., `Rawlings MI Ltd <credit-control@rawlings.us>`) signed by "David's Credit Control Bot"
- **Chase Email System**: Sends professional chase emails at specific intervals (day 1, 3, 5, 7 overdue)
- **Preview & Approval**: Admin receives preview emails for approval before sending to customers
- **Payment Detection**: Automatically stops chasing once invoices are paid
- **Dashboard**: Web interface to view overdue invoices and manage chase emails

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: PostgreSQL (production), SQLite (development)
- **APIs**: Stripe, Gmail, OpenAI
- **Authentication**: OAuth2 for Gmail, JWT for web app
- **Scheduling**: Cron jobs for automated invoice checking
- **Logging**: Winston structured logging

### Frontend (React/Next.js)
- **Dashboard**: Overdue invoices line-by-line with: Due date, Days overdue, Chases sent, Next chase timing, Pause, Expedite
- **Email History**: Expand per invoice to see previously sent chasers (subject/body preview)
- **Next Chaser Preview**: Modal with subject/body for the upcoming chaser

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (prod), SQLite (dev)
- **APIs**: Stripe, Gmail (OAuth2), OpenAI
- **Authentication**: JWT, OAuth2
- **Scheduling**: node-cron
- **Logging**: Winston
- **Testing**: Jest, Supertest

### Frontend
- **Framework**: React/Next.js
- **Styling**: Tailwind CSS
- **State Management**: React Context/Redux
- **Testing**: Jest, React Testing Library

### Infrastructure
- **Deployment**: Railway
- **Database**: PostgreSQL (Railway)
- **Email**: Gmail API (OAuth2)
- **Monitoring**: Railway metrics

## 📧 Email System

### Persona & Formatting
- **From**: COMPANY_NAME (e.g., `Rawlings MI Ltd <credit-control@rawlings.us>`)
- **Plain text only**: no HTML or markdown
- **Greeting**: First‑name greeting (derived from contact name/email)
- **Payment link**: Stripe hosted invoice link inserted directly
- **Signature**:
  Best regards,
  David's Credit Control Bot
  Rawlings MI Ltd

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (for production)
- Stripe account with API keys
- Gmail account with OAuth2 setup
- OpenAI API key

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd credit-control

# Install all dependencies (root, backend, frontend)
npm run install:all

# Set up environment
cp env.example .env
# Edit .env with your API keys

# Start backend (http://localhost:3001) and frontend (http://localhost:3000)
npm run dev
```

### Environment Variables
```bash
# App Configuration
NODE_ENV=development
PORT=3001
COMPANY_NAME=Rawlings MI Ltd
COMPANY_EMAIL=credit-control@rawlings.us

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/credit_control

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gmail (OAuth2)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=david@rawlings.us

# OpenAI
OPENAI_API_KEY=sk-...

# Email routing (test mode)
EMAIL_TEST_MODE=true                 # In dev, route chasers to TEST_EMAIL_RECIPIENT instead of customers
TEST_EMAIL_RECIPIENT=david@rawlings.us
```

## 📁 Project Structure

```
credit-control/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, logging config
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── docs/                # Backend documentation
│   └── tests/               # Test files
├── frontend/                # React/Next.js dashboard (running at :3000)
├── docs/                    # Project documentation
├── docker-compose.yml       # Local development
└── railway.json            # Railway deployment
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm install
npm run dev          # Start development server
npm test            # Run tests
npm run lint        # Lint code
npm run migrate     # Run database migrations
```

### Testing
```bash
# Test Gmail connection
curl http://localhost:3001/api/test/gmail

# Send test email
curl -X POST http://localhost:3001/api/test/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"david@rawlings.us","subject":"Test","body":"Hello"}'

# Test chase preview (AI-generated, plain text, includes Stripe payment link)
curl -X POST http://localhost:3001/api/test/send-chase-preview

# Generate AI email (optionally email preview)
curl -X POST http://localhost:3001/api/test/ai-generate \
  -H "Content-Type: application/json" \
  -d '{"send_preview": true, "to": "david@rawlings.us"}'
```

## 🚀 Deployment

### Railway Deployment
1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Environment Setup
- **Stripe**: Add webhook endpoint for payment notifications
- **Gmail**: OAuth2 credentials configured
- **Database**: PostgreSQL instance provisioned
- **Domain**: Custom domain configured (optional)

### Test Mode in Production
- Set `EMAIL_TEST_MODE=false` in production to send to customers.
- Optionally set `TEST_EMAIL_RECIPIENT` for staging environments to smoke‑test routing.

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE_SCHEMA.sql)
- [API Specification](docs/API_SPECIFICATION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Development Workflow](docs/DEVELOPMENT_WORKFLOW.md)
- [Railway Setup](docs/RAILWAY_SETUP.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Status**: ✅ Gmail OAuth2 setup complete, plain‑text email persona configured, AI generation and Stripe payment links integrated. 