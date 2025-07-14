import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import session from "express-session";
import authRoutes from "./auth-routes";
import emailRoutes from "./email-routes";
import twoFactorRoutes from "./two-factor-routes";
import { isAuthenticated, isAdmin } from "./auth";
import mailgunService, { updateMailgunService } from "./direct-mailgun";
import { AIService } from "./ai-service";

import { 
  insertUserSchema, insertDeviceSchema, insertCategorySchema,
  insertSoftwareSchema, insertSoftwareAssignmentSchema, insertMaintenanceRecordSchema,
  insertQrCodeSchema, insertNotificationSchema, insertBrandingSettingsSchema, insertSiteSchema,
  insertDepartmentSchema
} from "@shared/schema";

// Define the session data type to fix type errors
interface SessionData {
  userId: number;
  userRole: 'admin' | 'manager' | 'user';
  passwordResetRequired: boolean;
  pendingTwoFactorUserId?: number; // For 2FA verification flow
}

// Extend Express session to include our data
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: 'admin' | 'manager' | 'user';
    passwordResetRequired?: boolean;
    pendingTwoFactorUserId?: number;
  }
}

// Configure session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userRole: 'admin' | 'manager' | 'user';
    passwordResetRequired: boolean;
  }
}

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper functions for AI-powered filtering
async function filterDevices(devices: any[], filters: any) {
  let filtered = devices;
  
  if (filters.category) {
    const categories = await storage.getCategories();
    console.log('Available categories:', categories.map(c => c.name));
    console.log('Looking for category:', filters.category);
    
    // Try exact match first, then partial match
    const category = categories.find(cat => 
      cat.name.toLowerCase() === filters.category.toLowerCase()
    ) || categories.find(cat => 
      cat.name.toLowerCase().includes(filters.category.toLowerCase()) ||
      filters.category.toLowerCase().includes(cat.name.toLowerCase())
    );
    
    console.log('Found category for filter "' + filters.category + '":', category?.name);
    if (category) {
      filtered = filtered.filter(device => device.categoryId === category.id);
      console.log('Filtered to', filtered.length, 'devices in category', category.name);
    } else {
      console.log('No category found for filter "' + filters.category + '"');
      // Don't filter if category not found - return all devices
    }
  }
  
  if (filters.department) {
    const users = await storage.getUsers();
    const departmentUsers = users.filter(user => 
      user.department?.toLowerCase().includes(filters.department.toLowerCase())
    );
    const userIds = departmentUsers.map(user => user.id);
    filtered = filtered.filter(device => device.userId && userIds.includes(device.userId));
  }
  
  if (filters.brand) {
    filtered = filtered.filter(device => 
      device.brand?.toLowerCase().includes(filters.brand.toLowerCase())
    );
  }
  
  if (filters.model) {
    filtered = filtered.filter(device => 
      device.model?.toLowerCase().includes(filters.model.toLowerCase())
    );
  }
  
  if (filters.status) {
    filtered = filtered.filter(device => 
      device.status?.toLowerCase() === filters.status.toLowerCase()
    );
  }
  
  if (filters.expiryPeriod) {
    const now = new Date();
    if (filters.expiryPeriod === 'expired') {
      filtered = filtered.filter(device => 
        device.warrantyExpiry && new Date(device.warrantyExpiry) < now
      );
    } else if (filters.expiryPeriod === 'next month') {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      filtered = filtered.filter(device => 
        device.warrantyExpiry && 
        new Date(device.warrantyExpiry) >= now &&
        new Date(device.warrantyExpiry) <= nextMonth
      );
    }
  }
  
  return filtered;
}

async function filterUsers(users: any[], filters: any) {
  let filtered = users;
  
  if (filters.department) {
    filtered = filtered.filter(user => 
      user.department?.toLowerCase().includes(filters.department.toLowerCase())
    );
  }
  
  if (filters.status) {
    const isActive = filters.status.toLowerCase() === 'active';
    filtered = filtered.filter(user => user.active === isActive);
  }
  
  return filtered;
}

async function filterSoftware(software: any[], filters: any) {
  let filtered = software;
  
  if (filters.status) {
    filtered = filtered.filter(item => 
      item.status?.toLowerCase() === filters.status.toLowerCase()
    );
  }
  
  if (filters.expiryPeriod) {
    const now = new Date();
    if (filters.expiryPeriod === 'expired') {
      filtered = filtered.filter(item => 
        item.expiryDate && new Date(item.expiryDate) < now
      );
    } else if (filters.expiryPeriod === 'next month') {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      filtered = filtered.filter(item => 
        item.expiryDate && 
        new Date(item.expiryDate) >= now &&
        new Date(item.expiryDate) <= nextMonth
      );
    }
  }
  
  return filtered;
}

async function filterMaintenance(maintenance: any[], filters: any) {
  let filtered = maintenance;
  
  if (filters.status) {
    filtered = filtered.filter(record => 
      record.status?.toLowerCase() === filters.status.toLowerCase()
    );
  }
  
  if (filters.dateRange) {
    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered.filter(record => 
        record.scheduledDate && new Date(record.scheduledDate) >= startDate
      );
    }
    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(record => 
        record.scheduledDate && new Date(record.scheduledDate) <= endDate
      );
    }
  }
  
  return filtered;
}

