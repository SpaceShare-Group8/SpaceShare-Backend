// test-smtp.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('═══════════════════════════════════════════════');
console.log('🧪  SPACESHARE SMTP CONNECTION TEST');
console.log('═══════════════════════════════════════════════\n');

// Display configuration
console.log('📋 Current SMTP Configuration:');
console.log(`  Host: ${process.env.BREVO_HOST || '❌ Not set'}`);
console.log(`  Port: ${process.env.BREVO_PORT || '❌ Not set'}`);
console.log(`  User: ${process.env.BREVO_USER || '❌ Not set'}`);
console.log(`  Pass: ${process.env.BREVO_PASS ? '✅ Set (hidden)' : '❌ Not set'}`);
console.log(`  From: ${process.env.EMAIL_FROM || '❌ Not set'}`);
console.log('');

// Configuration
const SMTP_CONFIGS = [
  {
    name: 'Standard (STARTTLS)',
    host: process.env.BREVO_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.BREVO_PORT || 587),
    secure: false,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  },
  {
    name: 'SSL (Direct TLS)',
    host: process.env.BREVO_HOST || 'smtp-relay.brevo.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  },
  {
    name: 'Alternative Host (STARTTLS)',
    host: 'smtp.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  },
];

// Test email recipient
const TEST_EMAIL = process.env.TEST_EMAIL || 'your-email@gmail.com';

console.log(`📧 Test email will be sent to: ${TEST_EMAIL}`);
console.log('   (Change this by setting TEST_EMAIL environment variable)');
console.log('');

/**
 * Test a single SMTP configuration
 */
async function testSMTPConfig(config, index) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🔍 Testing Config ${index + 1}: ${config.name}`);
  console.log(`   Host: ${config.host}:${config.port} (secure: ${config.secure})`);
  console.log(`${'─'.repeat(50)}`);

  // Check if credentials exist
  if (!config.auth.user || !config.auth.pass) {
    console.log('❌ SKIPPED: Missing SMTP credentials (BREVO_USER or BREVO_PASS)');
    return { success: false, error: 'Missing credentials' };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 15000,
    socketTimeout: 20000,
    debug: true, // Enable debug output
  });

  try {
    console.log('⏳ Verifying connection...');
    
    // Step 1: Verify connection
    await transporter.verify();
    console.log('✅ Connection verified successfully!');

    // Step 2: Send a test email
    console.log('⏳ Sending test email...');
    
    const info = await transporter.sendMail({
      from: `"SpaceShare Test" <${process.env.EMAIL_FROM || config.auth.user}>`,
      to: TEST_EMAIL,
      subject: '🧪 SMTP Test from SpaceShare',
      text: `
        SMTP Test Results
        ════════════════
        
        Configuration: ${config.name}
        Host: ${config.host}:${config.port}
        Secure: ${config.secure}
        Time: ${new Date().toISOString()}
        
        If you received this email, your SMTP configuration is working!
        
        ✅ Test successful!
      `,
      html: `
        <h2>🧪 SMTP Test Results</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Configuration:</strong></td><td>${config.name}</td></tr>
          <tr><td><strong>Host:</strong></td><td>${config.host}:${config.port}</td></tr>
          <tr><td><strong>Secure:</strong></td><td>${config.secure}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${new Date().toISOString()}</td></tr>
        </table>
        <p style="color: green; font-weight: bold;">✅ Test successful!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated test email from SpaceShare.</p>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log(`📋 Message ID: ${info.messageId}`);
    console.log(`📋 Response: ${info.response}`);

    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Detailed error analysis
    if (error.code === 'ETIMEDOUT') {
      console.error('   💡 Connection TIMEOUT - Server cannot reach Brevo SMTP');
      console.error('   Possible causes:');
      console.error('   • Firewall blocking outbound SMTP');
      console.error('   • Network restrictions on your VPS/cloud provider');
      console.error('   • Incorrect host or port');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Connection REFUSED - Brevo server rejected connection');
      console.error('   Possible causes:');
      console.error('   • Wrong host or port');
      console.error('   • Server is down');
    } else if (error.code === 'EAUTH') {
      console.error('   💡 Authentication FAILED - Invalid credentials');
      console.error('   Possible causes:');
      console.error('   • Wrong BREVO_USER or BREVO_PASS');
      console.error('   • Account not activated');
    } else if (error.code === 'ESOCKET') {
      console.error('   💡 Socket ERROR - Network connectivity issue');
      console.error('   Possible causes:');
      console.error('   • Proxy or VPN interference');
      console.error('   • DNS resolution failed');
    }

    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting SMTP tests...\n');
  
  let successCount = 0;
  const results = [];

  // Test each configuration
  for (let i = 0; i < SMTP_CONFIGS.length; i++) {
    const result = await testSMTPConfig(SMTP_CONFIGS[i], i);
    results.push({ config: SMTP_CONFIGS[i].name, ...result });
    if (result.success) successCount++;
  }

  // Display summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log(`✅ Successful: ${successCount}/${SMTP_CONFIGS.length}`);
  console.log(`❌ Failed: ${SMTP_CONFIGS.length - successCount}/${SMTP_CONFIGS.length}\n`);

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} Config ${index + 1}: ${result.config}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '═'.repeat(50));
  
  if (successCount > 0) {
    console.log('🎉 At least one SMTP configuration worked!');
    console.log(`📧 Check your inbox at ${TEST_EMAIL}`);
  } else {
    console.log('⚠️ All SMTP configurations failed.');
    console.log('\n💡 Next Steps:');
    console.log('1. Check your Brevo credentials in .env file');
    console.log('2. Verify your Brevo account is active');
    console.log('3. Try using the Brevo API instead (requires BREVO_API_KEY)');
    console.log('4. Check if your network blocks SMTP ports');
    console.log('5. Contact Brevo support or your hosting provider');
  }
  console.log('═'.repeat(50) + '\n');
}

// Run the tests
runAllTests().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});