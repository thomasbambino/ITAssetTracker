import { db } from '../db';

export async function addDepartmentsTable() {
  console.log("Running migration: Adding departments table");
  
  try {
    // Check if departments table exists
    const tableExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'departments'
      );
    `);

    if (!tableExists || !tableExists.exists) {
      console.log("Creating departments table");
      
      await db.none(`
        CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          manager TEXT,
          budget INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      console.log("Departments table created successfully");
    } else {
      console.log("Departments table already exists, skipping creation");
    }

    // Check if the updated_at column exists
    const updatedAtExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'departments'
        AND column_name = 'updated_at'
      );
    `);

    if (!updatedAtExists || !updatedAtExists.exists) {
      console.log("Adding updated_at column to departments table");
      
      await db.none(`
        ALTER TABLE departments
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
      `);
      
      console.log("updated_at column added to departments table");
    } else {
      console.log("updated_at column already exists in departments table");
    }

    // Check if department_id column exists in users table
    const departmentIdExists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'department_id'
      );
    `);

    if (!departmentIdExists || !departmentIdExists.exists) {
      console.log("Adding department_id column to users table");
      
      await db.none(`
        ALTER TABLE users
        ADD COLUMN department_id INTEGER REFERENCES departments(id);
      `);
      
      console.log("department_id column added to users table");
    } else {
      console.log("department_id column already exists in users table");
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}