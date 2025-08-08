# API Specification

## Overview

The Credit Control System API provides RESTful endpoints for managing overdue invoices, chase emails, and the approval workflow. Emails are sent as plain text with a human tone, include a first-name greeting, and insert the Stripe hosted invoice link directly.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.railway.app`

## Authentication

### Gmail OAuth2
- **Scope**: `https://www.googleapis.com/auth/gmail.send`
- **Flow**: Authorization code flow with refresh tokens
- **Storage**: Tokens stored securely in environment variables

### API Authentication (Planned)
- **Method**: JWT tokens
- **Header**: `Authorization: Bearer <token>`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Health Check

#### GET /api/health
Check system health and status.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-08-08T14:00:00.000Z",
  "services": {
    "database": "connected",
    "stripe": "connected",
    "gmail": "connected"
  }
}
```

### Test Endpoints

#### GET /api/test/health
Comprehensive health check with detailed service status.

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-08-08T14:00:00.000Z",
  "database": {
    "status": "connected",
    "current_time": "2025-08-08 14:00:00"
  },
  "stripe": {
    "status": "connected",
    "secret_key_configured": true,
    "webhook_secret_configured": true
  },
  "gmail": {
    "status": "connected",
    "user_configured": true,
    "company_email_configured": true
  },
  "environment": {
    "node_env": "development",
    "port": "3001"
  }
}
```

#### GET /api/test/gmail
Test Gmail OAuth2 connection and email persona.

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "email": "stella.m@rawlings.us",
    "messagesTotal": 3,
    "threadsTotal": 3,
    "persona": {
      "name": "Credit Control",
      "email": "credit-control@rawlings.us",
      "phone": "1-800-CREDIT-1"
    }
  },
  "message": "Gmail service connection test successful"
}
```

#### POST /api/test/send-test-email
Send a test plain-text email using the professional persona.

**Request:**
```json
{
  "to": "david@rawlings.us",
  "subject": "Test Email",
  "body": "This is a test email from the Credit Control Bot."
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "messageId": "...",
    "threadId": "...",
    "from": "Rawlings MI Ltd <credit-control@rawlings.us>",
    "to": "david@rawlings.us",
    "subject": "Test Email"
  },
  "message": "Test email sent successfully"
}
```

#### POST /api/test/send-chase-preview
Send a plain-text chase email preview to admin for approval.

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "messageId": "...",
    "threadId": "...",
    "from": "Rawlings MI Ltd <credit-control@rawlings.us>",
    "to": "david@rawlings.us",
    "subject": "[PREVIEW] Friendly Reminder: Overdue Invoice from Rawlings MI Ltd"
  },
  "message": "Chase email preview sent successfully"
}
```

#### POST /api/test/ai-generate
Generate an AI chase email for the latest (or specified) invoice, and optionally send a preview.

**Request:**
```json
{
  "invoice_id": 123,            // optional, defaults to latest invoice
  "send_preview": true,         // optional, default false
  "to": "david@rawlings.us"     // optional, target for preview
}
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": 1,
    "stripe_invoice_id": "in_...",
    "customer_email": "crystal@example.com",
    "overdue_days": 6,
    "amount": 7500,
    "due_date": "2025-08-01"
  },
  "ai": {
    "model": "gpt-4o-mini",
    "subject": "Friendly Reminder: Overdue Invoice from Rawlings MI Ltd",
    "body": "Dear Crystal, ..."
  },
  "payment_link": "https://invoice.stripe.com/i/...",
  "preview": {
    "sent_to": "david@rawlings.us",
    "success": true,
    "messageId": "...",
    "threadId": "...",
    "from": "Rawlings MI Ltd <credit-control@rawlings.us>",
    "to": "david@rawlings.us",
    "subject": "[PREVIEW] Friendly Reminder: Overdue Invoice from Rawlings MI Ltd"
  }
}
```

### Invoice Management

#### GET /api/invoices
Get all invoices with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (pending, overdue, paid)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": 1,
        "stripe_invoice_id": "in_1RouEGJ7Nm1xDGwxl9lI2ipA",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe",
        "amount": "1250.00",
        "currency": "USD",
        "due_date": "2025-08-01",
        "status": "overdue",
        "overdue_days": 7,
        "last_chase_date": "2025-08-08T10:00:00.000Z",
        "chase_count": 2,
        "created_at": "2025-08-01T00:00:00.000Z",
        "updated_at": "2025-08-08T10:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

#### GET /api/invoices/overdue
List overdue invoices with next-chase info for the dashboard.

