const PAYSTACK_BASE_URL = "https://api.paystack.co";

const headers = {
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Initialize a Paystack transaction
 */
export async function initializeTransaction(paymentData) {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(paymentData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to initialize Paystack transaction."
    );
  }

  return data;
}

/**
 * Verify a Paystack transaction
 */
export async function verifyTransaction(reference) {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      method: "GET",
      headers,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to verify Paystack transaction."
    );
  }

  return data;
}