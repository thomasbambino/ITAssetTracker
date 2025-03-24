import pgPromise from 'pg-promise';
import * as schema from '../shared/schema';
import bcrypt from 'bcrypt';

// Create a PostgreSQL client
const pgp = pgPromise();
export const db = pgp(process.env.DATABASE_URL!);

// Helper function to hash a password
async function hashPassword(password: string): Promise<{ hash: string, salt: string }> {
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
}

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
        password_hash TEXT,
        password_salt TEXT,
        temp_password TEXT,
        temp_password_expiry TIMESTAMP WITH TIME ZONE,
        password_reset_required BOOLEAN DEFAULT TRUE,
        role TEXT DEFAULT 'user',
        active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
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
    
    // Check if users table has records - create default admin users if none exist
    const usersCount = await db.one(`SELECT COUNT(*) FROM users`);
    
    if (parseInt(usersCount.count) === 0) {
      console.log('Initializing default admin users...');
      
      // Hash the default password "Welcome1"
      const tommyPassword = await hashPassword('Welcome1');
      const olafPassword = await hashPassword('Welcome1');
      
      // Insert default admin users (Tommy and Olaf)
      const insertAdmins = `
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          role, 
          password_hash, 
          password_salt, 
          password_reset_required,
          active,
          department
        ) VALUES 
        (
          'Tommy', 
          'Admin', 
          'tommy@example.com', 
          'admin', 
          $1, 
          $2, 
          true,
          true,
          'IT'
        ),
        (
          'Olaf', 
          'Admin', 
          'olaf@example.com', 
          'admin', 
          $3, 
          $4, 
          true,
          true,
          'IT'
        )
      `;
      
      await db.none(insertAdmins, [
        tommyPassword.hash,
        tommyPassword.salt,
        olafPassword.hash,
        olafPassword.salt
      ]);
      
      console.log('Default admin users created.');
    } else {
      console.log(`Found ${usersCount.count} existing users.`);
    }
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}