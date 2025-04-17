import { db } from "../db";
import { log } from "../vite";

export async function addNotesField() {
  try {
    // Check if notes column exists
    const columnCheck = await db.oneOrNone(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'notes'
    `);
    
    if (!columnCheck) {
      log('Adding notes column to devices table');
      
      // Add notes column
      await db.none(`
        ALTER TABLE devices
        ADD COLUMN notes TEXT
      `);
      
      log('Successfully added notes column to devices table');
    } else {
      log('Notes column already exists in devices table, skipping addition');
    }
    
    return true;
  } catch (error) {
    log(`Error in notes column migration: ${error}`);
    return false;
  }
}