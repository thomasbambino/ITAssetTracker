import { db } from '../db';

export async function addTwoFactorAuthFields() {
  console.log("Running migration: Adding 2FA fields to users table");
  
  try {
    // Check if two_factor_secret column exists
    const secretExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'two_factor_secret'
      );
    `);

    if (!secretExists || !secretExists.exists) {
      console.log("Adding two_factor_secret column to users table");
      
      await db.none(`
        ALTER TABLE users
        ADD COLUMN two_factor_secret TEXT;
      `);
      
      console.log("two_factor_secret column added to users table");
    } else {
      console.log("two_factor_secret column already exists in users table");
    }

    // Check if two_factor_enabled column exists
    const enabledExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'two_factor_enabled'
      );
    `);

    if (!enabledExists || !enabledExists.exists) {
      console.log("Adding two_factor_enabled column to users table");
      
      await db.none(`
        ALTER TABLE users
        ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
      `);
      
      console.log("two_factor_enabled column added to users table");
    } else {
      console.log("two_factor_enabled column already exists in users table");
    }

    // Check if two_factor_backup_codes column exists
    const backupCodesExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'two_factor_backup_codes'
      );
    `);

    if (!backupCodesExists || !backupCodesExists.exists) {
      console.log("Adding two_factor_backup_codes column to users table");
      
      await db.none(`
        ALTER TABLE users
        ADD COLUMN two_factor_backup_codes TEXT;
      `);
      
      console.log("two_factor_backup_codes column added to users table");
    } else {
      console.log("two_factor_backup_codes column already exists in users table");
    }

    console.log("2FA migration completed successfully");
  } catch (error) {
    console.error("2FA migration failed:", error);
    throw error;
  }
}