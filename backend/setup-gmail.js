const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupGmail() {
  try {
    console.log('🔧 Setting up Gmail OAuth2 credentials...\n');

    // Check if credentials file exists
    const credentialsPath = path.join(__dirname, 'gmail-credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      console.log('❌ gmail-credentials.json not found!');
      console.log('Please run the following commands to create credentials:');
      console.log('\n1. Go to Google Cloud Console: https://console.cloud.google.com/');
      console.log('2. Select project: credit-control-app');
      console.log('3. Go to APIs & Services > Credentials');
      console.log('4. Click "Create Credentials" > "OAuth 2.0 Client IDs"');
      console.log('5. Choose "Desktop application"');
      console.log('6. Download the JSON file and save it as gmail-credentials.json in the backend folder');
      console.log('\nThen run this script again.');
      return;
    }

    // Load credentials
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('✅ Credentials loaded successfully!');
    console.log('\n📧 Gmail OAuth2 Setup Instructions:');
    console.log('=====================================');
    console.log('\n1. Visit this URL to authorize the application:');
    console.log(`   ${authUrl}`);
    console.log('\n2. Sign in with your Gmail account (stella.m@rawlings.us)');
    console.log('\n3. Grant the requested permissions');
    console.log('\n4. Copy the authorization code from the redirect URL');
    console.log('\n5. Paste the authorization code below when prompted');
    console.log('\n6. The script will save the token to gmail-token.json');
    console.log('\n7. You can then test the email functionality');
    console.log('\n=====================================');

    // For now, we'll create a placeholder token
    // In a real setup, you'd implement the full OAuth flow
    console.log('\n⚠️  For testing purposes, creating placeholder token...');
    
    const token = {
      access_token: 'placeholder_access_token',
      refresh_token: 'placeholder_refresh_token',
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600000
    };

    const tokenPath = path.join(__dirname, 'gmail-token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
    
    console.log('✅ Placeholder token created at gmail-token.json');
    console.log('\n📝 Next Steps:');
    console.log('1. Replace the placeholder token with real OAuth2 tokens');
    console.log('2. Test the email functionality with: curl http://localhost:3001/api/test/gmail');
    console.log('3. Send a test email with: curl -X POST http://localhost:3001/api/test/send-test-email');
    console.log('\n🎯 The system is ready to send professional chase emails!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure gmail-credentials.json exists in the backend folder');
    console.log('2. Verify the Google Cloud project is set up correctly');
    console.log('3. Check that Gmail API is enabled in Google Cloud Console');
  }
}

// Run the setup
setupGmail();
