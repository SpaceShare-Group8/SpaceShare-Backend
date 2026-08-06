// src/common/utils/brevo-mailer.js
import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send email using Brevo HTTP API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - HTML body (optional)
 * @returns {Promise<Object>} - API response
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const sender = process.env.EMAIL_FROM || process.env.BREVO_USER || 'spaceshare01@gmail.com';

    console.log(`[Brevo API] Sending email to: ${to}`);
    console.log(`[Brevo API] Using API key: ${BREVO_API_KEY ? '✅ Present' : '❌ Missing'}`);

    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY environment variable is not set');
    }

    const payload = {
      sender: {
        name: 'SpaceShare',
        email: sender,
      },
      to: [
        {
          email: to,
        },
      ],
      subject: subject,
      htmlContent: html || text.replace(/\n/g, '<br />'),
      textContent: text,
    };

    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      timeout: 10000, // 10 second timeout
    });

    console.log(`[Brevo API] ✅ Email sent successfully to ${to}`);
    console.log(`[Brevo API] Message ID: ${response.data.messageId}`);

    return {
      success: true,
      messageId: response.data.messageId,
    };
  } catch (error) {
    console.error(`[Brevo API] ❌ Failed to send email to ${to}:`, error.message);
    
    if (error.response) {
      console.error('[Brevo API] Response status:', error.response.status);
      console.error('[Brevo API] Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
};

export default sendEmail;