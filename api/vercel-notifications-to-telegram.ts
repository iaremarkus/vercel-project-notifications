import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "crypto";
import { sendTelegramMessage } from "../src/telegramService"; // Adjust path
import { VercelWebhook } from "../types";
import { formatVercelMessageForTelegram } from "../src/formatVercelMessageForTelegram";

// --- Configuration to disable default body parsing ---
// This allows us to access the raw request body for signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Helper function to get the raw request body ---
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// --- Vercel Webhook Payload Interface (customize as needed) ---

// api/vercel-notifications-to-telegram.ts
// ... (other imports and functions like getRawBody, VercelWebhook interface, etc.)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const vercelWebhookSecret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!vercelWebhookSecret) {
    console.error("VERCEL_WEBHOOK_SECRET is not set.");
    return res.status(500).send("Internal server configuration error.");
  }

  const signatureHeader = req.headers["x-vercel-signature"] as string;
  if (!signatureHeader) {
    console.warn("Missing x-vercel-signature header.");
    return res.status(401).send("Signature missing.");
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (error) {
    console.error("Error reading raw body:", error);
    return res.status(500).send("Error processing request body.");
  }

  const expectedSignature = `sha1=${createHmac("sha1", vercelWebhookSecret)
    .update(rawBody)
    .digest("hex")}`;

  // --- START DEBUG LOGS ---
  console.log(
    `Received x-vercel-signature header: '${signatureHeader}' (Length: ${signatureHeader.length})`
  );
  console.log(
    `Calculated expected signature: '${expectedSignature}' (Length: ${expectedSignature.length})`
  );

  const signatureHeaderBuffer = Buffer.from(signatureHeader);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  console.log(
    `Signature Header Buffer Length: ${signatureHeaderBuffer.byteLength}`
  );
  console.log(
    `Expected Signature Buffer Length: ${expectedSignatureBuffer.byteLength}`
  );
  // --- END DEBUG LOGS ---

  if (signatureHeaderBuffer.byteLength !== expectedSignatureBuffer.byteLength) {
    console.error(
      "Signature buffers have different byte lengths. Cannot use timingSafeEqual."
    );
    // This log helps confirm the direct cause of the RangeError before timingSafeEqual is even called.
    // However, timingSafeEqual itself throws the error if lengths are different.
    // The primary purpose of the logs above is to see *why* they are different.
    return res.status(401).send("Invalid signature due to length mismatch.");
  }

  if (
    !timingSafeEqual(
      signatureHeaderBuffer, // Use the buffer directly
      expectedSignatureBuffer // Use the buffer directly
    )
  ) {
    console.warn("Invalid signature (timingSafeEqual failed).");
    return res.status(401).send("Invalid signature.");
  }

  // ... rest of your code (parsing JSON, sending Telegram message)
  let webhookPayload: VercelWebhook;
  try {
    webhookPayload = JSON.parse(rawBody.toString("utf-8")) as VercelWebhook;
  } catch (error) {
    console.error("Error parsing JSON payload:", error);
    return res.status(400).send("Invalid JSON payload.");
  }

  // ... (formatVercelMessageForTelegram and sendTelegramMessage calls)
  console.log(
    "Received valid Vercel webhook:",
    JSON.stringify(webhookPayload, null, 2)
  );

  const TARGET_CHAT_ID = process.env.TELEGRAM_TARGET_CHAT_ID;
  if (!TARGET_CHAT_ID) {
    console.error("TELEGRAM_TARGET_CHAT_ID environment variable not set.");
    return res
      .status(200)
      .send("Webhook received, but Telegram chat ID not configured.");
  }

  const telegramMessage = formatVercelMessageForTelegram(webhookPayload);

  const success = await sendTelegramMessage(
    TARGET_CHAT_ID,
    telegramMessage,
    "MarkdownV2"
  );

  if (success) {
    return res.status(200).send("Notification sent to Telegram.");
  } else {
    return res.status(500).send("Failed to send Telegram notification.");
  }
}
