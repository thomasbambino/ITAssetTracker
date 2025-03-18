import { 
  type Category, type Device, type User, type AssignmentHistory, type ActivityLog,
  type InsertCategory, type InsertDevice, type InsertUser, 
  type InsertAssignmentHistory, type InsertActivityLog 
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
        WHERE d.id = $1
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
      
      // Delete device
      const result = await db.result(`
        DELETE FROM devices
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
      WHERE d.category_id = $1
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
      WHERE d.user_id = $1
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
      WHERE d.user_id IS NULL
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
}