Response:
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": 1,
        "stripe_invoice_id": "in_1RouEGJ7Nm1xDGwxl9lI2ipA",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe",
        "amount": "1250.00",
        "currency": "USD",
        "due_date": "2025-08-01",
        "status": "overdue",
        "overdue_days": 7,
        "last_chase_date": "2025-08-08T10:00:00.000Z",
        "chase_count": 2,
        "chase_paused": false,
        "next_chase_date": "2025-08-10T00:00:00.000Z",
        "days_until_next_chase": 1,
        "links": {
          "previous_chasers": "/api/invoices/1/chase-emails",
          "next_chaser_preview": "/api/invoices/1/next-chaser-preview"
        }
      }
    ],
    "total": 1
  }
}
```

#### GET /api/invoices/:id
Get specific invoice details.

**Response:**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": 1,
      "stripe_invoice_id": "in_1RouEGJ7Nm1xDGwxl9lI2ipA",
      "customer_email": "customer@example.com",
      "customer_name": "John Doe",
      "amount": "1250.00",
      "currency": "USD",
      "due_date": "2025-08-01",
      "status": "overdue",
      "overdue_days": 7,
      "last_chase_date": "2025-08-08T10:00:00.000Z",
      "chase_count": 2,
      "created_at": "2025-08-01T00:00:00.000Z",
      "updated_at": "2025-08-08T10:00:00.000Z"
    }
  }
}
```

### Chase Email Management

#### GET /api/chase-emails
Get all chase emails with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (pending, sent, failed)
- `type` (optional): Filter by type (preview, chase, reminder)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "chase_emails": [
      {
        "id": 1,
        "invoice_id": 1,
        "email_type": "preview",
        "subject": "Payment Reminder - Invoice in_1RouEGJ7Nm1xDGwxl9lI2ipA",
        "body": "Dear John Doe,\n\nI hope this email finds you well...",
        "recipient_email": "david@rawlings.us",
        "status": "pending",
        "sent_at": null,
        "message_id": null,
        "thread_id": null,
        "created_at": "2025-08-08T14:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /api/chase-emails/:id/approve
Approve a chase email for sending.

**Response:**
```json
{
  "success": true,
  "data": {
    "chase_email": {
      "id": 1,
      "status": "approved",
      "approved_at": "2025-08-08T14:00:00.000Z",
      "message_id": "1988b818debd6db7",
      "thread_id": "1988b818debd6db7"
    }
  },
  "message": "Chase email approved and sent successfully"
}
```

#### POST /api/chase-emails/:id/reject
Reject a chase email.

**Request:**
```json
{
  "reason": "Tone too aggressive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chase_email": {
      "id": 1,
      "status": "rejected",
      "rejected_at": "2025-08-08T14:00:00.000Z",
      "rejection_reason": "Tone too aggressive"
    }
  },
  "message": "Chase email rejected"
}
```

### Dashboard

#### GET /api/dashboard/stats
Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_invoices": 25,
    "overdue_invoices": 3,
    "total_amount_overdue": "3750.00",
    "pending_approvals": 2,
    "emails_sent_today": 5,
    "payment_rate": 0.88
  }
}
```

#### GET /api/dashboard/overdue-invoices
List overdue invoices with dashboard-ready fields.

Response:
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": 1,
        "stripe_invoice_id": "in_...",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe",
        "amount": "1250.00",
        "currency": "USD",
        "due_date": "2025-08-01",
        "overdue_days": 7,
        "chase_count": 2,
        "last_chase_date": "2025-08-08T10:00:00.000Z",
        "chase_paused": false,
        "next_chase_date": "2025-08-10T00:00:00.000Z",
        "days_until_next_chase": 1,
        "links": {
          "previous_chasers": "/api/invoices/1/chase-emails",
          "next_chaser_preview": "/api/invoices/1/next-chaser-preview"
        }
      }
    ],
    "total": 1
  }
}
```

Notes:
- `next_chase_date` and `days_until_next_chase` are computed based on the current interval policy: ≥10 days overdue → daily; ≥7 → every 2 days; ≥5 → every 3 days; <5 → none.
- `chase_paused` prevents automatic sends while true.

#### GET /api/invoices/:id/chase-emails
List previous chase emails for an invoice (most recent first).

Response:
```json
{
  "success": true,
  "data": {
    "chase_emails": [
      {
        "id": 42,
        "subject": "Payment Reminder - Invoice in_...",
        "body": "Dear John, ...",
        "sent_at": "2025-08-08T10:00:00.000Z"
      }
    ],
    "total": 2
  }
}
```

