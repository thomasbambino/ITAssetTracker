import { db } from '../db';

export async function addSoftwareUrlField() {
  try {
    // Check if url column exists in software table
    const columnExists = await db.oneOrNone(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'software' AND column_name = 'url'
    `);
    
    if (!columnExists) {
      console.log('Adding url column to software table...');
      await db.none(`
        ALTER TABLE software
        ADD COLUMN url TEXT
      `);
      console.log('URL column added successfully to software table');
    } else {
      console.log('URL column already exists in software table');
    }
    return true;
  } catch (error) {
    console.error('Error adding software URL field:', error);
    return false;
  }
}