# Credit Control System Architecture

## System Overview

The Credit Control System monitors Stripe for overdue invoices and sends plain‑text chase emails via Gmail with an admin approval workflow. Emails are written in a human tone, greet contacts by first name, and include the Stripe hosted invoice link.

## 🏗️ High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Stripe API    │    │  Credit Control │    │   Gmail API     │
│                 │    │     System      │    │   (OAuth2)      │
│ • Invoice Data  │◄──►│                 │◄──►│ • Send Emails   │
│ • Payment Events│    │ • Node.js/Express│    │ • Professional  │
│ • Webhooks      │    │ • PostgreSQL    │    │   Persona       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Frontend      │
                       │   Dashboard     │
                       │                 │
                       │ • React/Next.js │
                       │ • Email Preview │
                       │ • Approval UI   │
                       └─────────────────┘
```

## 📧 Email System Architecture

### Professional Email Persona
- **From**: COMPANY_NAME (e.g., `Rawlings MI Ltd <credit-control@rawlings.us>`)
- **Format**: Plain text only (no HTML/markdown)
- **Greeting**: First‑name greeting derived from contact name/email
- **Payment Link**: Stripe hosted invoice link inserted directly
- **Signature**:
  Best regards,
  David's Credit Control Bot
  Rawlings MI Ltd

### Email Flow
```
1. Invoice Overdue Detected
   ↓
2. AI Generates Chase Email
   ↓
3. Preview Email Sent to Admin
   ↓
4. Admin Reviews & Approves
   ↓
5. Chase Email Sent to Customer
   ↓
6. Payment Detection
   ↓
7. Stop Chasing (if paid)
```

### OAuth2 Authentication Flow
```
1. User Authorizes App
   ↓
2. Authorization Code Received
   ↓
3. Exchange Code for Tokens
   ↓
4. Store Refresh Token
   ↓
5. Use Access Token for API Calls
   ↓
6. Refresh Token When Needed
```

## 🔄 Data Flow Diagrams

### Invoice Monitoring Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Cron Job  │───►│ Stripe API  │───►│   Database  │───►│ Email Queue │
│ (Every 1hr) │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Email Chase Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Overdue     │───►│ Generate    │───►│ Send        │───►│ Customer    │
│ Invoice     │    │ Chase Email │    │ Preview     │    │ Receives    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │ Admin       │    │ Admin       │
                   │ Reviews     │    │ Approves    │
                   └─────────────┘    └─────────────┘
```

### Payment Detection Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Stripe      │───►│ Webhook     │───►│ Update      │───►│ Stop        │
│ Payment     │    │ Handler     │    │ Invoice     │    │ Status      │
│ Event       │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🗄️ Database Schema

### Core Tables

#### invoices
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  overdue_days INTEGER DEFAULT 0,
  last_chase_date TIMESTAMP,
  chase_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### chase_emails
