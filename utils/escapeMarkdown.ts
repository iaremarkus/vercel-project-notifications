// src/telegramService.ts or a shared utils.ts

// (sendTelegramMessage function and other interfaces remain here)

/**
 * Escapes special characters in a string for Telegram MarkdownV2.
 * @param text The text to escape.
 * @returns The escaped text, or an empty string if input is null/undefined.
 */
export const escapeMarkdown = (text: string | undefined | null): string => {
  if (text === undefined || text === null) {
    return "";
  }
  const charsToEscape = /[_*[\]()~`>#+\-=|{}.!]/g;
  // Important: The replacement string must also escape backslashes if they are part of the replacement pattern.
  // Here, we are replacing a character (e.g., '*') with its escaped version (e.g., '\*').
  // The `$&` in the replacement string means "insert the whole matched string here".
  return text.replace(charsToEscape, "\\$&");
};
