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
  return sendNotification({
    type: "EMAIL",
    recipient,
    subject,
    message,
  });
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
