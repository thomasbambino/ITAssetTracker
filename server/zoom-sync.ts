import type { RewardKpiSource } from "@shared/schema";
import type { KPIDataPoint, KPISyncProvider } from "./rewards-sync";
import { storage } from "./storage";

interface ZoomConfig {
  agentEmails?: string[];       // Optional filter (empty = all)
  syncStartDate?: string;       // YYYY-MM-DD
  callDirection?: 'inbound' | 'outbound' | 'all'; // Default: 'all'
  minDurationSeconds?: number;  // Skip very short calls (default: 0)
  // OAuth tokens stored after authorization
  zoomAccessToken?: string;
  zoomRefreshToken?: string;
  zoomTokenExpiresAt?: number;  // epoch ms
}

// Exchange authorization code for tokens
export async function exchangeZoomCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom OAuth token exchange error ${res.status}: ${text}`);
  }

  return res.json();
}

// Refresh an access token using a refresh token
async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom token refresh error ${res.status}: ${text}`);
  }

  return res.json();
}

// Get a valid access token, refreshing if needed, and persist updated tokens
async function getValidToken(source: RewardKpiSource, config: ZoomConfig, emit: (msg: string) => void): Promise<string> {
  const clientId = source.apiKey;
  const clientSecret = source.apiSecret;

  if (!clientId || !clientSecret) {
    throw new Error("Zoom source missing Client ID or Client Secret");
  }

  if (!config.zoomRefreshToken) {
    throw new Error("Zoom source not authorized. Click 'Authorize with Zoom' in the source settings.");
  }

  // Check if current token is still valid (with 60s buffer)
  if (config.zoomAccessToken && config.zoomTokenExpiresAt && Date.now() < config.zoomTokenExpiresAt - 60_000) {
    return config.zoomAccessToken;
  }

  // Refresh the token
  emit("Refreshing OAuth token...");
  const tokenData = await refreshAccessToken(clientId, clientSecret, config.zoomRefreshToken);

  // Update config with new tokens
  config.zoomAccessToken = tokenData.access_token;
  config.zoomRefreshToken = tokenData.refresh_token;
  config.zoomTokenExpiresAt = Date.now() + tokenData.expires_in * 1000;

  // Persist updated tokens back to the source
  await storage.updateRewardKpiSource(source.id, {
    config: JSON.stringify(config),
  });

  emit("OAuth token refreshed and saved");
  return tokenData.access_token;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const RATE_LIMIT_DELAY = 200;
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate monthly date ranges between start and end
function getMonthlyChunks(start: Date, end: Date): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = [];
  const current = new Date(start);

  while (current < end) {
    const chunkStart = formatDate(current);
    current.setMonth(current.getMonth() + 1);
    const chunkEnd = current < end ? formatDate(current) : formatDate(end);
    chunks.push({ from: chunkStart, to: chunkEnd });
  }

  return chunks;
}

