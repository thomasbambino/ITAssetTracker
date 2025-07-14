// Migration to add applicationUrl field to branding_settings table

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addApplicationUrlToBranding() {
  const client = await pool.connect();
  
  try {
    console.log('Running migration: Adding applicationUrl to branding_settings table');
    
    // Check if applicationUrl column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'branding_settings' 
      AND column_name = 'application_url'
    `);
    
    if (checkColumn.rows.length === 0) {
      // Add the applicationUrl column
      await client.query(`
        ALTER TABLE branding_settings 
        ADD COLUMN application_url TEXT
      `);
      console.log('✓ Added application_url column to branding_settings table');
    } else {
      console.log('application_url column already exists in branding_settings table, skipping addition');
    }
    
    console.log('Application URL migration completed successfully');
  } catch (error) {
    console.error('Error during application URL migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { addApplicationUrlToBranding };