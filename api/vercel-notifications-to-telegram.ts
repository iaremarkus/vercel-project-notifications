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

// --- Main Handler Function ---
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

  if (
    !timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    )
  ) {
    console.warn("Invalid signature.");
    return res.status(401).send("Invalid signature.");
  }

  let webhookPayload: VercelWebhook;
  try {
    webhookPayload = JSON.parse(rawBody.toString("utf-8")) as VercelWebhook;
  } catch (error) {
    console.error("Error parsing JSON payload:", error);
    return res.status(400).send("Invalid JSON payload.");
  }

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

  // Format the message using the new function
  const telegramMessage = formatVercelMessageForTelegram(webhookPayload);

  const success = await sendTelegramMessage(
    TARGET_CHAT_ID,
    telegramMessage, // Already escaped within formatVercelMessageForTelegram
    "MarkdownV2"
  );

  if (success) {
    return res.status(200).send("Notification sent to Telegram.");
  } else {
    return res.status(500).send("Failed to send Telegram notification.");
  }
}