// Define uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for problem report attachments with file validation
const attachmentUpload = multer({
  dest: 'uploads/attachments/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF) and PDF files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register authentication routes
  app.use('/api/auth', authRoutes);
  
  // Register email routes
  app.use('/api', emailRoutes);
  
  // Register 2FA routes
  app.use('/api/2fa', twoFactorRoutes);
  
  // Email templates now use database-stored logo directly
  
  // Initialize API routes
  const apiRouter = app.route('/api');

  // 2FA Security notification helper
  async function create2FASecurityNotifications() {
    try {
      const users = await storage.getUsers();
      const usersWithout2FA = users.filter(user => user.active && !user.twoFactorEnabled);
      
      for (const user of usersWithout2FA) {
        // Check if user already has a pending 2FA security notification
        const existingNotifications = await storage.getNotifications(user.id, 10);
        const has2FANotification = existingNotifications.some(notification => 
          notification.type === 'security_2fa' && !notification.isRead
        );
        
        if (!has2FANotification) {
          await storage.createNotification({
            userId: user.id,
            type: 'security_2fa',
            title: 'Secure Your Account with Two-Factor Authentication',
            message: 'Protect your account by enabling two-factor authentication (2FA). This adds an extra layer of security to prevent unauthorized access.',
            isRead: false,
            relatedId: null,
            relatedType: 'security'
          });
        }
      }
    } catch (error) {
      console.error('Error creating 2FA security notifications:', error);
    }
  }

  // Create 2FA security notifications for users without 2FA
  app.post('/api/notifications/2fa-reminder', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      await create2FASecurityNotifications();
      res.json({ success: true, message: '2FA security notifications created for users without 2FA' });
    } catch (error) {
      console.error('Error creating 2FA notifications:', error);
      res.status(500).json({ success: false, message: 'Failed to create 2FA notifications' });
    }
  });

  // Get dashboard stats
  // Cache for stats to improve performance
  let statsCache: { [key: string]: { data: any; timestamp: number } } = {};
  const STATS_CACHE_DURATION = 60 * 1000; // 1 minute cache

  app.get('/api/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const userId = sessionData.userId;
      const currentUser = await storage.getUserById(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Create cache key based on user role and department
      const cacheKey = `stats_${currentUser.role}_${currentUser.isManager ? currentUser.department : 'all'}`;
      const now = Date.now();
      
      // Check cache first
      if (statsCache[cacheKey] && (now - statsCache[cacheKey].timestamp) < STATS_CACHE_DURATION) {
        return res.json(statsCache[cacheKey].data);
      }
      
      // Fetch data in parallel for better performance
      const [devices, unassignedDevices, expiringWarranties, allTickets] = await Promise.all([
        storage.getDevices(),
        storage.getUnassignedDevices(),
        storage.getDevicesWithWarrantyExpiring(30),
        storage.getProblemReports()
      ]);
      
      let filteredDevices = devices;
      let filteredExpiringWarranties = expiringWarranties;
      let filteredTickets = allTickets;
      
      // Filter data for managers by their department
      if (currentUser.isManager && currentUser.role !== 'admin') {
        const users = await storage.getUsers();
        const departmentUsers = users.filter(user => user.department === currentUser.department);
        const departmentUserIds = departmentUsers.map(user => user.id);
        
        // Filter devices assigned to users in the manager's department
        filteredDevices = devices.filter(device => 
          device.userId && departmentUserIds.includes(device.userId)
        );
        
        filteredExpiringWarranties = expiringWarranties.filter(device => 
          device.userId && departmentUserIds.includes(device.userId)
        );
        
        // Filter tickets from users in the manager's department
        filteredTickets = allTickets.filter(ticket => 
          departmentUserIds.includes(ticket.userId)
        );
      }
      
      const openTickets = filteredTickets.filter(ticket => ticket.status !== 'closed');
      
      const stats = {
        totalDevices: filteredDevices.length,
        assignedDevices: filteredDevices.length - unassignedDevices.length,
        unassignedDevices: unassignedDevices.length,
        expiringWarranties: filteredExpiringWarranties.length,
        openTickets: openTickets.length
      };
      
      // Cache the result
      statsCache[cacheKey] = { data: stats, timestamp: now };
      
      res.json(stats);
    } catch (error) {
      console.error('Error in /api/stats:', error);
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  // Cache for category stats
  let categoryStatsCache: { [key: string]: { data: any; timestamp: number } } = {};

  // Get category distribution for devices
  app.get('/api/stats/categories', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const userId = sessionData.userId;
      const currentUser = await storage.getUserById(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Create cache key based on user role and department
      const cacheKey = `categories_${currentUser.role}_${currentUser.isManager ? currentUser.department : 'all'}`;
      const now = Date.now();
      
      // Check cache first
      if (categoryStatsCache[cacheKey] && (now - categoryStatsCache[cacheKey].timestamp) < STATS_CACHE_DURATION) {
        return res.json(categoryStatsCache[cacheKey].data);
      }
      
      // Fetch data in parallel
      const [devices, categories] = await Promise.all([
        storage.getDevices(),
        storage.getCategories()
      ]);
      
      let filteredDevices = devices;
      
      // Filter data for managers by their department
      if (currentUser.isManager && currentUser.role !== 'admin') {
        const users = await storage.getUsers();
        const departmentUsers = users.filter(user => user.department === currentUser.department);
        const departmentUserIds = departmentUsers.map(user => user.id);
        
        // Filter devices assigned to users in the manager's department
        filteredDevices = devices.filter(device => 
          device.userId && departmentUserIds.includes(device.userId)
        );
      }
      
      const distribution = categories.map(category => {
        const categoryDevices = filteredDevices.filter(device => device.categoryId === category.id);
        const count = categoryDevices.length;
        
        // Calculate total value (purchase cost) for the category
        let totalValueSum = 0;
        for (const device of categoryDevices) {
          // If no purchase cost, assign a default cost based on category
          if (!device.purchaseCost || device.purchaseCost === 0) {
            // Assign realistic default values based on category
            switch (category.name) {
              case 'Laptop':
                totalValueSum += 120000; // $1,200
                break;
              case 'Desktop':
                totalValueSum += 100000; // $1,000
                break;
              case 'Server':
                totalValueSum += 500000; // $5,000
                break;
              case 'Network':
                totalValueSum += 80000; // $800
                break;
              case 'Mobile':
                totalValueSum += 90000; // $900
                break;
              case 'Printer':
                totalValueSum += 35000; // $350
                break;
              case 'Accessories':
                totalValueSum += 5000; // $50
                break;
              case 'Display':
              case 'Monitor': 
                totalValueSum += 25000; // $250
                break;
              case 'AV':
                totalValueSum += 150000; // $1,500
                break;
              default:
                totalValueSum += 50000; // $500 default
            }
          } else {
            // If purchase cost exists, use it
            const costValue = Number(device.purchaseCost);
            if (!isNaN(costValue)) {
              totalValueSum += costValue;
            }
          }
        }
        
        return {
          id: category.id,
          name: category.name,
          count,
          percentage: filteredDevices.length > 0 ? Math.round((count / filteredDevices.length) * 100) : 0,
          totalValue: totalValueSum // Include total value in cents
        };
      });
      
      // Cache the result
      categoryStatsCache[cacheKey] = { data: distribution, timestamp: now };
      
      res.json(distribution);
    } catch (error) {
      console.error('Error in /api/stats/categories:', error);
      res.status(500).json({ message: "Error fetching category distribution" });
    }
  });

  // Cache for department stats
  let departmentStatsCache: { [key: string]: { data: any; timestamp: number } } = {};

  // Get department distribution for devices
  app.get('/api/stats/departments', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const userId = sessionData.userId;
      const currentUser = await storage.getUserById(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Create cache key based on user role and department
      const cacheKey = `departments_${currentUser.role}_${currentUser.isManager ? currentUser.department : 'all'}`;
      const now = Date.now();
      
      // Check cache first
      if (departmentStatsCache[cacheKey] && (now - departmentStatsCache[cacheKey].timestamp) < STATS_CACHE_DURATION) {
        return res.json(departmentStatsCache[cacheKey].data);
      }
      
      // Fetch data in parallel
      const [users, devices] = await Promise.all([
        storage.getUsers(),
        storage.getDevices()
      ]);
      
      let filteredUsers = users;
      let filteredDevices = devices;
      
      // Filter data for managers by their department
      if (currentUser.isManager && currentUser.role !== 'admin') {
        const departmentUsers = users.filter(user => user.department === currentUser.department);
        const departmentUserIds = departmentUsers.map(user => user.id);
        
        // Filter devices assigned to users in the manager's department
        filteredDevices = devices.filter(device => 
          device.userId && departmentUserIds.includes(device.userId)
        );
        
        // Filter users to only show those in the manager's department
        filteredUsers = departmentUsers;
      }
      
      // Get unique departments
      const departmentsArray = filteredUsers.map(user => user.department).filter(Boolean) as string[];
      const departmentsSet = new Set<string>(departmentsArray);
      const departments = Array.from(departmentsSet);
      
      const distribution = departments.map(department => {
        // Get users in this department
        const departmentUsers = filteredUsers.filter(user => user.department === department);
        const userIds = departmentUsers.map(user => user.id);
        
        // Count devices assigned to users in this department
        const count = filteredDevices.filter(device => device.userId && userIds.includes(device.userId)).length;
        
        return {
          department,
          count,
          percentage: filteredDevices.length > 0 ? Math.round((count / filteredDevices.length) * 100) : 0
        };
      });
      
      // Cache the result
      departmentStatsCache[cacheKey] = { data: distribution, timestamp: now };
      
      res.json(distribution);
    } catch (error) {
      console.error('Error in /api/stats/departments:', error);
      res.status(500).json({ message: "Error fetching department distribution" });
    }
  });

  // All activity logs
  app.get('/api/activity', async (req: Request, res: Response) => {
    try {
      // If no limit is specified or limit=0, get all logs (0 means unlimited)
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
      const activityLogs = await storage.getActivityLogs(limit);
      
      // Enhance logs with user information
      const enhancedLogs = await Promise.all(
        activityLogs.map(async (log) => {
          const user = log.userId ? await storage.getUserById(log.userId) : null;
          return {
            ...log,
            user: user ? {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
              department: user.department
            } : null
          };
        })
      );
      
      res.json(enhancedLogs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Error fetching activity logs" });
    }
  });

  // User routes
  // Get current authenticated user
  app.get('/api/users/me', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      if (userId === undefined) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't send password-related fields to the client
      const { 
        passwordHash, 
        passwordSalt, 
        tempPassword, 
        tempPasswordExpiry, 
        ...safeUserData 
      } = user;
      
      // Add password reset status from session
      const userData = {
        ...safeUserData,
        passwordResetRequired: req.session.passwordResetRequired
      };
      
      return res.status(200).json(userData);
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ message: 'An error occurred while retrieving user data' });
    }
  });

  // Manager routes
  app.get('/api/managers', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      const managers = users.filter(user => user.isManager);
      res.json(managers);
    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ message: "Error fetching managers" });
    }
  });

  app.post('/api/managers/promote/:userId', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Get the user's current department
      const currentUser = await storage.getUserById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user has a department assigned
      if (!currentUser.departmentId) {
        return res.status(400).json({ 
          message: "User must be assigned to a department before being promoted to manager" 
        });
      }
      
      // Check if the department already has a manager
      const existingManager = await storage.getDepartmentManager(currentUser.departmentId);
      
      if (existingManager && existingManager.id !== userId) {
        return res.status(400).json({ 
          message: `Department already has a manager: ${existingManager.firstName} ${existingManager.lastName}. Please demote the existing manager first.` 
        });
      }
      
      // Set managed department to their current department
      const managedDepartmentIds = JSON.stringify([currentUser.departmentId]);
      
      // Promote user to manager
      const updatedUser = await storage.updateUser(userId, {
        isManager: true,
        managedDepartmentIds: managedDepartmentIds
      }, loggedInUserId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error promoting user to manager:", error);
      res.status(500).json({ message: "Error promoting user to manager" });
    }
  });

  app.post('/api/managers/demote/:userId', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Demote manager to regular user
      const updatedUser = await storage.updateUser(userId, {
        isManager: false,
        managedDepartmentIds: null
      }, loggedInUserId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error demoting manager:", error);
      res.status(500).json({ message: "Error demoting manager" });
    }
  });

  app.put('/api/managers/:userId/departments', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { managedDepartmentIds } = req.body;
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Update manager's departments - store as JSON string
      const departmentIds = Array.isArray(managedDepartmentIds) 
        ? JSON.stringify(managedDepartmentIds)
        : managedDepartmentIds;
      
      const updatedUser = await storage.updateUser(userId, {
        managedDepartmentIds: departmentIds
      }, loggedInUserId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating manager departments:", error);
      res.status(500).json({ message: "Error updating manager departments" });
    }
  });

  // Get all users
  app.get('/api/users', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const userId = sessionData.userId;
      const currentUser = await storage.getUserById(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let users = await storage.getUsers();
      
      // Filter users for managers by their department
      if (currentUser.isManager && currentUser.role !== 'admin') {
        users = users.filter(user => user.department === currentUser.department);
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error in /api/users:', error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get devices assigned to this user
      const devices = await storage.getDevicesByUser(id);
      
      // Enrich devices with category information
      const enrichedDevices = await Promise.all(devices.map(async (device) => {
        const category = device.categoryId 
          ? await storage.getCategoryById(device.categoryId) 
          : null;
          
        return {
          ...device,
          category: category ? { id: category.id, name: category.name } : null
        };
      }));
      
      res.json({ ...user, devices: enrichedDevices });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData, loggedInUserId);
      
      // Send welcome email if user has an email address
      if (user.email) {
        try {
          // Get email settings to check if service is configured and enabled
          const emailSettings = await storage.getEmailSettings();
          
          if (emailSettings && emailSettings.isEnabled) {
            // Update the direct mailgun service with current settings from database
            console.log('Updating direct mailgun service for welcome email...');
            const updatedMailgunService = updateMailgunService(emailSettings);
            
            // Check if direct mailgun service is configured
            const isConfigured = updatedMailgunService.isConfigured();
            console.log('Database-based mailgun service configuration check for welcome email:', isConfigured);
            
            if (isConfigured) {
              // Generate temporary password for new user
              const tempPassword = 'TempPass123!';
              const fullName = `${user.firstName} ${user.lastName}`;
              
              console.log(`Sending welcome email to: ${user.email}`);
              const result = await updatedMailgunService.sendWelcomeEmail(
                user.email,
                tempPassword,
                fullName
              );
              
              console.log('Welcome email result:', result);
              
              // Also set the temporary password in the database
              if (result.success) {
                const bcrypt = await import('bcrypt');
                const hashedPassword = await bcrypt.hash(tempPassword, 10);
                await storage.updateUser(user.id, {
                  passwordHash: hashedPassword,
                  passwordResetRequired: true
                }, loggedInUserId, true);
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Don't fail user creation if email fails
        }
      }
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      console.log('Received user update data:', req.body);
      
      // Explicitly handle the role field as an enum and departmentId
      const schema = insertUserSchema.partial().extend({
        role: z.enum(['user', 'manager', 'admin']).optional(),
        departmentId: z.union([
          z.string().transform((str) => {
            if (str === '0' || str === '' || str === null || str === undefined) return null;
            const num = parseInt(str);
            return isNaN(num) ? null : num;
          }),
          z.number(),
          z.null()
        ]).optional().nullable()
      });
      
      const validatedData = schema.parse(req.body);
      console.log('Validated user data:', validatedData);
      
      // Pass the logged-in user's ID to updateUser
      const user = await storage.updateUser(id, validatedData, loggedInUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Add activity log for user role change if role was updated
      if (validatedData.role && user.role !== validatedData.role) {
        await storage.createActivityLog({
          actionType: 'USER_ROLE_CHANGE',
          userId: loggedInUserId,
          details: `Changed user ${user.firstName} ${user.lastName}'s role to ${validatedData.role}`
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const success = await storage.deleteUser(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  // Offboard user (deactivate)
  app.post('/api/users/:id/offboard', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Update user to set active to false
      const user = await storage.updateUser(id, { active: false }, loggedInUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User offboarded successfully", user });
    } catch (error) {
      console.error("Error offboarding user:", error);
      res.status(500).json({ message: "Error offboarding user" });
    }
  });

  // Reactivate user (reverse offboarding)
  app.post('/api/users/:id/reactivate', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Update user to set active to true
      const user = await storage.updateUser(id, { active: true }, loggedInUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User reactivated successfully", user });
    } catch (error) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ message: "Error reactivating user" });
    }
  });

  // Upload user profile photo
  app.post('/api/users/:id/photo', isAuthenticated, upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Check if user can update this profile (either own profile or admin)
      if (loggedInUserId !== id && sessionData.userRole !== 'admin') {
        return res.status(403).json({ message: "Unauthorized to update this profile" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, and GIF are allowed" });
      }
      
      // Validate file size (5MB limit)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB" });
      }
      
      // Convert to base64 for database storage
      const base64Photo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Update user profile photo
      const user = await storage.updateUser(id, { profilePhoto: base64Photo }, loggedInUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Profile photo updated successfully", profilePhoto: base64Photo });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res.status(500).json({ message: "Error uploading profile photo" });
    }
  });

  // Delete user profile photo
  app.delete('/api/users/:id/photo', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Check if user can update this profile (either own profile or admin)
      if (loggedInUserId !== id && sessionData.userRole !== 'admin') {
        return res.status(403).json({ message: "Unauthorized to update this profile" });
      }
      
      // Remove profile photo
      const user = await storage.updateUser(id, { profilePhoto: null }, loggedInUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Profile photo deleted successfully" });
    } catch (error) {
      console.error("Error deleting profile photo:", error);
      res.status(500).json({ message: "Error deleting profile photo" });
    }
  });

  // Device routes
  app.get('/api/devices', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const userId = sessionData.userId;
      const currentUser = await storage.getUserById(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let devices = await storage.getDevices();
      
      // Filter devices for managers by their department
      if (currentUser.isManager && currentUser.role !== 'admin') {
        const users = await storage.getUsers();
        const departmentUsers = users.filter(user => user.department === currentUser.department);
        const departmentUserIds = departmentUsers.map(user => user.id);
        
        // Filter devices assigned to users in the manager's department
        devices = devices.filter(device => 
          device.userId && departmentUserIds.includes(device.userId)
        );
      }
      
      // Enrich with category and user information
      const enrichedDevices = await Promise.all(
        devices.map(async (device) => {
          const category = device.categoryId ? await storage.getCategoryById(device.categoryId) : null;
          const user = device.userId ? await storage.getUserById(device.userId) : null;
          
          return {
            ...device,
            category: category ? { id: category.id, name: category.name } : null,
            user: user ? { 
              id: user.id, 
              name: `${user.firstName} ${user.lastName}`, 
              department: user.department 
            } : null
          };
        })
      );
      
      res.json(enrichedDevices);
    } catch (error) {
      console.error('Error in /api/devices:', error);
      res.status(500).json({ message: "Error fetching devices" });
    }
  });

  app.get('/api/devices/unassigned', async (req: Request, res: Response) => {
    try {
      const devices = await storage.getUnassignedDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Error fetching unassigned devices" });
    }
  });

  // Get devices assigned to current user (for regular users)
  app.get('/api/devices/assigned', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      console.log(`\n=== FETCHING DEVICES FOR USER ${userId} ===`);
      const devices = await storage.getDevicesByUser(userId);
      console.log(`Found ${devices.length} devices for user ${userId}`);
      devices.forEach(device => {
        console.log(`Raw device from DB: ID=${device.id}, Brand=${device.brand}, Model=${device.model}, Specs=${device.specs ? 'EXISTS' : 'NULL'}`);
      });
      
      // Enrich with category, site, and assignment information
      const enrichedDevices = await Promise.all(
        devices.map(async (device) => {
          const category = device.categoryId ? await storage.getCategoryById(device.categoryId) : null;
          const site = device.siteId ? await storage.getSiteById(device.siteId) : null;
          
          // Get the most recent assignment history for this device and user
          const history = await storage.getAssignmentHistory(device.id);
          const currentAssignment = history.find(h => h.userId === userId && !h.unassignedAt);
          
          // Parse specs if they exist
          let parsedSpecs = null;
          if (device.specs) {
            try {
              parsedSpecs = JSON.parse(device.specs);
              console.log(`Device ${device.id} (${device.brand} ${device.model}) has specs:`, parsedSpecs);
            } catch (e) {
              console.warn(`Invalid specs JSON for device ${device.id}`);
            }
          } else {
            console.log(`Device ${device.id} (${device.brand} ${device.model}) has NO specs in database`);
          }
          
          return {
            ...device,
            category: category ? { id: category.id, name: category.name } : null,
            site: site ? { id: site.id, name: site.name } : null,
            assignedAt: currentAssignment?.assignedAt || null,
            assignedBy: currentAssignment?.assignedBy || null,
            assignmentNotes: currentAssignment?.notes || null,
            specs: parsedSpecs
          };
        })
      );
      
      res.json(enrichedDevices);
    } catch (error) {
      console.error("Error fetching assigned devices:", error);
      res.status(500).json({ message: "Error fetching assigned devices" });
    }
  });



  app.get('/api/devices/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDeviceById(id);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Get category and user information
      const category = device.categoryId ? await storage.getCategoryById(device.categoryId) : null;
      const user = device.userId ? await storage.getUserById(device.userId) : null;
      
      res.json({
        ...device,
        category: category ? { id: category.id, name: category.name } : null,
        user: user ? { 
          id: user.id, 
          name: `${user.firstName} ${user.lastName}`, 
          department: user.department 
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching device" });
    }
  });
  
  // Get device invoice file for download
  app.get('/api/devices/:id/invoice', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDeviceById(id);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      if (!device.invoiceFile || !device.invoiceFileName || !device.invoiceFileType) {
        return res.status(404).json({ message: "No invoice file found for this device" });
      }
      
      // Convert base64 back to binary
      const fileBuffer = Buffer.from(device.invoiceFile, 'base64');
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', device.invoiceFileType);
      res.setHeader('Content-Disposition', `attachment; filename="${device.invoiceFileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      // Send the file
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error fetching device invoice:", error);
      res.status(500).json({ message: "Error fetching device invoice" });
    }
  });
  
  // Get device invoice file for viewing in browser
  app.get('/api/devices/:id/invoice/view', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDeviceById(id);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      if (!device.invoiceFile || !device.invoiceFileName || !device.invoiceFileType) {
        return res.status(404).json({ message: "No invoice file found for this device" });
      }
      
      // Convert base64 back to binary
      const fileBuffer = Buffer.from(device.invoiceFile, 'base64');
      
      // Set appropriate headers for inline viewing
      res.setHeader('Content-Type', device.invoiceFileType);
      // Use inline disposition to view in browser rather than download
      res.setHeader('Content-Disposition', `inline; filename="${device.invoiceFileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      // Send the file
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error viewing device invoice:", error);
      res.status(500).json({ message: "Error viewing device invoice" });
    }
  });

  // Get device assignment history
  app.get('/api/devices/:id/history', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const history = await storage.getAssignmentHistory(id);
      
      // Enrich history with user information
      const enrichedHistory = await Promise.all(
        history.map(async (entry) => {
          const assignedToUser = entry.userId ? await storage.getUserById(entry.userId) : null;
          const assignedByUser = entry.assignedBy ? await storage.getUserById(entry.assignedBy) : null;
          
          return {
            ...entry,
            user: assignedToUser ? {
              id: assignedToUser.id,
              name: `${assignedToUser.firstName} ${assignedToUser.lastName}`,
              department: assignedToUser.department
            } : null,
            assignor: assignedByUser ? {
              id: assignedByUser.id,
              name: `${assignedByUser.firstName} ${assignedByUser.lastName}`
            } : null
          };
        })
      );
      
      res.json(enrichedHistory);
    } catch (error) {
      console.error("Error fetching device history:", error);
      res.status(500).json({ message: "Error fetching device history" });
    }
  });
  
  // Get QR code for a device
  app.get('/api/devices/:id/qrcode', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const qrCode = await storage.getQrCodeByDeviceId(id);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found for device" });
      }
      
      res.json(qrCode);
    } catch (error) {
      res.status(500).json({ message: "Error fetching QR code" });
    }
  });

  // Get Intune eligible devices (laptops and desktops)
  app.get('/api/devices/intune/eligible', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const devices = await storage.getIntuneEligibleDevices();
      
      // Enrich with user information
      const enrichedDevices = await Promise.all(
        devices.map(async (device) => {
          const category = device.categoryId ? await storage.getCategoryById(device.categoryId) : null;
          const user = device.userId ? await storage.getUserById(device.userId) : null;
          
          return {
            ...device,
            category: category ? { id: category.id, name: category.name } : null,
            user: user ? { 
              id: user.id, 
              name: `${user.firstName} ${user.lastName}`, 
              department: user.department 
            } : null
          };
        })
      );
      
      res.json(enrichedDevices);
    } catch (error) {
      console.error("Error fetching Intune eligible devices:", error);
      res.status(500).json({ message: "Error fetching Intune eligible devices" });
    }
  });
  
  // Get all Intune devices for the Intune Management page
  app.get('/api/intune/devices', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const devices = await storage.getIntuneEligibleDevices();
      
      // Format data specifically for the Intune Management page
      const intuneDevices = await Promise.all(
        devices.map(async (device) => {
          const user = device.userId ? await storage.getUserById(device.userId) : null;
          
          return {
            id: device.id,
            name: device.name || "",
            brand: device.brand,
            model: device.model,
            serialNumber: device.serialNumber,
            assetTag: device.assetTag,
            userId: device.userId,
            userFirstName: user ? user.firstName : null,
            userLastName: user ? user.lastName : null,
            userEmail: user ? user.email : null,
            isIntuneOnboarded: device.isIntuneOnboarded || false,
            intuneComplianceStatus: device.intuneComplianceStatus || "unknown",
            intuneLastSync: device.intuneLastSync || null
          };
        })
      );
      
      res.json(intuneDevices);
    } catch (error) {
      console.error("Error fetching Intune devices:", error);
      res.status(500).json({ message: "Error fetching Intune devices" });
    }
  });
  
  // Update Intune device status
  app.patch('/api/intune/devices/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate the update data
      const updateDataSchema = z.object({
        isIntuneOnboarded: z.boolean().optional(),
        intuneComplianceStatus: z.string().optional(),
        intuneLastSync: z.union([z.string(), z.date(), z.null()]).optional().transform(val => {
          if (!val) return null;
          if (val instanceof Date) return val;
          // Try to convert string to Date
          try {
            return new Date(val);
          } catch (e) {
            console.warn("Failed to parse intuneLastSync date:", e);
            return null;
          }
        }),
      });
      
      const updateData = updateDataSchema.parse(req.body);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Update the device Intune status - pass loggedInUserId as the third parameter
      const device = await storage.updateDeviceIntuneStatus(id, {
        isIntuneOnboarded: updateData.isIntuneOnboarded,
        intuneComplianceStatus: updateData.intuneComplianceStatus,
        intuneLastSync: updateData.intuneLastSync
      }, loggedInUserId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Format the response to match the format expected by the client
      const user = device.userId ? await storage.getUserById(device.userId) : null;
      
      const formattedDevice = {
        id: device.id,
        name: device.name || "",
        brand: device.brand,
        model: device.model,
        serialNumber: device.serialNumber,
        assetTag: device.assetTag,
        userId: device.userId,
        userFirstName: user ? user.firstName : null,
        userLastName: user ? user.lastName : null,
        userEmail: user ? user.email : null,
        isIntuneOnboarded: device.isIntuneOnboarded || false,
        intuneComplianceStatus: device.intuneComplianceStatus || "unknown",
        intuneLastSync: device.intuneLastSync || null
      };
      
      res.json(formattedDevice);
    } catch (error) {
      console.error("Error updating Intune device:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating Intune device" });
    }
  });
  
  // Update device Intune status
  app.put('/api/devices/:id/intune', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isIntuneOnboarded, intuneComplianceStatus } = req.body;
      
      // Validate the update data
      const updateData = z.object({
        isIntuneOnboarded: z.boolean().optional(),
        intuneComplianceStatus: z.string().optional(),
      }).parse(req.body);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Update the device Intune status - pass loggedInUserId as the third parameter
      const device = await storage.updateDeviceIntuneStatus(id, {
        isIntuneOnboarded: updateData.isIntuneOnboarded,
        intuneComplianceStatus: updateData.intuneComplianceStatus
      }, loggedInUserId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Error updating device Intune status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating device Intune status" });
    }
  });



  // Create device
  app.post('/api/devices', isAuthenticated, upload.single('invoiceFile'), async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Parse the form data
      const formData = req.body;
      
      // Handle date parsing
      if (formData.purchaseDate) {
        try {
          formData.purchaseDate = new Date(formData.purchaseDate);
        } catch (e) {
          console.warn("Failed to parse purchaseDate:", e);
          formData.purchaseDate = null;
        }
      }
      
      if (formData.warrantyEOL) {
        try {
          formData.warrantyEOL = new Date(formData.warrantyEOL);
        } catch (e) {
          console.warn("Failed to parse warrantyEOL:", e);
          formData.warrantyEOL = null;
        }
      }
      
      // Handle purchase cost conversion
      if (formData.purchaseCost) {
        const costValue = formData.purchaseCost.toString().trim();
        
        if (costValue === '') {
          formData.purchaseCost = null;
        } else {
          // Try to convert to a number
          const numValue = parseFloat(costValue);
          
          if (!isNaN(numValue)) {
            // Use value directly - client already sends in cents
            formData.purchaseCost = numValue;
            console.log(`Using purchase cost value directly (already in cents): ${formData.purchaseCost}`);
          } else {
            formData.purchaseCost = null;
            console.warn(`Invalid purchase cost value: ${costValue}`);
          }
        }
      }
      
      // Handle the file upload if it exists
      if (req.file) {
        // Convert the file to base64 for storage
        const base64File = req.file.buffer.toString('base64');
        
        // Store file information
        formData.invoiceFile = base64File;
        formData.invoiceFileName = req.file.originalname;
        formData.invoiceFileType = req.file.mimetype;
      }
      
      // Handle other field type conversions
      if (formData.categoryId) {
        formData.categoryId = parseInt(formData.categoryId);
      }
      
      // Convert boolean fields from strings to actual booleans
      if (formData.isIntuneOnboarded !== undefined) {
        if (formData.isIntuneOnboarded === 'true' || formData.isIntuneOnboarded === true) {
          formData.isIntuneOnboarded = true;
        } else if (formData.isIntuneOnboarded === 'false' || formData.isIntuneOnboarded === false) {
          formData.isIntuneOnboarded = false;
        }
      }
      
      console.log('Formatted data before validation (create):', {
        categoryId: formData.categoryId,
        categoryIdType: typeof formData.categoryId,
        isIntuneOnboarded: formData.isIntuneOnboarded,
        isIntuneOnboardedType: typeof formData.isIntuneOnboarded
      });

      // Now the insertDeviceSchema can validate the properly typed data
      const validatedData = insertDeviceSchema.parse(formData);
      

      
      const device = await storage.createDevice(validatedData, loggedInUserId);
      res.status(201).json(device);
    } catch (error) {
      console.error("Error creating device:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating device" });
    }
  });

  // Update device
  app.put('/api/devices/:id', isAuthenticated, upload.single('invoiceFile'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Parse and validate the form data
      const formData = req.body;
      
      // Handle date parsing
      if (formData.purchaseDate) {
        try {
          formData.purchaseDate = new Date(formData.purchaseDate);
        } catch (e) {
          console.warn("Failed to parse purchaseDate:", e);
          formData.purchaseDate = null;
        }
      }
      
      if (formData.warrantyEOL) {
        try {
          formData.warrantyEOL = new Date(formData.warrantyEOL);
        } catch (e) {
          console.warn("Failed to parse warrantyEOL:", e);
          formData.warrantyEOL = null;
        }
      }
      
      // Handle purchase cost conversion
      if (formData.purchaseCost) {
        const costValue = formData.purchaseCost.toString().trim();
        
        if (costValue === '') {
          formData.purchaseCost = null;
        } else {
          // Try to convert to a number
          const numValue = parseFloat(costValue);
          
          if (!isNaN(numValue)) {
            // Use value directly - client already sends in cents
            formData.purchaseCost = numValue;
            console.log(`Using purchase cost value directly (already in cents): ${formData.purchaseCost}`);
          } else {
            formData.purchaseCost = null;
            console.warn(`Invalid purchase cost value: ${costValue}`);
          }
        }
      }
      
      // Handle the file upload if it exists
      if (req.file) {
        // Convert the file to base64 for storage
        const base64File = req.file.buffer.toString('base64');
        
        // Store file information
        formData.invoiceFile = base64File;
        formData.invoiceFileName = req.file.originalname;
        formData.invoiceFileType = req.file.mimetype;
      }
      
      // Handle other field type conversions
      if (formData.categoryId) {
        formData.categoryId = parseInt(formData.categoryId);
      }
      
      // Convert boolean fields from strings to actual booleans
      if (formData.isIntuneOnboarded !== undefined) {
        if (formData.isIntuneOnboarded === 'true' || formData.isIntuneOnboarded === true) {
          formData.isIntuneOnboarded = true;
        } else if (formData.isIntuneOnboarded === 'false' || formData.isIntuneOnboarded === false) {
          formData.isIntuneOnboarded = false;
        }
      }
      
      console.log('Formatted data before validation:', {
        categoryId: formData.categoryId,
        categoryIdType: typeof formData.categoryId,
        isIntuneOnboarded: formData.isIntuneOnboarded,
        isIntuneOnboardedType: typeof formData.isIntuneOnboarded,
        status: formData.status,
        statusType: typeof formData.status,
        allFields: Object.keys(formData)
      });

      // Now the insertDeviceSchema can validate the properly typed data
      const validatedData = insertDeviceSchema.partial().parse(formData);
      
      const device = await storage.updateDevice(id, validatedData, loggedInUserId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Error updating device:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating device" });
    }
  });

  app.delete('/api/devices/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const success = await storage.deleteDevice(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting device" });
    }
  });
  
  // Update specific device properties (like notes)
  app.patch('/api/devices/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Get the update data (notes, etc.)
      const updateData = req.body;
      
      console.log(`PATCH request for device ${id}:`, { 
        updateData,
        loggedInUserId,
        contentType: req.get('Content-Type')
      });
      
      // Get the current device to update
      const existingDevice = await storage.getDeviceById(id);
      if (!existingDevice) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Update the device
      const updatedDevice = await storage.updateDevice(id, updateData, loggedInUserId);
      
      if (!updatedDevice) {
        return res.status(404).json({ message: "Device not found or could not be updated" });
      }
      
      res.status(200).json(updatedDevice);
    } catch (error) {
      console.error("Error updating device:", error);
      res.status(500).json({ message: "Error updating device", error: String(error) });
    }
  });

  // Device assignment routes
  app.post('/api/devices/:id/assign', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { userId, notes } = req.body;
      
      // Validate the assignment data
      const assignmentSchema = z.object({
        userId: z.number(),
        notes: z.string().optional(),
      });
      
      const assignmentData = assignmentSchema.parse(req.body);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const assignedBy = sessionData.userId;
      
      // Assign the device
      const device = await storage.assignDevice(deviceId, assignmentData.userId, assignedBy, assignmentData.notes);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found or already assigned" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Error assigning device:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error assigning device" });
    }
  });

  app.post('/api/devices/:id/unassign', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Unassign the device
      const device = await storage.unassignDevice(deviceId, loggedInUserId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found or not currently assigned" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Error unassigning device:", error);
      res.status(500).json({ message: "Error unassigning device" });
    }
  });

  // Device by status routes
  app.get('/api/devices/status/:status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const status = req.params.status.toLowerCase();
      
      // Get all devices first
      const allDevices = await storage.getDevices();
      
      // Filter by status
      const filteredDevices = allDevices.filter(device => 
        (device.status || 'active').toLowerCase() === status
      );
      
      // Enrich with category and user information
      const enrichedDevices = await Promise.all(
        filteredDevices.map(async (device) => {
          const category = device.categoryId ? await storage.getCategoryById(device.categoryId) : null;
          const user = device.userId ? await storage.getUserById(device.userId) : null;
          
          return {
            ...device,
            category: category ? { id: category.id, name: category.name } : null,
            user: user ? { 
              id: user.id, 
              name: `${user.firstName} ${user.lastName}`, 
              department: user.department 
            } : null
          };
        })
      );
      
      res.json(enrichedDevices);
    } catch (error) {
      console.error(`Error fetching devices with status ${req.params.status}:`, error);
      res.status(500).json({ message: `Error fetching devices with status ${req.params.status}` });
    }
  });

  // Sites
  app.get('/api/sites', async (req: Request, res: Response) => {
    try {
      const sites = await storage.getSites();
      res.json(sites);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sites" });
    }
  });

  app.get('/api/sites/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const site = await storage.getSiteById(id);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
      
      // Get devices at this site
      const devices = await storage.getDevicesBySite(id);
      
      res.json({ ...site, devices });
    } catch (error) {
      res.status(500).json({ message: "Error fetching site" });
    }
  });

  app.post('/api/sites', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertSiteSchema.parse(req.body);
      const site = await storage.createSite(validatedData, loggedInUserId);
      res.status(201).json(site);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid site data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating site" });
    }
  });

  app.patch('/api/sites/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertSiteSchema.partial().parse(req.body);
      const site = await storage.updateSite(id, validatedData, loggedInUserId);
      
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
      
      res.json(site);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid site data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating site" });
    }
  });

  app.delete('/api/sites/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Check if any devices are assigned to this site
      const devices = await storage.getDevicesBySite(id);
      if (devices.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete site that has devices assigned",
          count: devices.length 
        });
      }
      
      const success = await storage.deleteSite(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "Site not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting site" });
    }
  });

  // Departments
  app.get('/api/departments', async (req: Request, res: Response) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ message: "Error fetching departments" });
    }
  });

  app.get('/api/departments/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const department = await storage.getDepartmentById(id);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      // Get users in this department
      const users = await storage.getUsersByDepartmentId(id);
      
      res.json({ ...department, users });
    } catch (error) {
      console.error('Error fetching department details:', error);
      res.status(500).json({ message: "Error fetching department" });
    }
  });

  app.post('/api/departments', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as SessionData;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData, loggedInUserId);
      res.status(201).json(department);
    } catch (error) {
      console.error('Error creating department:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid department data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating department" });
    }
  });

  app.patch('/api/departments/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as SessionData;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData, loggedInUserId);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error) {
      console.error('Error updating department:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid department data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating department" });
    }
  });

  app.delete('/api/departments/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as SessionData;
      const loggedInUserId = sessionData.userId;
      
      // Try to delete the department
      const success = await storage.deleteDepartment(id, loggedInUserId);
      
      if (!success) {
        // This could either mean the department doesn't exist or has users assigned
        // First check if the department exists
        const department = await storage.getDepartmentById(id);
        if (!department) {
          return res.status(404).json({ message: "Department not found" });
        }
        
        // If we get here, the department exists but has users assigned
        const users = await storage.getUsersByDepartmentId(id);
        return res.status(400).json({ 
          message: "Cannot delete department that has users assigned", 
          count: users.length 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({ message: "Error deleting department" });
    }
  });

  // Categories
  app.get('/api/categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      
      // Add device counts to each category
      const devices = await storage.getDevices();
      
      const enrichedCategories = categories.map(category => {
        const categoryDevices = devices.filter(device => device.categoryId === category.id);
        return {
          ...category,
          deviceCount: categoryDevices.length,
          devices: categoryDevices.map(device => ({ id: device.id }))
        };
      });
      
      res.json(enrichedCategories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.get('/api/categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategoryById(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Get devices in this category
      const devices = await storage.getDevicesByCategory(id);
      
      res.json({ ...category, devices });
    } catch (error) {
      res.status(500).json({ message: "Error fetching category" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData, loggedInUserId);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating category" });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validatedData, loggedInUserId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const success = await storage.deleteCategory(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "Category not found or in use" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // Software routes
  app.get('/api/software', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const userId = sessionData.userId;
      const currentUser = await storage.getUserById(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let software = await storage.getSoftwareWithUsageCounts();
      
      // Filter software for managers by their department
      if (currentUser.isManager && currentUser.role !== 'admin') {
        const users = await storage.getUsers();
        const departmentUsers = users.filter(user => user.department === currentUser.department);
        const departmentUserIds = departmentUsers.map(user => user.id);
        
        // Get all software assignments for all department users
        const departmentSoftwareIds = new Set<number>();
        for (const userId of departmentUserIds) {
          const userAssignments = await storage.getSoftwareAssignmentsByUser(userId);
          userAssignments.forEach(assignment => {
            departmentSoftwareIds.add(assignment.softwareId);
          });
        }
        
        // Filter software to only show those assigned to users in the manager's department
        software = software.filter(sw => departmentSoftwareIds.has(sw.id));
      }
      
      res.json(software);
    } catch (error) {
      console.error('Error in /api/software:', error);
      res.status(500).json({ message: "Error fetching software" });
    }
  });

  app.get('/api/software/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const software = await storage.getSoftwareById(id);
      
      if (!software) {
        return res.status(404).json({ message: "Software not found" });
      }
      
      res.json(software);
    } catch (error) {
      res.status(500).json({ message: "Error fetching software" });
    }
  });

  app.post('/api/software', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertSoftwareSchema.parse(req.body);
      const software = await storage.createSoftware(validatedData, loggedInUserId);
      res.status(201).json(software);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid software data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating software" });
    }
  });

  app.put('/api/software/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertSoftwareSchema.partial().parse(req.body);
      const software = await storage.updateSoftware(id, validatedData, loggedInUserId);
      
      if (!software) {
        return res.status(404).json({ message: "Software not found" });
      }
      
      res.json(software);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid software data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating software" });
    }
  });

  app.delete('/api/software/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const success = await storage.deleteSoftware(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "Software not found or in use" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting software" });
    }
  });

  // Software status filtering routes
  app.get('/api/software/status/:status', async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      const software = await storage.getSoftwareByStatusWithUsageCounts(status);
      res.json(software);
    } catch (error) {
      console.error("Error fetching software by status:", error);
      res.status(500).json({ message: "Error fetching software by status" });
    }
  });

  // Software expiring soon
  app.get('/api/software/expiring/:days', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.params.days);
      const software = await storage.getSoftwareExpiringSoon(days);
      res.json(software);
    } catch (error) {
      console.error("Error fetching expiring software:", error);
      res.status(500).json({ message: "Error fetching expiring software" });
    }
  });

  // Software assignments
  app.get('/api/software/:id/assignments', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assignments = await storage.getSoftwareAssignments(id);
      
      // Enrich with user and device information
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const user = assignment.userId ? await storage.getUserById(assignment.userId) : null;
          const device = assignment.deviceId ? await storage.getDeviceById(assignment.deviceId) : null;
          const assignedBy = assignment.assignedBy ? await storage.getUserById(assignment.assignedBy) : null;
          
          return {
            ...assignment,
            user: user ? { 
              id: user.id, 
              name: `${user.firstName} ${user.lastName}`,
              department: user.department
            } : null,
            device: device ? {
              id: device.id,
              name: device.name,
              brand: device.brand,
              model: device.model,
              assetTag: device.assetTag
            } : null,
            assignor: assignedBy ? {
              id: assignedBy.id,
              name: `${assignedBy.firstName} ${assignedBy.lastName}`
            } : null
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching software assignments:", error);
      res.status(500).json({ message: "Error fetching software assignments" });
    }
  });
  
  // Software assignments by user
  app.get('/api/software-assignments/user/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const assignments = await storage.getSoftwareAssignmentsByUser(userId);
      
      // Enrich with software information
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const software = await storage.getSoftwareById(assignment.softwareId);
          
          return {
            ...assignment,
            software: software ? {
              id: software.id,
              name: software.name,
              vendor: software.vendor,
              licenseType: software.licenseType,
              expiryDate: software.expiryDate,
              status: software.status,
              url: software.url,
              icon: software.icon
            } : null
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching user software assignments:", error);
      res.status(500).json({ message: "Error fetching user software assignments" });
    }
  });

  app.post('/api/software-assignments', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Add the assignedBy field
      const assignmentData = {
        ...req.body,
        assignedBy: loggedInUserId
      };
      
      // Debug log to help track issues with field names
      console.log('Software assignment request data:', assignmentData);
      
      const validatedData = insertSoftwareAssignmentSchema.parse(assignmentData);
      console.log('Validated software assignment data:', validatedData);
      
      const assignment = await storage.createSoftwareAssignment(validatedData);
      
      // Get the software to check if we need to send a notification
      const software = await storage.getSoftwareById(validatedData.softwareId);
      
      // Send notification email if configured
      if (software && software.sendAccessNotifications && software.notificationEmail) {
        // Get user information
        const user = validatedData.userId ? await storage.getUserById(validatedData.userId) : null;
        
        if (user) {
          // Get current email settings and update the service
          const emailSettings = await storage.getEmailSettings();
          if (emailSettings) {
            console.log('Updating mailgun service with current email settings for software notification');
            console.log('Email settings:', JSON.stringify(emailSettings, null, 2));
            const updatedMailgunService = updateMailgunService(emailSettings);
            
            const emailResult = await updatedMailgunService.sendSoftwareAccessEmail(
              software.notificationEmail,
              'assigned',
              software.name,
              `${user.firstName} ${user.lastName}`
            );
            
            console.log('Software access notification email result:', emailResult);
          } else {
            console.log('No email settings found for software notification');
          }
        }
      }
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating software assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid software assignment data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating software assignment" });
    }
  });

  app.delete('/api/software-assignments/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Get the assignment details before deletion for notification
      const assignment = await storage.getSoftwareAssignmentById(id);
      
      const success = await storage.deleteSoftwareAssignment(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "Software assignment not found" });
      }
      
      // Send notification email if configured and assignment existed
      if (assignment && assignment.userId) {
        const software = await storage.getSoftwareById(assignment.softwareId);
        
        if (software && software.sendAccessNotifications && software.notificationEmail) {
          const user = await storage.getUserById(assignment.userId);
          
          if (user) {
            // Get current email settings and update the service
            const emailSettings = await storage.getEmailSettings();
            if (emailSettings) {
              console.log('Updating mailgun service with current email settings for software unassignment notification');
              const updatedMailgunService = updateMailgunService(emailSettings);
              
              const emailResult = await updatedMailgunService.sendSoftwareAccessEmail(
                software.notificationEmail,
                'unassigned',
                software.name,
                `${user.firstName} ${user.lastName}`
              );
              
              console.log('Software unassignment notification email result:', emailResult);
            }
          }
        }
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting software assignment:", error);
      res.status(500).json({ message: "Error deleting software assignment" });
    }
  });

  // Maintenance routes
  app.get('/api/maintenance', async (req: Request, res: Response) => {
    try {
      const records = await storage.getMaintenanceRecords();
      
      // Enrich with device information
      const enrichedRecords = await Promise.all(
        records.map(async (record) => {
          const device = await storage.getDeviceById(record.deviceId);
          
          return {
            ...record,
            device: device ? {
              id: device.id,
              name: device.name,
              brand: device.brand,
              model: device.model,
              assetTag: device.assetTag
            } : null
          };
        })
      );
      
      res.json(enrichedRecords);
    } catch (error) {
      res.status(500).json({ message: "Error fetching maintenance records" });
    }
  });

  app.get('/api/devices/:id/maintenance', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const records = await storage.getMaintenanceRecordsByDevice(id);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Error fetching device maintenance records" });
    }
  });

  app.post('/api/maintenance', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertMaintenanceRecordSchema.parse(req.body);
      const record = await storage.createMaintenanceRecord(validatedData, loggedInUserId);
      
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance record data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating maintenance record" });
    }
  });

  app.put('/api/maintenance/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertMaintenanceRecordSchema.partial().parse(req.body);
      const record = await storage.updateMaintenanceRecord(id, validatedData, loggedInUserId);
      
      if (!record) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }
      
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Maintenance record validation error:', error.errors);
        return res.status(400).json({ message: "Invalid maintenance record data", errors: error.errors });
      }
      console.error('Error updating maintenance record:', error);
      res.status(500).json({ message: "Error updating maintenance record" });
    }
  });

  app.delete('/api/maintenance/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const success = await storage.deleteMaintenanceRecord(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting maintenance record" });
    }
  });

  // QR code routes
  app.get('/api/qrcodes', async (req: Request, res: Response) => {
    try {
      const qrCodes = await storage.getQrCodes();
      res.json(qrCodes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching QR codes" });
    }
  });

  app.get('/api/qrcodes/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const qrCode = await storage.getQrCodeById(id);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      res.json(qrCode);
    } catch (error) {
      res.status(500).json({ message: "Error fetching QR code" });
    }
  });

  app.post('/api/qrcodes', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertQrCodeSchema.parse(req.body);
      const qrCode = await storage.createQrCode(validatedData, loggedInUserId);
      res.status(201).json(qrCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid QR code data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating QR code" });
    }
  });

  app.put('/api/qrcodes/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const validatedData = insertQrCodeSchema.partial().parse(req.body);
      const qrCode = await storage.updateQrCode(id, validatedData, loggedInUserId);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      res.json(qrCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid QR code data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating QR code" });
    }
  });

  app.delete('/api/qrcodes/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      const success = await storage.deleteQrCode(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting QR code" });
    }
  });

  // Scan a QR code
  app.post('/api/qrcodes/scan/:code', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Get client IP and user agent for scan history
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Find the QR code
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      // Record the scan
      const updatedQrCode = await storage.recordQrCodeScan(qrCode.id, loggedInUserId, ipAddress, userAgent);
      
      // Get the associated device
      let device = null;
      if (qrCode.deviceId) {
        device = await storage.getDeviceById(qrCode.deviceId);
      }
      
      res.json({
        qrCode: updatedQrCode,
        device
      });
    } catch (error) {
      console.error("Error scanning QR code:", error);
      res.status(500).json({ message: "Error scanning QR code" });
    }
  });

  // Get QR code scan history
  app.get('/api/qrcodes/:id/history', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const history = await storage.getQrCodeScanHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching QR code scan history:", error);
      res.status(500).json({ message: "Error fetching QR code scan history" });
    }
  });

  // Notification routes
  app.get('/api/users/:id/notifications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  app.get('/api/users/:id/notifications/unread', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching unread notifications" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const success = await storage.deleteNotification(id);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting notification" });
    }
  });

  // Branding settings routes
  app.get('/api/branding', async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBrandingSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching branding settings:", error);
      res.status(500).json({ message: "Error fetching branding settings" });
    }
  });

  app.put('/api/branding', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertBrandingSettingsSchema.partial().parse(req.body);
      
      // Validate site description length (for SEO purposes)
      if (validatedData.siteDescription && validatedData.siteDescription.length > 160) {
        return res.status(400).json({ 
          message: "Site description is too long", 
          errors: [{ path: ["siteDescription"], message: "Site description should be 160 characters or less for optimal SEO" }] 
        });
      }
      
      const settings = await storage.updateBrandingSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating branding settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid branding settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating branding settings" });
    }
  });

  // Import devices from CSV
  app.post('/api/import/devices', isAuthenticated, isAdmin, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Get the currently logged in user's ID from the session
      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;
      
      // Parse CSV file
      const fileContent = req.file.buffer.toString('utf8');
      
      // Use the csv-parse library to parse the CSV data
      parse(fileContent, {
        columns: true,
        trim: true,
        skip_empty_lines: true
      }, async (err, records) => {
        if (err) {
          console.error("Error parsing CSV:", err);
          return res.status(400).json({ message: "Error parsing CSV file", error: err.message });
        }
        
        try {
          // Process each record
          const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
          };
          
          console.log(`Processing ${records.length} records from CSV`);
          
          for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
              // Helper function to parse currency values
              const parseCurrency = (value: string) => {
                if (!value) return null;
                // Remove currency symbols, commas, and spaces
                const cleaned = value.replace(/[$,\s]/g, '');
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? null : Math.round(parsed * 100); // Convert to cents
              };

              // Helper function to parse dates safely
              const parseDate = (value: string) => {
                if (!value) return null;
                // Fix common date format issues
                let dateStr = value.toString().trim();
                
                // Handle empty strings, "N/A", "None", etc.
                if (dateStr === '' || dateStr.toLowerCase() === 'n/a' || dateStr.toLowerCase() === 'none' || dateStr.toLowerCase() === 'null') {
                  return null;
                }
                
                // Handle the specific "1/27/1023" format - assume it's 2023
                if (dateStr.includes('/1023')) {
                  dateStr = dateStr.replace('/1023', '/2023');
                }
                
                // Handle 2-digit years (assume 20XX for years 00-30, 19XX for years 31-99)
                if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
                  const parts = dateStr.split('/');
                  let year = parseInt(parts[2]);
                  if (year <= 30) {
                    year += 2000;
                  } else if (year <= 99) {
                    year += 1900;
                  }
                  dateStr = `${parts[0]}/${parts[1]}/${year}`;
                }
                
                try {
                  const date = new Date(dateStr);
                  return isNaN(date.getTime()) ? null : date;
                } catch (e) {
                  return null;
                }
              };

              // Helper function to parse boolean values
              const parseBoolean = (value: string) => {
                if (!value) return false;
                const str = value.toString().toLowerCase();
                return str === 'yes' || str === 'true' || str === '1';
              };

              // Map CSV columns to device fields
              // Handle common variations in column names
              const deviceData = {
                name: record.Name || record.name || record.DeviceName || record.deviceName || null,
                brand: record.Brand || record.brand || record.Manufacturer || record.manufacturer || "Unknown",
                model: record.Model || record.model || "Unknown",
                serialNumber: (record.SerialNumber || record['Serial Number'] || record.serial || record.Serial || '').trim() || null,
                assetTag: (record.AssetTag || record['Asset Tag'] || record.Tag || record.tag || '').trim() || null,
                // Convert purchase cost from dollars to cents if present
                purchaseCost: parseCurrency(record.PurchaseCost || record['Purchase Cost'] || record.Cost || record.cost),
                purchaseDate: parseDate(record.PurchaseDate || record['Purchase Date'] || record.Date || record.date),
                purchasedBy: record.PurchasedBy || record['Purchased By'] || record.Purchaser || record.purchaser || "",
                warrantyEOL: parseDate(record.WarrantyEOL || record['Warranty End'] || record['Warranty EOL'] || record['Warranty Expiration'] || record['Warranty Expires'] || record.WarrantyEnd || record.WarrantyExpires || record.WarrantyExpiration || record.Warranty || record.warranty || record.warrantyEnd || record.warrantyExpires || record.warrantyExpiration),
                status: record.Status || record.status || 'active',
                isIntuneOnboarded: parseBoolean(record.IntuneOnboarded || record.intuneOnboarded),
                intuneComplianceStatus: record.IntuneStatus || record.intuneStatus || 'unknown',
              };
              
              // Find category by name if provided
              if (record.Category || record.category) {
                const categoryName = record.Category || record.category;
                const categories = await storage.getCategories();
                
                // Create a mapping of CSV category names to database categories
                const categoryMapping = {
                  'desktop': 'Desktop',
                  'laptop': 'Laptop',
                  'monitor': 'Monitor',
                  'av': 'Other',
                  'apple': 'Laptop',
                  'phone': 'Phone',
                  'desk phone': 'Phone',
                  'router': 'Networking',
                  'switch': 'Networking',
                  'firewall': 'Networking',
                  'server': 'Server',
                  'printer': 'Printer',
                  'tablet': 'Tablet'
                };
                
                // First try exact match
                let category = categories.find(c => 
                  c.name.toLowerCase() === categoryName.toLowerCase()
                );
                
                // If no exact match, try mapped category
                if (!category) {
                  const mappedCategoryName = categoryMapping[categoryName.toLowerCase()];
                  if (mappedCategoryName) {
                    category = categories.find(c => 
                      c.name.toLowerCase() === mappedCategoryName.toLowerCase()
                    );
                  }
                }
                
                // If still no match, use "Other" as fallback
                if (!category) {
                  category = categories.find(c => 
                    c.name.toLowerCase() === 'other'
                  );
                }
                
                if (category) {
                  deviceData.categoryId = category.id;
                }
              }
              
              // Find site by name if provided
              if (record.Site || record.site) {
                const siteName = record.Site || record.site;
                const sites = await storage.getSites();
                const site = sites.find(s => 
                  s.name.toLowerCase() === siteName.toLowerCase()
                );
                
                if (site) {
                  deviceData.siteId = site.id;
                }
              }

              // Find user by name if provided (for device assignment)
              let assignedUserId = null;
              if (record.AssignedTo || record.assignedTo) {
                const assignedToName = record.AssignedTo || record.assignedTo;
                const users = await storage.getUsers();
                const user = users.find(u => {
                  const fullName = `${u.firstName} ${u.lastName}`;
                  return fullName.toLowerCase() === assignedToName.toLowerCase();
                });
                
                if (user) {
                  deviceData.userId = user.id;
                  assignedUserId = user.id;
                }
              }
              
              // Validate and create device
              const validatedData = insertDeviceSchema.parse(deviceData);
              const newDevice = await storage.createDevice(validatedData, loggedInUserId);
              
              // Create assignment history record if device was assigned to a user
              if (assignedUserId && newDevice) {
                await storage.createAssignmentHistory({
                  deviceId: newDevice.id,
                  userId: assignedUserId,
                  assignedBy: loggedInUserId,
                  assignedAt: new Date(),
                  notes: 'Device assigned during CSV import'
                });
              }
              
              results.success++;
            } catch (error) {
              console.error(`Error importing device (row ${i + 2}):`, error); // +2 because CSV has header row
              results.failed++;
              const rowNumber = i + 2; // +2 because CSV has header row
              if (error instanceof z.ZodError) {
                results.errors.push(`Row ${rowNumber}: Validation error - ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
              } else {
                results.errors.push(`Row ${rowNumber}: ${error.message || 'Unknown error'}`);
              }
            }
          }
          
          console.log(`CSV Import Results: ${results.success} successful, ${results.failed} failed`);
          if (results.errors.length > 0) {
            console.log("Import errors:", results.errors);
          }
          
          res.json(results);
        } catch (error) {
          console.error("Error processing CSV records:", error);
          res.status(500).json({ message: "Error processing CSV records", error: error.message });
        }
      });
    } catch (error) {
      console.error("Error importing devices:", error);
      res.status(500).json({ message: "Error importing devices" });
    }
  });

  // Export devices to CSV
  app.get('/api/export/devices', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      
      // Transform data for CSV export
      const exportData = await Promise.all(devices.map(async (device) => {
        // Get category name
        const category = device.categoryId 
          ? await storage.getCategoryById(device.categoryId)
          : null;
          
        // Get user name
        const user = device.userId
          ? await storage.getUserById(device.userId)
          : null;
          
        // Get site name
        const site = device.siteId
          ? await storage.getSiteById(device.siteId)
          : null;
          
        return {
          Name: device.name || "",
          Brand: device.brand || "",
          Model: device.model || "",
          SerialNumber: device.serialNumber || "",
          AssetTag: device.assetTag || "",
          Category: category ? category.name : "",
          Site: site ? site.name : "",
          PurchaseCost: device.purchaseCost ? `$${(device.purchaseCost / 100).toFixed(2)}` : "",
          PurchaseDate: device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : "",
          PurchasedBy: device.purchasedBy || "",
          WarrantyEnd: device.warrantyEOL ? new Date(device.warrantyEOL).toLocaleDateString() : "",
          Status: device.status || "active",
          AssignedTo: user ? `${user.firstName} ${user.lastName}` : "",
          Department: user ? user.department || "" : "",
          IntuneOnboarded: device.isIntuneOnboarded ? "Yes" : "No",
          IntuneStatus: device.intuneComplianceStatus || "unknown",
        };
      }));
      
      // Convert to CSV
      stringify(exportData, { header: true }, (err, output) => {
        if (err) {
          console.error("Error generating CSV:", err);
          return res.status(500).json({ message: "Error generating CSV" });
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="devices-export-${new Date().toISOString().slice(0, 10)}.csv"`);
        
        // Send the CSV data
        res.send(output);
      });
    } catch (error) {
      console.error("Error exporting devices:", error);
      res.status(500).json({ message: "Error exporting devices" });
    }
  });

  // Export Tangible Personal Property report to CSV
  app.get('/api/export/tangible-property', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      
      // Get optional filters from query parameters
      const yearFilter = req.query.year ? parseInt(req.query.year as string) : null;
      const siteIdFilter = req.query.siteId ? parseInt(req.query.siteId as string) : null;
      
      // Filter devices based on purchase year and site if filters are provided
      const filteredDevices = devices.filter(device => {
        // Apply year filter
        if (yearFilter && device.purchaseDate) {
          const purchaseYear = new Date(device.purchaseDate).getFullYear();
          if (purchaseYear !== yearFilter) {
            return false;
          }
        }
        
        // Apply site filter
        if (siteIdFilter && device.siteId !== siteIdFilter) {
          return false;
        }
        
        return true;
      });
      
      // Transform data for CSV export
      const exportData = await Promise.all(filteredDevices.map(async (device) => {
        // Get site name
        const site = device.siteId
          ? await storage.getSiteById(device.siteId)
          : null;
          
        return {
          Model: device.model || "",
          SerialNumber: device.serialNumber || "",
          AssetTag: device.assetTag || "",
          PurchaseCost: device.purchaseCost ? `$${(device.purchaseCost / 100).toFixed(2)}` : "",
          PurchaseDate: device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : "",
          Site: site ? site.name : "",
        };
      }));
      
      // Convert to CSV
      stringify(exportData, { header: true }, (err, output) => {
        if (err) {
          console.error("Error generating CSV:", err);
          return res.status(500).json({ message: "Error generating CSV" });
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tangible-property-export-${new Date().toISOString().slice(0, 10)}.csv"`);
        
        // Send the CSV data
        res.send(output);
      });
    } catch (error) {
      console.error("Error exporting tangible property report:", error);
      res.status(500).json({ message: "Error exporting tangible property report" });
    }
  });