```sql
CREATE TABLE chase_emails (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  email_type VARCHAR(50) NOT NULL, -- 'preview', 'chase', 'reminder'
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP,
  message_id VARCHAR(255),
  thread_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### email_templates
```sql
CREATE TABLE email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### app_config
```sql
CREATE TABLE app_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### audit_log
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  user_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Service Architecture

### Backend Services

#### Stripe Service
- **Purpose**: Interact with Stripe API for invoice data
- **Functions**:
  - Fetch overdue invoices
  - Sync invoice data to database
  - Handle webhook events
  - Get payment links

#### Gmail Service (OAuth2)
- **Purpose**: Send plain‑text emails via Gmail API
- **Behavior**:
  - Plain‑text body with first‑name greeting
  - Inserts Stripe hosted invoice link
  - Appends standard signature (see above)
  - Preview emails match customer‑facing text exactly

#### Cron Service
- **Purpose**: Schedule automated tasks
- **Functions**:
  - Periodic invoice sync
  - Overdue invoice detection
  - Chase email scheduling
  - Payment status updates

#### OpenAI Service
- **Purpose**: Generate concise chase email subject/body
- **Prompts**:
  - No signature included (system appends signature)
  - First‑name greeting and explicit note invoice is payable to COMPANY_NAME

### Frontend Components (Planned)

#### Dashboard
- **Purpose**: Oversee overdue invoices and chase operations
- **Views**:
  - Invoice overview table with: Due date, Days overdue, Chase emails sent, Days until next chase, Pause toggle, Expedite action
  - Links to: Previous chasers (email text per send), Next chaser preview (subject/body)
- **Behavior**:
  - "Pause chasers" sets a pause flag on the invoice to stop automatic sends
  - "Expedite" triggers immediate send via backend, bypassing interval gating but still respecting `max_chase_count`
  - Next chase timing computed by backend according to policy: ≥10d daily; ≥7d every 2 days; ≥5d every 3 days

#### Email Preview
- **Purpose**: Review chase emails before sending
- **Features**:
  - HTML email preview
  - Edit capabilities
  - Approval/rejection buttons
  - Email history

## 🔐 Security Architecture

### Authentication
- **Gmail**: OAuth2 with refresh tokens
- **Web App**: JWT tokens
- **API**: API key authentication

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **HTTPS**: All communications over HTTPS
- **Environment Variables**: Sensitive config in env vars
- **Database**: Connection string encryption

### Access Control
- **Admin Access**: Email approval workflow
- **API Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all inputs
- **Audit Logging**: Track all actions

## 📊 Monitoring & Logging

### Application Logging
- **Framework**: Winston
- **Levels**: Error, Warn, Info, Debug
- **Structured**: JSON format for parsing
- **Rotation**: Daily log files

### Monitoring
- **Health Checks**: `/api/health` endpoint
- **Metrics**: Response times, error rates
- **Alerts**: Failed email sends, API errors
- **Dashboard**: Railway metrics

### Error Handling
- **Global Error Handler**: Catch all unhandled errors
- **Graceful Degradation**: Continue operation on partial failures
- **Retry Logic**: Automatic retry for transient failures
- **User Feedback**: Clear error messages

## 🚀 Deployment Architecture

### Railway Deployment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │───►│   Railway       │───►│   Production    │
│   Repository    │    │   Platform      │    │   Environment   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       └─────────────────┘
```

### Environment Configuration
- **Development**: SQLite database, local services
- **Production**: PostgreSQL, Railway services
- **Environment Variables**: Separate configs per environment
- **Secrets Management**: Railway secrets for sensitive data

## 🔄 Integration Points

### Stripe Integration
- **Webhooks**: Real-time payment notifications
- **API Calls**: Fetch invoice data
- **Authentication**: API key authentication
- **Rate Limiting**: Respect Stripe API limits

### Gmail Integration
- **OAuth2 Flow**: Secure authentication
- **API Access**: Send emails programmatically
- **Professional Persona**: Dedicated email identity
- **Error Handling**: Handle API failures gracefully

### OpenAI Integration (Planned)
- **API Calls**: Generate email content
- **Prompt Engineering**: Optimize for credit control
- **Cost Management**: Monitor API usage
- **Fallback**: Template-based emails if API fails

## 📈 Scalability Considerations

### Database Scaling
- **Indexing**: Optimize query performance
- **Connection Pooling**: Efficient database connections
- **Read Replicas**: Scale read operations
- **Partitioning**: Large table management

### Application Scaling
- **Stateless Design**: Easy horizontal scaling
- **Caching**: Redis for frequently accessed data
- **Load Balancing**: Distribute traffic
- **Auto-scaling**: Railway automatic scaling

### Email Scaling
- **Queue System**: Handle email volume
- **Rate Limiting**: Respect Gmail API limits
- **Batching**: Group email operations
- **Retry Logic**: Handle temporary failures

---

**Status**: ✅ Gmail OAuth2 setup complete, email persona configured, ready for AI integration and frontend development. 