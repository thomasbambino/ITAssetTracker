import { storage } from "./storage";
import type { RewardKpiSource } from "@shared/schema";
import { ZendeskSyncProvider } from "./zendesk-sync";
import { ZoomSyncProvider } from "./zoom-sync";

// Data point returned by a KPI sync provider
export interface KPIDataPoint {
  userId: number;
  metricKey: string;
  quantity: number;
  referenceId: string;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  rawData?: { sourceReferenceId: string; payload: Record<string, any> };
}

// Abstract interface for KPI sync providers
export interface KPISyncProvider {
  fetchMetrics(source: RewardKpiSource, since: Date, log?: (msg: string) => void): Promise<KPIDataPoint[]>;
}

// Registry of sync providers by source type
const syncProviders: Record<string, KPISyncProvider> = {};

export function registerSyncProvider(type: string, provider: KPISyncProvider) {
  syncProviders[type] = provider;
}

// Register built-in providers
registerSyncProvider('zendesk', new ZendeskSyncProvider());
registerSyncProvider('zoom_phone', new ZoomSyncProvider());

// Result returned from a sync operation
export interface SyncResult {
  sourceName: string;
  dataPointsFetched: number;
  pointsAwarded: number;
  duplicatesSkipped: number;
  unmatchedMetrics: number;
  errors: string[];
  details: string[];
}

// Sync a single source: fetch new data points, deduplicate, and award points
async function syncSource(source: RewardKpiSource): Promise<SyncResult> {
  const result: SyncResult = {
    sourceName: source.name,
    dataPointsFetched: 0,
    pointsAwarded: 0,
    duplicatesSkipped: 0,
    unmatchedMetrics: 0,
    errors: [],
    details: [],
  };

  const provider = syncProviders[source.type];
  if (!provider) {
    result.errors.push(`No sync provider registered for type: ${source.type}`);
    return result;
  }

  const since = source.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
  result.details.push(`Syncing since: ${since.toISOString()}`);

  try {
    const logToDetails = (msg: string) => result.details.push(msg);
    const dataPoints = await provider.fetchMetrics(source, since, logToDetails);
    result.dataPointsFetched = dataPoints.length;
    result.details.push(`Fetched ${dataPoints.length} data points from ${source.type}`);

    const metrics = await storage.getRewardKpiMetricsBySource(source.id);

    for (const dp of dataPoints) {
      // Store raw data if provided (once per source entity, before dedup)
      if (dp.rawData) {
        try {
          await storage.upsertRewardRawData({
            sourceId: source.id,
            referenceId: dp.rawData.sourceReferenceId,
            userId: dp.userId,
            rawPayload: dp.rawData.payload,
          });
        } catch (err: any) {
          result.details.push(`Warning: failed to store raw data for ${dp.rawData.sourceReferenceId}: ${err.message}`);
        }
      }

      // Find the matching metric
      const metric = metrics.find(m => m.key === dp.metricKey && m.isActive);
      if (!metric) {
        result.unmatchedMetrics++;
        result.details.push(`No active metric for key "${dp.metricKey}" — skipped`);
        continue;
      }

      // Deduplicate by referenceId
      const existing = await storage.getRewardPointsLogByReference(dp.referenceId);
      if (existing) {
        result.duplicatesSkipped++;
        continue;
      }

      const points = dp.quantity * metric.pointsPerUnit;

      // Log the points
      await storage.createRewardPointsLog({
        userId: dp.userId,
        metricId: metric.id,
        points,
        quantity: dp.quantity,
        description: dp.description,
        type: 'earned',
        referenceId: dp.referenceId,
        periodStart: dp.periodStart,
        periodEnd: dp.periodEnd,
      });

      // Update balance
      await storage.updateRewardBalance(dp.userId, points, 0);

      // Check for badge eligibility
      await storage.checkAndAwardBadges(dp.userId);

      result.pointsAwarded += points;
      result.details.push(`+${points} pts to user #${dp.userId}: ${dp.description}`);
    }

    // Update last sync timestamp
    await storage.updateRewardKpiSource(source.id, { lastSyncAt: new Date() });

    console.log(`Synced source "${source.name}": ${dataPoints.length} fetched, ${result.pointsAwarded} pts awarded, ${result.duplicatesSkipped} duplicates skipped`);
  } catch (error: any) {
    const msg = error?.message || String(error);
    result.errors.push(msg);
    console.error(`Error syncing source "${source.name}":`, error);
  }

  return result;
}

// Sync all active sources
async function syncAllSources() {
  try {
    const sources = await storage.getRewardKpiSources();
    const activeSources = sources.filter(s => s.isActive);

    for (const source of activeSources) {
      // Check if enough time has passed since last sync
      if (source.lastSyncAt) {
        const minutesSinceLastSync = (Date.now() - new Date(source.lastSyncAt).getTime()) / (1000 * 60);
        if (minutesSinceLastSync < (source.syncIntervalMinutes || 60)) {
          continue;
        }
      }
      await syncSource(source);
    }
  } catch (error) {
    console.error('Error during rewards sync:', error);
  }
}

