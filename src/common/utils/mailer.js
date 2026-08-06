// src/common/utils/mailer.js
import nodemailer from 'nodemailer';

// Initialize Nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: Number(process.env.BREVO_PORT || 587),
  secure: false, // Port 587 uses STARTTLS
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

/**
 * Sends an email via Brevo SMTP
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - Optional HTML body
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const sender = process.env.EMAIL_FROM || process.env.BREVO_USER;

    const mailOptions = {
      from: `"SpaceShare" <${sender}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[Email Error] Failed to send email:', error);
    throw error;
  }
};