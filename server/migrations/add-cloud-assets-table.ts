import { db } from '../db';

export async function addCloudAssetsTableMigration() {
  console.log('Running migration: Adding cloud_assets table');

  try {
    // Check if the cloud_assets table already exists
    const checkCloudAssetsTable = await db.one(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'cloud_assets'
      ) as exists;
    `);

    if (!checkCloudAssetsTable.exists) {
      // Create the cloud_assets table
      await db.none(`
        CREATE TABLE cloud_assets (
          id SERIAL PRIMARY KEY,
          resource_name TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          subscription_id TEXT,
          resource_group TEXT,
          region TEXT,
          site_id INTEGER REFERENCES sites(id),
          status TEXT DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created cloud_assets table');

      // Create index on site_id for faster lookups
      await db.none(`
        CREATE INDEX idx_cloud_assets_site_id ON cloud_assets(site_id);
      `);
      console.log('Created index on site_id');
    } else {
      console.log('cloud_assets table already exists, skipping creation');
    }

    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}