// Start the sync scheduler
let syncInterval: NodeJS.Timeout | null = null;

export function startRewardsSyncScheduler(intervalMinutes: number = 5) {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Run sync check every N minutes
  syncInterval = setInterval(syncAllSources, intervalMinutes * 60 * 1000);
  console.log(`Rewards sync scheduler started (checking every ${intervalMinutes} minutes)`);
}

export function stopRewardsSyncScheduler() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Rewards sync scheduler stopped');
  }
}

// Manual sync trigger for a specific source
export async function triggerManualSync(sourceId: number): Promise<SyncResult> {
  const source = await storage.getRewardKpiSourceById(sourceId);
  if (!source) {
    throw new Error('Source not found');
  }
  return syncSource(source);
}

// ---- Recalculation logic ----

// Metric evaluators per source type: given a raw payload, determine if a metric applies and its quantity
type MetricEvaluator = (payload: Record<string, any>, metricKey: string, config?: any) => { applies: boolean; quantity: number; description: string } | null;

const zendeskEvaluator: MetricEvaluator = (payload, metricKey, config) => {
  const ticketId = payload.ticket_id;
  const subject = payload.subject || 'No subject';
  const thresholdMinutes = config?.fastReplyThresholdMinutes || 30;

  switch (metricKey) {
    case 'tickets_solved':
      return { applies: true, quantity: 1, description: `Solved ticket #${ticketId}: ${subject}` };
    case 'fast_first_reply':
      if (payload.reply_time_minutes != null && payload.reply_time_minutes < thresholdMinutes) {
        return { applies: true, quantity: 1, description: `Fast first reply on ticket #${ticketId} (${payload.reply_time_minutes}min)` };
      }
      return null;
    case 'first_contact_resolution':
      if (payload.reopens === 0) {
        return { applies: true, quantity: 1, description: `First contact resolution on ticket #${ticketId}: ${subject}` };
      }
      return null;
    case 'sla_resolution_4h':
      if (payload.full_resolution_minutes != null && payload.full_resolution_minutes <= 240) {
        return { applies: true, quantity: 1, description: `SLA resolution within 4h on ticket #${ticketId} (${payload.full_resolution_minutes}min)` };
      }
      return null;
    case 'sla_resolution_24h':
      if (payload.full_resolution_minutes != null && payload.full_resolution_minutes > 240 && payload.full_resolution_minutes <= 1440) {
        return { applies: true, quantity: 1, description: `SLA resolution within 24h on ticket #${ticketId} (${payload.full_resolution_minutes}min)` };
      }
      return null;
    default:
      return null;
  }
};

const zoomEvaluator: MetricEvaluator = (payload, metricKey) => {
  const callId = payload.call_id;
  const calleeName = payload.callee_name || payload.caller_name || callId;
  const durationMinutes = Math.round((payload.duration_seconds / 60) * 100) / 100;

  switch (metricKey) {
    case 'calls_handled':
      return { applies: true, quantity: 1, description: `Call ${calleeName} (${durationMinutes} min)` };
    case 'call_duration':
      return { applies: true, quantity: durationMinutes, description: `Call duration: ${durationMinutes} min — ${calleeName}` };
    default:
      return null;
  }
};

const metricEvaluators: Record<string, MetricEvaluator> = {
  zendesk: zendeskEvaluator,
  zoom_phone: zoomEvaluator,
};

// Reference ID builders per source type + metric key
function buildReferenceId(sourceType: string, metricKey: string, payload: Record<string, any>): string {
  if (sourceType === 'zendesk') {
    const ticketId = payload.ticket_id;
    const keyMap: Record<string, string> = {
      tickets_solved: `zendesk_solved_${ticketId}`,
      fast_first_reply: `zendesk_frt_${ticketId}`,
      first_contact_resolution: `zendesk_fcr_${ticketId}`,
      sla_resolution_4h: `zendesk_sla4h_${ticketId}`,
      sla_resolution_24h: `zendesk_sla24h_${ticketId}`,
    };
    return keyMap[metricKey] || `zendesk_${metricKey}_${ticketId}`;
  }
  if (sourceType === 'zoom_phone') {
    const callId = payload.call_id;
    const keyMap: Record<string, string> = {
      calls_handled: `zoom_call_${callId}`,
      call_duration: `zoom_duration_${callId}`,
    };
    return keyMap[metricKey] || `zoom_${metricKey}_${callId}`;
  }
  return `${sourceType}_${metricKey}_${payload.id || Date.now()}`;
}

