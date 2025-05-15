// api/vercel-notifications-to-telegram.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Make sure this path is correct based on your project structure
import { sendTelegramMessage } from "../src/telegramService";

// ... (rest of the VercelWebhookPayload interface and other logic)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Already async!
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const payload = req.body; // Vercel parses JSON by default
    // ... your logic to process payload and create message ...
    const TARGET_CHAT_ID = process.env.TELEGRAM_TARGET_CHAT_ID;
    const message = "Your formatted message from Vercel payload"; // Construct this

    if (!TARGET_CHAT_ID) {
      // ... error handling ...
      return res
        .status(200)
        .send("Webhook received, but Telegram chat ID not configured.");
    }

    // Using await here is standard within an async function
    const success = await sendTelegramMessage(
      TARGET_CHAT_ID,
      message,
      "MarkdownV2" // or undefined
    );

    if (success) {
      return res.status(200).send("Notification sent to Telegram.");
    } else {
      return res.status(500).send("Failed to send Telegram notification.");
    }
  } catch (error) {
    console.error("Error processing Vercel webhook:", error);
    return res.status(500).send("Internal Server Error");
  }
}
