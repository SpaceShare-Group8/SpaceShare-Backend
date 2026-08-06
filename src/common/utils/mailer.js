// src/common/utils/mailer.js
import nodemailer from 'nodemailer';

// Initialize Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: Number(process.env.BREVO_PORT || 587),
  secure: false, // True for 465, false for 587/STARTTLS
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
  // Add connection timeout and logger for more visibility
  connectionTimeout: 5000, // 5 seconds
});

// Remove the transporter.verify() call here.
// Instead, rely on sendEmail to handle errors.

/**
 * Sends an email via Brevo SMTP
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - Optional HTML body
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const sender = process.env.EMAIL_FROM || process.env.BREVO_USER;

    const mailOptions = {
      from: `"SpaceShare" <${sender}>`,
      to,
      subject,
      text,
      html: html || text, // Fallback HTML to text if not provided
    };

    // Add logging before sending
    console.log(`[Email] Attempting to send to ${to} via ${process.env.BREVO_HOST}:${process.env.BREVO_PORT}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Message ID: ${info.messageId} -> To: ${to}`);
    return info;
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error);
    // Log the specific error to understand why it's failing
    if (error.code === 'ETIMEDOUT') {
      console.error('🚨 Connection timeout: Check if your server can reach smtp-relay.brevo.com on port 587.');
    }
    throw error; // Re-throw to be handled by the caller
  }
};

export default sendEmail;