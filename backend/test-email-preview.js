const gmailService = require('./src/services/gmail-service');

// Sample invoice data
const sampleInvoice = {
  stripe_invoice_id: 'inv_1234567890',
  customer_email: 'customer@example.com',
  customer_name: 'John Doe',
  amount: '1,250.00',
  due_date: '2025-08-01',
  overdue_days: 7
};

// Sample email content
const emailContent = {
  subject: `Payment Reminder - Invoice ${sampleInvoice.stripe_invoice_id}`,
  body: `Dear ${sampleInvoice.customer_name},

I hope this email finds you well. I wanted to follow up regarding invoice ${sampleInvoice.stripe_invoice_id} for $${sampleInvoice.amount} which was due on ${sampleInvoice.due_date}.

We haven't received payment yet, and I wanted to ensure everything is in order. If you have any questions about this invoice or need to discuss payment arrangements, please don't hesitate to reach out.

You can make payment directly through our secure payment portal: {payment_link}

Thank you for your prompt attention to this matter.

Best regards,
David's Credit Control Bot`
};

// Preview the email
console.log('📧 Email Preview with New Persona');
console.log('==================================\n');

console.log('📧 From: Credit Control <credit-control@rawlings.us>');
console.log('📧 To: customer@example.com');
console.log('📧 Subject: Payment Reminder - Invoice inv_1234567890\n');

console.log('📝 Email Content:');
console.log('================');
console.log(emailContent.body);
console.log('\n');

console.log('🏷️  Signature:');
console.log('==============');
console.log('David\'s Credit Control Bot');
console.log('credit-control@rawlings.us');
console.log('1-800-CREDIT-1');
console.log('rawlings.us');
console.log('\n');

console.log('📋 Professional Features:');
console.log('========================');
console.log('✅ Dedicated email persona (not personal email)');
console.log('✅ Professional signature with contact info');
console.log('✅ Automated message disclaimer');
console.log('✅ Company branding and colors');
console.log('✅ HTML formatting for better presentation');
console.log('✅ Preview system for admin approval');
console.log('\n');

console.log('🎯 Ready to send professional chase emails!');
console.log('Complete the OAuth2 setup to start sending emails.');
