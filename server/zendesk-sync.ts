import type { RewardKpiSource } from "@shared/schema";
import type { KPIDataPoint, KPISyncProvider } from "./rewards-sync";
import { storage } from "./storage";

interface ZendeskConfig {
  adminEmail: string;
  fastReplyThresholdMinutes: number;
  agentEmails?: string[];   // Only track these agent emails (empty = all)
  groupIds?: number[];      // Only track tickets from these Zendesk group IDs (empty = all)
  syncStartDate?: string;   // Earliest date to sync from (YYYY-MM-DD)
  fcrLookbackDays?: number; // Days to wait before evaluating FCR (default 7)
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

const RATE_LIMIT_DELAY = 100;
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate monthly date ranges between start and end
function getMonthlyChunks(start: Date, end: Date): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = [];
  const current = new Date(start);

  while (current < end) {
    const chunkStart = formatDate(current);
    // Move to next month
    current.setMonth(current.getMonth() + 1);
    const chunkEnd = current < end ? formatDate(current) : formatDate(end);
    chunks.push({ from: chunkStart, to: chunkEnd });
  }

  return chunks;
}

// Fetch available Zendesk groups for validation
export async function fetchZendeskGroups(source: RewardKpiSource): Promise<{ id: number; name: string }[]> {
  const subdomain = source.accountId;
  const apiToken = source.apiKey;
  if (!subdomain || !apiToken) throw new Error("Missing subdomain or API token");

  let config: ZendeskConfig;
  try { config = JSON.parse(source.config || "{}"); } catch { throw new Error("Invalid config JSON"); }
  if (!config.adminEmail) throw new Error("Missing admin email");

  const authHeader = buildAuthHeader(config.adminEmail, apiToken);
  const data = await zendeskFetch(subdomain, "/api/v2/groups.json", authHeader);
  return (data.groups || []).map((g: any) => ({ id: g.id, name: g.name }));
}

