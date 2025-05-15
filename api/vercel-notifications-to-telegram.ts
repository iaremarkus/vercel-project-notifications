import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "crypto";
import { sendTelegramMessage } from "../src/telegramService";
import { VercelWebhook } from "../types";
import { formatVercelMessageForTelegram } from "../src/formatVercelMessageForTelegram";

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

// --- Helper function to calculate SHA1 hash (like in the example) ---
function calculateSha1Hash(data: Buffer, secret: string): string {
  return createHmac("sha1", secret).update(data).digest("hex");
}

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

  // Node.js typically lowercases header names.
  const receivedSignatureHeader = req.headers["x-vercel-signature"] as string;
  if (!receivedSignatureHeader) {
    console.warn("Missing x-vercel-signature header.");
    return res.status(401).send("Signature missing.");
  }

  let rawBodyBuffer: Buffer;
  try {
    rawBodyBuffer = await getRawBody(req);
  } catch (error) {
    console.error("Error reading raw body:", error);
    return res.status(500).send("Error processing request body.");
  }

  // Calculate the expected hash (40 characters)
  const expectedHash = calculateSha1Hash(rawBodyBuffer, vercelWebhookSecret);

  // Prepare buffers for timingSafeEqual.
  // We are now assuming receivedSignatureHeader is the raw 40-char hash.
  const receivedSignatureBuffer = Buffer.from(receivedSignatureHeader, "utf-8");
  const expectedHashBuffer = Buffer.from(expectedHash, "utf-8");

  // Check lengths before timingSafeEqual. This is crucial.
  if (receivedSignatureBuffer.byteLength !== expectedHashBuffer.byteLength) {
    return res.status(401).send("Invalid signature due to length mismatch.");
  }

  // Perform the timing-safe comparison
  if (!timingSafeEqual(receivedSignatureBuffer, expectedHashBuffer)) {
    return res.status(401).send("Invalid signature.");
  }

  // --- Signature is valid, now parse the body as JSON ---
  let webhookPayload: VercelWebhook;
  try {
    webhookPayload = JSON.parse(
      rawBodyBuffer.toString("utf-8")
    ) as VercelWebhook;
  } catch (error) {
    console.error(
      "Error parsing JSON payload after signature verification:",
      error
    );
    return res.status(400).send("Invalid JSON payload.");
  }

  // --- Process the webhook and send Telegram message ---
  const TARGET_CHAT_ID = process.env.TELEGRAM_TARGET_CHAT_ID;
  if (!TARGET_CHAT_ID) {
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
