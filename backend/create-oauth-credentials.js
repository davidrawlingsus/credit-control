const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

console.log('🔧 Gmail OAuth2 Credentials Setup');
console.log('===================================\n');

console.log('📋 Manual Setup Instructions:');
console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
console.log('2. Select project: credit-control-app');
console.log('3. Navigate to: APIs & Services > Credentials');
console.log('4. Click "Create Credentials" > "OAuth 2.0 Client IDs"');
console.log('5. Application type: "Desktop application"');
console.log('6. Name: "Credit Control Gmail Client"');
console.log('7. Click "Create"');
console.log('8. Download the JSON file');
console.log('9. Save it as "gmail-oauth-credentials.json" in the backend folder\n');

console.log('📧 Gmail API Setup:');
console.log('1. Go to: APIs & Services > Library');
console.log('2. Search for "Gmail API"');
console.log('3. Click "Enable"');
console.log('4. Go to: APIs & Services > OAuth consent screen');
console.log('5. Add your email (stella.m@rawlings.us) as a test user\n');

console.log('🔑 After creating credentials:');
console.log('1. Place the downloaded JSON file in the backend folder');
console.log('2. Rename it to "gmail-oauth-credentials.json"');
console.log('3. Run: node setup-gmail.js');
console.log('4. Follow the authorization flow\n');

console.log('📝 Environment Variables to Add:');
console.log('GMAIL_CLIENT_ID=your_client_id_here');
console.log('GMAIL_CLIENT_SECRET=your_client_secret_here');
console.log('GMAIL_REFRESH_TOKEN=your_refresh_token_here\n');

console.log('🎯 The system will then be able to:');
console.log('- Send professional chase emails');
console.log('- Use a dedicated credit control persona');
console.log('- Send preview emails for approval');
console.log('- Track email delivery status\n');

console.log('✅ Ready to proceed with the setup!');
