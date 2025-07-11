import { db } from '../db';

export async function addManagerFields() {
  console.log("Running migration: Adding manager fields to users table");
  
  try {
    // Check if is_manager column exists
    const managerExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_manager'
      );
    `);

    if (!managerExists || !managerExists.exists) {
      console.log("Adding is_manager column to users table");
      
      await db.none(`
        ALTER TABLE users
        ADD COLUMN is_manager BOOLEAN DEFAULT FALSE;
      `);
      
      console.log("is_manager column added to users table");
    } else {
      console.log("is_manager column already exists in users table");
    }

    // Check if managed_department_ids column exists
    const managedDepartmentIdsExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'managed_department_ids'
      );
    `);

    if (!managedDepartmentIdsExists || !managedDepartmentIdsExists.exists) {
      console.log("Adding managed_department_ids column to users table");
      
      await db.none(`
        ALTER TABLE users
        ADD COLUMN managed_department_ids TEXT;
      `);
      
      console.log("managed_department_ids column added to users table");
    } else {
      console.log("managed_department_ids column already exists in users table");
    }

    console.log("Manager fields migration completed successfully");
  } catch (error) {
    console.error("Manager fields migration failed:", error);
    throw error;
  }
}