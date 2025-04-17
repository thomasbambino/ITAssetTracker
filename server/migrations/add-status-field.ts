import { db } from '../db';

export async function addStatusField() {
  try {
    // Check if status column exists first
    const columnExists = await db.oneOrNone(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'status'
    `);
    
    if (!columnExists) {
      console.log('Adding status column to devices table...');
      await db.none(`
        ALTER TABLE devices
        ADD COLUMN status TEXT DEFAULT 'active'
      `);
      console.log('Status column added successfully');
    } else {
      console.log('Status column already exists');
    }
    return true;
  } catch (error) {
    console.error('Error adding status field:', error);
    return false;
  }
}