export class ZendeskSyncProvider implements KPISyncProvider {
  async fetchMetrics(source: RewardKpiSource, since: Date, log?: (msg: string) => void): Promise<KPIDataPoint[]> {
    const emit = log || (() => {});
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
    const fcrLookbackDays = config.fcrLookbackDays || 7;
    const authHeader = buildAuthHeader(config.adminEmail, apiToken);

    // Use syncStartDate if configured and it's earlier than `since`
    let effectiveSince = since;
    if (config.syncStartDate) {
      const parsed = new Date(config.syncStartDate);
      if (!isNaN(parsed.getTime()) && parsed < since) {
        effectiveSince = parsed;
      }
    }

    // Normalize filter lists
    const filterEmails = (config.agentEmails || []).map(e => e.toLowerCase().trim()).filter(Boolean);
    const filterGroupIds = (config.groupIds || []).filter(Boolean);

    emit(`Config: subdomain=${subdomain}, adminEmail=${config.adminEmail}`);
    emit(`Date range: ${formatDate(effectiveSince)} → ${formatDate(new Date())}`);
    emit(`Group filter: ${filterGroupIds.length > 0 ? filterGroupIds.join(', ') : '(none — all groups)'}`);
    emit(`Agent email filter: ${filterEmails.length > 0 ? filterEmails.join(', ') : '(none — all agents)'}`);
    emit(`Fast reply threshold: ${thresholdMinutes} minutes`);
    emit(`FCR lookback: ${fcrLookbackDays} days`);

    // Fetch and log available groups for reference
    try {
      const groups = await fetchZendeskGroups(source);
      emit(`Available Zendesk groups: ${groups.map(g => `${g.name} (${g.id})`).join(', ')}`);
      if (filterGroupIds.length > 0) {
        const matchedGroups = groups.filter(g => filterGroupIds.map(String).includes(String(g.id)));
        const unmatchedIds = filterGroupIds.filter(id => !groups.find(g => String(g.id) === String(id)));
        emit(`Matched groups: ${matchedGroups.map(g => `${g.name} (${g.id})`).join(', ') || '(none!)'}`);
        if (unmatchedIds.length > 0) {
          emit(`WARNING: Group IDs not found in Zendesk: ${unmatchedIds.join(', ')}`);
        }
      }
    } catch (e: any) {
      emit(`Could not fetch group list: ${e.message}`);
    }

    const dataPoints: KPIDataPoint[] = [];
    const now = new Date();

    // Tracking for skip reasons
    let totalTicketsSeen = 0;
    let skippedNoAssignee = 0;
    let skippedGroupFilter = 0;
    let skippedNoAgentEmail = 0;
    let skippedAgentEmailFilter = 0;
    let skippedNoAppUser = 0;

    // Break into monthly chunks to avoid Zendesk's 1000-result search limit
    const chunks = getMonthlyChunks(effectiveSince, now);
    emit(`Processing ${chunks.length} monthly chunk(s)`);

    for (const chunk of chunks) {
      // Build search query for this chunk
      let query = `type:ticket status>=solved solved>=${chunk.from} solved<${chunk.to}`;
      if (filterGroupIds.length === 1) {
        query += ` group:${filterGroupIds[0]}`;
      }

      emit(`Chunk ${chunk.from} → ${chunk.to}: query="${query}"`);

      let searchUrl: string | null = `/api/v2/search.json?query=${encodeURIComponent(query)}`;
      let chunkTickets = 0;
      let pageNum = 0;

      while (searchUrl) {
        pageNum++;
        const searchData = await zendeskFetch(subdomain, searchUrl, authHeader);
        const tickets = searchData.results || [];
        const totalCount = searchData.count;

        if (pageNum === 1) {
          emit(`  Zendesk returned ${totalCount ?? '?'} total results for this chunk`);
        }

        for (const ticket of tickets) {
          totalTicketsSeen++;
          chunkTickets++;

          if (!ticket.assignee_id) {
            skippedNoAssignee++;
            continue;
          }

          // Filter by group IDs
          if (filterGroupIds.length > 0 && !filterGroupIds.map(String).includes(String(ticket.group_id))) {
            skippedGroupFilter++;
            continue;
          }

          await delay(RATE_LIMIT_DELAY);

          // Get agent email and match to app user
          const agentEmail = await getAgentEmail(subdomain, ticket.assignee_id, authHeader);
          if (!agentEmail) {
            skippedNoAgentEmail++;
            continue;
          }

          // Filter by agent emails if configured
          if (filterEmails.length > 0 && !filterEmails.includes(agentEmail.toLowerCase())) {
            skippedAgentEmailFilter++;
            continue;
          }

          const appUser = await storage.getUserByEmail(agentEmail);
          if (!appUser) {
            skippedNoAppUser++;
            emit(`  Ticket #${ticket.id}: agent ${agentEmail} not found in app users`);
            continue;
          }

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

            // SLA Resolution Time bonus (skip abandoned tickets without solved_at)
            if (ticket.solved_at) {
              const fullResolutionMinutes = metricsData.ticket_metric?.full_resolution_time_in_minutes?.calendar;
              if (fullResolutionMinutes != null) {
                if (fullResolutionMinutes <= 240) {
                  dataPoints.push({
                    userId: appUser.id,
                    metricKey: "sla_resolution_4h",
                    quantity: 1,
                    referenceId: `zendesk_sla4h_${ticket.id}`,
                    description: `SLA resolution within 4h on ticket #${ticket.id} (${fullResolutionMinutes}min)`,
                    periodStart: ticketDate,
                    periodEnd: ticketDate,
                  });
                } else if (fullResolutionMinutes <= 1440) {
                  dataPoints.push({
                    userId: appUser.id,
                    metricKey: "sla_resolution_24h",
                    quantity: 1,
                    referenceId: `zendesk_sla24h_${ticket.id}`,
                    description: `SLA resolution within 24h on ticket #${ticket.id} (${fullResolutionMinutes}min)`,
                    periodStart: ticketDate,
                    periodEnd: ticketDate,
                  });
                }
              }
            }
          } catch {
            // Skip metrics if unavailable for this ticket
          }
        }

        // Follow pagination within this chunk
        searchUrl = searchData.next_page || null;
        if (searchUrl) {
          await delay(RATE_LIMIT_DELAY);
        }
      }

      emit(`  Chunk done: ${chunkTickets} tickets processed`);
      await delay(RATE_LIMIT_DELAY);
    }

