/**
 * Notification Service
 *
 * Central abstraction for sending notifications.
 * Email, SMS, and Push implementations are placeholders
 * and can be replaced with real providers later.
 */

/**
 * Generic notification sender
 */
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: Number(process.env.BREVO_PORT),
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

export const sendNotification = async ({
  type,
  recipient,
  subject,
  message,
}) => {
  console.log("================================");
  console.log(`Notification Type : ${type}`);
  console.log(`Recipient         : ${recipient}`);
  console.log(`Subject           : ${subject}`);
  console.log(`Message           : ${message}`);
  console.log("================================");

  return {
    success: true,
    message: `${type} notification queued successfully.`,
  };
};

/**
 * Email notification
 */
export const sendEmail = async (recipient, subject, message) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipient,
      subject,
      text: message,
    });

    console.log(`📧 Email sent to ${recipient}`);

    return {
      success: true,
      message: "Email sent successfully.",
    };
  } catch (error) {
    console.error(" Email sending failed:", error.message);

    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * SMS notification
 */
export const sendSMS = async (recipient, message) => {
  return sendNotification({
    type: "SMS",
    recipient,
    subject: "SMS Notification",
    message,
  });
};

/**
 * Push notification
 */
export const sendPushNotification = async (recipient, title, message) => {
  return sendNotification({
    type: "PUSH",
    recipient,
    subject: title,
    message,
  });
};
