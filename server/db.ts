import pgPromise from 'pg-promise';
import * as schema from '../shared/schema';

// Create a PostgreSQL client
const pgp = pgPromise();
export const db = pgp(process.env.DATABASE_URL!);

// Helper function to initialize the database
export async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // First, check if tables exist
    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT,
        department TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        serial_number TEXT NOT NULL,
        asset_tag TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        purchase_cost DECIMAL,
        purchase_date TIMESTAMP WITH TIME ZONE,
        purchased_by TEXT,
        warranty_eol TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS assignment_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        device_id INTEGER REFERENCES devices(id) NOT NULL,
        assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
        assigned_by INTEGER REFERENCES users(id),
        unassigned_at TIMESTAMP WITH TIME ZONE,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        details TEXT,
        user_id INTEGER REFERENCES users(id),
        action_type TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await db.none(createTables);
    
    // Check if categories table has records
    const categoriesCount = await db.one(`SELECT COUNT(*) FROM categories`);
    
    if (parseInt(categoriesCount.count) === 0) {
      console.log('Initializing default categories...');
      
      // Insert default categories
      const insertCategories = `
        INSERT INTO categories (name, description) VALUES
          ('Laptop', 'Portable computers for general use'),
          ('Desktop', 'Fixed computers for office use'),
          ('Monitor', 'Display screens'),
          ('Printer', 'Document printing devices'),
          ('Phone', 'Mobile phones and smartphones'),
          ('Tablet', 'Portable tablet computers'),
          ('Server', 'Server hardware'),
          ('Networking', 'Network equipment like routers and switches'),
          ('Peripheral', 'Computer peripherals like keyboards and mice'),
          ('Other', 'Other IT equipment')
      `;
      
      await db.none(insertCategories);
      console.log('Default categories created.');
    } else {
      console.log(`Found ${categoriesCount.count} existing categories.`);
    }
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}