    // --- FCR (First Contact Resolution) Pass ---
    // Evaluate tickets solved 7-21 days ago to confirm no reopens
    const fcrWindowEnd = new Date(now);
    fcrWindowEnd.setDate(fcrWindowEnd.getDate() - fcrLookbackDays);
    const fcrWindowStart = new Date(now);
    fcrWindowStart.setDate(fcrWindowStart.getDate() - 21);

    emit(`--- FCR Pass ---`);
    emit(`FCR window: ${formatDate(fcrWindowStart)} → ${formatDate(fcrWindowEnd)}`);

    let fcrEvaluated = 0;
    let fcrAwarded = 0;

    const fcrChunks = getMonthlyChunks(fcrWindowStart, fcrWindowEnd);

    for (const chunk of fcrChunks) {
      let fcrQuery = `type:ticket status>=solved solved>=${chunk.from} solved<${chunk.to}`;
      if (filterGroupIds.length === 1) {
        fcrQuery += ` group:${filterGroupIds[0]}`;
      }

      let fcrSearchUrl: string | null = `/api/v2/search.json?query=${encodeURIComponent(fcrQuery)}`;

      while (fcrSearchUrl) {
        const searchData = await zendeskFetch(subdomain, fcrSearchUrl, authHeader);
        const tickets = searchData.results || [];

        for (const ticket of tickets) {
          if (!ticket.assignee_id) continue;
          if (!ticket.solved_at) continue;

          // Filter by group IDs
          if (filterGroupIds.length > 0 && !filterGroupIds.map(String).includes(String(ticket.group_id))) {
            continue;
          }

          await delay(RATE_LIMIT_DELAY);

          const agentEmail = await getAgentEmail(subdomain, ticket.assignee_id, authHeader);
          if (!agentEmail) continue;

          if (filterEmails.length > 0 && !filterEmails.includes(agentEmail.toLowerCase())) {
            continue;
          }

          const appUser = await storage.getUserByEmail(agentEmail);
          if (!appUser) continue;

          fcrEvaluated++;

          // Fetch ticket metrics to check reopens
          try {
            await delay(RATE_LIMIT_DELAY);
            const metricsData = await zendeskFetch(
              subdomain,
              `/api/v2/tickets/${ticket.id}/metrics.json`,
              authHeader
            );

            const reopens = metricsData.ticket_metric?.reopens ?? -1;
            if (reopens === 0) {
              const ticketDate = new Date(ticket.solved_at);
              dataPoints.push({
                userId: appUser.id,
                metricKey: "first_contact_resolution",
                quantity: 1,
                referenceId: `zendesk_fcr_${ticket.id}`,
                description: `First contact resolution on ticket #${ticket.id}: ${ticket.subject || "No subject"}`,
                periodStart: ticketDate,
                periodEnd: ticketDate,
              });
              fcrAwarded++;
            }
          } catch {
            // Skip if metrics unavailable
          }
        }

        fcrSearchUrl = searchData.next_page || null;
        if (fcrSearchUrl) {
          await delay(RATE_LIMIT_DELAY);
        }
      }
    }

    emit(`FCR evaluated: ${fcrEvaluated}, awarded: ${fcrAwarded}`);

    emit(`--- Summary ---`);
    emit(`Total tickets seen: ${totalTicketsSeen}`);
    emit(`Skipped (no assignee): ${skippedNoAssignee}`);
    emit(`Skipped (group filter): ${skippedGroupFilter}`);
    emit(`Skipped (agent email lookup failed): ${skippedNoAgentEmail}`);
    emit(`Skipped (agent email filter): ${skippedAgentEmailFilter}`);
    emit(`Skipped (agent not in app): ${skippedNoAppUser}`);
    emit(`Data points generated: ${dataPoints.length}`);

    return dataPoints;
  }
}
