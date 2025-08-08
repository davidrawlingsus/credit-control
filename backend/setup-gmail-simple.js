const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

console.log('🔧 Simple Gmail Setup for Credit Control');
console.log('=========================================\n');

console.log('📋 Quick Setup Instructions:');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
console.log('2. Select project: credit-control-app');
console.log('3. Click "Create Credentials" > "OAuth 2.0 Client IDs"');
console.log('4. Application type: "Desktop application"');
console.log('5. Name: "Credit Control Gmail"');
console.log('6. Click "Create"');
console.log('7. Download the JSON file');
console.log('8. Save it as "gmail-oauth.json" in the backend folder\n');

console.log('📧 Enable Gmail API:');
console.log('1. Go to: https://console.cloud.google.com/apis/library');
console.log('2. Search for "Gmail API"');
console.log('3. Click "Enable"\n');

console.log('🔑 Set up OAuth Consent Screen:');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
console.log('2. User Type: "External"');
console.log('3. App name: "Credit Control System"');
console.log('4. User support email: stella.m@rawlings.us');
console.log('5. Developer contact: stella.m@rawlings.us');
console.log('6. Add scopes: https://www.googleapis.com/auth/gmail.send');
console.log('7. Add test users: stella.m@rawlings.us\n');

console.log('📝 After setup, add these environment variables to .env:');
console.log('GMAIL_CLIENT_ID=your_client_id_here');
console.log('GMAIL_CLIENT_SECRET=your_client_secret_here');
console.log('GMAIL_REFRESH_TOKEN=your_refresh_token_here\n');

console.log('🎯 The system will send emails from:');
console.log('From: Credit Control <credit-control@rawlings.us>');
console.log('Reply-To: credit-control@rawlings.us');
console.log('Organization: Credit Control\n');
console.log('Signature: David\'s Credit Control Bot\n');

console.log('✅ Once set up, test with:');
console.log('curl http://localhost:3001/api/test/gmail');
console.log('curl -X POST http://localhost:3001/api/test/send-test-email \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"to":"test@example.com","subject":"Test","body":"Hello"}\'\n');

console.log('🚀 Ready to create professional chase emails!');
