import type { RewardKpiSource } from "@shared/schema";
import type { KPIDataPoint, KPISyncProvider } from "./rewards-sync";
import { storage } from "./storage";

interface ZendeskConfig {
  adminEmail: string;
  fastReplyThresholdMinutes: number;
  agentEmails?: string[];   // Only track these agent emails (empty = all)
  groupIds?: number[];      // Only track tickets from these Zendesk group IDs (empty = all)
  syncStartDate?: string;   // Earliest date to sync from (YYYY-MM-DD). Overrides default "last 24h" on first sync.
}

// Cache of Zendesk agent ID -> email
const agentEmailCache = new Map<string, string>();

function buildAuthHeader(adminEmail: string, apiToken: string): string {
  const credentials = Buffer.from(`${adminEmail}/token:${apiToken}`).toString("base64");
  return `Basic ${credentials}`;
}

async function zendeskFetch(subdomain: string, path: string, authHeader: string): Promise<any> {
  const url = path.startsWith("http")
    ? path
    : `https://${subdomain}.zendesk.com${path}`;

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Zendesk API error ${res.status}: ${res.statusText} (${url})`);
  }

  return res.json();
}

async function getAgentEmail(
  subdomain: string,
  agentId: number,
  authHeader: string
): Promise<string | null> {
  const cacheKey = `${subdomain}:${agentId}`;
  if (agentEmailCache.has(cacheKey)) {
    return agentEmailCache.get(cacheKey)!;
  }

  try {
    const data = await zendeskFetch(subdomain, `/api/v2/users/${agentId}.json`, authHeader);
    const email = data.user?.email || null;
    if (email) {
      agentEmailCache.set(cacheKey, email);
    }
    return email;
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const RATE_LIMIT_DELAY = 100; // ms between requests
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ZendeskSyncProvider implements KPISyncProvider {
  async fetchMetrics(source: RewardKpiSource, since: Date): Promise<KPIDataPoint[]> {
    const subdomain = source.accountId;
    const apiToken = source.apiKey;

    if (!subdomain || !apiToken) {
      throw new Error("Zendesk source requires accountId (subdomain) and apiKey (API token)");
    }

    let config: ZendeskConfig;
    try {
      config = JSON.parse(source.config || "{}");
    } catch {
      throw new Error("Invalid JSON in source config");
    }

    if (!config.adminEmail) {
      throw new Error("Zendesk config requires adminEmail");
    }

    const thresholdMinutes = config.fastReplyThresholdMinutes || 30;
    const authHeader = buildAuthHeader(config.adminEmail, apiToken);

    // Use syncStartDate from config if this is the first sync (no lastSyncAt)
    let effectiveSince = since;
    if (!source.lastSyncAt && config.syncStartDate) {
      const parsed = new Date(config.syncStartDate);
      if (!isNaN(parsed.getTime())) {
        effectiveSince = parsed;
      }
    }
    const sinceDate = formatDate(effectiveSince);

    // Normalize filter lists
    const filterEmails = (config.agentEmails || []).map(e => e.toLowerCase().trim()).filter(Boolean);
    const filterGroupIds = (config.groupIds || []).filter(Boolean);

    const dataPoints: KPIDataPoint[] = [];
    const now = new Date();

    // Build search query with optional group filter
    let query = `type:ticket status:solved solved>=${sinceDate}`;
    if (filterGroupIds.length === 1) {
      query += ` group_id:${filterGroupIds[0]}`;
    }

    let searchUrl = `/api/v2/search.json?query=${encodeURIComponent(query)}`;

    while (searchUrl) {
      const searchData = await zendeskFetch(subdomain, searchUrl, authHeader);
      const tickets = searchData.results || [];

      for (const ticket of tickets) {
        if (!ticket.assignee_id) continue;

        // Filter by group IDs (for multiple groups, filter client-side since Zendesk search supports one)
        if (filterGroupIds.length > 1 && !filterGroupIds.includes(ticket.group_id)) continue;

        await delay(RATE_LIMIT_DELAY);

        // Get agent email and match to app user
        const agentEmail = await getAgentEmail(subdomain, ticket.assignee_id, authHeader);
        if (!agentEmail) continue;

        // Filter by agent emails if configured
        if (filterEmails.length > 0 && !filterEmails.includes(agentEmail.toLowerCase())) continue;

        const appUser = await storage.getUserByEmail(agentEmail);
        if (!appUser) continue;

        const ticketDate = new Date(ticket.solved_at || ticket.updated_at);

        // Emit tickets_solved data point
        dataPoints.push({
          userId: appUser.id,
          metricKey: "tickets_solved",
          quantity: 1,
          referenceId: `zendesk_solved_${ticket.id}`,
          description: `Solved ticket #${ticket.id}: ${ticket.subject || "No subject"}`,
          periodStart: ticketDate,
          periodEnd: ticketDate,
        });

        // Check first reply time for fast response bonus
        try {
          await delay(RATE_LIMIT_DELAY);
          const metricsData = await zendeskFetch(
            subdomain,
            `/api/v2/tickets/${ticket.id}/metrics.json`,
            authHeader
          );

          const replyTimeMinutes = metricsData.ticket_metric?.reply_time_in_minutes?.calendar;

          if (replyTimeMinutes != null && replyTimeMinutes < thresholdMinutes) {
            dataPoints.push({
              userId: appUser.id,
              metricKey: "fast_first_reply",
              quantity: 1,
              referenceId: `zendesk_frt_${ticket.id}`,
              description: `Fast first reply on ticket #${ticket.id} (${replyTimeMinutes}min)`,
              periodStart: ticketDate,
              periodEnd: ticketDate,
            });
          }
        } catch {
          // Skip metrics if unavailable for this ticket
        }
      }

      // Follow pagination
      searchUrl = searchData.next_page || null;
      if (searchUrl) {
        await delay(RATE_LIMIT_DELAY);
      }
    }

    return dataPoints;
  }
}
