# Development Workflow

## Development Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git
- VS Code (recommended)
- Docker (optional)

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd credit-control

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your development values

# Set up database
npm run db:setup
npm run migrate
npm run seed
```

## Project Structure

```
credit-control/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── utils/           # Utility functions
│   │   ├── config/          # Configuration files
│   │   └── types/           # TypeScript types
│   ├── tests/               # Backend tests
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript types
│   │   └── styles/          # CSS/styling
│   ├── tests/               # Frontend tests
│   ├── package.json
│   └── next.config.js
├── database/
│   ├── migrations/          # Database migrations
│   └── seeds/               # Seed data
├── docs/                    # Documentation
└── scripts/                 # Build/deployment scripts
```

## Coding Standards

### JavaScript/TypeScript

#### General Rules
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Maximum line length: 100 characters
- Use meaningful variable and function names

#### Naming Conventions
```typescript
// Variables and functions: camelCase
const customerEmail = 'customer@example.com';
const getInvoiceById = (id: number) => {};

// Classes: PascalCase
class InvoiceService {}

// Constants: UPPER_SNAKE_CASE
const MAX_CHASE_COUNT = 4;

// Files: kebab-case
// invoice-service.ts
// customer-controller.ts
```

#### Code Organization
```typescript
// 1. Imports (external, then internal)
import express from 'express';
import { InvoiceService } from '../services/invoice-service';

// 2. Type definitions
interface InvoiceData {
  id: number;
  amount: number;
}

// 3. Class/function definitions
export class InvoiceController {
  // Public methods first
  public async getInvoice(req: Request, res: Response) {
    // Implementation
  }

  // Private methods last
  private validateInvoice(data: InvoiceData): boolean {
    // Implementation
  }
}
```

### Database

#### Migration Naming
```
YYYYMMDD_HHMMSS_description.sql
20240115_143000_create_invoices_table.sql
20240115_143100_add_overdue_days_to_invoices.sql
```

#### Migration Structure
```sql
-- Up migration
BEGIN;
-- Your SQL here
COMMIT;

-- Down migration (for rollback)
BEGIN;
-- Rollback SQL here
COMMIT;
```

### API Design

#### RESTful Endpoints
```typescript
// Resource-based URLs
GET    /api/invoices          # List invoices
GET    /api/invoices/:id      # Get specific invoice
POST   /api/invoices          # Create invoice
PUT    /api/invoices/:id      # Update invoice
DELETE /api/invoices/:id      # Delete invoice

// Action-based endpoints
POST   /api/invoices/:id/approve  # Approve invoice
POST   /api/chase-emails/:id/send # Send email
```

#### Response Format
```typescript
// Success response
{
  success: true,
  data: {
    // Response data
  },
  message?: string
}

// Error response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

## Testing Strategy

### Backend Testing

#### Unit Tests
```typescript
// invoice-service.test.ts
import { InvoiceService } from '../services/invoice-service';

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(() => {
    service = new InvoiceService();
  });

  describe('getOverdueInvoices', () => {
    it('should return overdue invoices', async () => {
      const result = await service.getOverdueInvoices();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
```

#### Integration Tests
```typescript
// invoice-controller.test.ts
import request from 'supertest';
import { app } from '../server';

describe('InvoiceController', () => {
  describe('GET /api/invoices', () => {
    it('should return list of invoices', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoices).toBeDefined();
    });
  });
});
```

### Frontend Testing

#### Component Tests
```typescript
// InvoiceList.test.tsx
import { render, screen } from '@testing-library/react';
import { InvoiceList } from '../components/InvoiceList';

describe('InvoiceList', () => {
  it('should render invoice list', () => {
    const invoices = [
      { id: 1, customer_email: 'test@example.com', amount: 100 }
    ];

    render(<InvoiceList invoices={invoices} />);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
```

#### API Service Tests
```typescript
// invoice-service.test.ts
import { InvoiceService } from '../services/invoice-service';

describe('InvoiceService', () => {
  it('should fetch invoices from API', async () => {
    const service = new InvoiceService();
    const invoices = await service.getInvoices();
    
    expect(invoices).toBeDefined();
  });
});
```

