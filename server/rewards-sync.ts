import { storage } from "./storage";
import type { RewardKpiSource } from "@shared/schema";

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

// Sync a single source: fetch new data points, deduplicate, and award points
async function syncSource(source: RewardKpiSource) {
  const provider = syncProviders[source.type];
  if (!provider) {
    console.log(`No sync provider registered for type: ${source.type}`);
    return;
  }

  const since = source.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours

  try {
    const dataPoints = await provider.fetchMetrics(source, since);
    const metrics = await storage.getRewardKpiMetricsBySource(source.id);

    for (const dp of dataPoints) {
      // Find the matching metric
      const metric = metrics.find(m => m.key === dp.metricKey && m.isActive);
      if (!metric) continue;

      // Deduplicate by referenceId
      const existing = await storage.getRewardPointsLogByReference(dp.referenceId);
      if (existing) continue;

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
    }

    // Update last sync timestamp
    await storage.updateRewardKpiSource(source.id, { lastSyncAt: new Date() });

    console.log(`Synced source "${source.name}": processed ${dataPoints.length} data points`);
  } catch (error) {
    console.error(`Error syncing source "${source.name}":`, error);
  }
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
export async function triggerManualSync(sourceId: number) {
  const source = await storage.getRewardKpiSourceById(sourceId);
  if (!source) {
    throw new Error('Source not found');
  }
  await syncSource(source);
}
