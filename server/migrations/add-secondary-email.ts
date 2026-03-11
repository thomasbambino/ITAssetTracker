import { db } from '../db';

export async function addSecondaryEmailField() {
  try {
    const exists = await db.oneOrNone(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'secondary_email'
      );
    `);

    if (!exists || !exists.exists) {
      console.log("Adding secondary_email column to users table");
      await db.none(`ALTER TABLE users ADD COLUMN secondary_email TEXT;`);
      console.log("secondary_email column added");
    }
  } catch (error) {
    console.error("Error in addSecondaryEmailField migration:", error);
  }
}
