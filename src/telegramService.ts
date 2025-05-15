// src/telegramService.ts

// It's best practice to store your bot token as an environment variable
const BOT_TOKEN: string | undefined = process.env.TELEGRAM_BOT_TOKEN;

interface SendMessagePayload {
  chat_id: string | number;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
  // Add other optional sendMessage parameters here if needed
}

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * Sends a message to a specific Telegram chat_id using a bot token via native fetch.
 * @param chatId The chat_id of the target user.
 * @param messageText The message text to send.
 * @param parseMode Optional: "MarkdownV2" or "HTML" for formatting.
 * @returns True if the message was sent successfully, false otherwise.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  messageText: string,
  parseMode?: "MarkdownV2" | "HTML"
): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error("Error: TELEGRAM_BOT_TOKEN environment variable not set.");
    return false;
  }

  const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload: SendMessagePayload = {
    chat_id: chatId,
    text: messageText,
  };

  if (parseMode) {
    payload.parse_mode = parseMode;
  }

  try {
    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // fetch does not throw on HTTP errors, so we check response.ok
    if (!response.ok) {
      // Try to parse the error response from Telegram
      let errorData: TelegramResponse | null = null;
      try {
        errorData = (await response.json()) as TelegramResponse;
      } catch (jsonError) {
        // If parsing error response fails, use status text
        console.error(
          `Telegram API Error for chat_id ${chatId}: HTTP ${response.status} - ${response.statusText}. Failed to parse error response body.`
        );
        return false;
      }
      console.error(
        `Telegram API Error for chat_id ${chatId}: HTTP ${response.status} - ${
          errorData?.description || response.statusText
        }`
      );
      return false;
    }

    const responseData = (await response.json()) as TelegramResponse;
    if (responseData.ok) {
      console.log(
        `Message sent successfully to chat_id ${chatId}:`,
        responseData.result
      );
      return true;
    } else {
      // This case might be redundant if !response.ok already caught it,
      // but good for explicit check of Telegram's 'ok' field.
      console.error(
        `Telegram API reported not OK for chat_id ${chatId}: ${responseData.description}`
      );
      return false;
    }
  } catch (error) {
    // This catch block will now primarily handle network errors or issues with fetch itself
    console.error(
      `Network or fetch error sending Telegram message to chat_id ${chatId}:`,
      error
    );
    return false;
  }
}

// The rest of your webhook handler logic (handleWebhook, getChatIdForUser)
// would remain the same, as it just calls sendTelegramMessage.
// The Vercel handler function is already async, so await works fine within it.
