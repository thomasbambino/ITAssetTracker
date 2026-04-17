import { db } from '../db';

export async function addRewardsSystemMigration() {
  console.log('Running migration: Adding rewards system tables');

  try {
    // 1. reward_kpi_sources
    const checkKpiSources = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_kpi_sources'
      ) as exists;
    `);

    if (!checkKpiSources.exists) {
      await db.none(`
        CREATE TABLE reward_kpi_sources (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          api_key TEXT,
          api_secret TEXT,
          account_id TEXT,
          config TEXT,
          is_active BOOLEAN DEFAULT true,
          last_sync_at TIMESTAMP,
          sync_interval_minutes INTEGER DEFAULT 60,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created reward_kpi_sources table');
    } else {
      console.log('reward_kpi_sources table already exists, skipping');
    }

    // 2. reward_kpi_metrics
    const checkKpiMetrics = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_kpi_metrics'
      ) as exists;
    `);

    if (!checkKpiMetrics.exists) {
      await db.none(`
        CREATE TABLE reward_kpi_metrics (
          id SERIAL PRIMARY KEY,
          source_id INTEGER REFERENCES reward_kpi_sources(id),
          name TEXT NOT NULL,
          key TEXT NOT NULL,
          points_per_unit INTEGER NOT NULL DEFAULT 1,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created reward_kpi_metrics table');
    } else {
      console.log('reward_kpi_metrics table already exists, skipping');
    }

    // 3. reward_points_log
    const checkPointsLog = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_points_log'
      ) as exists;
    `);

    if (!checkPointsLog.exists) {
      await db.none(`
        CREATE TABLE reward_points_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          metric_id INTEGER REFERENCES reward_kpi_metrics(id),
          points INTEGER NOT NULL,
          quantity INTEGER DEFAULT 1,
          description TEXT,
          type TEXT NOT NULL,
          reference_id TEXT,
          period_start TIMESTAMP,
          period_end TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_reward_points_log_user_id ON reward_points_log(user_id);
        CREATE INDEX idx_reward_points_log_type ON reward_points_log(type);
        CREATE INDEX idx_reward_points_log_reference_id ON reward_points_log(reference_id);
      `);
      console.log('Created reward_points_log table with indexes');
    } else {
      console.log('reward_points_log table already exists, skipping');
    }

    // 4. reward_balances
    const checkBalances = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_balances'
      ) as exists;
    `);

    if (!checkBalances.exists) {
      await db.none(`
        CREATE TABLE reward_balances (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
          total_earned INTEGER NOT NULL DEFAULT 0,
          total_redeemed INTEGER NOT NULL DEFAULT 0,
          current_balance INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_reward_balances_user_id ON reward_balances(user_id);
        CREATE INDEX idx_reward_balances_current_balance ON reward_balances(current_balance DESC);
      `);
      console.log('Created reward_balances table with indexes');
    } else {
      console.log('reward_balances table already exists, skipping');
    }

    // 5. reward_badges
    const checkBadges = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_badges'
      ) as exists;
    `);

    if (!checkBadges.exists) {
      await db.none(`
        CREATE TABLE reward_badges (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          color TEXT,
          threshold INTEGER NOT NULL,
          metric_id INTEGER REFERENCES reward_kpi_metrics(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created reward_badges table');
    } else {
      console.log('reward_badges table already exists, skipping');
    }

    // 6. reward_user_badges
    const checkUserBadges = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_user_badges'
      ) as exists;
    `);

    if (!checkUserBadges.exists) {
      await db.none(`
        CREATE TABLE reward_user_badges (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          badge_id INTEGER NOT NULL REFERENCES reward_badges(id),
          earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_reward_user_badges_user_id ON reward_user_badges(user_id);
        CREATE UNIQUE INDEX idx_reward_user_badges_unique ON reward_user_badges(user_id, badge_id);
      `);
      console.log('Created reward_user_badges table with indexes');
    } else {
      console.log('reward_user_badges table already exists, skipping');
    }

    // 7. reward_catalog
    const checkCatalog = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_catalog'
      ) as exists;
    `);

    if (!checkCatalog.exists) {
      await db.none(`
        CREATE TABLE reward_catalog (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          points_cost INTEGER NOT NULL,
          category TEXT,
          image_url TEXT,
          stock INTEGER,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created reward_catalog table');
    } else {
      console.log('reward_catalog table already exists, skipping');
    }

    // 8. reward_redemptions
    const checkRedemptions = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_redemptions'
      ) as exists;
    `);

    if (!checkRedemptions.exists) {
      await db.none(`
        CREATE TABLE reward_redemptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          catalog_item_id INTEGER NOT NULL REFERENCES reward_catalog(id),
          points_spent INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          approved_by INTEGER REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fulfilled_at TIMESTAMP
        );
        CREATE INDEX idx_reward_redemptions_user_id ON reward_redemptions(user_id);
        CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);
      `);
      console.log('Created reward_redemptions table with indexes');
    } else {
      console.log('reward_redemptions table already exists, skipping');
    }

    // 9. reward_settings
    const checkSettings = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_settings'
      ) as exists;
    `);

    if (!checkSettings.exists) {
      await db.none(`
        CREATE TABLE reward_settings (
          id SERIAL PRIMARY KEY,
          config TEXT NOT NULL DEFAULT '{}',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created reward_settings table');
    } else {
      console.log('reward_settings table already exists, skipping');
    }

    // 10. reward_raw_data — stores raw source entities (tickets, calls) for recalculation
    const checkRawData = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'reward_raw_data'
      ) as exists;
    `);

    if (!checkRawData.exists) {
      await db.none(`
        CREATE TABLE reward_raw_data (
          id SERIAL PRIMARY KEY,
          source_id INTEGER NOT NULL REFERENCES reward_kpi_sources(id) ON DELETE CASCADE,
          reference_id TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id),
          raw_payload JSONB NOT NULL,
          fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX idx_reward_raw_data_ref ON reward_raw_data(source_id, reference_id);
        CREATE INDEX idx_reward_raw_data_source ON reward_raw_data(source_id);
        CREATE INDEX idx_reward_raw_data_user ON reward_raw_data(user_id);
      `);
      console.log('Created reward_raw_data table with indexes');
    } else {
      console.log('reward_raw_data table already exists, skipping');
    }

    console.log('Rewards system migration completed successfully');
    return true;
  } catch (error) {
    console.error('Rewards system migration failed:', error);
    return false;
  }
}
