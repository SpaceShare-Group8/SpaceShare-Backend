// src/common/utils/mailer.js
import nodemailer from 'nodemailer';

// Initialize Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: Number(process.env.BREVO_PORT || 587),
  secure: process.env.BREVO_PORT === '465', // True for 465, false for 587/STARTTLS
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

// Optional: Verify connection configuration on startup
transporter.verify((error) => {
  if (error) {
    console.error('[Mailer Setup Error] Transporter failed to connect:', error.message);
  } else {
    console.log('[Mailer Ready] Brevo SMTP Transporter is online.');
  }
});

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

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Message ID: ${info.messageId} -> To: ${to}`);
    return info;
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error);
    throw error;
  }
};

export default sendEmail;