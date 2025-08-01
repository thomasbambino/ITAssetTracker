import { 
  type Category, type Device, type User, type AssignmentHistory, type ActivityLog,
  type Software, type SoftwareAssignment, type MaintenanceRecord, type QrCode,
  type Notification, type BrandingSettings, type EmailSettings, type Site,
  type GameHighScore,
  type InsertCategory, type InsertDevice, type InsertUser, 
  type InsertAssignmentHistory, type InsertActivityLog,
  type InsertSoftware, type InsertSoftwareAssignment, type InsertMaintenanceRecord,
  type InsertQrCode, type InsertNotification, type InsertBrandingSettings, 
  type InsertEmailSettings, type InsertSite, type InsertGameHighScore
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";

export class DatabaseStorage implements IStorage {
  // Site operations
  async getSites(): Promise<Site[]> {
    const sites = await db.any(`
      SELECT 
        id, 
        name, 
        address, 
        city, 
        state, 
        zip_code as "zipCode", 
        country, 
        notes, 
        created_at as "createdAt"
      FROM sites
      ORDER BY name
    `);
    return sites;
  }

  async getSiteById(id: number): Promise<Site | undefined> {
    try {
      const site = await db.one(`
        SELECT 
          id, 
          name, 
          address, 
          city, 
          state, 
          zip_code as "zipCode", 
          country, 
          notes, 
          created_at as "createdAt"
        FROM sites 
        WHERE id = $1
      `, [id]);
      return site;
    } catch (error) {
      return undefined;
    }
  }

  async createSite(site: InsertSite, loggedInUserId?: number): Promise<Site> {
    const newSite = await db.one(`
      INSERT INTO sites (
        name, 
        address, 
        city, 
        state, 
        zip_code, 
        country, 
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING 
        id, 
        name, 
        address, 
        city, 
        state, 
        zip_code as "zipCode", 
        country, 
        notes, 
        created_at as "createdAt"
    `, [
      site.name,
      site.address || null,
      site.city || null,
      site.state || null,
      site.zipCode || null,
      site.country || null,
      site.notes || null
    ]);
    
    // Log activity
    await this.createActivityLog({
      userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
      actionType: 'site_added',
      details: `Site created: ${site.name}`
    });
    
    return newSite;
  }

  async updateSite(id: number, site: Partial<InsertSite>, loggedInUserId?: number): Promise<Site | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (site.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(site.name);
      }
      
      if (site.address !== undefined) {
        updates.push(`address = $${paramCount++}`);
        values.push(site.address);
      }
      
      if (site.city !== undefined) {
        updates.push(`city = $${paramCount++}`);
        values.push(site.city);
      }
      
      if (site.state !== undefined) {
        updates.push(`state = $${paramCount++}`);
        values.push(site.state);
      }
      
      if (site.zipCode !== undefined) {
        updates.push(`zip_code = $${paramCount++}`);
        values.push(site.zipCode);
      }
      
      if (site.country !== undefined) {
        updates.push(`country = $${paramCount++}`);
        values.push(site.country);
      }
      
      if (site.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(site.notes);
      }
      
      // If no updates, return the site
      if (updates.length === 0) {
        return this.getSiteById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedSite = await db.one(`
        UPDATE sites SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          name, 
          address, 
          city, 
          state, 
          zip_code as "zipCode", 
          country, 
          notes, 
          created_at as "createdAt"
      `, values);
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'site_updated',
        details: `Site updated: ${updatedSite.name}`
      });
      
      return updatedSite;
    } catch (error) {
      console.error('Error updating site:', error);
      return undefined;
    }
  }

  async deleteSite(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // Check if any devices use this site
      const deviceCount = await db.one(`
        SELECT COUNT(*) FROM devices
        WHERE site_id = $1
      `, [id]);
      
      if (parseInt(deviceCount.count) > 0) {
        return false; // Cannot delete site in use
      }
      
      // First, get site for logging
      const site = await this.getSiteById(id);
      if (!site) return false;
      
      // Delete site
      const result = await db.result(`
        DELETE FROM sites
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'site_deleted',
          details: `Site deleted: ${site.name}`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting site:', error);
      return false;
    }
  }

  async getDevicesBySite(siteId: number): Promise<Device[]> {
    const devices = await db.any(`
      SELECT 
        d.id,
        d.name,
        d.brand, 
        d.model, 
        d.serial_number as "serialNumber", 
        d.asset_tag as "assetTag", 
        d.category_id as "categoryId", 
        d.purchase_cost as "purchaseCost", 
        d.purchase_date as "purchaseDate", 
        d.purchased_by as "purchasedBy", 
        d.warranty_eol as "warrantyEOL", 
        d.created_at as "createdAt", 
        d.user_id as "userId",
        d.is_intune_onboarded as "isIntuneOnboarded",
        d.intune_compliance_status as "intuneComplianceStatus",
        d.intune_last_sync as "intuneLastSync",
        d.status,
        c.name as "categoryName"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.site_id = $1 AND (d.deleted = FALSE OR d.deleted IS NULL)
      ORDER BY d.brand, d.model
    `, [siteId]);
    return devices;
  }
  // User operations
  async getUsers(): Promise<User[]> {
    const users = await db.any(`
      SELECT 
        id, 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone_number as "phoneNumber", 
        department,
        department_id as "departmentId",
        role,
        active,
        is_manager as "isManager",
        managed_department_ids as "managedDepartmentIds",
        created_at as "createdAt" 
      FROM users
      ORDER BY last_name, first_name
    `);
    return users;
  }
  
  // Update user's last login without creating an activity log
  async updateUserLastLogin(id: number, lastLogin: Date): Promise<User | undefined> {
    try {
      const updatedUser = await db.one(`
        UPDATE users SET
          last_login = $1
        WHERE id = $2
        RETURNING 
          id, 
          first_name as "firstName", 
          last_name as "lastName", 
          email, 
          phone_number as "phoneNumber", 
          department,
          department_id as "departmentId",
          password_hash as "passwordHash",
          password_salt as "passwordSalt",
          temp_password as "tempPassword",
          temp_password_expiry as "tempPasswordExpiry",
          password_reset_required as "passwordResetRequired",
          role,
          active,
          last_login as "lastLogin",
          created_at as "createdAt"
      `, [lastLogin, id]);
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user last login:', error);
      return undefined;
    }
  }

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const user = await db.one(`
        SELECT 
          id, 
          first_name as "firstName", 
          last_name as "lastName", 
          email, 
          phone_number as "phoneNumber", 
          department,
          department_id as "departmentId",
          password_hash as "passwordHash",
          password_salt as "passwordSalt",
          temp_password as "tempPassword",
          temp_password_expiry as "tempPasswordExpiry",
          password_reset_required as "passwordResetRequired",
          two_factor_secret as "twoFactorSecret",
          two_factor_enabled as "twoFactorEnabled",
          two_factor_backup_codes as "twoFactorBackupCodes",
          profile_photo as "profilePhoto",
          role,
          active,
          is_manager as "isManager",
          managed_department_ids as "managedDepartmentIds",
          last_login as "lastLogin",
          created_at as "createdAt" 
        FROM users 
        WHERE id = $1
      `, [id]);
      return user;
    } catch (error) {
      // If no rows found, return undefined
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await db.one(`
        SELECT 
          id, 
          first_name as "firstName", 
          last_name as "lastName", 
          email, 
          phone_number as "phoneNumber", 
          department,
          department_id as "departmentId",
          password_hash as "passwordHash",
          password_salt as "passwordSalt",
          temp_password as "tempPassword",
          temp_password_expiry as "tempPasswordExpiry",
          password_reset_required as "passwordResetRequired",
          two_factor_secret as "twoFactorSecret",
          two_factor_enabled as "twoFactorEnabled",
          two_factor_backup_codes as "twoFactorBackupCodes",
          profile_photo as "profilePhoto",
          role,
          active,
          is_manager as "isManager",
          managed_department_ids as "managedDepartmentIds",
          last_login as "lastLogin",
          created_at as "createdAt" 
        FROM users 
        WHERE email ILIKE $1
      `, [email]);
      return user;
    } catch (error) {
      // If no rows found, return undefined
      return undefined;
    }
  }

  async createUser(user: InsertUser, loggedInUserId?: number): Promise<User> {
    const newUser = await db.one(`
      INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        phone_number, 
        department
      ) VALUES (
        $1, $2, $3, $4, $5
      ) RETURNING 
        id, 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone_number as "phoneNumber", 
        department, 
        created_at as "createdAt"
    `, [
      user.firstName, 
      user.lastName, 
      user.email, 
      user.phoneNumber || null, 
      user.department || null
    ]);
    
    // Log activity
    await this.createActivityLog({
      userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
      actionType: 'user_added',
      details: `User created: ${user.firstName} ${user.lastName}`
    });
    
    return newUser;
  }

  async updateUser(id: number, user: any, loggedInUserId?: number, skipActivityLog?: boolean): Promise<User | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (user.firstName !== undefined) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(user.firstName);
      }
      
      if (user.lastName !== undefined) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(user.lastName);
      }
      
      if (user.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(user.email);
      }
      
      if (user.phoneNumber !== undefined) {
        updates.push(`phone_number = $${paramCount++}`);
        values.push(user.phoneNumber);
      }
      
      if (user.department !== undefined) {
        updates.push(`department = $${paramCount++}`);
        values.push(user.department);
      }
      
      if (user.departmentId !== undefined) {
        updates.push(`department_id = $${paramCount++}`);
        values.push(user.departmentId);
      }
      
      // Password-related fields
      if (user.passwordHash !== undefined) {
        updates.push(`password_hash = $${paramCount++}`);
        values.push(user.passwordHash);
      }
      
      if (user.passwordSalt !== undefined) {
        updates.push(`password_salt = $${paramCount++}`);
        values.push(user.passwordSalt);
      }
      
      if (user.tempPassword !== undefined) {
        updates.push(`temp_password = $${paramCount++}`);
        values.push(user.tempPassword);
      }
      
      if (user.tempPasswordExpiry !== undefined) {
        updates.push(`temp_password_expiry = $${paramCount++}`);
        values.push(user.tempPasswordExpiry);
      }
      
      if (user.passwordResetRequired !== undefined) {
        updates.push(`password_reset_required = $${paramCount++}`);
        values.push(user.passwordResetRequired);
      }
      
      if (user.role !== undefined) {
        updates.push(`role = $${paramCount++}`);
        values.push(user.role);
      }
      
      if (user.active !== undefined) {
        updates.push(`active = $${paramCount++}`);
        values.push(user.active);
      }
      
      if (user.isManager !== undefined) {
        updates.push(`is_manager = $${paramCount++}`);
        values.push(user.isManager);
      }
      
      if (user.managedDepartmentIds !== undefined) {
        updates.push(`managed_department_ids = $${paramCount++}`);
        values.push(user.managedDepartmentIds);
      }
      
      if (user.lastLogin !== undefined) {
        updates.push(`last_login = $${paramCount++}`);
        values.push(user.lastLogin);
      }
      
      // 2FA fields
      if (user.twoFactorSecret !== undefined) {
        updates.push(`two_factor_secret = $${paramCount++}`);
        values.push(user.twoFactorSecret);
      }
      
      if (user.twoFactorEnabled !== undefined) {
        updates.push(`two_factor_enabled = $${paramCount++}`);
        values.push(user.twoFactorEnabled);
      }
      
      if (user.twoFactorBackupCodes !== undefined) {
        updates.push(`two_factor_backup_codes = $${paramCount++}`);
        values.push(user.twoFactorBackupCodes);
      }
      
      // Profile photo field
      if (user.profilePhoto !== undefined) {
        updates.push(`profile_photo = $${paramCount++}`);
        values.push(user.profilePhoto);
      }
      
      // If no updates, return the user
      if (updates.length === 0) {
        return this.getUserById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedUser = await db.one(`
        UPDATE users SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          first_name as "firstName", 
          last_name as "lastName", 
          email, 
          phone_number as "phoneNumber", 
          department,
          department_id as "departmentId",
          password_hash as "passwordHash",
          password_salt as "passwordSalt",
          temp_password as "tempPassword",
          temp_password_expiry as "tempPasswordExpiry",
          password_reset_required as "passwordResetRequired",
          two_factor_secret as "twoFactorSecret",
          two_factor_enabled as "twoFactorEnabled",
          two_factor_backup_codes as "twoFactorBackupCodes",
          profile_photo as "profilePhoto",
          role,
          active,
          is_manager as "isManager",
          managed_department_ids as "managedDepartmentIds",
          last_login as "lastLogin",
          created_at as "createdAt"
      `, values);
      
      // Log activity only if not skipped
      if (!skipActivityLog) {
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'user_updated',
          details: `User updated: ${updatedUser.firstName} ${updatedUser.lastName}`
        });
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // First, get user for logging
      const user = await this.getUserById(id);
      if (!user) return false;
      
      // Unassign any devices assigned to this user
      await db.none(`
        UPDATE devices SET user_id = NULL
        WHERE user_id = $1
      `, [id]);
      
      // Delete user
      const result = await db.result(`
        DELETE FROM users
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'user_deleted',
          details: `User deleted: ${user.firstName} ${user.lastName}`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    const users = await db.any(`
      SELECT 
        id, 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone_number as "phoneNumber", 
        department, 
        created_at as "createdAt" 
      FROM users
      WHERE department = $1
    `, [department]);
    
    return users;
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    const users = await db.any(`
      SELECT 
        id, 
        first_name as "firstName", 
        last_name as "lastName", 
        email, 
        phone_number as "phoneNumber", 
        department,
        role,
        created_at as "createdAt" 
      FROM users
      WHERE role = $1
    `, [role]);
    
    return users;
  }
  
  // Category operations
  async getCategories(): Promise<Category[]> {
    const categories = await db.any(`
      SELECT id, name, description, has_specs as "hasSpecs"
      FROM categories
      ORDER BY name
    `);
    return categories;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    try {
      const category = await db.one(`
        SELECT id, name, description, has_specs as "hasSpecs"
        FROM categories
        WHERE id = $1
      `, [id]);
      return category;
    } catch (error) {
      return undefined;
    }
  }

  async createCategory(category: InsertCategory, loggedInUserId?: number): Promise<Category> {
    const newCategory = await db.one(`
      INSERT INTO categories (
        name, 
        description
      ) VALUES (
        $1, $2
      ) RETURNING 
        id, name, description
    `, [
      category.name, 
      category.description || null
    ]);
    
    // Log activity
    await this.createActivityLog({
      userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
      actionType: 'category_added',
      details: `Category created: ${category.name}`
    });
    
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>, loggedInUserId?: number): Promise<Category | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (category.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(category.name);
      }
      
      if (category.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(category.description);
      }
      
      if (category.hasSpecs !== undefined) {
        updates.push(`has_specs = $${paramCount++}`);
        values.push(category.hasSpecs);
      }
      
      // If no updates, return the category
      if (updates.length === 0) {
        return this.getCategoryById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedCategory = await db.one(`
        UPDATE categories SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, description, has_specs as "hasSpecs"
      `, values);
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'category_updated',
        details: `Category updated: ${updatedCategory.name}`
      });
      
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }

  async deleteCategory(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // Check if any devices use this category
      const deviceCount = await db.one(`
        SELECT COUNT(*) FROM devices
        WHERE category_id = $1
      `, [id]);
      
      if (parseInt(deviceCount.count) > 0) {
        return false; // Cannot delete category in use
      }
      
      // First, get category for logging
      const category = await this.getCategoryById(id);
      if (!category) return false;
      
      // Delete category
      const result = await db.result(`
        DELETE FROM categories
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'category_deleted',
          details: `Category deleted: ${category.name}`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  // Device operations
  async getDevices(): Promise<Device[]> {
    const devices = await db.any(`
      SELECT 
        d.id,
        d.name,
        d.brand, 
        d.model, 
        d.serial_number as "serialNumber", 
        d.asset_tag as "assetTag", 
        d.category_id as "categoryId", 
        d.site_id as "siteId",
        d.purchase_cost as "purchaseCost", 
        d.purchase_date as "purchaseDate", 
        d.purchased_by as "purchasedBy", 
        d.warranty_eol as "warrantyEOL", 
        d.created_at as "createdAt", 
        d.user_id as "userId",
        d.is_intune_onboarded as "isIntuneOnboarded",
        d.intune_compliance_status as "intuneComplianceStatus",
        d.intune_last_sync as "intuneLastSync",
        d.status,
        d.notes,
        d.address,
        d.specs,
        c.name as "categoryName"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE (d.deleted = FALSE OR d.deleted IS NULL)
      ORDER BY d.brand, d.model
    `);
    return devices;
  }

  async getDeviceById(id: number): Promise<Device | undefined> {
    try {
      const device = await db.one(`
        SELECT 
          d.id,
          d.name,
          d.brand, 
          d.model, 
          d.serial_number as "serialNumber", 
          d.asset_tag as "assetTag", 
          d.category_id as "categoryId", 
          d.site_id as "siteId",
          d.purchase_cost as "purchaseCost", 
          d.purchase_date as "purchaseDate", 
          d.purchased_by as "purchasedBy", 
          d.warranty_eol as "warrantyEOL", 
          d.created_at as "createdAt", 
          d.user_id as "userId",
          d.is_intune_onboarded as "isIntuneOnboarded",
          d.intune_compliance_status as "intuneComplianceStatus",
          d.intune_last_sync as "intuneLastSync",
          d.status,
          d.notes,
          d.address,
          d.specs,
          c.name as "categoryName"
        FROM devices d
        LEFT JOIN categories c ON d.category_id = c.id
        WHERE d.id = $1 AND (d.deleted = FALSE OR d.deleted IS NULL)
      `, [id]);
      return device;
    } catch (error) {
      return undefined;
    }
  }

  async createDevice(device: InsertDevice, loggedInUserId?: number): Promise<Device> {
    const newDevice = await db.one(`
      INSERT INTO devices (
        name,
        brand, 
        model, 
        serial_number,
        site_id, 
        asset_tag, 
        category_id, 
        purchase_cost, 
        purchase_date, 
        purchased_by, 
        warranty_eol,
        user_id,
        address,
        status,
        notes,
        specs
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING 
        id, 
        name,
        brand, 
        model, 
        serial_number as "serialNumber", 
        asset_tag as "assetTag", 
        category_id as "categoryId", 
        site_id as "siteId",
        purchase_cost as "purchaseCost", 
        purchase_date as "purchaseDate", 
        purchased_by as "purchasedBy", 
        warranty_eol as "warrantyEOL", 
        created_at as "createdAt", 
        user_id as "userId",
        address,
        status,
        notes,
        specs
    `, [
      device.name || null,
      device.brand, 
      device.model, 
      device.serialNumber, 
      device.siteId || null,
      device.assetTag, 
      device.categoryId || null, 
      device.purchaseCost || null, 
      device.purchaseDate || null, 
      device.purchasedBy || null, 
      device.warrantyEOL || null,
      device.userId || null,
      device.address || null,
      device.status || 'active',
      device.notes || null,
      device.specs || null
    ]);
    
    // Get category name for the device
    if (newDevice.categoryId) {
      try {
        const category = await this.getCategoryById(newDevice.categoryId);
        if (category) {
          (newDevice as any).categoryName = category.name;
        }
      } catch (error) {
        console.error('Error fetching category for new device:', error);
      }
    }
    
    // Log activity
    await this.createActivityLog({
      userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
      actionType: 'device_added',
      details: `Device added: ${device.name ? device.name : `${device.brand} ${device.model}`} (${device.assetTag})`
    });
    
    return newDevice;
  }

  async updateDevice(id: number, device: Partial<InsertDevice>, loggedInUserId?: number): Promise<Device | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (device.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(device.name);
      }
      
      if (device.brand !== undefined) {
        updates.push(`brand = $${paramCount++}`);
        values.push(device.brand);
      }
      
      if (device.model !== undefined) {
        updates.push(`model = $${paramCount++}`);
        values.push(device.model);
      }
      
      if (device.serialNumber !== undefined) {
        updates.push(`serial_number = $${paramCount++}`);
        values.push(device.serialNumber);
      }
      
      if (device.assetTag !== undefined) {
        updates.push(`asset_tag = $${paramCount++}`);
        values.push(device.assetTag);
      }
      
      if (device.categoryId !== undefined) {
        updates.push(`category_id = $${paramCount++}`);
        values.push(device.categoryId);
      }
      
      if (device.siteId !== undefined) {
        updates.push(`site_id = $${paramCount++}`);
        values.push(device.siteId);
      }
      
      if (device.purchaseCost !== undefined) {
        updates.push(`purchase_cost = $${paramCount++}`);
        values.push(device.purchaseCost);
      }
      
      if (device.purchaseDate !== undefined) {
        updates.push(`purchase_date = $${paramCount++}`);
        values.push(device.purchaseDate);
      }
      
      if (device.purchasedBy !== undefined) {
        updates.push(`purchased_by = $${paramCount++}`);
        values.push(device.purchasedBy);
      }
      
      if (device.warrantyEOL !== undefined) {
        updates.push(`warranty_eol = $${paramCount++}`);
        values.push(device.warrantyEOL);
      }
      
      // Add status field handling
      if (device.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(device.status);
        console.log(`Adding status update: ${device.status}`);
      }
      
      // Handle notes field
      if (device.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(device.notes);
        console.log(`Adding notes update: ${device.notes}`);
      }
      
      // Handle address field
      if (device.address !== undefined) {
        updates.push(`address = $${paramCount++}`);
        values.push(device.address);
        console.log(`Adding address update: ${device.address}`);
      }
      
      // Handle specs field
      if (device.specs !== undefined) {
        updates.push(`specs = $${paramCount++}`);
        values.push(device.specs);
        console.log(`Adding specs update: ${device.specs}`);
      }
      
      // If no updates, return the device
      if (updates.length === 0) {
        return this.getDeviceById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedDevice = await db.one(`
        UPDATE devices SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          name,
          brand, 
          model, 
          serial_number as "serialNumber", 
          asset_tag as "assetTag", 
          category_id as "categoryId", 
          site_id as "siteId",
          purchase_cost as "purchaseCost", 
          purchase_date as "purchaseDate", 
          purchased_by as "purchasedBy", 
          warranty_eol as "warrantyEOL", 
          created_at as "createdAt", 
          user_id as "userId",
          status,
          notes,
          address,
          specs
      `, values);
      
      // Get category name for the device
      if (updatedDevice.categoryId) {
        try {
          const category = await this.getCategoryById(updatedDevice.categoryId);
          if (category) {
            (updatedDevice as any).categoryName = category.name;
          }
        } catch (error) {
          console.error('Error fetching category for updated device:', error);
        }
      }
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'device_updated',
        details: `Device updated: ${updatedDevice.name ? updatedDevice.name : `${updatedDevice.brand} ${updatedDevice.model}`} (${updatedDevice.assetTag})`
      });
      
      return updatedDevice;
    } catch (error) {
      console.error('Error updating device:', error);
      return undefined;
    }
  }

  async deleteDevice(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // First, get device for logging
      const device = await this.getDeviceById(id);
      if (!device) return false;
      
      // Instead of physically deleting, mark it as deleted
      const result = await db.result(`
        UPDATE devices
        SET deleted = TRUE,
            user_id = NULL
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'device_deleted',
          details: `Device deleted: ${device.name ? device.name : `${device.brand} ${device.model}`} (${device.assetTag})`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting device:', error);
      return false;
    }
  }

  async getDevicesByCategory(categoryId: number): Promise<Device[]> {
    const devices = await db.any(`
      SELECT 
        d.id,
        d.name,
        d.brand, 
        d.model, 
        d.serial_number as "serialNumber", 
        d.asset_tag as "assetTag", 
        d.category_id as "categoryId", 
        d.site_id as "siteId",
        d.purchase_cost as "purchaseCost", 
        d.purchase_date as "purchaseDate", 
        d.purchased_by as "purchasedBy", 
        d.warranty_eol as "warrantyEOL", 
        d.created_at as "createdAt", 
        d.user_id as "userId",
        d.is_intune_onboarded as "isIntuneOnboarded",
        d.intune_compliance_status as "intuneComplianceStatus",
        d.intune_last_sync as "intuneLastSync",
        d.status,
        d.notes,
        c.name as "categoryName"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.category_id = $1 AND (d.deleted = FALSE OR d.deleted IS NULL)
    `, [categoryId]);
    
    return devices;
  }
  
  async getIntuneEligibleDevices(): Promise<Device[]> {
    const devices = await db.any(`
      SELECT 
        d.id,
        d.name,
        d.brand, 
        d.model, 
        d.serial_number as "serialNumber", 
        d.asset_tag as "assetTag", 
        d.category_id as "categoryId", 
        d.site_id as "siteId",
        d.purchase_cost as "purchaseCost", 
        d.purchase_date as "purchaseDate", 
        d.purchased_by as "purchasedBy", 
        d.warranty_eol as "warrantyEOL", 
        d.created_at as "createdAt", 
        d.user_id as "userId",
        d.is_intune_onboarded as "isIntuneOnboarded",
        d.intune_compliance_status as "intuneComplianceStatus",
        d.intune_last_sync as "intuneLastSync",
        c.name as "categoryName",
        u.first_name as "userFirstName",
        u.last_name as "userLastName",
        u.email as "userEmail"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE (d.deleted = FALSE OR d.deleted IS NULL)
      AND c.name IN ('Laptop', 'Desktop')
      AND d.user_id IS NOT NULL
      ORDER BY d.brand, d.model
    `);
    
    return devices;
  }
  
  async updateDeviceIntuneStatus(id: number, intuneStatus: {
    isIntuneOnboarded?: boolean;
    intuneComplianceStatus?: string;
    intuneLastSync?: Date | null;
  }, loggedInUserId?: number): Promise<Device | undefined> {
    try {
      // Build dynamic update query for Intune status
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (intuneStatus.isIntuneOnboarded !== undefined) {
        updates.push(`is_intune_onboarded = $${paramCount++}`);
        values.push(intuneStatus.isIntuneOnboarded);
      }
      
      if (intuneStatus.intuneComplianceStatus !== undefined) {
        updates.push(`intune_compliance_status = $${paramCount++}`);
        values.push(intuneStatus.intuneComplianceStatus);
      }
      
      if (intuneStatus.intuneLastSync !== undefined) {
        updates.push(`intune_last_sync = $${paramCount++}`);
        values.push(intuneStatus.intuneLastSync);
      }
      
      // If no updates, return the device
      if (updates.length === 0) {
        return this.getDeviceById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedDevice = await db.one(`
        UPDATE devices SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          name,
          brand, 
          model, 
          serial_number as "serialNumber", 
          asset_tag as "assetTag", 
          category_id as "categoryId",
          site_id as "siteId", 
          purchase_cost as "purchaseCost", 
          purchase_date as "purchaseDate", 
          purchased_by as "purchasedBy", 
          warranty_eol as "warrantyEOL", 
          created_at as "createdAt", 
          user_id as "userId",
          is_intune_onboarded as "isIntuneOnboarded",
          intune_compliance_status as "intuneComplianceStatus",
          intune_last_sync as "intuneLastSync",
          notes
      `, values);
      
      // Get category name for the device
      if (updatedDevice.categoryId) {
        try {
          const category = await this.getCategoryById(updatedDevice.categoryId);
          if (category) {
            (updatedDevice as any).categoryName = category.name;
          }
        } catch (error) {
          console.error('Error fetching category for updated device:', error);
        }
      }
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'device_intune_updated',
        details: `Intune status updated for device: ${updatedDevice.name ? updatedDevice.name : `${updatedDevice.brand} ${updatedDevice.model}`} (${updatedDevice.assetTag})`
      });
      
      return updatedDevice;
    } catch (error) {
      console.error('Error updating device Intune status:', error);
      return undefined;
    }
  }

  async getDevicesByUser(userId: number): Promise<Device[]> {
    const devices = await db.any(`
      SELECT 
        d.id,
        d.name,
        d.brand, 
        d.model, 
        d.serial_number as "serialNumber", 
        d.asset_tag as "assetTag", 
        d.category_id as "categoryId",
        d.site_id as "siteId", 
        d.purchase_cost as "purchaseCost", 
        d.purchase_date as "purchaseDate", 
        d.purchased_by as "purchasedBy", 
        d.warranty_eol as "warrantyEOL", 
        d.created_at as "createdAt", 
        d.user_id as "userId",
        d.status,
        d.notes,
        d.address,
        d.specs,
        c.name as "categoryName"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.user_id = $1 AND (d.deleted = FALSE OR d.deleted IS NULL)
    `, [userId]);
    
    return devices;
  }

  async getUnassignedDevices(): Promise<Device[]> {
    const devices = await db.any(`
      SELECT 
        d.id,
        d.name,
        d.brand, 
        d.model, 
        d.serial_number as "serialNumber", 
        d.asset_tag as "assetTag", 
        d.category_id as "categoryId",
        d.site_id as "siteId", 
        d.purchase_cost as "purchaseCost", 
        d.purchase_date as "purchaseDate", 
        d.purchased_by as "purchasedBy", 
        d.warranty_eol as "warrantyEOL", 
        d.created_at as "createdAt", 
        d.user_id as "userId",
        d.status,
        d.notes,
        c.name as "categoryName"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.user_id IS NULL AND (d.deleted = FALSE OR d.deleted IS NULL)
    `);
    
    return devices;
  }

  async assignDevice(deviceId: number, userId: number, assignedBy: number): Promise<Device | undefined> {
    try {
      // Verify device and user exist
      const device = await this.getDeviceById(deviceId);
      const user = await this.getUserById(userId);
      
      if (!device || !user) return undefined;
      
      // Check if device is already assigned to someone
      if (device.userId) {
        // If it's the same user, no need to reassign
        if (device.userId === userId) {
          return device;
        }
        
        // It's a different user, so we need to explicitly unassign first
        const previousUser = await this.getUserById(device.userId);
        
        // DON'T update any existing records - instead, create a completely new unassignment record
        // This maintains an immutable history of all device events
        
        // Create an explicit unassignment record with its own entry
        // This helps maintain a clear history of all device state changes
        await this.createAssignmentHistory({
          deviceId,
          userId: device.userId, // Record who it was unassigned from
          assignedBy,
          assignedAt: new Date(), // This is technically an "unassigned_at" action but we use the same schema
          unassignedAt: new Date(), // Set both dates the same for an unassignment record
          notes: previousUser 
            ? `Unassigned from ${previousUser.firstName} ${previousUser.lastName} before reassignment`
            : `Unassigned before reassignment`
        });
        
        // Log unassignment activity as a separate action
        if (previousUser) {
          await this.createActivityLog({
            userId: assignedBy,
            actionType: 'device_unassigned',
            details: `Device ${device.name ? device.name : `${device.brand} ${device.model}`} (ID: ${device.id}) (${device.assetTag || ''}) unassigned from ${previousUser.firstName} ${previousUser.lastName} before reassignment`
          });
        }
      }
      
      // Update device with new assignment
      const updatedDevice = await db.one(`
        UPDATE devices SET
          user_id = $1
        WHERE id = $2
        RETURNING 
          id,
          name,
          brand, 
          model, 
          serial_number as "serialNumber", 
          asset_tag as "assetTag", 
          category_id as "categoryId",
          site_id as "siteId",
          purchase_cost as "purchaseCost", 
          purchase_date as "purchaseDate", 
          purchased_by as "purchasedBy", 
          warranty_eol as "warrantyEOL", 
          created_at as "createdAt", 
          user_id as "userId"
      `, [userId, deviceId]);
      
      // Get category name for the device
      if (updatedDevice.categoryId) {
        try {
          const category = await this.getCategoryById(updatedDevice.categoryId);
          if (category) {
            (updatedDevice as any).categoryName = category.name;
          }
        } catch (error) {
          console.error('Error fetching category for assigned device:', error);
        }
      }
      
      // Create a new assignment history record
      await this.createAssignmentHistory({
        deviceId,
        userId,
        assignedBy,
        assignedAt: new Date(),
        unassignedAt: null,
        notes: `Assigned to ${user.firstName} ${user.lastName}`
      });
      
      // Log the new assignment activity
      await this.createActivityLog({
        userId: assignedBy,
        actionType: 'device_assigned',
        details: `Device ${device.name ? device.name : `${device.brand} ${device.model}`} (ID: ${device.id}) (${device.assetTag || ''}) assigned to ${user.firstName} ${user.lastName}`
      });
      
      return updatedDevice;
    } catch (error) {
      console.error('Error assigning device:', error);
      return undefined;
    }
  }

  async unassignDevice(deviceId: number, loggedInUserId?: number): Promise<Device | undefined> {
    try {
      // Get the device
      const device = await this.getDeviceById(deviceId);
      if (!device || !device.userId) return device;
      
      // Get the user who had the device
      const previousUser = await this.getUserById(device.userId);
      const previousUserId = device.userId;
      
      // Update the device
      const updatedDevice = await db.one(`
        UPDATE devices SET
          user_id = NULL
        WHERE id = $1
        RETURNING 
          id,
          name,
          brand, 
          model, 
          serial_number as "serialNumber", 
          asset_tag as "assetTag", 
          category_id as "categoryId",
          site_id as "siteId", 
          purchase_cost as "purchaseCost", 
          purchase_date as "purchaseDate", 
          purchased_by as "purchasedBy", 
          warranty_eol as "warrantyEOL", 
          created_at as "createdAt", 
          user_id as "userId"
      `, [deviceId]);
      
      // Get category name for the device
      if (updatedDevice.categoryId) {
        try {
          const category = await this.getCategoryById(updatedDevice.categoryId);
          if (category) {
            (updatedDevice as any).categoryName = category.name;
          }
        } catch (error) {
          console.error('Error fetching category for unassigned device:', error);
        }
      }
      
      // REMOVED: Updating the latest assignment record
      // We no longer modify existing records to maintain an immutable history
      
      // Create a new explicit unassignment history record
      // This creates a dedicated record showing the unassignment action
      await this.createAssignmentHistory({
        deviceId,
        userId: previousUserId,
        assignedBy: loggedInUserId || 1,
        assignedAt: new Date(), // This is technically an "unassigned_at" action but we use the same schema
        unassignedAt: new Date(), // Set both dates the same for an unassignment record
        notes: previousUser 
          ? `Unassigned from ${previousUser.firstName} ${previousUser.lastName}`
          : `Unassigned`
      });
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'device_unassigned',
        details: previousUser 
          ? `Device ${device.name ? device.name : `${device.brand} ${device.model}`} (ID: ${device.id}) (${device.assetTag || ''}) unassigned from ${previousUser.firstName} ${previousUser.lastName}`
          : `Device ${device.name ? device.name : `${device.brand} ${device.model}`} (ID: ${device.id}) (${device.assetTag || ''}) unassigned`
      });
      
      return updatedDevice;
    } catch (error) {
      console.error('Error unassigning device:', error);
      return undefined;
    }
  }

  async getDevicesWithWarrantyExpiring(days: number): Promise<Device[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    const devices = await db.any(`
      SELECT 
        d.id,
        d.name,
        d.brand, 
        d.model, 
        d.serial_number as "serialNumber", 
        d.asset_tag as "assetTag", 
        d.category_id as "categoryId", 
        d.site_id as "siteId",
        d.purchase_cost as "purchaseCost", 
        d.purchase_date as "purchaseDate", 
        d.purchased_by as "purchasedBy", 
        d.warranty_eol as "warrantyEOL", 
        d.created_at as "createdAt", 
        d.user_id as "userId",
        d.status,
        d.notes,
        c.name as "categoryName"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.warranty_eol IS NOT NULL
        AND d.warranty_eol <= $1
        AND d.warranty_eol >= $2
        AND (d.deleted = FALSE OR d.deleted IS NULL)
    `, [futureDate, now]);
    
    return devices;
  }

  // Assignment history operations
  async getAssignmentHistory(deviceId: number): Promise<AssignmentHistory[]> {
    const history = await db.any(`
      SELECT 
        ah.id, 
        ah.user_id as "userId", 
        ah.device_id as "deviceId", 
        ah.assigned_at as "assignedAt", 
        ah.assigned_by as "assignedBy", 
        ah.unassigned_at as "unassignedAt", 
        ah.notes,
        u1.first_name || ' ' || u1.last_name as "userName",
        u2.first_name || ' ' || u2.last_name as "assignedByName"
      FROM assignment_history ah
      LEFT JOIN users u1 ON ah.user_id = u1.id
      LEFT JOIN users u2 ON ah.assigned_by = u2.id
      WHERE ah.device_id = $1
      ORDER BY ah.assigned_at DESC
    `, [deviceId]);
    
    return history;
  }

  async createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const newHistory = await db.one(`
      INSERT INTO assignment_history (
        user_id, 
        device_id, 
        assigned_at, 
        assigned_by, 
        unassigned_at, 
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING 
        id, 
        user_id as "userId", 
        device_id as "deviceId", 
        assigned_at as "assignedAt", 
        assigned_by as "assignedBy", 
        unassigned_at as "unassignedAt", 
        notes
    `, [
      history.userId || null, 
      history.deviceId, 
      history.assignedAt || new Date(), 
      history.assignedBy || null, 
      history.unassignedAt || null, 
      history.notes || null
    ]);
    
    return newHistory;
  }

  async updateAssignmentHistory(id: number, history: Partial<InsertAssignmentHistory>): Promise<AssignmentHistory | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (history.userId !== undefined) {
        updates.push(`user_id = $${paramCount++}`);
        values.push(history.userId);
      }
      
      if (history.deviceId !== undefined) {
        updates.push(`device_id = $${paramCount++}`);
        values.push(history.deviceId);
      }
      
      if (history.assignedAt !== undefined) {
        updates.push(`assigned_at = $${paramCount++}`);
        values.push(history.assignedAt);
      }
      
      if (history.assignedBy !== undefined) {
        updates.push(`assigned_by = $${paramCount++}`);
        values.push(history.assignedBy);
      }
      
      if (history.unassignedAt !== undefined) {
        updates.push(`unassigned_at = $${paramCount++}`);
        values.push(history.unassignedAt);
      }
      
      if (history.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(history.notes);
      }
      
      // If no updates, return undefined
      if (updates.length === 0) {
        return undefined;
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedHistory = await db.one(`
        UPDATE assignment_history SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          user_id as "userId", 
          device_id as "deviceId", 
          assigned_at as "assignedAt", 
          assigned_by as "assignedBy", 
          unassigned_at as "unassignedAt", 
          notes
      `, values);
      
      return updatedHistory;
    } catch (error) {
      console.error('Error updating assignment history:', error);
      return undefined;
    }
  }

  // Activity log operations
  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    let query = `
      SELECT 
        al.id, 
        al.details, 
        al.user_id as "userId", 
        al.action_type as "actionType", 
        al.timestamp,
        u.first_name || ' ' || u.last_name as "userName",
        u.department
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    const logs = await db.any(query);
    
    // Transform the data to match the expected frontend structure
    return logs.map(log => ({
      id: log.id,
      actionType: log.actionType,
      details: log.details,
      timestamp: log.timestamp,
      userId: log.userId,
      user: log.userId && log.userName ? {
        id: log.userId,
        name: log.userName,
        department: log.department
      } : null
    })) as any;
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const newLog = await db.one(`
      INSERT INTO activity_log (
        details, 
        user_id, 
        action_type
      ) VALUES (
        $1, $2, $3
      ) RETURNING 
        id, 
        details, 
        user_id as "userId", 
        action_type as "actionType", 
        timestamp
    `, [
      log.details || null, 
      log.userId || null, 
      log.actionType
    ]);
    
    return newLog;
  }

  // Software operations
  async getSoftware(): Promise<Software[]> {
    const software = await db.any(`
      SELECT 
        id, 
        name, 
        vendor, 
        license_type as "licenseType", 
        purchase_cost as "purchaseCost", 
        purchase_date as "purchaseDate", 
        expiry_date as "expiryDate", 
        license_key as "licenseKey", 
        seats, 
        notes, 
        status, 
        url,
        notification_email as "notificationEmail",
        send_access_notifications as "sendAccessNotifications",
        created_at as "createdAt"
      FROM software
      ORDER BY name
    `);
    return software;
  }

  async getSoftwareById(id: number): Promise<Software | undefined> {
    try {
      const software = await db.one(`
        SELECT 
          id, 
          name, 
          vendor, 
          license_type as "licenseType", 
          purchase_cost as "purchaseCost", 
          purchase_date as "purchaseDate", 
          expiry_date as "expiryDate", 
          license_key as "licenseKey", 
          seats, 
          notes, 
          status, 
          url,
          icon,
          notification_email as "notificationEmail",
          send_access_notifications as "sendAccessNotifications",
          created_at as "createdAt"
        FROM software
        WHERE id = $1
      `, [id]);
      return software;
    } catch (error) {
      return undefined;
    }
  }

  async createSoftware(software: InsertSoftware, loggedInUserId?: number): Promise<Software> {
    const newSoftware = await db.one(`
      INSERT INTO software (
        name, 
        vendor, 
        license_type, 
        purchase_cost, 
        purchase_date, 
        expiry_date, 
        license_key, 
        seats, 
        notes, 
        status,
        url,
        icon,
        notification_email,
        send_access_notifications
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING 
        id, 
        name, 
        vendor, 
        license_type as "licenseType", 
        purchase_cost as "purchaseCost", 
        purchase_date as "purchaseDate", 
        expiry_date as "expiryDate", 
        license_key as "licenseKey", 
        seats, 
        notes, 
        status,
        url,
        icon,
        notification_email as "notificationEmail",
        send_access_notifications as "sendAccessNotifications", 
        created_at as "createdAt"
    `, [
      software.name, 
      software.vendor, 
      software.licenseType, 
      software.purchaseCost || null, 
      software.purchaseDate || null, 
      software.expiryDate || null, 
      software.licenseKey || null, 
      software.seats || null, 
      software.notes || null, 
      software.status || 'active',
      software.url || null,
      software.icon || null,
      software.notificationEmail || null,
      software.sendAccessNotifications || false
    ]);
    
    // Log activity
    await this.createActivityLog({
      userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
      actionType: 'software_added',
      details: `Software added: ${software.name} (${software.vendor})`
    });
    
    return newSoftware;
  }

  async updateSoftware(id: number, software: Partial<InsertSoftware>, loggedInUserId?: number): Promise<Software | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (software.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(software.name);
      }
      
      if (software.vendor !== undefined) {
        updates.push(`vendor = $${paramCount++}`);
        values.push(software.vendor);
      }
      
      if (software.licenseType !== undefined) {
        updates.push(`license_type = $${paramCount++}`);
        values.push(software.licenseType);
      }
      
      if (software.purchaseCost !== undefined) {
        updates.push(`purchase_cost = $${paramCount++}`);
        values.push(software.purchaseCost);
      }
      
      if (software.purchaseDate !== undefined) {
        updates.push(`purchase_date = $${paramCount++}`);
        values.push(software.purchaseDate);
      }
      
      if (software.expiryDate !== undefined) {
        updates.push(`expiry_date = $${paramCount++}`);
        values.push(software.expiryDate);
      }
      
      if (software.licenseKey !== undefined) {
        updates.push(`license_key = $${paramCount++}`);
        values.push(software.licenseKey);
      }
      
      if (software.seats !== undefined) {
        updates.push(`seats = $${paramCount++}`);
        values.push(software.seats);
      }
      
      if (software.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(software.notes);
      }
      
      if (software.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(software.status);
      }
      
      // Add the notification fields
      if (software.notificationEmail !== undefined) {
        updates.push(`notification_email = $${paramCount++}`);
        values.push(software.notificationEmail);
      }
      
      if (software.sendAccessNotifications !== undefined) {
        updates.push(`send_access_notifications = $${paramCount++}`);
        values.push(software.sendAccessNotifications);
      }
      
      // Add the URL field
      if (software.url !== undefined) {
        updates.push(`url = $${paramCount++}`);
        values.push(software.url);
      }
      
      // Add the icon field
      if (software.icon !== undefined) {
        updates.push(`icon = $${paramCount++}`);
        values.push(software.icon);
      }
      
      // If no updates, return the software
      if (updates.length === 0) {
        return this.getSoftwareById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedSoftware = await db.one(`
        UPDATE software SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          name, 
          vendor, 
          license_type as "licenseType", 
          purchase_cost as "purchaseCost", 
          purchase_date as "purchaseDate", 
          expiry_date as "expiryDate", 
          license_key as "licenseKey", 
          seats, 
          notes, 
          status,
          url,
          icon,
          notification_email as "notificationEmail",
          send_access_notifications as "sendAccessNotifications",
          created_at as "createdAt"
      `, values);
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'software_updated',
        details: `Software updated: ${updatedSoftware.name} (${updatedSoftware.vendor})`
      });
      
      return updatedSoftware;
    } catch (error) {
      console.error('Error updating software:', error);
      return undefined;
    }
  }

  async deleteSoftware(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // First, check if any assignments exist for this software
      const assignmentCount = await db.one(`
        SELECT COUNT(*) FROM software_assignments
        WHERE software_id = $1
      `, [id]);
      
      if (parseInt(assignmentCount.count) > 0) {
        // Can't delete software with active assignments
        return false;
      }
      
      // Get software for logging
      const software = await this.getSoftwareById(id);
      if (!software) return false;
      
      // Delete software
      const result = await db.result(`
        DELETE FROM software
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'software_deleted',
          details: `Software deleted: ${software.name} (${software.vendor})`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting software:', error);
      return false;
    }
  }

  async getSoftwareByStatus(status: string): Promise<Software[]> {
    const software = await db.any(`
      SELECT 
        id, 
        name, 
        vendor, 
        license_type as "licenseType", 
        purchase_cost as "purchaseCost", 
        purchase_date as "purchaseDate", 
        expiry_date as "expiryDate", 
        license_key as "licenseKey", 
        seats, 
        notes, 
        status, 
        notification_email as "notificationEmail",
        send_access_notifications as "sendAccessNotifications",
        created_at as "createdAt"
      FROM software
      WHERE status = $1
      ORDER BY name
    `, [status]);
    
    return software;
  }

  async getSoftwareExpiringSoon(days: number): Promise<Software[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    const software = await db.any(`
      SELECT 
        id, 
        name, 
        vendor, 
        license_type as "licenseType", 
        purchase_cost as "purchaseCost", 
        purchase_date as "purchaseDate", 
        expiry_date as "expiryDate", 
        license_key as "licenseKey", 
        seats, 
        notes, 
        status,
        notification_email as "notificationEmail",
        send_access_notifications as "sendAccessNotifications", 
        created_at as "createdAt"
      FROM software
      WHERE expiry_date IS NOT NULL
        AND expiry_date <= $1
        AND expiry_date >= $2
      ORDER BY expiry_date
    `, [futureDate, now]);
    
    return software;
  }

  async getSoftwareWithUsageCounts(): Promise<Software[]> {
    const software = await db.any(`
      SELECT 
        s.id, 
        s.name, 
        s.vendor, 
        s.license_type as "licenseType", 
        s.purchase_cost as "purchaseCost", 
        s.purchase_date as "purchaseDate", 
        s.expiry_date as "expiryDate", 
        s.license_key as "licenseKey", 
        s.seats, 
        s.notes, 
        s.status, 
        s.url,
        s.icon,
        s.notification_email as "notificationEmail",
        s.send_access_notifications as "sendAccessNotifications",
        s.created_at as "createdAt",
        COALESCE(assignment_counts.used_seats, 0) as "usedSeats"
      FROM software s
      LEFT JOIN (
        SELECT 
          software_id,
          COUNT(*) as used_seats
        FROM software_assignments
        GROUP BY software_id
      ) assignment_counts ON s.id = assignment_counts.software_id
      ORDER BY s.name
    `);
    
    return software;
  }

  async getSoftwareByStatusWithUsageCounts(status: string): Promise<Software[]> {
    const software = await db.any(`
      SELECT 
        s.id, 
        s.name, 
        s.vendor, 
        s.license_type as "licenseType", 
        s.purchase_cost as "purchaseCost", 
        s.purchase_date as "purchaseDate", 
        s.expiry_date as "expiryDate", 
        s.license_key as "licenseKey", 
        s.seats, 
        s.notes, 
        s.status, 
        s.url,
        s.icon,
        s.notification_email as "notificationEmail",
        s.send_access_notifications as "sendAccessNotifications",
        s.created_at as "createdAt",
        COALESCE(assignment_counts.used_seats, 0) as "usedSeats"
      FROM software s
      LEFT JOIN (
        SELECT 
          software_id,
          COUNT(*) as used_seats
        FROM software_assignments
        GROUP BY software_id
      ) assignment_counts ON s.id = assignment_counts.software_id
      WHERE s.status = $1
      ORDER BY s.name
    `, [status]);
    
    return software;
  }

  // Software assignment operations
  async getSoftwareAssignments(softwareId: number): Promise<SoftwareAssignment[]> {
    const assignments = await db.any(`
      SELECT 
        sa.id, 
        sa.software_id as "softwareId", 
        sa.user_id as "userId", 
        sa.device_id as "deviceId", 
        sa.assigned_at as "assignedAt", 
        sa.assigned_by as "assignedBy", 
        sa.notes,
        u.first_name || ' ' || u.last_name as "userName",
        d.asset_tag as "deviceAssetTag",
        s.name as "softwareName"
      FROM software_assignments sa
      LEFT JOIN users u ON sa.user_id = u.id
      LEFT JOIN devices d ON sa.device_id = d.id
      LEFT JOIN software s ON sa.software_id = s.id
      WHERE sa.software_id = $1
      ORDER BY sa.assigned_at DESC
    `, [softwareId]);
    
    return assignments;
  }
  
  async getSoftwareAssignmentById(id: number): Promise<SoftwareAssignment | undefined> {
    const assignment = await db.oneOrNone(`
      SELECT 
        sa.id, 
        sa.software_id as "softwareId", 
        sa.user_id as "userId", 
        sa.device_id as "deviceId", 
        sa.assigned_at as "assignedAt", 
        sa.assigned_by as "assignedBy", 
        sa.notes,
        u.first_name || ' ' || u.last_name as "userName",
        d.asset_tag as "deviceAssetTag",
        s.name as "softwareName"
      FROM software_assignments sa
      LEFT JOIN users u ON sa.user_id = u.id
      LEFT JOIN devices d ON sa.device_id = d.id
      LEFT JOIN software s ON sa.software_id = s.id
      WHERE sa.id = $1
    `, [id]);
    
    return assignment || undefined;
  }

  async getSoftwareAssignmentsByUser(userId: number): Promise<SoftwareAssignment[]> {
    const assignments = await db.any(`
      SELECT 
        sa.id, 
        sa.software_id as "softwareId", 
        sa.user_id as "userId", 
        sa.device_id as "deviceId", 
        sa.assigned_at as "assignedAt", 
        sa.assigned_by as "assignedBy", 
        sa.notes,
        u.first_name || ' ' || u.last_name as "userName",
        d.asset_tag as "deviceAssetTag",
        s.name as "softwareName"
      FROM software_assignments sa
      LEFT JOIN users u ON sa.user_id = u.id
      LEFT JOIN devices d ON sa.device_id = d.id
      LEFT JOIN software s ON sa.software_id = s.id
      WHERE sa.user_id = $1
      ORDER BY sa.assigned_at DESC
    `, [userId]);
    
    return assignments;
  }

  async getSoftwareAssignmentsByDevice(deviceId: number): Promise<SoftwareAssignment[]> {
    const assignments = await db.any(`
      SELECT 
        sa.id, 
        sa.software_id as "softwareId", 
        sa.user_id as "userId", 
        sa.device_id as "deviceId", 
        sa.assigned_at as "assignedAt", 
        sa.assigned_by as "assignedBy", 
        sa.notes,
        u.first_name || ' ' || u.last_name as "userName",
        d.asset_tag as "deviceAssetTag",
        s.name as "softwareName"
      FROM software_assignments sa
      LEFT JOIN users u ON sa.user_id = u.id
      LEFT JOIN devices d ON sa.device_id = d.id
      LEFT JOIN software s ON sa.software_id = s.id
      WHERE sa.device_id = $1
      ORDER BY sa.assigned_at DESC
    `, [deviceId]);
    
    return assignments;
  }

  async createSoftwareAssignment(assignment: InsertSoftwareAssignment): Promise<SoftwareAssignment> {
    const newAssignment = await db.one(`
      INSERT INTO software_assignments (
        software_id, 
        user_id, 
        device_id, 
        assigned_at, 
        assigned_by, 
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING 
        id, 
        software_id as "softwareId", 
        user_id as "userId", 
        device_id as "deviceId", 
        assigned_at as "assignedAt", 
        assigned_by as "assignedBy", 
        notes
    `, [
      assignment.softwareId,
      assignment.userId || null,
      assignment.deviceId || null,
      assignment.assignedAt || new Date(),
      assignment.assignedBy || 1, // Default to admin
      assignment.notes || null
    ]);
    
    // Get software, user, and device information for better logs
    const software = await this.getSoftwareById(assignment.softwareId);
    let userName = 'N/A';
    let deviceAssetTag = 'N/A';
    
    if (assignment.userId) {
      const user = await this.getUserById(assignment.userId);
      if (user) {
        userName = `${user.firstName} ${user.lastName}`;
      }
    }
    
    if (assignment.deviceId) {
      const device = await this.getDeviceById(assignment.deviceId);
      if (device) {
        deviceAssetTag = device.assetTag;
      }
    }
    
    // For the return value, add these fields
    (newAssignment as any).userName = userName;
    (newAssignment as any).deviceAssetTag = deviceAssetTag;
    (newAssignment as any).softwareName = software ? software.name : 'Unknown';
    
    // Log activity
    await this.createActivityLog({
      userId: assignment.assignedBy || 1,
      actionType: 'software_assigned',
      details: `Software "${software?.name}" assigned to ${assignment.userId ? 'user ' + userName : ''}${assignment.userId && assignment.deviceId ? ' and ' : ''}${assignment.deviceId ? 'device ' + deviceAssetTag : ''}`
    });
    
    return newAssignment;
  }

  async updateSoftwareAssignment(id: number, assignment: Partial<InsertSoftwareAssignment>, loggedInUserId?: number): Promise<SoftwareAssignment | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (assignment.softwareId !== undefined) {
        updates.push(`software_id = $${paramCount++}`);
        values.push(assignment.softwareId);
      }
      
      if (assignment.userId !== undefined) {
        updates.push(`user_id = $${paramCount++}`);
        values.push(assignment.userId);
      }
      
      if (assignment.deviceId !== undefined) {
        updates.push(`device_id = $${paramCount++}`);
        values.push(assignment.deviceId);
      }
      
      if (assignment.assignedAt !== undefined) {
        updates.push(`assigned_at = $${paramCount++}`);
        values.push(assignment.assignedAt);
      }
      
      if (assignment.assignedBy !== undefined) {
        updates.push(`assigned_by = $${paramCount++}`);
        values.push(assignment.assignedBy);
      }
      
      if (assignment.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(assignment.notes);
      }
      
      // If no updates, return nothing
      if (updates.length === 0) {
        return undefined;
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedAssignment = await db.one(`
        UPDATE software_assignments SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          software_id as "softwareId", 
          user_id as "userId", 
          device_id as "deviceId", 
          assigned_at as "assignedAt", 
          assigned_by as "assignedBy", 
          notes
      `, values);
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'software_assignment_updated',
        details: `Software assignment updated: ID ${id}`
      });
      
      // Get additional information for the updated assignment
      if (updatedAssignment.softwareId) {
        const software = await this.getSoftwareById(updatedAssignment.softwareId);
        if (software) {
          (updatedAssignment as any).softwareName = software.name;
        }
      }
      
      if (updatedAssignment.userId) {
        const user = await this.getUserById(updatedAssignment.userId);
        if (user) {
          (updatedAssignment as any).userName = `${user.firstName} ${user.lastName}`;
        }
      }
      
      if (updatedAssignment.deviceId) {
        const device = await this.getDeviceById(updatedAssignment.deviceId);
        if (device) {
          (updatedAssignment as any).deviceAssetTag = device.assetTag;
        }
      }
      
      return updatedAssignment;
    } catch (error) {
      console.error('Error updating software assignment:', error);
      return undefined;
    }
  }

  async deleteSoftwareAssignment(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // Get the assignment for logging purposes
      const assignment = await db.oneOrNone(`
        SELECT 
          sa.id, 
          sa.software_id as "softwareId", 
          sa.user_id as "userId", 
          s.name as "softwareName",
          u.first_name || ' ' || u.last_name as "userName"
        FROM software_assignments sa
        LEFT JOIN software s ON sa.software_id = s.id
        LEFT JOIN users u ON sa.user_id = u.id
        WHERE sa.id = $1
      `, [id]);
      
      if (!assignment) return false;
      
      // Delete the assignment
      const result = await db.result(`
        DELETE FROM software_assignments
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'software_assignment_deleted',
          details: `Software assignment deleted: ${assignment.softwareName} from ${assignment.userName || 'device'}`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting software assignment:', error);
      return false;
    }
  }

  // Maintenance operations
  async getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    const records = await db.any(`
      SELECT 
        mr.id, 
        mr.device_id as "deviceId", 
        mr.maintenance_type as "maintenanceType", 
        mr.description, 
        mr.scheduled_date as "scheduledDate", 
        mr.completed_date as "completedDate", 
        mr.cost, 
        mr.performed_by as "performedBy", 
        mr.status, 
        mr.notes, 
        mr.created_at as "createdAt",
        d.brand as "deviceBrand",
        d.model as "deviceModel",
        d.asset_tag as "deviceAssetTag"
      FROM maintenance_records mr
      LEFT JOIN devices d ON mr.device_id = d.id
      ORDER BY 
        CASE 
          WHEN mr.status = 'scheduled' THEN 1
          WHEN mr.status = 'in_progress' THEN 2
          WHEN mr.status = 'completed' THEN 3
          WHEN mr.status = 'cancelled' THEN 4
        END,
        mr.scheduled_date ASC
    `);
    
    return records;
  }

  async getMaintenanceRecordById(id: number): Promise<MaintenanceRecord | undefined> {
    try {
      const record = await db.one(`
        SELECT 
          mr.id, 
          mr.device_id as "deviceId", 
          mr.maintenance_type as "maintenanceType", 
          mr.description, 
          mr.scheduled_date as "scheduledDate", 
          mr.completed_date as "completedDate", 
          mr.cost, 
          mr.performed_by as "performedBy", 
          mr.status, 
          mr.notes, 
          mr.created_at as "createdAt",
          d.brand as "deviceBrand",
          d.model as "deviceModel",
          d.asset_tag as "deviceAssetTag"
        FROM maintenance_records mr
        LEFT JOIN devices d ON mr.device_id = d.id
        WHERE mr.id = $1
      `, [id]);
      
      return record;
    } catch (error) {
      return undefined;
    }
  }

  async getMaintenanceRecordsByDevice(deviceId: number): Promise<MaintenanceRecord[]> {
    const records = await db.any(`
      SELECT 
        mr.id, 
        mr.device_id as "deviceId", 
        mr.maintenance_type as "maintenanceType", 
        mr.description, 
        mr.scheduled_date as "scheduledDate", 
        mr.completed_date as "completedDate", 
        mr.cost, 
        mr.performed_by as "performedBy", 
        mr.status, 
        mr.notes, 
        mr.created_at as "createdAt",
        d.brand as "deviceBrand",
        d.model as "deviceModel",
        d.asset_tag as "deviceAssetTag"
      FROM maintenance_records mr
      LEFT JOIN devices d ON mr.device_id = d.id
      WHERE mr.device_id = $1
      ORDER BY 
        CASE 
          WHEN mr.status = 'scheduled' THEN 1
          WHEN mr.status = 'in_progress' THEN 2
          WHEN mr.status = 'completed' THEN 3
          WHEN mr.status = 'cancelled' THEN 4
        END,
        mr.scheduled_date ASC
    `, [deviceId]);
    
    return records;
  }

  async createMaintenanceRecord(record: InsertMaintenanceRecord, loggedInUserId?: number): Promise<MaintenanceRecord> {
    const newRecord = await db.one(`
      INSERT INTO maintenance_records (
        device_id, 
        maintenance_type, 
        description, 
        scheduled_date, 
        completed_date, 
        cost, 
        performed_by, 
        status, 
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING 
        id, 
        device_id as "deviceId", 
        maintenance_type as "maintenanceType", 
        description, 
        scheduled_date as "scheduledDate", 
        completed_date as "completedDate", 
        cost, 
        performed_by as "performedBy", 
        status, 
        notes, 
        created_at as "createdAt"
    `, [
      record.deviceId,
      record.maintenanceType,
      record.description,
      record.scheduledDate || null,
      record.completedDate || null,
      record.cost || null,
      record.performedBy || null,
      record.status || 'scheduled',
      record.notes || null
    ]);
    
    // Get device information
    const device = await this.getDeviceById(record.deviceId);
    if (device) {
      (newRecord as any).deviceBrand = device.brand;
      (newRecord as any).deviceModel = device.model;
      (newRecord as any).deviceAssetTag = device.assetTag;
    }
    
    // Log activity
    await this.createActivityLog({
      userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
      actionType: 'maintenance_scheduled',
      details: `Maintenance ${record.maintenanceType} scheduled for device ${device ? device.assetTag : record.deviceId}`
    });
    
    return newRecord;
  }

  async updateMaintenanceRecord(id: number, record: Partial<InsertMaintenanceRecord>, loggedInUserId?: number): Promise<MaintenanceRecord | undefined> {
    try {
      // Get the current record for status change detection
      const currentRecord = await this.getMaintenanceRecordById(id);
      if (!currentRecord) return undefined;
      
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (record.deviceId !== undefined) {
        updates.push(`device_id = $${paramCount++}`);
        values.push(record.deviceId);
      }
      
      if (record.maintenanceType !== undefined) {
        updates.push(`maintenance_type = $${paramCount++}`);
        values.push(record.maintenanceType);
      }
      
      if (record.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(record.description);
      }
      
      if (record.scheduledDate !== undefined) {
        updates.push(`scheduled_date = $${paramCount++}`);
        values.push(record.scheduledDate);
      }
      
      if (record.completedDate !== undefined) {
        updates.push(`completed_date = $${paramCount++}`);
        values.push(record.completedDate);
      }
      
      if (record.cost !== undefined) {
        updates.push(`cost = $${paramCount++}`);
        values.push(record.cost);
      }
      
      if (record.performedBy !== undefined) {
        updates.push(`performed_by = $${paramCount++}`);
        values.push(record.performedBy);
      }
      
      if (record.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(record.status);
      }
      
      if (record.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(record.notes);
      }
      
      // If no updates, return the record
      if (updates.length === 0) {
        return currentRecord;
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedRecord = await db.one(`
        UPDATE maintenance_records SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          device_id as "deviceId", 
          maintenance_type as "maintenanceType", 
          description, 
          scheduled_date as "scheduledDate", 
          completed_date as "completedDate", 
          cost, 
          performed_by as "performedBy", 
          status, 
          notes, 
          created_at as "createdAt"
      `, values);
      
      // Get device information
      const device = await this.getDeviceById(updatedRecord.deviceId);
      if (device) {
        (updatedRecord as any).deviceBrand = device.brand;
        (updatedRecord as any).deviceModel = device.model;
        (updatedRecord as any).deviceAssetTag = device.assetTag;
      }
      
      // Log activity, especially for status changes
      let actionType = 'maintenance_updated';
      let details = `Maintenance record updated for device ${device ? device.assetTag : updatedRecord.deviceId}`;
      
      if (record.status && record.status !== currentRecord.status) {
        if (record.status === 'completed') {
          actionType = 'maintenance_completed';
          details = `Maintenance ${updatedRecord.maintenanceType} marked as completed for device ${device ? device.assetTag : updatedRecord.deviceId}`;
        } else if (record.status === 'in_progress') {
          actionType = 'maintenance_started';
          details = `Maintenance ${updatedRecord.maintenanceType} started for device ${device ? device.assetTag : updatedRecord.deviceId}`;
        } else if (record.status === 'cancelled') {
          actionType = 'maintenance_cancelled';
          details = `Maintenance ${updatedRecord.maintenanceType} cancelled for device ${device ? device.assetTag : updatedRecord.deviceId}`;
        }
      }
      
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType,
        details
      });
      
      return updatedRecord;
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      return undefined;
    }
  }

  async deleteMaintenanceRecord(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // Get the record for logging
      const record = await this.getMaintenanceRecordById(id);
      if (!record) return false;
      
      // Delete the record
      const result = await db.result(`
        DELETE FROM maintenance_records
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'maintenance_deleted',
          details: `Maintenance record deleted: ${record.maintenanceType} for device ${record.deviceAssetTag || record.deviceId}`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
      return false;
    }
  }

  async getScheduledMaintenance(): Promise<MaintenanceRecord[]> {
    const records = await db.any(`
      SELECT 
        mr.id, 
        mr.device_id as "deviceId", 
        mr.maintenance_type as "maintenanceType", 
        mr.description, 
        mr.scheduled_date as "scheduledDate", 
        mr.completed_date as "completedDate", 
        mr.cost, 
        mr.performed_by as "performedBy", 
        mr.status, 
        mr.notes, 
        mr.created_at as "createdAt",
        d.brand as "deviceBrand",
        d.model as "deviceModel",
        d.asset_tag as "deviceAssetTag"
      FROM maintenance_records mr
      LEFT JOIN devices d ON mr.device_id = d.id
      WHERE mr.status IN ('scheduled', 'in_progress')
      ORDER BY mr.scheduled_date ASC
    `);
    
    return records;
  }

  // QR/Barcode operations
  async getQrCodes(): Promise<QrCode[]> {
    const qrCodes = await db.any(`
      SELECT 
        qr.id, 
        qr.code, 
        qr.device_id as "deviceId", 
        qr.generated_at as "createdAt", 
        qr.last_scanned as "lastScanned", 
        qr.scan_count as "scanCount",
        d.id as "deviceId",
        d.brand,
        d.model,
        d.asset_tag as "assetTag"
      FROM qr_codes qr
      LEFT JOIN devices d ON qr.device_id = d.id
      ORDER BY qr.generated_at DESC
    `);
    
    // Transform the result to include nested device object
    return qrCodes.map(qr => {
      // Only include device data if we have the basic device information
      const device = qr.brand || qr.model || qr.assetTag ? {
        id: qr.deviceId,
        brand: qr.brand || '',
        model: qr.model || '',
        assetTag: qr.assetTag || ''
      } : undefined;
      
      // Remove the flattened device properties and add device object
      return {
        id: qr.id,
        code: qr.code,
        deviceId: qr.deviceId,
        createdAt: qr.createdAt,
        lastScanned: qr.lastScanned,
        scanCount: qr.scanCount,
        device
      };
    });
  }

  async getQrCodeById(id: number): Promise<QrCode | undefined> {
    try {
      const qrCode = await db.one(`
        SELECT 
          qr.id, 
          qr.code, 
          qr.device_id as "deviceId", 
          qr.generated_at as "createdAt", 
          qr.last_scanned as "lastScanned", 
          qr.scan_count as "scanCount",
          d.id as "deviceId",
          d.brand,
          d.model,
          d.asset_tag as "assetTag"
        FROM qr_codes qr
        LEFT JOIN devices d ON qr.device_id = d.id
        WHERE qr.id = $1
      `, [id]);
      
      // Transform to include device object
      const device = qrCode.brand || qrCode.model || qrCode.assetTag ? {
        id: qrCode.deviceId,
        brand: qrCode.brand || '',
        model: qrCode.model || '',
        assetTag: qrCode.assetTag || ''
      } : undefined;
      
      return {
        id: qrCode.id,
        code: qrCode.code,
        deviceId: qrCode.deviceId,
        createdAt: qrCode.createdAt,
        lastScanned: qrCode.lastScanned,
        scanCount: qrCode.scanCount,
        device
      };
    } catch (error) {
      return undefined;
    }
  }

  async getQrCodeByDeviceId(deviceId: number): Promise<QrCode | undefined> {
    try {
      const qrCode = await db.one(`
        SELECT 
          qr.id, 
          qr.code, 
          qr.device_id as "deviceId", 
          qr.generated_at as "createdAt", 
          qr.last_scanned as "lastScanned", 
          qr.scan_count as "scanCount",
          d.id as "deviceId",
          d.brand,
          d.model,
          d.asset_tag as "assetTag"
        FROM qr_codes qr
        LEFT JOIN devices d ON qr.device_id = d.id
        WHERE qr.device_id = $1
      `, [deviceId]);
      
      // Transform to include device object
      const device = qrCode.brand || qrCode.model || qrCode.assetTag ? {
        id: qrCode.deviceId,
        brand: qrCode.brand || '',
        model: qrCode.model || '',
        assetTag: qrCode.assetTag || ''
      } : undefined;
      
      return {
        id: qrCode.id,
        code: qrCode.code,
        deviceId: qrCode.deviceId,
        createdAt: qrCode.createdAt,
        lastScanned: qrCode.lastScanned,
        scanCount: qrCode.scanCount,
        device
      };
    } catch (error) {
      return undefined;
    }
  }

  async getQrCodeByCode(code: string): Promise<QrCode | undefined> {
    try {
      const qrCode = await db.one(`
        SELECT 
          qr.id, 
          qr.code, 
          qr.device_id as "deviceId", 
          qr.generated_at as "createdAt", 
          qr.last_scanned as "lastScanned", 
          qr.scan_count as "scanCount",
          d.id as "deviceId",
          d.brand,
          d.model,
          d.asset_tag as "assetTag"
        FROM qr_codes qr
        LEFT JOIN devices d ON qr.device_id = d.id
        WHERE qr.code = $1
      `, [code]);
      
      // Transform to include device object
      const device = qrCode.brand || qrCode.model || qrCode.assetTag ? {
        id: qrCode.deviceId,
        brand: qrCode.brand || '',
        model: qrCode.model || '',
        assetTag: qrCode.assetTag || ''
      } : undefined;
      
      return {
        id: qrCode.id,
        code: qrCode.code,
        deviceId: qrCode.deviceId,
        createdAt: qrCode.createdAt,
        lastScanned: qrCode.lastScanned,
        scanCount: qrCode.scanCount,
        device
      };
    } catch (error) {
      return undefined;
    }
  }

  async createQrCode(qrCode: InsertQrCode, loggedInUserId?: number): Promise<QrCode> {
    const newQrCode = await db.one(`
      INSERT INTO qr_codes (
        code, 
        device_id
      ) VALUES (
        $1, $2
      ) RETURNING 
        id, 
        code, 
        device_id as "deviceId", 
        generated_at as "createdAt", 
        last_scanned as "lastScanned", 
        scan_count as "scanCount"
    `, [
      qrCode.code,
      qrCode.deviceId || null
    ]);
    
    // Get device information if available
    let device;
    if (newQrCode.deviceId) {
      const deviceData = await this.getDeviceById(newQrCode.deviceId);
      if (deviceData) {
        device = {
          id: deviceData.id,
          brand: deviceData.brand,
          model: deviceData.model,
          assetTag: deviceData.assetTag
        };
      }
    }
    
    // Log activity
    await this.createActivityLog({
      userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
      actionType: 'qr_code_generated',
      details: newQrCode.deviceId && device
        ? `QR code generated for device ${device.assetTag || newQrCode.deviceId}`
        : `QR code generated: ${qrCode.code}`
    });
    
    // Return with device data
    const result = {
      id: newQrCode.id,
      code: newQrCode.code,
      deviceId: newQrCode.deviceId,
      createdAt: newQrCode.createdAt,
      lastScanned: newQrCode.lastScanned,
      scanCount: newQrCode.scanCount,
      device
    };
    
    return result;
  }

  async updateQrCode(id: number, qrCode: Partial<InsertQrCode>, loggedInUserId?: number): Promise<QrCode | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (qrCode.code !== undefined) {
        updates.push(`code = $${paramCount++}`);
        values.push(qrCode.code);
      }
      
      if (qrCode.deviceId !== undefined) {
        updates.push(`device_id = $${paramCount++}`);
        values.push(qrCode.deviceId);
      }
      
      // If no updates, return the QR code
      if (updates.length === 0) {
        return this.getQrCodeById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedQrCode = await db.one(`
        UPDATE qr_codes SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          code, 
          device_id as "deviceId", 
          generated_at as "createdAt", 
          last_scanned as "lastScanned", 
          scan_count as "scanCount"
      `, values);
      
      // Get device information if available
      let device;
      if (updatedQrCode.deviceId) {
        const deviceData = await this.getDeviceById(updatedQrCode.deviceId);
        if (deviceData) {
          device = {
            id: deviceData.id,
            brand: deviceData.brand,
            model: deviceData.model,
            assetTag: deviceData.assetTag
          };
        }
      }
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'qr_code_updated',
        details: `QR code updated: ${updatedQrCode.code}`
      });
      
      // Return with device data
      const result = {
        id: updatedQrCode.id,
        code: updatedQrCode.code,
        deviceId: updatedQrCode.deviceId,
        createdAt: updatedQrCode.createdAt,
        lastScanned: updatedQrCode.lastScanned,
        scanCount: updatedQrCode.scanCount,
        device
      };
      
      return result;
    } catch (error) {
      console.error('Error updating QR code:', error);
      return undefined;
    }
  }

  async deleteQrCode(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // Get the QR code for logging
      const qrCode = await this.getQrCodeById(id);
      if (!qrCode) return false;
      
      // Delete the QR code
      const result = await db.result(`
        DELETE FROM qr_codes
        WHERE id = $1
      `, [id]);
      
      if (result.rowCount > 0) {
        // Log activity
        await this.createActivityLog({
          userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
          actionType: 'qr_code_deleted',
          details: qrCode.deviceId && qrCode.device
            ? `QR code deleted for device ${qrCode.device.assetTag || qrCode.deviceId}`
            : `QR code deleted: ${qrCode.code}`
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting QR code:', error);
      return false;
    }
  }

  async recordQrCodeScan(id: number, loggedInUserId?: number, ipAddress?: string, userAgent?: string): Promise<QrCode | undefined> {
    try {
      // Update the scan count and last scanned time
      const updatedQrCode = await db.one(`
        UPDATE qr_codes SET
          scan_count = scan_count + 1,
          last_scanned = NOW()
        WHERE id = $1
        RETURNING 
          id, 
          code, 
          device_id as "deviceId", 
          generated_at as "createdAt", 
          last_scanned as "lastScanned", 
          scan_count as "scanCount"
      `, [id]);
      
      // Create scan history record
      await db.none(`
        INSERT INTO qr_code_scan_history (qr_code_id, user_id, ip_address, user_agent, scanned_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [id, loggedInUserId, ipAddress, userAgent]);
      
      // Get device information if available
      let device;
      if (updatedQrCode.deviceId) {
        const deviceData = await this.getDeviceById(updatedQrCode.deviceId);
        if (deviceData) {
          device = {
            id: deviceData.id,
            brand: deviceData.brand,
            model: deviceData.model,
            assetTag: deviceData.assetTag
          };
        }
      }
      
      // Log activity
      await this.createActivityLog({
        userId: loggedInUserId || 41, // Use logged-in user ID if provided, otherwise default to current admin (Tommy)
        actionType: 'qr_code_scanned',
        details: updatedQrCode.deviceId && device
          ? `QR code scanned for device ${device.assetTag || updatedQrCode.deviceId}`
          : `QR code scanned: ${updatedQrCode.code}`
      });
      
      // Return with device data
      const result = {
        id: updatedQrCode.id,
        code: updatedQrCode.code,
        deviceId: updatedQrCode.deviceId,
        createdAt: updatedQrCode.createdAt,
        lastScanned: updatedQrCode.lastScanned,
        scanCount: updatedQrCode.scanCount,
        device
      };
      
      return result;
    } catch (error) {
      console.error('Error recording QR code scan:', error);
      return undefined;
    }
  }

  async getQrCodeScanHistory(qrCodeId: number): Promise<any[]> {
    try {
      const history = await db.any(`
        SELECT 
          h.id,
          h.qr_code_id as "qrCodeId",
          h.user_id as "userId",
          h.scanned_at as "timestamp",
          h.ip_address as "ipAddress",
          h.user_agent as "userAgent",
          h.location,
          u.first_name as "firstName",
          u.last_name as "lastName"
        FROM qr_code_scan_history h
        LEFT JOIN users u ON h.user_id = u.id
        WHERE h.qr_code_id = $1
        ORDER BY h.scanned_at DESC
      `, [qrCodeId]);
      
      return history.map(scan => ({
        id: scan.id,
        qrCodeId: scan.qrCodeId,
        userId: scan.userId,
        timestamp: scan.timestamp,
        ipAddress: scan.ipAddress,
        userAgent: scan.userAgent,
        location: scan.location,
        scannedBy: scan.firstName && scan.lastName ? {
          id: scan.userId,
          name: `${scan.firstName} ${scan.lastName}`
        } : null
      }));
    } catch (error) {
      console.error('Error fetching QR code scan history:', error);
      return [];
    }
  }

  // Notification operations
  async getNotifications(userId: number, limit?: number): Promise<Notification[]> {
    const limitClause = limit ? `LIMIT ${limit}` : '';
    
    const notifications = await db.any(`
      SELECT 
        id, 
        user_id as "userId", 
        type, 
        title, 
        message, 
        is_read as "isRead", 
        related_id as "relatedId", 
        related_type as "relatedType", 
        created_at as "createdAt"
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      ${limitClause}
    `, [userId]);
    
    return notifications;
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    const notifications = await db.any(`
      SELECT 
        id, 
        user_id as "userId", 
        type, 
        title, 
        message, 
        is_read as "isRead", 
        related_id as "relatedId", 
        related_type as "relatedType", 
        created_at as "createdAt"
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
      ORDER BY created_at DESC
    `, [userId]);
    
    return notifications;
  }
  
  async getNotificationById(id: number): Promise<Notification | undefined> {
    try {
      const notification = await db.oneOrNone(`
        SELECT 
          id, 
          user_id as "userId", 
          type, 
          title, 
          message, 
          is_read as "isRead", 
          related_id as "relatedId", 
          related_type as "relatedType", 
          created_at as "createdAt"
        FROM notifications
        WHERE id = $1
      `, [id]);
      
      return notification;
    } catch (error) {
      console.error('Error fetching notification by ID:', error);
      return undefined;
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification = await db.one(`
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        is_read, 
        related_id, 
        related_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING 
        id, 
        user_id as "userId", 
        type, 
        title, 
        message, 
        is_read as "isRead", 
        related_id as "relatedId", 
        related_type as "relatedType", 
        created_at as "createdAt"
    `, [
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      notification.isRead || false,
      notification.relatedId || null,
      notification.relatedType || null
    ]);
    
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const updatedNotification = await db.one(`
        UPDATE notifications SET
          is_read = TRUE
        WHERE id = $1
        RETURNING 
          id, 
          user_id as "userId", 
          type, 
          title, 
          message, 
          is_read as "isRead", 
          related_id as "relatedId", 
          related_type as "relatedType", 
          created_at as "createdAt"
      `, [id]);
      
      return updatedNotification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return undefined;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      const result = await db.result(`
        DELETE FROM notifications
        WHERE id = $1
      `, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Branding operations
  async getBrandingSettings(): Promise<BrandingSettings | undefined> {
    try {
      // First check if we need to alter the table to add new columns
      await this.ensureBrandingColumns();
      
      // Now fetch the settings
      const branding = await db.one(`
        SELECT 
          id, 
          company_name as "companyName", 
          logo,
          favicon,
          primary_color as "primaryColor", 
          accent_color as "accentColor",
          site_name_color as "siteNameColor",
          site_name_color_secondary as "siteNameColorSecondary",
          site_name_gradient as "siteNameGradient",
          company_tagline as "companyTagline",
          support_email as "supportEmail",
          support_phone as "supportPhone",
          site_title as "siteTitle",
          site_description as "siteDescription",
          updated_at as "updatedAt"
        FROM branding_settings
        ORDER BY id ASC
        LIMIT 1
      `);
      
      return branding;
    } catch (error) {
      // If no branding settings exist, create default ones
      try {
        return await this.updateBrandingSettings({
          companyName: 'IT Asset Management',
          logo: '',
          primaryColor: '#1E40AF',
          accentColor: '#3B82F6',
          siteNameColor: '#1E40AF',
          siteNameColorSecondary: '#3B82F6',
          siteNameGradient: true
        });
      } catch (createError) {
        console.error('Error creating default branding settings:', createError);
        return undefined;
      }
    }
  }
  
  // Helper method to ensure the branding_settings table has the required columns
  private async ensureBrandingColumns(): Promise<void> {
    try {
      // Check if site_name_color column exists
      const result = await db.oneOrNone(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'branding_settings' AND column_name = 'site_name_color'
      `);
      
      // If it doesn't exist, add all the new columns
      if (!result) {
        console.log('Adding new columns to branding_settings table...');
        await db.none(`
          ALTER TABLE branding_settings 
          ADD COLUMN IF NOT EXISTS site_name_color TEXT DEFAULT '#1E40AF',
          ADD COLUMN IF NOT EXISTS site_name_color_secondary TEXT DEFAULT '#3B82F6',
          ADD COLUMN IF NOT EXISTS site_name_gradient BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS company_tagline TEXT DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS support_phone TEXT DEFAULT NULL
        `);
        console.log('Added new columns to branding_settings table');
      }
      
      // Check if favicon column exists
      const faviconResult = await db.oneOrNone(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'branding_settings' AND column_name = 'favicon'
      `);
      
      // If favicon column doesn't exist, add it
      if (!faviconResult) {
        console.log('Adding favicon column to branding_settings table...');
        await db.none(`
          ALTER TABLE branding_settings 
          ADD COLUMN IF NOT EXISTS favicon TEXT DEFAULT NULL
        `);
        console.log('Added favicon column to branding_settings table');
      }
      
      // Check if site_title column exists
      const siteTitleResult = await db.oneOrNone(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'branding_settings' AND column_name = 'site_title'
      `);
      
      // If site_title column doesn't exist, add site_title and site_description columns
      if (!siteTitleResult) {
        console.log('Adding site metadata columns to branding_settings table...');
        await db.none(`
          ALTER TABLE branding_settings 
          ADD COLUMN IF NOT EXISTS site_title TEXT DEFAULT 'IT Asset Manager',
          ADD COLUMN IF NOT EXISTS site_description TEXT DEFAULT 'A comprehensive IT asset management system for tracking hardware, software, and maintenance.'
        `);
        console.log('Added site metadata columns to branding_settings table');
      }
    } catch (error) {
      console.error('Error ensuring branding columns exist:', error);
    }
  }

  private async ensureImagesColumn(): Promise<void> {
    try {
      // Check if the images column exists in problem_report_messages table
      const columnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'problem_report_messages' AND column_name = 'images'
      `;
      
      const columns = await db.manyOrNone(columnQuery);
      
      if (columns.length === 0) {
        await db.none('ALTER TABLE problem_report_messages ADD COLUMN images JSONB');
        console.log('Added images column to problem_report_messages table');
      }
    } catch (error) {
      console.error('Error ensuring images column:', error);
    }
  }

  async updateBrandingSettings(settings: Partial<InsertBrandingSettings>): Promise<BrandingSettings> {
    try {
      // Check if branding settings already exist
      const existingSettings = await db.oneOrNone(`
        SELECT id FROM branding_settings LIMIT 1
      `);
      
      if (existingSettings) {
        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        
        if (settings.companyName !== undefined) {
          updates.push(`company_name = $${paramCount++}`);
          values.push(settings.companyName);
        }
        
        if (settings.logo !== undefined) {
          updates.push(`logo = $${paramCount++}`);
          values.push(settings.logo);
        }
        
        if (settings.favicon !== undefined) {
          updates.push(`favicon = $${paramCount++}`);
          values.push(settings.favicon);
        }
        
        if (settings.primaryColor !== undefined) {
          updates.push(`primary_color = $${paramCount++}`);
          values.push(settings.primaryColor);
        }
        
        if (settings.accentColor !== undefined) {
          updates.push(`accent_color = $${paramCount++}`);
          values.push(settings.accentColor);
        }
        
        if (settings.siteNameColor !== undefined) {
          updates.push(`site_name_color = $${paramCount++}`);
          values.push(settings.siteNameColor);
        }
        
        if (settings.siteNameColorSecondary !== undefined) {
          updates.push(`site_name_color_secondary = $${paramCount++}`);
          values.push(settings.siteNameColorSecondary);
        }
        
        if (settings.siteNameGradient !== undefined) {
          updates.push(`site_name_gradient = $${paramCount++}`);
          values.push(settings.siteNameGradient);
        }
        
        if (settings.companyTagline !== undefined) {
          updates.push(`company_tagline = $${paramCount++}`);
          values.push(settings.companyTagline);
        }
        
        if (settings.supportEmail !== undefined) {
          updates.push(`support_email = $${paramCount++}`);
          values.push(settings.supportEmail);
        }
        
        if (settings.supportPhone !== undefined) {
          updates.push(`support_phone = $${paramCount++}`);
          values.push(settings.supportPhone);
        }
        
        if (settings.siteTitle !== undefined) {
          updates.push(`site_title = $${paramCount++}`);
          values.push(settings.siteTitle);
        }
        
        if (settings.siteDescription !== undefined) {
          updates.push(`site_description = $${paramCount++}`);
          values.push(settings.siteDescription);
        }
        
        updates.push(`updated_at = NOW()`);
        
        // Update existing settings
        values.push(existingSettings.id);
        
        const updatedSettings = await db.one(`
          UPDATE branding_settings SET
            ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING 
            id, 
            company_name as "companyName", 
            logo,
            favicon, 
            primary_color as "primaryColor", 
            accent_color as "accentColor",
            site_name_color as "siteNameColor",
            site_name_color_secondary as "siteNameColorSecondary",
            site_name_gradient as "siteNameGradient", 
            company_tagline as "companyTagline",
            support_email as "supportEmail",
            support_phone as "supportPhone",
            site_title as "siteTitle",
            site_description as "siteDescription",
            updated_at as "updatedAt"
        `, values);
        
        return updatedSettings;
      } else {
        // Create new settings
        const newSettings = await db.one(`
          INSERT INTO branding_settings (
            company_name, 
            logo,
            favicon,
            primary_color, 
            accent_color,
            site_name_color,
            site_name_color_secondary,
            site_name_gradient,
            company_tagline,
            support_email,
            support_phone,
            site_title,
            site_description
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          ) RETURNING 
            id, 
            company_name as "companyName", 
            logo,
            favicon,
            primary_color as "primaryColor", 
            accent_color as "accentColor",
            site_name_color as "siteNameColor",
            site_name_color_secondary as "siteNameColorSecondary",
            site_name_gradient as "siteNameGradient", 
            company_tagline as "companyTagline",
            support_email as "supportEmail",
            support_phone as "supportPhone",
            site_title as "siteTitle",
            site_description as "siteDescription",
            updated_at as "updatedAt"
        `, [
          settings.companyName || 'IT Asset Management',
          settings.logo || '',
          settings.favicon || '',
          settings.primaryColor || '#1E40AF',
          settings.accentColor || '#3B82F6',
          settings.siteNameColor || '#1E40AF',
          settings.siteNameColorSecondary || '#3B82F6',
          settings.siteNameGradient !== undefined ? settings.siteNameGradient : true,
          settings.companyTagline || '',
          settings.supportEmail || '',
          settings.supportPhone || '',
          settings.siteTitle || 'IT Asset Manager',
          settings.siteDescription || 'A comprehensive IT asset management system for tracking hardware, software, and maintenance.'
        ]);
        
        return newSettings;
      }
    } catch (error) {
      console.error('Error updating branding settings:', error);
      throw error;
    }
  }
  
  // Email settings operations
  async getEmailSettings(): Promise<EmailSettings | undefined> {
    try {
      const settings = await db.one(`
        SELECT 
          id,
          api_key as "apiKey",
          domain,
          from_email as "fromEmail",
          from_name as "fromName",
          is_enabled as "isEnabled",
          updated_at as "updatedAt"
        FROM email_settings
        ORDER BY id
        LIMIT 1
      `);
      return settings;
    } catch (error) {
      // If no records found, return undefined
      return undefined;
    }
  }

  async updateEmailSettings(settings: Partial<InsertEmailSettings>): Promise<EmailSettings> {
    try {
      // Check if email settings already exist
      const existingSettings = await db.oneOrNone(`
        SELECT id FROM email_settings LIMIT 1
      `);
      
      if (existingSettings) {
        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        
        if (settings.apiKey !== undefined) {
          updates.push(`api_key = $${paramCount++}`);
          values.push(settings.apiKey);
        }
        
        if (settings.domain !== undefined) {
          updates.push(`domain = $${paramCount++}`);
          values.push(settings.domain);
        }
        
        if (settings.fromEmail !== undefined) {
          updates.push(`from_email = $${paramCount++}`);
          values.push(settings.fromEmail);
        }
        
        if (settings.fromName !== undefined) {
          updates.push(`from_name = $${paramCount++}`);
          values.push(settings.fromName);
        }
        
        if (settings.isEnabled !== undefined) {
          updates.push(`is_enabled = $${paramCount++}`);
          values.push(settings.isEnabled);
        }
        
        updates.push(`updated_at = NOW()`);
        
        // Update existing settings
        values.push(existingSettings.id);
        
        const updatedSettings = await db.one(`
          UPDATE email_settings SET
            ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING 
            id,
            api_key as "apiKey",
            domain,
            from_email as "fromEmail",
            from_name as "fromName",
            is_enabled as "isEnabled",
            updated_at as "updatedAt"
        `, values);
        
        return updatedSettings;
      } else {
        // Create new settings
        const newSettings = await db.one(`
          INSERT INTO email_settings (
            api_key,
            domain,
            from_email,
            from_name,
            is_enabled
          ) VALUES (
            $1, $2, $3, $4, $5
          ) RETURNING 
            id,
            api_key as "apiKey",
            domain,
            from_email as "fromEmail",
            from_name as "fromName",
            is_enabled as "isEnabled",
            updated_at as "updatedAt"
        `, [
          settings.apiKey || null,
          settings.domain || null,
          settings.fromEmail || null,
          settings.fromName || null,
          settings.isEnabled !== undefined ? settings.isEnabled : false
        ]);
        
        return newSettings;
      }
    } catch (error) {
      console.error('Error updating email settings:', error);
      throw error;
    }
  }

  // Department CRUD operations
  async getDepartments(): Promise<Department[]> {
    try {
      const departments = await db.manyOrNone(`
        SELECT 
          d.id, 
          d.name, 
          d.description, 
          d.manager, 
          d.budget, 
          d.created_at as "createdAt",
          COUNT(CASE WHEN u.is_manager = true AND u.managed_department_ids IS NOT NULL 
                AND (u.managed_department_ids::text LIKE '%[' || d.id || ',%' 
                     OR u.managed_department_ids::text LIKE '%,' || d.id || ',%'
                     OR u.managed_department_ids::text LIKE '%,' || d.id || ']%'
                     OR u.managed_department_ids::text = '[' || d.id || ']')
                THEN 1 END) as "managerCount",
          STRING_AGG(
            CASE WHEN u.is_manager = true AND u.managed_department_ids IS NOT NULL 
                 AND (u.managed_department_ids::text LIKE '%[' || d.id || ',%' 
                      OR u.managed_department_ids::text LIKE '%,' || d.id || ',%'
                      OR u.managed_department_ids::text LIKE '%,' || d.id || ']%'
                      OR u.managed_department_ids::text = '[' || d.id || ']')
                 THEN u.first_name || ' ' || u.last_name 
                 END, 
            ', '
          ) as "assignedManagers"
        FROM departments d
        LEFT JOIN users u ON u.active = true
        GROUP BY d.id, d.name, d.description, d.manager, d.budget, d.created_at
        ORDER BY d.name ASC
      `);
      return departments || [];
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  }
  
  async getDepartmentById(id: number): Promise<Department | undefined> {
    try {
      const department = await db.oneOrNone(`
        SELECT 
          id, 
          name, 
          description, 
          manager, 
          budget, 
          created_at as "createdAt"
        FROM departments 
        WHERE id = $1
      `, [id]);
      return department || undefined;
    } catch (error) {
      console.error('Error getting department by ID:', error);
      throw error;
    }
  }
  
  async getDepartmentByName(name: string): Promise<Department | undefined> {
    try {
      const department = await db.oneOrNone(`
        SELECT 
          id, 
          name, 
          description, 
          manager, 
          budget, 
          created_at as "createdAt"
        FROM departments 
        WHERE name = $1
      `, [name]);
      return department || undefined;
    } catch (error) {
      console.error('Error getting department by name:', error);
      throw error;
    }
  }
  
  async createDepartment(department: InsertDepartment, loggedInUserId?: number): Promise<Department> {
    try {
      // Create the department
      const newDepartment = await db.one(`
        INSERT INTO departments (
          name, 
          description, 
          manager, 
          budget,
          created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING 
          id, 
          name, 
          description, 
          manager, 
          budget, 
          created_at as "createdAt"
      `, [
        department.name,
        department.description || null,
        department.manager || null,
        department.budget || null
      ]);
      
      // Log the activity
      if (loggedInUserId) {
        await this.createActivityLog({
          userId: loggedInUserId,
          actionType: 'department_added',
          details: `Department "${department.name}" created`
        });
      }
      
      return newDepartment;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }
  
  async updateDepartment(id: number, department: Partial<InsertDepartment>, loggedInUserId?: number): Promise<Department | undefined> {
    try {
      // Check if the department exists
      const existingDept = await this.getDepartmentById(id);
      if (!existingDept) {
        return undefined;
      }
      
      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (department.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(department.name);
      }
      
      if (department.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(department.description);
      }
      
      if (department.manager !== undefined) {
        updates.push(`manager = $${paramCount++}`);
        values.push(department.manager);
      }
      
      if (department.budget !== undefined) {
        updates.push(`budget = $${paramCount++}`);
        values.push(department.budget);
      }
      
      if (updates.length === 0) {
        return existingDept; // No updates to make
      }
      
      // Add the ID as the last parameter
      values.push(id);
      
      // Execute the update
      const updatedDepartment = await db.oneOrNone(`
        UPDATE departments
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, 
          name, 
          description, 
          manager, 
          budget, 
          created_at as "createdAt"
      `, values);
      
      // Log the activity
      if (loggedInUserId && updatedDepartment) {
        await this.createActivityLog({
          userId: loggedInUserId,
          actionType: 'department_updated',
          details: `Department "${updatedDepartment.name}" updated`
        });
      }
      
      return updatedDepartment || undefined;
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }
  
  async deleteDepartment(id: number, loggedInUserId?: number): Promise<boolean> {
    try {
      // Check if the department exists
      const department = await this.getDepartmentById(id);
      if (!department) {
        return false;
      }
      
      // Check if any users are assigned to this department
      const usersInDept = await this.getUsersByDepartment(department.name);
      if (usersInDept.length > 0) {
        // Don't delete if users are still associated
        return false;
      }
      
      // Delete the department
      await db.none(`
        DELETE FROM departments WHERE id = $1
      `, [id]);
      
      // Log the activity
      if (loggedInUserId) {
        await this.createActivityLog({
          userId: loggedInUserId,
          actionType: 'department_deleted',
          details: `Department "${department.name}" deleted`
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  }
  
  // Method to get all users in a specific department by ID
  async getUsersByDepartmentId(departmentId: number): Promise<User[]> {
    try {
      const department = await this.getDepartmentById(departmentId);
      if (!department) {
        return [];
      }
      
      return this.getUsersByDepartment(department.name);
    } catch (error) {
      console.error('Error getting users by department ID:', error);
      throw error;
    }
  }

  async getDepartmentManager(departmentId: number): Promise<User | undefined> {
    try {
      const manager = await this.db.oneOrNone(`
        SELECT * FROM users 
        WHERE department_id = $1 AND is_manager = true AND active = true
        LIMIT 1
      `, [departmentId]);
      return manager || undefined;
    } catch (error) {
      console.error('Error getting department manager:', error);
      throw error;
    }
  }

  // Problem Report Methods
  async getProblemReports(status?: string, userId?: number): Promise<any[]> {
    try {
      let query = `
        SELECT pr.*, 
               u.first_name as user_first_name, u.last_name as user_last_name,
               a.first_name as assigned_to_first_name, a.last_name as assigned_to_last_name,
               c.first_name as completed_by_first_name, c.last_name as completed_by_last_name
        FROM problem_reports pr
        LEFT JOIN users u ON pr.user_id = u.id
        LEFT JOIN users a ON pr.assigned_to_id = a.id
        LEFT JOIN users c ON pr.completed_by_id = c.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (status) {
        query += ` AND pr.status = $${params.length + 1}`;
        params.push(status);
      }
      
      if (userId) {
        query += ` AND pr.user_id = $${params.length + 1}`;
        params.push(userId);
      }
      
      query += ` ORDER BY pr.created_at DESC`;
      
      const result = await db.any(query, params);
      return result.map(this.transformProblemReport);
    } catch (error) {
      console.error('Error getting problem reports:', error);
      throw error;
    }
  }

  async getProblemReportById(id: number): Promise<any | undefined> {
    try {
      const query = `
        SELECT pr.*, 
               u.first_name as user_first_name, u.last_name as user_last_name,
               a.first_name as assigned_to_first_name, a.last_name as assigned_to_last_name,
               c.first_name as completed_by_first_name, c.last_name as completed_by_last_name
        FROM problem_reports pr
        LEFT JOIN users u ON pr.user_id = u.id
        LEFT JOIN users a ON pr.assigned_to_id = a.id
        LEFT JOIN users c ON pr.completed_by_id = c.id
        WHERE pr.id = $1
      `;
      
      const result = await db.oneOrNone(query, [id]);
      return result ? this.transformProblemReport(result) : undefined;
    } catch (error) {
      console.error('Error getting problem report by ID:', error);
      return undefined;
    }
  }

  async createProblemReport(report: any, loggedInUserId?: number): Promise<any> {
    try {
      const query = `
        INSERT INTO problem_reports (user_id, type, item_id, subject, description, priority, status, assigned_to_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const result = await db.one(query, [
        report.userId,
        report.type,
        report.itemId,
        report.subject,
        report.description,
        report.priority || 'medium',
        report.status || 'open',
        report.assignedToId || null
      ]);
      
      const newReport = this.transformProblemReport(result);
      
      if (loggedInUserId) {
        await this.createActivityLog({
          userId: loggedInUserId,
          actionType: 'problem_report_created',
          details: `Problem report created: ${report.subject} (Priority: ${report.priority})`
        });
      }
      
      return newReport;
    } catch (error) {
      console.error('Error creating problem report:', error);
      throw error;
    }
  }

  async updateProblemReport(id: number, report: any, loggedInUserId?: number): Promise<any | undefined> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;
      
      if (report.subject !== undefined) {
        fields.push(`subject = $${paramCount}`);
        values.push(report.subject);
        paramCount++;
      }
      
      if (report.description !== undefined) {
        fields.push(`description = $${paramCount}`);
        values.push(report.description);
        paramCount++;
      }
      
      if (report.priority !== undefined) {
        fields.push(`priority = $${paramCount}`);
        values.push(report.priority);
        paramCount++;
      }
      
      if (report.status !== undefined) {
        fields.push(`status = $${paramCount}`);
        values.push(report.status);
        paramCount++;
      }
      
      if (report.assignedToId !== undefined) {
        fields.push(`assigned_to_id = $${paramCount}`);
        values.push(report.assignedToId);
        paramCount++;
      }
      
      if (fields.length === 0) {
        return this.getProblemReportById(id);
      }
      
      fields.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `
        UPDATE problem_reports 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await db.oneOrNone(query, values);
      
      if (!result) {
        return undefined;
      }
      
      const updatedReport = this.transformProblemReport(result);
      
      if (loggedInUserId) {
        await this.createActivityLog({
          userId: loggedInUserId,
          actionType: 'problem_report_updated',
          details: `Problem report updated: ${updatedReport.subject}`
        });
      }
      
      return updatedReport;
    } catch (error) {
      console.error('Error updating problem report:', error);
      return undefined;
    }
  }

  async completeProblemReport(id: number, loggedInUserId: number): Promise<any | undefined> {
    try {
      const query = `
        UPDATE problem_reports 
        SET status = 'completed', completed_at = NOW(), completed_by_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await db.oneOrNone(query, [loggedInUserId, id]);
      
      if (!result) {
        return undefined;
      }
      
      const completedReport = this.transformProblemReport(result);
      
      await this.createActivityLog({
        userId: loggedInUserId,
        actionType: 'problem_report_completed',
        details: `Problem report completed: ${completedReport.subject}`
      });
      
      return completedReport;
    } catch (error) {
      console.error('Error completing problem report:', error);
      return undefined;
    }
  }

  async archiveProblemReport(id: number, loggedInUserId?: number): Promise<any | undefined> {
    try {
      const query = `
        UPDATE problem_reports 
        SET status = 'archived', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.oneOrNone(query, [id]);
      
      if (!result) {
        return undefined;
      }
      
      const archivedReport = this.transformProblemReport(result);
      
      if (loggedInUserId) {
        await this.createActivityLog({
          userId: loggedInUserId,
          actionType: 'problem_report_archived',
          details: `Problem report archived: ${archivedReport.subject}`
        });
      }
      
      return archivedReport;
    } catch (error) {
      console.error('Error archiving problem report:', error);
      return undefined;
    }
  }

  // Problem Report Messages Methods
  async getProblemReportMessages(problemReportId: number): Promise<any[]> {
    try {
      // First, ensure the images column exists
      await this.ensureImagesColumn();
      
      const query = `
        SELECT prm.*, 
               u.first_name as user_first_name, u.last_name as user_last_name,
               u.role as user_role
        FROM problem_report_messages prm
        LEFT JOIN users u ON prm.user_id = u.id
        WHERE prm.problem_report_id = $1
        ORDER BY prm.created_at ASC
      `;
      
      const result = await db.any(query, [problemReportId]);
      return result.map(this.transformProblemReportMessage);
    } catch (error) {
      console.error('Error getting problem report messages:', error);
      throw error;
    }
  }

  async createProblemReportMessage(message: any, loggedInUserId?: number): Promise<any> {
    try {
      // First, ensure the images column exists
      await this.ensureImagesColumn();
      
      const query = `
        INSERT INTO problem_report_messages (problem_report_id, user_id, message, is_internal, images)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await db.one(query, [
        message.problemReportId,
        message.userId,
        message.message,
        message.isInternal || false,
        message.images && message.images.length > 0 ? JSON.stringify(message.images) : null
      ]);
      
      const newMessage = this.transformProblemReportMessage(result);
      
      // Update the problem report's updated_at timestamp
      await db.none(
        'UPDATE problem_reports SET updated_at = NOW() WHERE id = $1',
        [message.problemReportId]
      );
      
      if (loggedInUserId) {
        await this.createActivityLog({
          userId: loggedInUserId,
          actionType: 'problem_report_message_added',
          details: `Message added to problem report #${message.problemReportId}`
        });
      }
      
      return newMessage;
    } catch (error) {
      console.error('Error creating problem report message:', error);
      throw error;
    }
  }

  private transformProblemReport(row: any): any {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      itemId: row.item_id,
      subject: row.subject,
      description: row.description,
      priority: row.priority,
      status: row.status,
      assignedToId: row.assigned_to_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      completedById: row.completed_by_id,
      // Additional fields from joins
      userFirstName: row.user_first_name,
      userLastName: row.user_last_name,
      assignedToFirstName: row.assigned_to_first_name,
      assignedToLastName: row.assigned_to_last_name,
      completedByFirstName: row.completed_by_first_name,
      completedByLastName: row.completed_by_last_name
    };
  }

  private transformProblemReportMessage(row: any): any {
    let images = [];
    if (row.images) {
      try {
        // PostgreSQL JSONB with pg-promise should return the parsed JSON directly
        if (Array.isArray(row.images)) {
          images = row.images;
        } else if (typeof row.images === 'string') {
          // If it's a string, parse it
          images = JSON.parse(row.images);
        } else {
          // If it's any other type, convert to array
          images = [row.images];
        }
      } catch (error) {
        console.error('Error parsing images JSON:', error, 'Raw images:', row.images);
        images = [];
      }
    }

    return {
      id: row.id,
      problemReportId: row.problem_report_id,
      userId: row.user_id,
      message: row.message,
      isInternal: row.is_internal,
      createdAt: row.created_at,
      images: images,
      // Additional fields from joins
      userFirstName: row.user_first_name,
      userLastName: row.user_last_name,
      userRole: row.user_role
    };
  }

  // Problem Report Attachments Methods
  async getProblemReportAttachments(problemReportId: number): Promise<any[]> {
    try {
      const query = `
        SELECT pra.*, 
               u.first_name as uploaded_by_first_name, 
               u.last_name as uploaded_by_last_name
        FROM problem_report_attachments pra
        LEFT JOIN users u ON pra.uploaded_by = u.id
        WHERE pra.problem_report_id = $1
        ORDER BY pra.created_at ASC
      `;
      
      const result = await db.any(query, [problemReportId]);
      return result.map(this.transformProblemReportAttachment);
    } catch (error) {
      console.error('Error getting problem report attachments:', error);
      throw error;
    }
  }

  async getProblemReportAttachmentById(id: number): Promise<any | undefined> {
    try {
      const query = `
        SELECT pra.*, 
               u.first_name as uploaded_by_first_name, 
               u.last_name as uploaded_by_last_name
        FROM problem_report_attachments pra
        LEFT JOIN users u ON pra.uploaded_by = u.id
        WHERE pra.id = $1
      `;
      
      const result = await db.oneOrNone(query, [id]);
      return result ? this.transformProblemReportAttachment(result) : undefined;
    } catch (error) {
      console.error('Error getting problem report attachment by ID:', error);
      throw error;
    }
  }

  async createProblemReportAttachment(attachment: any): Promise<any> {
    try {
      const query = `
        INSERT INTO problem_report_attachments 
        (problem_report_id, file_name, original_name, file_type, file_size, file_path, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await db.one(query, [
        attachment.problemReportId,
        attachment.fileName,
        attachment.originalName,
        attachment.fileType,
        attachment.fileSize,
        attachment.filePath,
        attachment.uploadedBy
      ]);
      
      return this.transformProblemReportAttachment(result);
    } catch (error) {
      console.error('Error creating problem report attachment:', error);
      throw error;
    }
  }

  async deleteProblemReportAttachment(id: number): Promise<boolean> {
    try {
      const result = await db.result(`
        DELETE FROM problem_report_attachments
        WHERE id = $1
      `, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting problem report attachment:', error);
      return false;
    }
  }

  private transformProblemReportAttachment(row: any): any {
    return {
      id: row.id,
      problemReportId: row.problem_report_id,
      fileName: row.file_name,
      originalName: row.original_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      filePath: row.file_path,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
      // Additional fields from joins
      uploadedByFirstName: row.uploaded_by_first_name,
      uploadedByLastName: row.uploaded_by_last_name
    };
  }

  // Game High Score operations
  async getGameHighScore(gameName: string): Promise<any | undefined> {
    try {
      const highScore = await db.one(`
        SELECT 
          id,
          game_name as "gameName",
          high_score as "highScore",
          player_name as "playerName",
          user_id as "userId",
          achieved_at as "achievedAt",
          updated_at as "updatedAt"
        FROM game_high_scores 
        WHERE game_name = $1
      `, [gameName]);
      return highScore;
    } catch (error) {
      return undefined;
    }
  }

  async updateGameHighScore(gameName: string, score: number, playerName?: string, userId?: number): Promise<any> {
    try {
      // Try to update existing record
      const result = await db.result(`
        UPDATE game_high_scores 
        SET 
          high_score = $2,
          player_name = $3,
          user_id = $4,
          achieved_at = NOW(),
          updated_at = NOW()
        WHERE game_name = $1 AND high_score < $2
      `, [gameName, score, playerName || null, userId || null]);

      if (result.rowCount === 0) {
        // No existing record or score wasn't higher, try to insert or get existing
        try {
          await db.one(`
            INSERT INTO game_high_scores (game_name, high_score, player_name, user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `, [gameName, score, playerName || null, userId || null]);
        } catch (insertError) {
          // Record exists but score wasn't higher, just return current high score
        }
      }

      // Return the current high score
      return await this.getGameHighScore(gameName);
    } catch (error) {
      console.error('Error updating game high score:', error);
      throw error;
    }
  }

  async getGameLeaderboard(gameName: string, limit: number = 5): Promise<any[]> {
    try {
      const leaderboard = await db.any(`
        SELECT 
          id,
          game_name as "gameName",
          score,
          player_name as "playerName",
          user_id as "userId",
          achieved_at as "achievedAt"
        FROM game_leaderboard 
        WHERE game_name = $1 
        ORDER BY score DESC 
        LIMIT $2
      `, [gameName, limit]);
      
      return leaderboard;
    } catch (error) {
      console.error('Error getting game leaderboard:', error);
      return [];
    }
  }

  async addGameLeaderboardEntry(gameName: string, score: number, playerName: string, userId?: number): Promise<any> {
    try {
      // First check if player already exists - get the highest score entry for this player
      const existingEntry = await db.oneOrNone(`
        SELECT 
          id,
          game_name as "gameName",
          score,
          player_name as "playerName",
          user_id as "userId",
          achieved_at as "achievedAt"
        FROM game_leaderboard 
        WHERE game_name = $1 AND player_name = $2
        ORDER BY score DESC, achieved_at DESC
        LIMIT 1
      `, [gameName, playerName]);
      
      if (existingEntry) {
        // Update existing entry if new score is higher
        if (score > existingEntry.score) {
          // First, delete all existing entries for this player to avoid duplicates
          await db.none(`
            DELETE FROM game_leaderboard 
            WHERE game_name = $1 AND player_name = $2
          `, [gameName, playerName]);
          
          // Then create a new entry with the higher score
          const updatedEntry = await db.one(`
            INSERT INTO game_leaderboard (game_name, score, player_name, user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING 
              id,
              game_name as "gameName",
              score,
              player_name as "playerName",
              user_id as "userId",
              achieved_at as "achievedAt"
          `, [gameName, score, playerName, userId || null]);
          
          return updatedEntry;
        } else {
          // Return existing entry if score is not higher
          return existingEntry;
        }
      } else {
        // Create new entry if player doesn't exist
        const entry = await db.one(`
          INSERT INTO game_leaderboard (game_name, score, player_name, user_id)
          VALUES ($1, $2, $3, $4)
          RETURNING 
            id,
            game_name as "gameName",
            score,
            player_name as "playerName",
            user_id as "userId",
            achieved_at as "achievedAt"
        `, [gameName, score, playerName, userId || null]);
        
        return entry;
      }
    } catch (error) {
      console.error('Error adding game leaderboard entry:', error);
      throw error;
    }
  }
}