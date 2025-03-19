import { 
  type Category, type Device, type User, type AssignmentHistory, type ActivityLog,
  type Software, type SoftwareAssignment, type MaintenanceRecord, type QrCode,
  type Notification, type BrandingSettings,
  type InsertCategory, type InsertDevice, type InsertUser, 
  type InsertAssignmentHistory, type InsertActivityLog,
  type InsertSoftware, type InsertSoftwareAssignment, type InsertMaintenanceRecord,
  type InsertQrCode, type InsertNotification, type InsertBrandingSettings
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";

export class DatabaseStorage implements IStorage {
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
        created_at as "createdAt" 
      FROM users
      ORDER BY last_name, first_name
    `);
    return users;
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

  async createUser(user: InsertUser): Promise<User> {
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
      userId: 1, // Admin user ID
      actionType: 'user_added',
      details: `User created: ${user.firstName} ${user.lastName}`
    });
    
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
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
          created_at as "createdAt"
      `, values);
      
      // Log activity
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'user_updated',
        details: `User updated: ${updatedUser.firstName} ${updatedUser.lastName}`
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
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
          userId: 1, // Admin user ID
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
  
  // Category operations
  async getCategories(): Promise<Category[]> {
    const categories = await db.any(`
      SELECT id, name, description
      FROM categories
      ORDER BY name
    `);
    return categories;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    try {
      const category = await db.one(`
        SELECT id, name, description
        FROM categories
        WHERE id = $1
      `, [id]);
      return category;
    } catch (error) {
      return undefined;
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
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
      userId: 1, // Admin user ID
      actionType: 'category_added',
      details: `Category created: ${category.name}`
    });
    
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
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
      
      // If no updates, return the category
      if (updates.length === 0) {
        return this.getCategoryById(id);
      }
      
      values.push(id); // Add id as the last parameter
      
      const updatedCategory = await db.one(`
        UPDATE categories SET
          ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, description
      `, values);
      
      // Log activity
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'category_updated',
        details: `Category updated: ${updatedCategory.name}`
      });
      
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
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
          userId: 1, // Admin user ID
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

  async createDevice(device: InsertDevice): Promise<Device> {
    const newDevice = await db.one(`
      INSERT INTO devices (
        brand, 
        model, 
        serial_number, 
        asset_tag, 
        category_id, 
        purchase_cost, 
        purchase_date, 
        purchased_by, 
        warranty_eol
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING 
        id, 
        brand, 
        model, 
        serial_number as "serialNumber", 
        asset_tag as "assetTag", 
        category_id as "categoryId", 
        purchase_cost as "purchaseCost", 
        purchase_date as "purchaseDate", 
        purchased_by as "purchasedBy", 
        warranty_eol as "warrantyEOL", 
        created_at as "createdAt", 
        user_id as "userId"
    `, [
      device.brand, 
      device.model, 
      device.serialNumber, 
      device.assetTag, 
      device.categoryId || null, 
      device.purchaseCost || null, 
      device.purchaseDate || null, 
      device.purchasedBy || null, 
      device.warrantyEOL || null
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
      userId: 1, // Admin user ID
      actionType: 'device_added',
      details: `Device added: ${device.brand} ${device.model} (${device.assetTag})`
    });
    
    return newDevice;
  }

  async updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
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
          brand, 
          model, 
          serial_number as "serialNumber", 
          asset_tag as "assetTag", 
          category_id as "categoryId", 
          purchase_cost as "purchaseCost", 
          purchase_date as "purchaseDate", 
          purchased_by as "purchasedBy", 
          warranty_eol as "warrantyEOL", 
          created_at as "createdAt", 
          user_id as "userId"
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
        userId: 1, // Admin user ID
        actionType: 'device_updated',
        details: `Device updated: ${updatedDevice.brand} ${updatedDevice.model} (${updatedDevice.assetTag})`
      });
      
      return updatedDevice;
    } catch (error) {
      console.error('Error updating device:', error);
      return undefined;
    }
  }

  async deleteDevice(id: number): Promise<boolean> {
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
          userId: 1, // Admin user ID
          actionType: 'device_deleted',
          details: `Device deleted: ${device.brand} ${device.model} (${device.assetTag})`
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
        c.name as "categoryName"
      FROM devices d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.category_id = $1 AND (d.deleted = FALSE OR d.deleted IS NULL)
    `, [categoryId]);
    
    return devices;
  }

  async getDevicesByUser(userId: number): Promise<Device[]> {
    const devices = await db.any(`
      SELECT 
        d.id, 
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
      
      // Update device
      const updatedDevice = await db.one(`
        UPDATE devices SET
          user_id = $1
        WHERE id = $2
        RETURNING 
          id, 
          brand, 
          model, 
          serial_number as "serialNumber", 
          asset_tag as "assetTag", 
          category_id as "categoryId", 
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
      
      // Create assignment history record
      await this.createAssignmentHistory({
        deviceId,
        userId,
        assignedBy,
        assignedAt: new Date(),
        unassignedAt: null,
        notes: `Assigned to ${user.firstName} ${user.lastName}`
      });
      
      // Log activity
      await this.createActivityLog({
        userId: assignedBy,
        actionType: 'device_assigned',
        details: `Device ${device.brand} ${device.model} (${device.assetTag}) assigned to ${user.firstName} ${user.lastName}`
      });
      
      return updatedDevice;
    } catch (error) {
      console.error('Error assigning device:', error);
      return undefined;
    }
  }

  async unassignDevice(deviceId: number): Promise<Device | undefined> {
    try {
      // Get the device
      const device = await this.getDeviceById(deviceId);
      if (!device || !device.userId) return device;
      
      // Get the user who had the device
      const previousUser = await this.getUserById(device.userId);
      
      // Update the device
      const updatedDevice = await db.one(`
        UPDATE devices SET
          user_id = NULL
        WHERE id = $1
        RETURNING 
          id, 
          brand, 
          model, 
          serial_number as "serialNumber", 
          asset_tag as "assetTag", 
          category_id as "categoryId", 
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
      
      // Update assignment history
      // Find the latest assignment for this device
      const latestAssignment = await db.oneOrNone(`
        SELECT id FROM assignment_history
        WHERE device_id = $1 AND user_id = $2 AND unassigned_at IS NULL
        ORDER BY assigned_at DESC
        LIMIT 1
      `, [deviceId, device.userId]);
      
      if (latestAssignment) {
        await db.none(`
          UPDATE assignment_history SET
            unassigned_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [latestAssignment.id]);
      }
      
      // Log activity
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'device_unassigned',
        details: previousUser 
          ? `Device ${device.brand} ${device.model} (${device.assetTag}) unassigned from ${previousUser.firstName} ${previousUser.lastName}`
          : `Device ${device.brand} ${device.model} (${device.assetTag}) unassigned`
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
        u.first_name || ' ' || u.last_name as "userName"
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    const logs = await db.any(query);
    return logs;
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
          created_at as "createdAt"
        FROM software
        WHERE id = $1
      `, [id]);
      return software;
    } catch (error) {
      return undefined;
    }
  }

  async createSoftware(software: InsertSoftware): Promise<Software> {
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
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
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
      software.status || 'active'
    ]);
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'software_added',
      details: `Software added: ${software.name} (${software.vendor})`
    });
    
    return newSoftware;
  }

  async updateSoftware(id: number, software: Partial<InsertSoftware>): Promise<Software | undefined> {
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
          created_at as "createdAt"
      `, values);
      
      // Log activity
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'software_updated',
        details: `Software updated: ${updatedSoftware.name} (${updatedSoftware.vendor})`
      });
      
      return updatedSoftware;
    } catch (error) {
      console.error('Error updating software:', error);
      return undefined;
    }
  }

  async deleteSoftware(id: number): Promise<boolean> {
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
          userId: 1, // Admin user ID
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
        created_at as "createdAt"
      FROM software
      WHERE expiry_date IS NOT NULL
        AND expiry_date <= $1
        AND expiry_date >= $2
      ORDER BY expiry_date
    `, [futureDate, now]);
    
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

  async updateSoftwareAssignment(id: number, assignment: Partial<InsertSoftwareAssignment>): Promise<SoftwareAssignment | undefined> {
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
        userId: 1, // Admin user ID
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

  async deleteSoftwareAssignment(id: number): Promise<boolean> {
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
          userId: 1, // Admin user ID
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

  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
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
      userId: 1, // Admin user ID
      actionType: 'maintenance_scheduled',
      details: `Maintenance ${record.maintenanceType} scheduled for device ${device ? device.assetTag : record.deviceId}`
    });
    
    return newRecord;
  }

  async updateMaintenanceRecord(id: number, record: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord | undefined> {
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
        userId: 1, // Admin user ID
        actionType,
        details
      });
      
      return updatedRecord;
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      return undefined;
    }
  }

  async deleteMaintenanceRecord(id: number): Promise<boolean> {
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
          userId: 1, // Admin user ID
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
        qr.generated_at as "generatedAt", 
        qr.last_scanned as "lastScanned", 
        qr.scan_count as "scanCount",
        d.brand as "deviceBrand",
        d.model as "deviceModel",
        d.asset_tag as "deviceAssetTag"
      FROM qr_codes qr
      LEFT JOIN devices d ON qr.device_id = d.id
      ORDER BY qr.generated_at DESC
    `);
    
    return qrCodes;
  }

  async getQrCodeById(id: number): Promise<QrCode | undefined> {
    try {
      const qrCode = await db.one(`
        SELECT 
          qr.id, 
          qr.code, 
          qr.device_id as "deviceId", 
          qr.generated_at as "generatedAt", 
          qr.last_scanned as "lastScanned", 
          qr.scan_count as "scanCount",
          d.brand as "deviceBrand",
          d.model as "deviceModel",
          d.asset_tag as "deviceAssetTag"
        FROM qr_codes qr
        LEFT JOIN devices d ON qr.device_id = d.id
        WHERE qr.id = $1
      `, [id]);
      
      return qrCode;
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
          qr.generated_at as "generatedAt", 
          qr.last_scanned as "lastScanned", 
          qr.scan_count as "scanCount",
          d.brand as "deviceBrand",
          d.model as "deviceModel",
          d.asset_tag as "deviceAssetTag"
        FROM qr_codes qr
        LEFT JOIN devices d ON qr.device_id = d.id
        WHERE qr.device_id = $1
      `, [deviceId]);
      
      return qrCode;
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
          qr.generated_at as "generatedAt", 
          qr.last_scanned as "lastScanned", 
          qr.scan_count as "scanCount",
          d.brand as "deviceBrand",
          d.model as "deviceModel",
          d.asset_tag as "deviceAssetTag"
        FROM qr_codes qr
        LEFT JOIN devices d ON qr.device_id = d.id
        WHERE qr.code = $1
      `, [code]);
      
      return qrCode;
    } catch (error) {
      return undefined;
    }
  }

  async createQrCode(qrCode: InsertQrCode): Promise<QrCode> {
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
        generated_at as "generatedAt", 
        last_scanned as "lastScanned", 
        scan_count as "scanCount"
    `, [
      qrCode.code,
      qrCode.deviceId || null
    ]);
    
    // Get device information if available
    if (newQrCode.deviceId) {
      const device = await this.getDeviceById(newQrCode.deviceId);
      if (device) {
        (newQrCode as any).deviceBrand = device.brand;
        (newQrCode as any).deviceModel = device.model;
        (newQrCode as any).deviceAssetTag = device.assetTag;
      }
    }
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'qr_code_generated',
      details: newQrCode.deviceId 
        ? `QR code generated for device ${(newQrCode as any).deviceAssetTag || newQrCode.deviceId}`
        : `QR code generated: ${qrCode.code}`
    });
    
    return newQrCode;
  }

  async updateQrCode(id: number, qrCode: Partial<InsertQrCode>): Promise<QrCode | undefined> {
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
          generated_at as "generatedAt", 
          last_scanned as "lastScanned", 
          scan_count as "scanCount"
      `, values);
      
      // Get device information if available
      if (updatedQrCode.deviceId) {
        const device = await this.getDeviceById(updatedQrCode.deviceId);
        if (device) {
          (updatedQrCode as any).deviceBrand = device.brand;
          (updatedQrCode as any).deviceModel = device.model;
          (updatedQrCode as any).deviceAssetTag = device.assetTag;
        }
      }
      
      // Log activity
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'qr_code_updated',
        details: `QR code updated: ${updatedQrCode.code}`
      });
      
      return updatedQrCode;
    } catch (error) {
      console.error('Error updating QR code:', error);
      return undefined;
    }
  }

  async deleteQrCode(id: number): Promise<boolean> {
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
          userId: 1, // Admin user ID
          actionType: 'qr_code_deleted',
          details: qrCode.deviceId 
            ? `QR code deleted for device ${(qrCode as any).deviceAssetTag || qrCode.deviceId}`
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

  async recordQrCodeScan(id: number): Promise<QrCode | undefined> {
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
          generated_at as "generatedAt", 
          last_scanned as "lastScanned", 
          scan_count as "scanCount"
      `, [id]);
      
      // Get device information if available
      if (updatedQrCode.deviceId) {
        const device = await this.getDeviceById(updatedQrCode.deviceId);
        if (device) {
          (updatedQrCode as any).deviceBrand = device.brand;
          (updatedQrCode as any).deviceModel = device.model;
          (updatedQrCode as any).deviceAssetTag = device.assetTag;
        }
      }
      
      // Log activity
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'qr_code_scanned',
        details: updatedQrCode.deviceId 
          ? `QR code scanned for device ${(updatedQrCode as any).deviceAssetTag || updatedQrCode.deviceId}`
          : `QR code scanned: ${updatedQrCode.code}`
      });
      
      return updatedQrCode;
    } catch (error) {
      console.error('Error recording QR code scan:', error);
      return undefined;
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
      const branding = await db.one(`
        SELECT 
          id, 
          company_name as "companyName", 
          logo, 
          primary_color as "primaryColor", 
          accent_color as "accentColor", 
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
          accentColor: '#3B82F6'
        });
      } catch (createError) {
        console.error('Error creating default branding settings:', createError);
        return undefined;
      }
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
        
        if (settings.primaryColor !== undefined) {
          updates.push(`primary_color = $${paramCount++}`);
          values.push(settings.primaryColor);
        }
        
        if (settings.accentColor !== undefined) {
          updates.push(`accent_color = $${paramCount++}`);
          values.push(settings.accentColor);
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
            primary_color as "primaryColor", 
            accent_color as "accentColor", 
            updated_at as "updatedAt"
        `, values);
        
        return updatedSettings;
      } else {
        // Create new settings
        const newSettings = await db.one(`
          INSERT INTO branding_settings (
            company_name, 
            logo, 
            primary_color, 
            accent_color
          ) VALUES (
            $1, $2, $3, $4
          ) RETURNING 
            id, 
            company_name as "companyName", 
            logo, 
            primary_color as "primaryColor", 
            accent_color as "accentColor", 
            updated_at as "updatedAt"
        `, [
          settings.companyName || 'IT Asset Management',
          settings.logo || '',
          settings.primaryColor || '#1E40AF',
          settings.accentColor || '#3B82F6'
        ]);
        
        return newSettings;
      }
    } catch (error) {
      console.error('Error updating branding settings:', error);
      throw error;
    }
  }
}