### Test Commands
```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development Workflow

### Feature Development

#### 1. Create Feature Branch
```bash
git checkout -b feature/invoice-chase-system
```

#### 2. Development Process
```bash
# Start development servers
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 3000

# Run tests
npm test

# Check code quality
npm run lint
npm run format
```

#### 3. Commit Standards
```bash
# Conventional commits
git commit -m "feat: add invoice chase system"
git commit -m "fix: resolve email sending issue"
git commit -m "docs: update API documentation"
git commit -m "test: add invoice service tests"
```

#### 4. Pull Request Process
1. Push feature branch
2. Create pull request
3. Add description and labels
4. Request code review
5. Address review comments
6. Merge after approval

### Code Review Checklist

#### Backend Code Review
- [ ] Follows coding standards
- [ ] Includes proper error handling
- [ ] Has appropriate tests
- [ ] Uses correct HTTP status codes
- [ ] Validates input data
- [ ] Handles edge cases
- [ ] Includes API documentation

#### Frontend Code Review
- [ ] Follows React best practices
- [ ] Uses TypeScript properly
- [ ] Includes component tests
- [ ] Handles loading/error states
- [ ] Is responsive and accessible
- [ ] Uses proper state management

### Database Changes

#### Migration Process
```bash
# Create new migration
npm run migration:create -- --name add_chase_count_to_invoices

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback
```

#### Migration Guidelines
- Always include both up and down migrations
- Test migrations on development data
- Use descriptive migration names
- Include data validation in migrations
- Consider performance impact of large tables

## Debugging

### Backend Debugging

#### Logging
```typescript
import logger from '../utils/logger';

logger.info('Processing invoice', { invoiceId: 123 });
logger.error('Failed to send email', { error: err.message });
```

#### Debug Mode
```bash
# Start with debugging
NODE_ENV=development DEBUG=* npm run dev:backend
```

### Frontend Debugging

#### React DevTools
- Install React Developer Tools extension
- Use browser dev tools for network requests
- Check console for errors

#### Debug Mode
```bash
# Start with debugging
REACT_APP_DEBUG=true npm run dev:frontend
```

## Performance Optimization

### Backend Optimization
- Use database indexes
- Implement caching with Redis
- Optimize database queries
- Use connection pooling
- Monitor memory usage

### Frontend Optimization
- Code splitting with React.lazy()
- Optimize bundle size
- Use React.memo() for expensive components
- Implement virtual scrolling for large lists
- Optimize images and assets

## Security Best Practices

### Backend Security
- Validate all input data
- Use parameterized queries
- Implement rate limiting
- Sanitize user inputs
- Use HTTPS in production
- Implement proper authentication

### Frontend Security
- Sanitize user inputs
- Use HTTPS for API calls
- Implement proper CORS
- Validate form data
- Use secure storage for tokens

## Deployment Process

### Development Deployment
```bash
# Build application
npm run build

# Start production server
npm start
```

### Production Deployment
```bash
# Build for production
npm run build:prod

# Deploy with PM2
pm2 start ecosystem.config.js
```

## Monitoring and Logging

### Application Logging
```typescript
// Structured logging
logger.info('Invoice processed', {
  invoiceId: 123,
  customerEmail: 'customer@example.com',
  amount: 1500.00
});
```

### Error Tracking
- Use Sentry for error tracking
- Monitor application performance
- Set up alerts for critical errors
- Track user interactions

## Documentation

### Code Documentation
```typescript
/**
 * Processes overdue invoices and generates chase emails
 * @param options - Processing options
 * @returns Promise<ProcessedInvoice[]>
 */
async function processOverdueInvoices(options: ProcessOptions): Promise<ProcessedInvoice[]> {
  // Implementation
}
```

### API Documentation
- Use OpenAPI/Swagger for API docs
- Keep documentation up to date
- Include examples and error responses
- Document authentication requirements

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run lint
```

### Pre-commit Hooks
```bash
# Install husky
npm install husky --save-dev

# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm test"
``` 