export async function recalculateSource(sourceId: number, metricIds?: number[]): Promise<SyncResult> {
  const source = await storage.getRewardKpiSourceById(sourceId);
  if (!source) throw new Error('Source not found');

  const result: SyncResult = {
    sourceName: source.name,
    dataPointsFetched: 0,
    pointsAwarded: 0,
    duplicatesSkipped: 0,
    unmatchedMetrics: 0,
    errors: [],
    details: [],
  };

  const evaluator = metricEvaluators[source.type];
  if (!evaluator) {
    result.errors.push(`No evaluator registered for source type: ${source.type}`);
    return result;
  }

  // Get target metrics
  let allMetrics = await storage.getRewardKpiMetricsBySource(sourceId);
  if (metricIds && metricIds.length > 0) {
    allMetrics = allMetrics.filter(m => metricIds.includes(m.id));
  }
  const activeMetrics = allMetrics.filter(m => m.isActive);
  result.details.push(`Recalculating ${activeMetrics.length} metric(s) for source "${source.name}"`);

  // Parse source config for evaluator
  let config: any = {};
  try { config = JSON.parse(source.config || '{}'); } catch {}

  // Get all raw data for this source (paginated in large batches)
  const PAGE_SIZE = 500;
  let offset = 0;
  let totalProcessed = 0;

  while (true) {
    const { data: rawRows, total } = await storage.getRewardRawDataBySource(sourceId, {
      limit: PAGE_SIZE, offset, sortBy: 'date', sortDir: 'asc',
    });

    if (offset === 0) {
      result.dataPointsFetched = total;
      result.details.push(`Found ${total} raw data rows to evaluate`);
    }

    if (rawRows.length === 0) break;

    for (const row of rawRows) {
      const payload = typeof row.rawPayload === 'string' ? JSON.parse(row.rawPayload) : row.rawPayload;

      for (const metric of activeMetrics) {
        const evalResult = evaluator(payload, metric.key, config);
        if (!evalResult || !evalResult.applies) continue;

        const referenceId = buildReferenceId(source.type, metric.key, payload);

        // Skip if already exists
        const existing = await storage.getRewardPointsLogByReference(referenceId);
        if (existing) {
          result.duplicatesSkipped++;
          continue;
        }

        if (!row.userId) {
          result.details.push(`Skipping ${referenceId}: no userId on raw data row`);
          continue;
        }

        const points = evalResult.quantity * metric.pointsPerUnit;

        // Determine period dates from raw payload
        const periodDate = new Date(payload.solved_at || payload.date_time || row.fetchedAt);

        await storage.createRewardPointsLog({
          userId: row.userId,
          metricId: metric.id,
          points,
          quantity: evalResult.quantity,
          description: evalResult.description,
          type: 'earned',
          referenceId,
          periodStart: periodDate,
          periodEnd: periodDate,
        });

        await storage.updateRewardBalance(row.userId, points, 0);
        await storage.checkAndAwardBadges(row.userId);

        result.pointsAwarded += points;
        totalProcessed++;
        result.details.push(`+${points} pts to user #${row.userId}: ${evalResult.description}`);
      }
    }

    offset += PAGE_SIZE;
    if (offset >= (result.dataPointsFetched || 0)) break;
  }

  result.details.push(`Recalculation complete: ${totalProcessed} new points entries created`);
  return result;
}

// ---- Background (async) sync support ----

export interface SyncJob {
  id: string;
  sourceId: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  result: SyncResult | null;
}

const activeSyncJobs = new Map<string, SyncJob>();

export function startBackgroundSync(sourceId: number): SyncJob {
  // Prevent duplicate syncs for the same source
  const existingJobs = Array.from(activeSyncJobs.values());
  const running = existingJobs.find(j => j.sourceId === sourceId && j.status === 'running');
  if (running) {
    return running;
  }

  const jobId = `sync_${sourceId}_${Date.now()}`;
  const job: SyncJob = {
    id: jobId,
    sourceId,
    status: 'running',
    startedAt: Date.now(),
    result: null,
  };
  activeSyncJobs.set(jobId, job);

  // Run sync in background (fire-and-forget)
  triggerManualSync(sourceId)
    .then((result) => {
      job.status = 'completed';
      job.result = result;
    })
    .catch((error) => {
      job.status = 'failed';
      job.result = {
        sourceName: `Source #${sourceId}`,
        dataPointsFetched: 0,
        pointsAwarded: 0,
        duplicatesSkipped: 0,
        unmatchedMetrics: 0,
        errors: [error?.message || String(error)],
        details: [],
      };
    });

  return job;
}

export function startBackgroundRecalculation(sourceId: number, metricIds?: number[]): SyncJob {
  const jobId = `recalc_${sourceId}_${Date.now()}`;
  const job: SyncJob = {
    id: jobId,
    sourceId,
    status: 'running',
    startedAt: Date.now(),
    result: null,
  };
  activeSyncJobs.set(jobId, job);

  recalculateSource(sourceId, metricIds)
    .then((result) => {
      job.status = 'completed';
      job.result = result;
    })
    .catch((error) => {
      job.status = 'failed';
      job.result = {
        sourceName: `Source #${sourceId}`,
        dataPointsFetched: 0,
        pointsAwarded: 0,
        duplicatesSkipped: 0,
        unmatchedMetrics: 0,
        errors: [error?.message || String(error)],
        details: [],
      };
    });

  return job;
}

export function getSyncJob(jobId: string): SyncJob | undefined {
  return activeSyncJobs.get(jobId);
}

// Clean up old completed jobs after 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  Array.from(activeSyncJobs.entries()).forEach(([id, job]) => {
    if (job.status !== 'running' && job.startedAt < cutoff) {
      activeSyncJobs.delete(id);
    }
  });
}, 60 * 1000);