// Export warranties to CSV
  app.get('/api/export/warranties', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      
      // Filter devices with warranty info
      const devicesWithWarranty = devices.filter(device => device.warrantyEOL);
      
      // Transform data for CSV export
      const exportData = await Promise.all(devicesWithWarranty.map(async (device) => {
        // Get category name
        const category = device.categoryId 
          ? await storage.getCategoryById(device.categoryId)
          : null;
          
        // Get user name
        const user = device.userId
          ? await storage.getUserById(device.userId)
          : null;
          
        // Get site name
        const site = device.siteId
          ? await storage.getSiteById(device.siteId)
          : null;
          
        // Calculate days until warranty expiration
        const today = new Date();
        const warrantyDate = new Date(device.warrantyEOL);
        const diffTime = warrantyDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          Name: device.name || "",
          Brand: device.brand || "",
          Model: device.model || "",
          SerialNumber: device.serialNumber || "",
          AssetTag: device.assetTag || "",
          Category: category ? category.name : "",
          Site: site ? site.name : "",
          PurchaseDate: device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : "",
          WarrantyEnd: device.warrantyEOL ? new Date(device.warrantyEOL).toLocaleDateString() : "",
          DaysRemaining: diffDays,
          Status: device.status || "active",
          AssignedTo: user ? `${user.firstName} ${user.lastName}` : "",
          Department: user ? user.department || "" : "",
        };
      }));
      
      // Convert to CSV
      stringify(exportData, { header: true }, (err, output) => {
        if (err) {
          console.error("Error generating CSV:", err);
          return res.status(500).json({ message: "Error generating CSV" });
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="warranty-export-${new Date().toISOString().slice(0, 10)}.csv"`);
        
        // Send the CSV data
        res.send(output);
      });
    } catch (error) {
      console.error("Error exporting warranties:", error);
      res.status(500).json({ message: "Error exporting warranties" });
    }
  });

  // Enhanced Problem report routes
  app.get('/api/problem-reports', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sessionData = req.session as any;
      const { status, userId } = req.query;
      const currentUser = await storage.getUserById(sessionData.userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let filterUserId = userId;
      
      // Admin users can see all reports
      if (currentUser.role === 'admin') {
        // No filtering for admin users
      } 
      // Managers can see reports from their department
      else if (currentUser.isManager) {
        const allReports = await storage.getProblemReports(status as string);
        const users = await storage.getUsers();
        const departmentUsers = users.filter(user => user.department === currentUser.department);
        const departmentUserIds = departmentUsers.map(user => user.id);
        
        const filteredReports = allReports.filter(report => 
          departmentUserIds.includes(report.userId)
        );
        
        return res.json(filteredReports);
      }
      // Regular users can only see their own reports
      else {
        filterUserId = sessionData.userId.toString();
      }
      
      const reports = await storage.getProblemReports(status as string, filterUserId ? parseInt(filterUserId) : undefined);
      res.json(reports);
    } catch (error) {
      console.error('Error getting problem reports:', error);
      res.status(500).json({ message: "Error retrieving problem reports" });
    }
  });

  app.get('/api/problem-reports/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      
      const report = await storage.getProblemReportById(parseInt(id));
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Non-admin users can only see their own reports
      if (sessionData.userRole !== 'admin' && report.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(report);
    } catch (error) {
      console.error('Error getting problem report:', error);
      res.status(500).json({ message: "Error retrieving problem report" });
    }
  });

  app.post('/api/problem-reports', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { type, itemId, subject, description, priority } = req.body;
      const sessionData = req.session as any;
      const reportingUserId = sessionData.userId;

      // Validate required fields
      if (!type || !itemId || !subject || !description || !priority) {
        return res.status(400).json({ 
          message: "Missing required fields" 
        });
      }

      // Create the problem report in database
      const reportData = {
        userId: reportingUserId,
        type,
        itemId: parseInt(itemId),
        subject,
        description,
        priority,
        status: 'open'
      };

      const newReport = await storage.createProblemReport(reportData, reportingUserId);

      // Get reporting user info for notifications
      const reportingUser = await storage.getUserById(reportingUserId);
      if (!reportingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get item details based on type
      let itemName = "";
      let itemDetails = "";
      
      if (type === "device") {
        const device = await storage.getDeviceById(parseInt(itemId));
        if (device) {
          itemName = `${device.brand} ${device.model}`;
          if (device.assetTag) {
            itemName += ` (${device.assetTag})`;
          }
          itemDetails = itemName;
        }
      } else if (type === "software") {
        const software = await storage.getSoftwareById(parseInt(itemId));
        if (software) {
          itemName = software.name;
          itemDetails = `${software.name} (${software.vendor})`;
        }
      }

      // Create notifications for all admin users
      const adminUsers = await storage.getUsersByRole('admin');
      
      const notificationTitle = `Problem Report: ${itemDetails}`;
      const notificationMessage = `${reportingUser.firstName} ${reportingUser.lastName} reported a ${priority} priority problem with ${itemDetails}: "${subject}"`;

      // Create notification for each admin
      for (const admin of adminUsers) {
        await storage.createNotification({
          userId: admin.id,
          type: 'problem_report',
          title: notificationTitle,
          message: notificationMessage,
          isRead: false,
          relatedId: newReport.id, // Use the problem report ID instead of item ID
          relatedType: 'problem_report'
        });
      }

      res.status(201).json({ 
        success: true, 
        message: "Problem report submitted successfully",
        report: newReport
      });

    } catch (error) {
      console.error('Error creating problem report:', error);
      res.status(500).json({ message: "Error submitting problem report" });
    }
  });

  app.put('/api/problem-reports/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      let updates = req.body;
      
      // Check if report exists and access permissions
      const existingReport = await storage.getProblemReportById(parseInt(id));
      if (!existingReport) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Only admins can update reports (or the original reporter for basic fields)
      if (sessionData.userRole !== 'admin' && existingReport.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Non-admin users can only update description, not status or assignment
      if (sessionData.userRole !== 'admin') {
        updates = { description: updates.description };
      }
      
      const updatedReport = await storage.updateProblemReport(parseInt(id), updates, sessionData.userId);
      
      if (!updatedReport) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      res.json(updatedReport);
    } catch (error) {
      console.error('Error updating problem report:', error);
      res.status(500).json({ message: "Error updating problem report" });
    }
  });

  app.post('/api/problem-reports/:id/complete', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      
      const completedReport = await storage.completeProblemReport(parseInt(id), sessionData.userId);
      
      if (!completedReport) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      res.json(completedReport);
    } catch (error) {
      console.error('Error completing problem report:', error);
      res.status(500).json({ message: "Error completing problem report" });
    }
  });

  app.post('/api/problem-reports/:id/archive', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      
      const archivedReport = await storage.archiveProblemReport(parseInt(id), sessionData.userId);
      
      if (!archivedReport) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      res.json(archivedReport);
    } catch (error) {
      console.error('Error archiving problem report:', error);
      res.status(500).json({ message: "Error archiving problem report" });
    }
  });

  // Problem Report Messages routes
  app.get('/api/problem-reports/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      
      // Check if user has access to this problem report
      const report = await storage.getProblemReportById(parseInt(id));
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Non-admin users can only see messages for their own reports
      if (sessionData.userRole !== 'admin' && report.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getProblemReportMessages(parseInt(id));
      
      // Filter out internal messages for non-admin users
      if (sessionData.userRole !== 'admin') {
        const filteredMessages = messages.filter(msg => !msg.isInternal);
        return res.json(filteredMessages);
      }
      
      res.json(messages);
    } catch (error) {
      console.error('Error getting problem report messages:', error);
      res.status(500).json({ message: "Error retrieving messages" });
    }
  });

  app.post('/api/problem-reports/:id/messages', isAuthenticated, upload.array('messageImages', 5), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message, isInternal } = req.body;
      const sessionData = req.session as any;
      const files = req.files as Express.Multer.File[];
      
      if ((!message || message.trim().length === 0) && (!files || files.length === 0)) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }
      
      // Check if user has access to this problem report
      const report = await storage.getProblemReportById(parseInt(id));
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Non-admin users can only add messages to their own reports and cannot create internal messages
      if (sessionData.userRole !== 'admin' && report.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let imageUrls: string[] = [];
      
      // Process uploaded inline images
      if (files && files.length > 0) {
        for (const file of files) {
          // Validate image type
          if (!file.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: "Only image files are allowed for inline images" });
          }
          
          // Generate unique filename
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const extension = path.extname(file.originalname);
          const filename = `message-${timestamp}-${randomId}${extension}`;
          const filepath = path.join(uploadsDir, filename);
          
          // Save file
          await fs.promises.writeFile(filepath, file.buffer);
          
          // Store relative URL
          imageUrls.push(`/uploads/${filename}`);
        }
      }
      
      const messageData = {
        problemReportId: parseInt(id),
        userId: sessionData.userId,
        message: message ? message.trim() : '',
        isInternal: sessionData.userRole === 'admin' && isInternal === true,
        images: imageUrls
      };
      
      const newMessage = await storage.createProblemReportMessage(messageData, sessionData.userId);
      
      // Create notification for relevant users when a new message is added
      if (!messageData.isInternal) {
        // If admin replied, notify the original reporter
        if (sessionData.userRole === 'admin' && sessionData.userId !== report.userId) {
          await storage.createNotification({
            userId: report.userId,
            type: 'problem_report',
            title: `Response to your problem report: ${report.subject}`,
            message: `An administrator has responded to your problem report.`,
            isRead: false,
            relatedId: report.id,
            relatedType: 'problem_report'
          });
        }
        // If user replied, notify all admins
        else if (sessionData.userRole !== 'admin') {
          const adminUsers = await storage.getUsersByRole('admin');
          const reportingUser = await storage.getUserById(sessionData.userId);
          
          for (const admin of adminUsers) {
            await storage.createNotification({
              userId: admin.id,
              type: 'problem_report',
              title: `New message on problem report: ${report.subject}`,
              message: `${reportingUser?.firstName} ${reportingUser?.lastName} added a message to their problem report.`,
              isRead: false,
              relatedId: report.id,
              relatedType: 'problem_report'
            });
          }
        }
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error creating problem report message:', error);
      res.status(500).json({ message: "Error creating message" });
    }
  });

  // Problem Report Attachments routes
  app.get('/api/problem-reports/:id/attachments', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      
      // Check if user has access to this problem report
      const report = await storage.getProblemReportById(parseInt(id));
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Non-admin users can only see attachments for their own reports
      if (sessionData.userRole !== 'admin' && report.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const attachments = await storage.getProblemReportAttachments(parseInt(id));
      res.json(attachments);
    } catch (error) {
      console.error('Error getting problem report attachments:', error);
      res.status(500).json({ message: "Error retrieving attachments" });
    }
  });

  app.post('/api/problem-reports/:id/attachments', isAuthenticated, attachmentUpload.array('files', 5), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      const files = req.files as Express.Multer.File[];
      
      console.log('Attachment upload request received for problem report:', id);
      console.log('Files received:', files?.length || 0);
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);
      
      if (!files || files.length === 0) {
        console.log('No files found in request');
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      // Check if user has access to this problem report
      const report = await storage.getProblemReportById(parseInt(id));
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Users can only upload to their own reports, admins can upload to any
      if (sessionData.userRole !== 'admin' && report.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Create attachments directory if it doesn't exist
      const attachmentsDir = path.join(process.cwd(), 'uploads', 'attachments');
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }
      
      const attachments = [];
      
      for (const file of files) {
        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
        const finalPath = path.join(attachmentsDir, uniqueFileName);
        
        // Move file to final location
        fs.renameSync(file.path, finalPath);
        
        // Save attachment record to database
        const attachment = await storage.createProblemReportAttachment({
          problemReportId: parseInt(id),
          fileName: uniqueFileName,
          originalName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          filePath: finalPath,
          uploadedBy: sessionData.userId
        });
        
        attachments.push(attachment);
      }
      
      res.status(201).json({ message: "Files uploaded successfully", attachments });
    } catch (error) {
      console.error('Error uploading attachments:', error);
      res.status(500).json({ message: "Error uploading files" });
    }
  });

  app.get('/api/attachments/:id/download', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      const attachmentId = parseInt(id);
      
      console.log('Download request for attachment ID:', attachmentId);
      
      // Get attachment by ID
      const attachment = await storage.getProblemReportAttachmentById(attachmentId);
      
      console.log('Found attachment:', attachment);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Check if user has access to this attachment's problem report
      const report = await storage.getProblemReportById(attachment.problemReportId);
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Non-admin users can only download attachments from their own reports
      if (sessionData.userRole !== 'admin' && report.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if file exists
      if (!fs.existsSync(attachment.filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }
      
      // Set appropriate headers and send file
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      res.sendFile(path.resolve(attachment.filePath));
    } catch (error) {
      console.error('Error downloading attachment:', error);
      res.status(500).json({ message: "Error downloading file" });
    }
  });

  app.get('/api/attachments/:id/view', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      const attachmentId = parseInt(id);
      
      // Get attachment by ID
      const attachment = await storage.getProblemReportAttachmentById(attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Check if user has access to this attachment's problem report
      const report = await storage.getProblemReportById(attachment.problemReportId);
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Non-admin users can only view attachments from their own reports
      if (sessionData.userRole !== 'admin' && report.userId !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if file exists
      if (!fs.existsSync(attachment.filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }
      
      // Set appropriate headers for inline viewing
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader('Content-Disposition', 'inline');
      res.sendFile(path.resolve(attachment.filePath));
    } catch (error) {
      console.error('Error viewing attachment:', error);
      res.status(500).json({ message: "Error viewing file" });
    }
  });

  app.delete('/api/attachments/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionData = req.session as any;
      const attachmentId = parseInt(id);
      
      // Get attachment info
      const attachment = await storage.getProblemReportAttachmentById(attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Check if user has access to this attachment's problem report
      const report = await storage.getProblemReportById(attachment.problemReportId);
      if (!report) {
        return res.status(404).json({ message: "Problem report not found" });
      }
      
      // Only attachment uploader or admin can delete
      if (sessionData.userRole !== 'admin' && attachment.uploadedBy !== sessionData.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete file from filesystem
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }
      
      // Delete attachment record from database
      const success = await storage.deleteProblemReportAttachment(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      res.status(500).json({ message: "Error deleting attachment" });
    }
  });

  // Message images route - serve uploaded message images
  app.get('/uploads/*', async (req: Request, res: Response) => {
    try {
      const filePath = path.join(process.cwd(), req.path);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Get file stats to determine content type
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        return res.status(404).json({ message: "Not a file" });
      }
      
      // Determine content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf'
      };
      
      const contentType = contentTypeMap[ext] || 'application/octet-stream';
      
      // Set appropriate headers for inline viewing
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('Error serving uploaded file:', error);
      res.status(500).json({ message: "Error serving file" });
    }
  });

  // CSV Import/Export routes
  app.post('/api/import/users', isAuthenticated, isAdmin, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const sessionData = req.session as any;
      const loggedInUserId = sessionData.userId;

      // Parse CSV data
      const csvData = req.file.buffer.toString('utf8');
      const records: any[] = [];

      parse(csvData, { 
        columns: true, 
        skip_empty_lines: true 
      }, async (err, data) => {
        if (err) {
          console.error('CSV parsing error:', err);
          return res.status(400).json({ message: "Invalid CSV format" });
        }

        try {
          let importedCount = 0;
          let skippedCount = 0;
          const errors: string[] = [];

          for (const record of data) {
            try {
              // Map CSV columns to database fields
              const userData = {
                firstName: record.FirstName || record.first_name || '',
                lastName: record.LastName || record.last_name || '',
                email: record.Email || record.email || '',
                phoneNumber: record.PhoneNumber || record.phone_number || record.Phone || '',
                department: record.Department || record.department || '',
                role: record.Role || record.role || 'user',
                active: record.Status === 'inactive' ? false : true,
                passwordResetRequired: true,
                twoFactorEnabled: (record.TwoFactorEnabled || record.two_factor_enabled) === 'Yes'
              };

              // Validate required fields
              if (!userData.firstName || !userData.lastName || !userData.email) {
                skippedCount++;
                errors.push(`Row skipped: Missing required fields for ${userData.firstName} ${userData.lastName} (${userData.email})`);
                continue;
              }

              // Check if user already exists
              const existingUser = await storage.getUserByEmail(userData.email);
              if (existingUser) {
                skippedCount++;
                errors.push(`User ${userData.email} already exists`);
                continue;
              }

              // Create user with temporary password
              const tempPassword = 'TempPass123!';
              const hashedPassword = await import('bcrypt').then(bcrypt => bcrypt.hash(tempPassword, 10));
              
              const userToCreate = {
                ...userData,
                passwordHash: hashedPassword,
                passwordResetRequired: true
              };

              // Create user
              const newUser = await storage.createUser(userToCreate, loggedInUserId);
              importedCount++;
              
              // Send welcome email if user has an email address
              if (newUser.email) {
                try {
                  // Get email settings to check if service is configured and enabled
                  const emailSettings = await storage.getEmailSettings();
                  
                  if (emailSettings && emailSettings.isEnabled) {
                    // Update the direct mailgun service with current settings from database
                    const updatedMailgunService = updateMailgunService(emailSettings);
                    
                    // Check if direct mailgun service is configured
                    const isConfigured = updatedMailgunService.isConfigured();
                    
                    if (isConfigured) {
                      const fullName = `${newUser.firstName} ${newUser.lastName}`;
                      
                      console.log(`Sending welcome email to imported user: ${newUser.email}`);
                      const result = await updatedMailgunService.sendWelcomeEmail(
                        newUser.email,
                        tempPassword,
                        fullName
                      );
                      
                      console.log('Welcome email result for imported user:', result);
                    }
                  }
                } catch (emailError) {
                  console.error('Error sending welcome email to imported user:', emailError);
                  // Don't fail user creation if email fails
                }
              }

            } catch (error) {
              console.error('Error processing user record:', error);
              skippedCount++;
              errors.push(`Error processing ${record.FirstName} ${record.LastName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          // Log import activity
          await storage.createActivityLog({
            actionType: 'BULK_IMPORT',
            userId: loggedInUserId,
            details: `Imported ${importedCount} users from CSV (${skippedCount} skipped)`
          });

          res.json({
            message: `Successfully imported ${importedCount} users. ${skippedCount} records skipped.`,
            imported: importedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined
          });

        } catch (error) {
          console.error('Error processing CSV import:', error);
          res.status(500).json({ message: "Error processing CSV import" });
        }
      });

    } catch (error) {
      console.error('Error importing users:', error);
      res.status(500).json({ message: "Error importing users" });
    }
  });

  // Export users to CSV
  app.get('/api/export/users', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      
      // Transform data for CSV export
      const exportData = users.map(user => ({
        ID: user.id,
        FirstName: user.firstName,
        LastName: user.lastName,
        Email: user.email,
        Role: user.role,
        Department: user.department,
        PhoneNumber: user.phoneNumber || '',
        Status: user.active ? 'active' : 'inactive',
        LastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '',
        CreatedAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        TwoFactorEnabled: user.twoFactorEnabled ? 'Yes' : 'No'
      }));
      
      // Convert to CSV
      stringify(exportData, { header: true }, (err, output) => {
        if (err) {
          console.error("Error generating CSV:", err);
          return res.status(500).json({ message: "Error generating CSV" });
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="users-export-${new Date().toISOString().slice(0, 10)}_${Date.now()}.csv"`);
        
        // Send the CSV data
        res.send(output);
      });
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Error exporting users" });
    }
  });

  // Game High Score routes
  app.get('/api/game/:gameName/highscore', async (req: Request, res: Response) => {
    try {
      const { gameName } = req.params;
      const highScore = await storage.getGameHighScore(gameName);
      
      if (!highScore) {
        return res.json({ highScore: 0, playerName: null });
      }
      
      res.json(highScore);
    } catch (error) {
      console.error('Error fetching high score:', error);
      res.status(500).json({ message: 'Error fetching high score' });
    }
  });

  app.post('/api/game/:gameName/highscore', async (req: Request, res: Response) => {
    try {
      const { gameName } = req.params;
      const { score, playerName } = req.body;
      
      if (!score || score < 0) {
        return res.status(400).json({ message: 'Invalid score' });
      }
      
      // Get current user ID if logged in
      const userId = req.session.userId;
      
      const result = await storage.updateGameHighScore(gameName, score, playerName, userId);
      res.json(result);
    } catch (error) {
      console.error('Error updating high score:', error);
      res.status(500).json({ message: 'Error updating high score' });
    }
  });

  // AI-powered API endpoints
  
  // Test endpoint to verify AI service is working
  app.post('/api/test-ai', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      console.log('Testing AI with query:', query);
      
      const result = await AIService.parseSearchQuery(query || 'show me all ipads');
      console.log('AI parsing result:', result);
      
      res.json({ success: true, result });
    } catch (error) {
      console.error('AI test error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Smart search with natural language processing
  app.post('/api/search/smart', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      console.log('Smart search query:', query);
      
      // Parse the natural language query
      const parsedQuery = await AIService.parseSearchQuery(query);
      console.log('AI parsed query:', JSON.stringify(parsedQuery, null, 2));
      
      // Execute search based on parsed intent and filters
      let results = [];
      
      switch (parsedQuery.intent) {
        case 'devices':
          const devices = await storage.getDevices();
          console.log('Total devices before filtering:', devices.length);
          results = await filterDevices(devices, parsedQuery.filters);
          console.log('Devices after filtering:', results.length);
          console.log('Applied filters:', JSON.stringify(parsedQuery.filters, null, 2));
          break;
          
        case 'users':
          const users = await storage.getUsers();
          results = await filterUsers(users, parsedQuery.filters);
          break;
          
        case 'software':
          const software = await storage.getSoftware();
          results = await filterSoftware(software, parsedQuery.filters);
          break;
          
        case 'maintenance':
          const maintenance = await storage.getMaintenanceRecords();
          results = await filterMaintenance(maintenance, parsedQuery.filters);
          break;
          
        default:
          // General search across all entities
          const allDevices = await storage.getDevices();
          const allUsers = await storage.getUsers();
          const allSoftware = await storage.getSoftware();
          const allCategories = await storage.getCategories();
          results = [...allDevices, ...allUsers, ...allSoftware, ...allCategories];
      }
      
      // Add type field to results for frontend processing
      const formattedResults = results.map((result: any) => ({
        ...result,
        type: result.firstName ? 'user' : 
              result.name && result.description ? 'category' :
              result.name && result.version ? 'software' :
              result.maintenanceType ? 'maintenance' : 'device'
      }));
      
      console.log('Formatted results sample:', formattedResults.slice(0, 3));
      
      res.json({
        query: parsedQuery,
        results: formattedResults.slice(0, 50), // Limit results
        totalFound: formattedResults.length
      });
    } catch (error) {
      console.error('Smart search error:', error);
      res.status(500).json({ message: 'Error processing search query' });
    }
  });
  
  // AI-powered problem report analysis
  app.post('/api/problem-reports/analyze', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { title, description, deviceId, softwareId } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      
      let deviceType: string | undefined;
      let softwareName: string | undefined;
      
      // Get device type if deviceId provided
      if (deviceId) {
        const device = await storage.getDeviceById(deviceId);
        if (device) {
          const category = device.categoryId ? await storage.getCategoryById(device.categoryId) : null;
          deviceType = category?.name || 'Unknown Device';
        }
      }
      
      // Get software name if softwareId provided
      if (softwareId) {
        const software = await storage.getSoftwareById(softwareId);
        softwareName = software?.name;
      }
      
      // Analyze the problem report
      const analysis = await AIService.analyzeProblemReport(title, description, deviceType, softwareName);
      
      res.json(analysis);
    } catch (error) {
      console.error('Problem report analysis error:', error);
      res.status(500).json({ message: 'Error analyzing problem report' });
    }
  });
  
  // Generate search suggestions
  app.post('/api/search/suggestions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      const suggestions = await AIService.generateSearchSuggestions(query);
      res.json({ suggestions });
    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({ message: 'Error generating suggestions' });
    }
  });

  // Start the server
  const server = createServer(app);
  return server;
}