#### GET /api/invoices/:id/next-chaser-preview
Generate and return the subject/body for the next scheduled chaser without sending.

Response:
```json
{
  "success": true,
  "data": {
    "overdue_days": 7,
    "next_chase_date": "2025-08-10T00:00:00.000Z",
    "subject": "Friendly Reminder: Overdue Invoice from Rawlings MI Ltd",
    "body": "Dear John, ...",
    "payment_link": "https://invoice.stripe.com/i/..."
  }
}
```

#### POST /api/invoices/:id/pause
Pause or resume automatic chasing for a specific invoice.

Request:
```json
{ "paused": true }
```

Response:
```json
{
  "success": true,
  "data": { "id": 1, "chase_paused": true }
}
```

#### POST /api/invoices/:id/expedite
Send the next chaser immediately, bypassing the interval gate (respects `max_chase_count`).

Response:
```json
{
  "success": true,
  "data": {
    "sent": true,
    "chase_email_id": 99,
    "sent_at": "2025-08-08T12:34:56.000Z"
  },
  "message": "Next chaser sent"
}
```

#### GET /api/dashboard/overdue-summary
Get summary of overdue invoices by day.

**Response:**
```json
{
  "success": true,
  "data": {
    "overdue_summary": [
      {
        "overdue_days": 1,
        "count": 1,
        "total_amount": "1250.00"
      },
      {
        "overdue_days": 7,
        "count": 2,
        "total_amount": "2500.00"
      }
    ]
  }
}
```

### Configuration

#### GET /api/config
Get application configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "company_name": "Credit Control",
    "company_email": "credit-control@rawlings.us",
    "chase_intervals": [1, 3, 5, 7],
    "email_templates": {
      "day_1": "Gentle reminder template",
      "day_3": "Follow-up template",
      "day_5": "Urgent template",
      "day_7": "Final notice template"
    }
  }
}
```

#### PUT /api/config
Update application configuration.

**Request:**
```json
{
  "chase_intervals": [1, 3, 5, 7, 10],
  "email_templates": {
    "day_1": "Updated gentle reminder template"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_config": {
      "chase_intervals": [1, 3, 5, 7, 10],
      "email_templates": {
        "day_1": "Updated gentle reminder template"
      }
    }
  },
  "message": "Configuration updated successfully"
}
```

### Webhooks

#### POST /api/webhooks/stripe
Handle Stripe webhook events.

**Headers:**
```
Stripe-Signature: t=timestamp,v1=signature
```

**Request:**
```json
{
  "id": "evt_1234567890",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1598632774,
  "data": {
    "object": {
      "id": "in_1RouEGJ7Nm1xDGwxl9lI2ipA",
      "object": "invoice",
      "status": "paid"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_1234567890",
    "idempotency_key": null
  },
  "type": "invoice.payment_succeeded"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Missing or invalid request parameters |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `STRIPE_ERROR` | Stripe API error |
| `GMAIL_ERROR` | Gmail API error |

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Webhooks**: 1000 requests per minute
- **Email sending**: 10 emails per minute

## Pagination

All list endpoints support pagination with `limit` and `offset` parameters:

```
GET /api/invoices?limit=20&offset=40
```

Response includes pagination metadata:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "limit": 20,
    "offset": 40,
    "has_more": true
  }
}
```

## Email Persona

All emails are sent using the professional persona:

- **From**: Credit Control <credit-control@rawlings.us>
- **Reply-To**: credit-control@rawlings.us
- **Organization**: Credit Control
- **Signature**: David's Credit Control Bot

### Test Mode Behavior
- In non-production, emails are routed to `TEST_EMAIL_RECIPIENT` (or `COMPANY_EMAIL`) when `EMAIL_TEST_MODE` is true (default in development).
- Set `EMAIL_TEST_MODE=false` in production to send to customers.

## Testing

### Test Endpoints
- `GET /api/test/health` - Comprehensive health check
- `GET /api/test/gmail` - Test Gmail OAuth2 connection
- `POST /api/test/send-test-email` - Send test email
- `POST /api/test/send-chase-preview` - Send chase preview

### Example Test Commands
```bash
# Test Gmail connection
curl http://localhost:3001/api/test/gmail

# Send test email
curl -X POST http://localhost:3001/api/test/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"david@rawlings.us","subject":"Test","body":"Hello"}'

# Test chase preview
curl -X POST http://localhost:3001/api/test/send-chase-preview
```

---

**Status**: ✅ Gmail OAuth2 setup complete, email persona configured, API endpoints ready for frontend integration. 
``` 