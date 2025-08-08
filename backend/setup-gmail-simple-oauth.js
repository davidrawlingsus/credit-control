const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupGmailSimpleOAuth() {
  try {
    console.log('🔧 Simple Gmail OAuth2 Setup');
    console.log('==============================\n');

    // Check if OAuth credentials exist
    const oauthPath = path.join(__dirname, 'gmail-oauth.json');
    if (!fs.existsSync(oauthPath)) {
      console.log('❌ gmail-oauth.json not found!');
      console.log('Please create OAuth2 credentials first.');
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

    // Generate fresh authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('🔗 Fresh Authorization URL:');
    console.log('==========================');
    console.log(authUrl);
    console.log('\n📋 Instructions:');
    console.log('1. Copy the URL above and paste it in your browser');
    console.log('2. Sign in with: stella.m@rawlings.us');
    console.log('3. Grant the requested permissions');
    console.log('4. You\'ll be redirected to: http://localhost/?code=XXXXX');
    console.log('5. Copy the code from the URL (the part after code=)');
    console.log('6. Paste it below when prompted\n');

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

    try {
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
      
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log('✅ Gmail connection successful!');
      console.log(`📧 Email: ${profile.data.emailAddress}`);
      console.log(`📊 Messages: ${profile.data.messagesTotal}`);
      console.log(`🧵 Threads: ${profile.data.threadsTotal}`);

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
      console.log('❌ Token exchange failed:', error.message);
      console.log('\n💡 This usually means:');
      console.log('1. The authorization code has expired (try again with a fresh code)');
      console.log('2. The OAuth consent screen needs to be configured');
      console.log('3. The Gmail API needs to be enabled');
      console.log('\n🔄 Try running this script again with a fresh authorization code.');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run the setup
setupGmailSimpleOAuth();
