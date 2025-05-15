export interface VercelWebhook {
  id: string; // Event ID
  type: string; // The event type, e.g., "deployment.succeeded"
  createdAt: number; // Timestamp of the event
  userId: string;
  teamId?: string | null;
  payload: {
    // Common for deployment events
    deployment?: {
      id: string;
      name: string; // Project name
      url: string; // Unique deployment URL (e.g., project-git-branch-team.vercel.app)
      state?: string; // READY, ERROR, CANCELED, BUILDING, QUEUED
      target?: "production" | "staging" | null;
      alias?: string[]; // Actual domains assigned (e.g., myapp.com)
      meta?: {
        githubCommitAuthorName?: string;
        githubCommitMessage?: string;
        githubCommitRef?: string; // branch
        githubCommitSha?: string;
        // ... other git metadata
      };
      inspectorUrl?: string; // Link to deployment details on Vercel dashboard
      errorMessage?: string; // For deployment.error
    };
    // Common for project events
    project?: {
      id: string;
      name: string;
    };
    // For deployment.error (sometimes error details are here)
    error?: {
      code?: string;
      message?: string;
      [key: string]: any;
    };
    // For attack.detected
    attack?: {
      type: string; // e.g., "DDOS", "WAF_BLOCK"
      description: string;
      source?: string; // e.g., IP address
      target: string; // e.g., domain or project name
      mitigation?: string;
      inspectorUrl?: string; // Link to attack details on Vercel dashboard
    };
    // For deployment.promoted (Vercel might send this as a 'deployment' event
    // where target is 'production' and state is 'READY'.
    // If 'deployment.promoted' is a distinct type, its payload might differ.
    // This structure assumes it's similar to a successful deployment but emphasizes promotion.
    // You might need to adjust based on actual payloads for "deployment.promoted".
    promotedAlias?: string[]; // Guessed: new production aliases
    previousAliases?: string[]; // Guessed: old production aliases

    // Allow other properties
    [key: string]: any;
  };
}

export interface SendMessagePayload {
  chat_id: string | number;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
  // Add other optional sendMessage parameters here if needed
}

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}
