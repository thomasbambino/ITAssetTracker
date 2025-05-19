import { db } from '../db';

/**
 * This migration script creates department records from existing user department values
 * and updates users to reference these departments via foreign key
 */
export async function migrateDepartmentsData() {
  console.log("Running migration: Migrating department data from users table");
  
  try {
    // Check if users have department values set
    const usersWithDepartments = await db.manyOrNone(`
      SELECT DISTINCT department 
      FROM users 
      WHERE department IS NOT NULL AND department != ''
    `);

    if (usersWithDepartments.length === 0) {
      console.log("No department data found in users table, skipping migration");
      return;
    }

    console.log(`Found ${usersWithDepartments.length} unique departments in users table`);
    
    // Create departments based on distinct values in users.department field
    for (const { department } of usersWithDepartments) {
      // Check if department already exists
      const existingDept = await db.oneOrNone(`
        SELECT id FROM departments WHERE name = $1
      `, [department]);
      
      if (existingDept) {
        console.log(`Department "${department}" already exists, skipping creation`);
        continue;
      }
      
      // Create department
      const newDept = await db.one(`
        INSERT INTO departments (name, created_at)
        VALUES ($1, CURRENT_TIMESTAMP)
        RETURNING id
      `, [department]);
      
      console.log(`Created department "${department}" with ID ${newDept.id}`);
      
      // Update users to reference the new department
      const updateResult = await db.result(`
        UPDATE users
        SET department_id = $1
        WHERE department = $2
      `, [newDept.id, department]);
      
      console.log(`Updated ${updateResult.rowCount} users with department "${department}"`);
    }
    
    console.log("Department data migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}