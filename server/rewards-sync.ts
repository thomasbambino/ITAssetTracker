import { storage } from "./storage";
import type { RewardKpiSource } from "@shared/schema";
import { ZendeskSyncProvider } from "./zendesk-sync";

// Data point returned by a KPI sync provider
export interface KPIDataPoint {
  userId: number;
  metricKey: string;
  quantity: number;
  referenceId: string;
  description: string;
  periodStart: Date;
  periodEnd: Date;
}

// Abstract interface for KPI sync providers
export interface KPISyncProvider {
  fetchMetrics(source: RewardKpiSource, since: Date): Promise<KPIDataPoint[]>;
}

// Registry of sync providers by source type
const syncProviders: Record<string, KPISyncProvider> = {};

export function registerSyncProvider(type: string, provider: KPISyncProvider) {
  syncProviders[type] = provider;
}

// Register built-in providers
registerSyncProvider('zendesk', new ZendeskSyncProvider());

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
    const dataPoints = await provider.fetchMetrics(source, since);
    result.dataPointsFetched = dataPoints.length;
    result.details.push(`Fetched ${dataPoints.length} data points from ${source.type}`);

    const metrics = await storage.getRewardKpiMetricsBySource(source.id);

    for (const dp of dataPoints) {
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
