const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupGmailOAuth() {
  try {
    console.log('🔧 Gmail OAuth2 Setup for Credit Control');
    console.log('=========================================\n');

    // Check if OAuth credentials exist
    const oauthPath = path.join(__dirname, 'gmail-oauth.json');
    if (!fs.existsSync(oauthPath)) {
      console.log('❌ gmail-oauth.json not found!');
      console.log('\n📋 Please follow these steps:');
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
      
      console.log('✅ After creating credentials, run this script again.');
      return;
    }

    console.log('✅ OAuth credentials found!');
    
    // Load OAuth credentials
    const credentials = JSON.parse(fs.readFileSync(oauthPath, 'utf8'));
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

    console.log('🔗 Authorization URL:');
    console.log(authUrl);
    console.log('\n📋 Steps:');
    console.log('1. Copy and paste the URL above into your browser');
    console.log('2. Sign in with your Gmail account (stella.m@rawlings.us)');
    console.log('3. Grant the requested permissions');
    console.log('4. Copy the authorization code from the redirect URL');
    console.log('5. Paste it below when prompted\n');

    // Get authorization code from user
    const authCode = await new Promise((resolve) => {
      rl.question('Enter the authorization code: ', (code) => {
        resolve(code.trim());
      });
    });

    if (!authCode) {
      console.log('❌ No authorization code provided. Setup cancelled.');
      return;
    }

    console.log('\n🔄 Exchanging authorization code for tokens...');

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    
    console.log('✅ Tokens received successfully!');

    // Save tokens
    const tokenPath = path.join(__dirname, 'gmail-token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    
    console.log('💾 Tokens saved to gmail-token.json');

    // Update environment variables
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add or update Gmail environment variables
    const envUpdates = {
      'GMAIL_CLIENT_ID': client_id,
      'GMAIL_CLIENT_SECRET': client_secret,
      'GMAIL_REFRESH_TOKEN': tokens.refresh_token
    };

    for (const [key, value] of Object.entries(envUpdates)) {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Environment variables updated');

    // Test the connection
    console.log('\n🧪 Testing Gmail connection...');
    
    // Create a simple test
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log('✅ Gmail connection successful!');
      console.log(`📧 Email: ${profile.data.emailAddress}`);
      console.log(`📊 Messages: ${profile.data.messagesTotal}`);
      console.log(`🧵 Threads: ${profile.data.threadsTotal}`);
    } catch (error) {
      console.log('❌ Gmail connection test failed:', error.message);
      console.log('💡 Make sure you\'ve enabled the Gmail API in Google Cloud Console');
      return;
    }

    console.log('\n🎉 Gmail OAuth2 setup completed successfully!');
    console.log('\n📧 Your email persona:');
    console.log('From: Credit Control <credit-control@rawlings.us>');
    console.log('Signature: David\'s Credit Control Bot');
    console.log('\n🧪 Test the setup:');
    console.log('curl http://localhost:3001/api/test/gmail');
    console.log('curl -X POST http://localhost:3001/api/test/send-test-email \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"to":"test@example.com","subject":"Test","body":"Hello"}\'');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure gmail-oauth.json exists in the backend folder');
    console.log('2. Verify the Google Cloud project is set up correctly');
    console.log('3. Check that Gmail API is enabled in Google Cloud Console');
    console.log('4. Ensure you\'re using the correct Gmail account');
  } finally {
    rl.close();
  }
}

// Run the setup
setupGmailOAuth();
