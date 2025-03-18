import { 
  categories, devices, users, assignmentHistory, activityLog,
  type Category, type Device, type User, type AssignmentHistory, type ActivityLog,
  type InsertCategory, type InsertDevice, type InsertUser, 
  type InsertAssignmentHistory, type InsertActivityLog 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersByDepartment(department: string): Promise<User[]>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Device operations
  getDevices(): Promise<Device[]>;
  getDeviceById(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  getDevicesByCategory(categoryId: number): Promise<Device[]>;
  getDevicesByUser(userId: number): Promise<Device[]>;
  getUnassignedDevices(): Promise<Device[]>;
  assignDevice(deviceId: number, userId: number, assignedBy: number): Promise<Device | undefined>;
  unassignDevice(deviceId: number): Promise<Device | undefined>;
  getDevicesWithWarrantyExpiring(days: number): Promise<Device[]>;
  
  // Assignment history operations
  getAssignmentHistory(deviceId: number): Promise<AssignmentHistory[]>;
  createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory>;
  updateAssignmentHistory(id: number, history: Partial<InsertAssignmentHistory>): Promise<AssignmentHistory | undefined>;
  
  // Activity log operations
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private devices: Map<number, Device>;
  private assignmentHistory: Map<number, AssignmentHistory>;
  private activityLogs: ActivityLog[];
  
  private userIdCounter: number;
  private categoryIdCounter: number;
  private deviceIdCounter: number;
  private assignmentHistoryIdCounter: number;
  private activityLogIdCounter: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.devices = new Map();
    this.assignmentHistory = new Map();
    this.activityLogs = [];
    
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.deviceIdCounter = 1;
    this.assignmentHistoryIdCounter = 1;
    this.activityLogIdCounter = 1;
    
    // Add some default categories
    this.initializeCategories();
  }

  private initializeCategories() {
    const defaultCategories = [
      { name: "Laptop", description: "Portable computers" },
      { name: "Desktop", description: "Stationary computers" },
      { name: "Monitor", description: "Display devices" },
      { name: "Phone", description: "Mobile communication devices" },
      { name: "Tablet", description: "Portable touchscreen devices" }
    ];
    
    defaultCategories.forEach(cat => {
      this.createCategory(cat);
    });
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, newUser);
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'user_added',
      details: `User created: ${user.firstName} ${user.lastName}`
    });
    
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'user_updated',
      details: `User updated: ${updatedUser.firstName} ${updatedUser.lastName}`
    });
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    // Unassign devices
    const userDevices = await this.getDevicesByUser(id);
    for (const device of userDevices) {
      await this.unassignDevice(device.id);
    }
    
    const deleted = this.users.delete(id);
    
    // Log activity
    if (deleted) {
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'user_deleted',
        details: `User deleted: ${user.firstName} ${user.lastName}`
      });
    }
    
    return deleted;
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.department === department
    );
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'category_added',
      details: `Category created: ${category.name}`
    });
    
    return newCategory;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'category_updated',
      details: `Category updated: ${updatedCategory.name}`
    });
    
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const category = this.categories.get(id);
    if (!category) return false;
    
    // Check if any devices use this category
    const devices = await this.getDevicesByCategory(id);
    if (devices.length > 0) {
      return false; // Cannot delete category in use
    }
    
    const deleted = this.categories.delete(id);
    
    // Log activity
    if (deleted) {
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'category_deleted',
        details: `Category deleted: ${category.name}`
      });
    }
    
    return deleted;
  }

  // Device operations
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDeviceById(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const id = this.deviceIdCounter++;
    const newDevice: Device = { 
      ...device, 
      id, 
      createdAt: new Date() 
    };
    this.devices.set(id, newDevice);
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'device_added',
      details: `Device added: ${device.brand} ${device.model} (${device.assetTag})`
    });
    
    return newDevice;
  }

  async updateDevice(id: number, deviceData: Partial<InsertDevice>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, ...deviceData };
    this.devices.set(id, updatedDevice);
    
    // Log activity
    await this.createActivityLog({
      userId: 1, // Admin user ID
      actionType: 'device_updated',
      details: `Device updated: ${updatedDevice.brand} ${updatedDevice.model} (${updatedDevice.assetTag})`
    });
    
    return updatedDevice;
  }

  async deleteDevice(id: number): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) return false;
    
    const deleted = this.devices.delete(id);
    
    // Log activity
    if (deleted) {
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'device_deleted',
        details: `Device deleted: ${device.brand} ${device.model} (${device.assetTag})`
      });
    }
    
    return deleted;
  }

  async getDevicesByCategory(categoryId: number): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      device => device.categoryId === categoryId
    );
  }

  async getDevicesByUser(userId: number): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      device => device.userId === userId
    );
  }

  async getUnassignedDevices(): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      device => !device.userId
    );
  }

  async assignDevice(deviceId: number, userId: number, assignedBy: number): Promise<Device | undefined> {
    const device = this.devices.get(deviceId);
    const user = this.users.get(userId);
    if (!device || !user) return undefined;
    
    // Update device
    const updatedDevice = { ...device, userId };
    this.devices.set(deviceId, updatedDevice);
    
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
  }

  async unassignDevice(deviceId: number): Promise<Device | undefined> {
    const device = this.devices.get(deviceId);
    if (!device) return undefined;
    
    // Get the user who had the device
    const previousUserId = device.userId;
    const previousUser = previousUserId ? await this.getUserById(previousUserId) : undefined;
    
    // Update the device
    const updatedDevice = { ...device, userId: null };
    this.devices.set(deviceId, updatedDevice);
    
    // Update assignment history
    if (previousUserId) {
      // Find the latest assignment for this device
      const histories = await this.getAssignmentHistory(deviceId);
      const latestAssignment = histories
        .filter(h => h.userId === previousUserId && !h.unassignedAt)
        .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
      
      if (latestAssignment) {
        await this.updateAssignmentHistory(latestAssignment.id, {
          unassignedAt: new Date()
        });
      }
      
      // Log activity
      await this.createActivityLog({
        userId: 1, // Admin user ID
        actionType: 'device_unassigned',
        details: previousUser 
          ? `Device ${device.brand} ${device.model} (${device.assetTag}) unassigned from ${previousUser.firstName} ${previousUser.lastName}`
          : `Device ${device.brand} ${device.model} (${device.assetTag}) unassigned`
      });
    }
    
    return updatedDevice;
  }

  async getDevicesWithWarrantyExpiring(days: number): Promise<Device[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    return Array.from(this.devices.values()).filter(device => {
      if (!device.warrantyEOL) return false;
      const warrantyDate = new Date(device.warrantyEOL);
      return warrantyDate <= futureDate && warrantyDate >= now;
    });
  }

  // Assignment history operations
  async getAssignmentHistory(deviceId: number): Promise<AssignmentHistory[]> {
    return Array.from(this.assignmentHistory.values())
      .filter(history => history.deviceId === deviceId)
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  }

  async createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const id = this.assignmentHistoryIdCounter++;
    const newHistory: AssignmentHistory = { 
      ...history, 
      id,
      assignedAt: history.assignedAt || new Date() 
    };
    this.assignmentHistory.set(id, newHistory);
    return newHistory;
  }

  async updateAssignmentHistory(id: number, historyData: Partial<InsertAssignmentHistory>): Promise<AssignmentHistory | undefined> {
    const history = this.assignmentHistory.get(id);
    if (!history) return undefined;
    
    const updatedHistory = { ...history, ...historyData };
    this.assignmentHistory.set(id, updatedHistory);
    return updatedHistory;
  }

  // Activity log operations
  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    const logs = [...this.activityLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return limit ? logs.slice(0, limit) : logs;
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const newLog: ActivityLog = { 
      ...log, 
      id, 
      timestamp: new Date() 
    };
    this.activityLogs.push(newLog);
    return newLog;
  }
}

export const storage = new MemStorage();
