import db from '../db';

export async function addSitesTableMigration() {
  console.log('Running migration: Adding sites table and siteId to devices table');
  
  try {
    // Check if the sites table already exists
    const checkSitesTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sites'
      );
    `);
    
    if (!checkSitesTable.rows[0].exists) {
      // Create the sites table
      await db.query(`
        CREATE TABLE sites (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          address TEXT,
          city TEXT,
          state TEXT,
          zip_code TEXT,
          country TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Created sites table');
    } else {
      console.log('Sites table already exists, skipping creation');
    }
    
    // Check if siteId column exists in devices table
    const checkSiteIdColumn = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'site_id'
      );
    `);
    
    if (!checkSiteIdColumn.rows[0].exists) {
      // Add siteId column to devices table
      await db.query(`
        ALTER TABLE devices 
        ADD COLUMN site_id INTEGER REFERENCES sites(id);
      `);
      console.log('Added site_id column to devices table');
    } else {
      console.log('site_id column already exists in devices table, skipping addition');
    }
    
    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}