export class ZoomSyncProvider implements KPISyncProvider {
  async fetchMetrics(source: RewardKpiSource, since: Date, log?: (msg: string) => void): Promise<KPIDataPoint[]> {
    const emit = log || (() => {});

    let config: ZoomConfig;
    try {
      config = JSON.parse(source.config || "{}");
    } catch {
      throw new Error("Invalid JSON in source config");
    }

    const callDirection = config.callDirection || 'all';
    const minDuration = config.minDurationSeconds || 0;

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

    emit(`Config: callDirection=${callDirection}, minDuration=${minDuration}s`);
    emit(`Date range: ${formatDate(effectiveSince)} → ${formatDate(new Date())}`);
    emit(`Agent email filter: ${filterEmails.length > 0 ? filterEmails.join(', ') : '(none — all agents)'}`);

    // Get valid OAuth token (refresh if needed)
    const token = await getValidToken(source, config, emit);
    emit(`OAuth token ready`);

    const dataPoints: KPIDataPoint[] = [];
    const now = new Date();

    // Tracking for skip reasons
    let totalCallsSeen = 0;
    let skippedDirection = 0;
    let skippedNotAnswered = 0;
    let skippedTooShort = 0;
    let skippedNoEmail = 0;
    let skippedEmailFilter = 0;
    let skippedNoAppUser = 0;

    // Break into monthly chunks
    const chunks = getMonthlyChunks(effectiveSince, now);
    emit(`Processing ${chunks.length} monthly chunk(s)`);

    for (const chunk of chunks) {
      emit(`Chunk ${chunk.from} → ${chunk.to}`);
      let nextPageToken: string | null = null;
      let pageNum = 0;

      do {
        pageNum++;
        const params = new URLSearchParams({
          from: chunk.from,
          to: chunk.to,
          page_size: '300',
        });
        if (nextPageToken) {
          params.set('next_page_token', nextPageToken);
        }

        const url = `https://api.zoom.us/v2/phone/call_history?${params.toString()}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Zoom API error ${res.status}: ${text}`);
        }

        const data = await res.json();
        const calls = data.call_logs || [];
        nextPageToken = data.next_page_token || null;

        if (pageNum === 1) {
          emit(`  Page 1: ${calls.length} calls returned${data.total_records ? ` (${data.total_records} total)` : ''}`);
        }

        for (const call of calls) {
          totalCallsSeen++;

          // Filter by direction
          if (callDirection !== 'all') {
            const dir = (call.direction || '').toLowerCase();
            if (dir !== callDirection) {
              skippedDirection++;
              continue;
            }
          }

          // Only count answered calls
          const result = (call.result || call.call_result || '').toLowerCase();
          if (result !== 'call connected' && result !== 'answered' && result !== 'connected') {
            // Also check if duration > 0 as a fallback for "answered"
            if (!call.duration || parseInt(call.duration) <= 0) {
              skippedNotAnswered++;
              continue;
            }
          }

          // Filter by minimum duration
          const durationSeconds = parseInt(call.duration) || 0;
          if (durationSeconds < minDuration) {
            skippedTooShort++;
            continue;
          }

          // Get agent email from call owner
          const agentEmail = (call.owner?.email || call.callee_email || call.caller_email || '').toLowerCase();
          if (!agentEmail) {
            skippedNoEmail++;
            continue;
          }

          // Filter by agent emails if configured
          if (filterEmails.length > 0 && !filterEmails.includes(agentEmail)) {
            skippedEmailFilter++;
            continue;
          }

          // Match to app user
          const appUser = await storage.getUserByEmail(agentEmail);
          if (!appUser) {
            skippedNoAppUser++;
            emit(`  Call ${call.id}: agent ${agentEmail} not found in app users`);
            continue;
          }

          const callDate = new Date(call.date_time || call.start_time);
          const callId = call.id || call.call_id;
          const durationMinutes = Math.round((durationSeconds / 60) * 100) / 100; // Round to 2 decimal places

          // Emit calls_handled data point
          dataPoints.push({
            userId: appUser.id,
            metricKey: "calls_handled",
            quantity: 1,
            referenceId: `zoom_call_${callId}`,
            description: `Call ${callDirection !== 'all' ? callDirection + ' ' : ''}${call.callee_name || call.caller_name || callId} (${durationMinutes} min)`,
            periodStart: callDate,
            periodEnd: callDate,
          });

          // Emit call_duration data point
          dataPoints.push({
            userId: appUser.id,
            metricKey: "call_duration",
            quantity: durationMinutes,
            referenceId: `zoom_duration_${callId}`,
            description: `Call duration: ${durationMinutes} min — ${call.callee_name || call.caller_name || callId}`,
            periodStart: callDate,
            periodEnd: callDate,
          });
        }

        if (nextPageToken) {
          await delay(RATE_LIMIT_DELAY);
        }
      } while (nextPageToken);

      emit(`  Chunk done: page(s) processed = ${pageNum}`);
      await delay(RATE_LIMIT_DELAY);
    }

    emit(`--- Summary ---`);
    emit(`Total calls seen: ${totalCallsSeen}`);
    emit(`Skipped (direction filter): ${skippedDirection}`);
    emit(`Skipped (not answered): ${skippedNotAnswered}`);
    emit(`Skipped (too short): ${skippedTooShort}`);
    emit(`Skipped (no email): ${skippedNoEmail}`);
    emit(`Skipped (email filter): ${skippedEmailFilter}`);
    emit(`Skipped (agent not in app): ${skippedNoAppUser}`);
    emit(`Data points generated: ${dataPoints.length}`);

    return dataPoints;
  }
}
