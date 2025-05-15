import { VercelWebhook } from "../types";
import { escapeMarkdown } from "../utils/escapeMarkdown";

export function formatVercelMessageForTelegram(webhook: VercelWebhook): string {
  const { type, payload, createdAt } = webhook;
  const projectName = escapeMarkdown(
    payload.deployment?.name || payload.project?.name || "N/A"
  );
  const deploymentUrl = payload.deployment?.url;
  const inspectorUrl =
    payload.deployment?.inspectorUrl || payload.attack?.inspectorUrl;

  let messageLines: string[] = [];
  const titlePrefix = `🔔 *Vercel Notification*`;

  const addCommonDetails = (lines: string[], customTitle?: string) => {
    lines.push(customTitle || titlePrefix);
    lines.push(`*Project:* ${projectName}`);
    if (deploymentUrl) {
      lines.push(
        `*Deployment URL:* [${escapeMarkdown(deploymentUrl)}](${escapeMarkdown(
          deploymentUrl
        )})`
      );
    }
    if (inspectorUrl) {
      lines.push(
        `*Details:* [View on Vercel](${escapeMarkdown(inspectorUrl)})`
      );
    }
    const date = new Date(createdAt).toLocaleString();
    lines.push(`*Time:* \`${escapeMarkdown(date)}\``);
  };

  switch (type) {
    case "deployment.created":
      addCommonDetails(messageLines, `🚀 *Deployment Created*`);
      if (payload.deployment?.meta?.githubCommitRef) {
        messageLines.push(
          `*Branch:* \`${escapeMarkdown(
            payload.deployment.meta.githubCommitRef
          )}\``
        );
      }
      if (payload.deployment?.meta?.githubCommitAuthorName) {
        messageLines.push(
          `*Author:* \`${escapeMarkdown(
            payload.deployment.meta.githubCommitAuthorName
          )}\``
        );
      }
      break;

    case "deployment.succeeded":
      addCommonDetails(messageLines, `✅ *Deployment Succeeded*`);
      if (payload.deployment?.target === "production") {
        messageLines.push(`🎯 *Target:* \`PRODUCTION\``);
      }
      if (payload.deployment?.alias && payload.deployment.alias.length > 0) {
        messageLines.push(
          `*Domains:* ${payload.deployment.alias
            .map((a) => `\`${escapeMarkdown(a)}\``)
            .join(", ")}`
        );
      }
      if (payload.deployment?.meta?.githubCommitRef) {
        messageLines.push(
          `*Branch:* \`${escapeMarkdown(
            payload.deployment.meta.githubCommitRef
          )}\``
        );
      }
      break;

    case "deployment.error":
      addCommonDetails(messageLines, `❌ *Deployment Error*`);
      const errorMessage = escapeMarkdown(
        payload.error?.message ||
          payload.deployment?.errorMessage ||
          "No specific error message provided."
      );
      const errorCode = escapeMarkdown(payload.error?.code);
      messageLines.push(`*Error:* ${errorMessage}`);
      if (errorCode) {
        messageLines.push(`*Code:* \`${errorCode}\``);
      }
      break;

    case "deployment.canceled":
      addCommonDetails(messageLines, `🚫 *Deployment Canceled*`);
      break;

    case "deployment.promoted": // Note: Vercel might send this as a 'deployment.succeeded' with target: 'production'
      addCommonDetails(messageLines, `🌟 *Deployment Promoted to Production*`);
      if (payload.deployment?.alias && payload.deployment.alias.length > 0) {
        messageLines.push(
          `*Production Domains:* ${payload.deployment.alias
            .map((a) => `\`${escapeMarkdown(a)}\``)
            .join(", ")}`
        );
      }
      // You might want to add more specific info if the payload for "deployment.promoted" has it
      break;

    case "project.created":
      messageLines.push(`🎉 *Project Created*`);
      messageLines.push(`*Project Name:* ${projectName}`);
      messageLines.push(
        `*Time:* \`${escapeMarkdown(new Date(createdAt).toLocaleString())}\``
      );
      // Add user who created it if available in payload.userId or a specific field
      break;

    case "project.removed":
      messageLines.push(`🗑️ *Project Removed*`);
      messageLines.push(`*Project Name:* ${projectName}`);
      messageLines.push(
        `*Time:* \`${escapeMarkdown(new Date(createdAt).toLocaleString())}\``
      );
      break;

    case "attack.detected":
      messageLines.push(`🛡️ *Security Attack Detected*`);
      messageLines.push(
        `*Project/Target:* ${escapeMarkdown(
          payload.attack?.target || projectName
        )}`
      );
      messageLines.push(
        `*Attack Type:* \`${escapeMarkdown(payload.attack?.type)}\``
      );
      messageLines.push(
        `*Description:* ${escapeMarkdown(payload.attack?.description)}`
      );
      if (payload.attack?.source) {
        messageLines.push(
          `*Source:* \`${escapeMarkdown(payload.attack.source)}\``
        );
      }
      if (inspectorUrl) {
        // Already handled by addCommonDetails if present
        // messageLines.push(`*Details:* [View on Vercel](${escapeMarkdown(inspectorUrl)})`);
      }
      messageLines.push(
        `*Time:* \`${escapeMarkdown(new Date(createdAt).toLocaleString())}\``
      );
      break;

    default:
      addCommonDetails(messageLines, `ℹ️ *Vercel Notification*`);
      messageLines.push(`*Event Type:* \`${escapeMarkdown(type)}\``);
      messageLines.push(
        `_Raw payload logged for unhandled event type. Please check server logs._`
      );
      console.log(
        "Unhandled Vercel event type:",
        type,
        JSON.stringify(payload, null, 2)
      );
  }
  return messageLines.join("\n");
}
