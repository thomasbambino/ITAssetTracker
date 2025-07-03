import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import session from "express-session";
import authRoutes from "./auth-routes";
import emailRoutes from "./email-routes";
import twoFactorRoutes from "./two-factor-routes";
import { isAuthenticated, isAdmin } from "./auth";
import mailgunService from "./direct-mailgun";

import { 
  insertUserSchema, insertDeviceSchema, insertCategorySchema,
  insertSoftwareSchema, insertSoftwareAssignmentSchema, insertMaintenanceRecordSchema,
  insertQrCodeSchema, insertNotificationSchema, insertBrandingSettingsSchema, insertSiteSchema,
  insertDepartmentSchema
} from "@shared/schema";

// Define the session data type to fix type errors
interface SessionData {
  userId: number;
  userRole: 'admin' | 'user';
  passwordResetRequired: boolean;
  pendingTwoFactorUserId?: number; // For 2FA verification flow
}

// Extend Express session to include our data
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: 'admin' | 'user';
    passwordResetRequired?: boolean;
    pendingTwoFactorUserId?: number;
  }
}

// Configure session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userRole: 'admin' | 'user';
    passwordResetRequired: boolean;
  }
}

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register authentication routes
  app.use('/api/auth', authRoutes);
  
  // Register email routes
  app.use('/api', emailRoutes);
  
  // Register 2FA routes
  app.use('/api/2fa', twoFactorRoutes);
  
  // Initialize API routes
  const apiRouter = app.route('/api');

  // Get dashboard stats
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      const unassignedDevices = await storage.getUnassignedDevices();
      const expiringWarranties = await storage.getDevicesWithWarrantyExpiring(30);
      
      const stats = {
        totalDevices: devices.length,
        assignedDevices: devices.length - unassignedDevices.length,
        unassignedDevices: unassignedDevices.length,
        expiringWarranties: expiringWarranties.length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  // Get category distribution for devices
  app.get('/api/stats/categories', async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      const categories = await storage.getCategories();
      
      const distribution = categories.map(category => {
        const categoryDevices = devices.filter(device => device.categoryId === category.id);
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
          percentage: devices.length > 0 ? Math.round((count / devices.length) * 100) : 0,
          totalValue: totalValueSum // Include total value in cents
        };
      });
      
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Error fetching category distribution" });
    }
  });

  // Get department distribution for devices
  app.get('/api/stats/departments', async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      const devices = await storage.getDevices();
      
      // Get unique departments
      const departmentsArray = users.map(user => user.department).filter(Boolean) as string[];
      const departmentsSet = new Set<string>(departmentsArray);
      const departments = Array.from(departmentsSet);
      
      const distribution = departments.map(department => {
        // Get users in this department
        const departmentUsers = users.filter(user => user.department === department);
        const userIds = departmentUsers.map(user => user.id);
        
        // Count devices assigned to users in this department
        const count = devices.filter(device => device.userId && userIds.includes(device.userId)).length;
        
        return {
          department,
          count,
          percentage: devices.length > 0 ? Math.round((count / devices.length) * 100) : 0
        };
      });
      
      res.json(distribution);
    } catch (error) {
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

  // Get all users
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
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

  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
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
        role: z.enum(['user', 'admin']).optional(),
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

  // Device routes
  app.get('/api/devices', async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      
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
  app.get('/api/software', async (req: Request, res: Response) => {
    try {
      const software = await storage.getSoftwareWithUsageCounts();
      res.json(software);
    } catch (error) {
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
          const emailResult = await mailgunService.sendSoftwareAccessEmail(
            software.notificationEmail,
            user.email,
            `${user.firstName} ${user.lastName}`,
            software.name,
            software.vendor
          );
          
          console.log('Software access notification email result:', emailResult);
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
      
      const success = await storage.deleteSoftwareAssignment(id, loggedInUserId);
      
      if (!success) {
        return res.status(404).json({ message: "Software assignment not found" });
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
        return res.status(400).json({ message: "Invalid maintenance record data", errors: error.errors });
      }
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
      
      // Find the QR code
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      // Record the scan
      const updatedQrCode = await storage.recordQrCodeScan(qrCode.id, loggedInUserId);
      
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
          
          for (const record of records) {
            try {
              // Map CSV columns to device fields
              // Handle common variations in column names
              const deviceData = {
                name: record.Name || record.name || record.DeviceName || record.deviceName || null,
                brand: record.Brand || record.brand || record.Manufacturer || record.manufacturer || "",
                model: record.Model || record.model || "",
                serialNumber: record.SerialNumber || record['Serial Number'] || record.serial || record.Serial || "",
                assetTag: record.AssetTag || record['Asset Tag'] || record.Tag || record.tag || "",
                // Convert purchase cost from dollars to cents if present
                purchaseCost: record.PurchaseCost || record['Purchase Cost'] || record.Cost || record.cost
                  ? Math.round(parseFloat(record.PurchaseCost || record['Purchase Cost'] || record.Cost || record.cost) * 100)
                  : null,
                purchaseDate: record.PurchaseDate || record['Purchase Date'] || record.Date || record.date
                  ? new Date(record.PurchaseDate || record['Purchase Date'] || record.Date || record.date)
                  : null,
                purchasedBy: record.PurchasedBy || record['Purchased By'] || record.Purchaser || record.purchaser || "",
                warrantyEOL: record.WarrantyEOL || record['Warranty End'] || record.Warranty || record.warranty
                  ? new Date(record.WarrantyEOL || record['Warranty End'] || record.Warranty || record.warranty)
                  : null,
                status: record.Status || record.status || 'active',
                isIntuneOnboarded: record.IntuneOnboarded || record.intuneOnboarded || false,
                intuneComplianceStatus: record.IntuneStatus || record.intuneStatus || 'unknown',
              };
              
              // Find category by name if provided
              if (record.Category || record.category) {
                const categoryName = record.Category || record.category;
                const categories = await storage.getCategories();
                const category = categories.find(c => 
                  c.name.toLowerCase() === categoryName.toLowerCase()
                );
                
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
              
              // Validate and create device
              const validatedData = insertDeviceSchema.parse(deviceData);
              await storage.createDevice(validatedData, loggedInUserId);
              results.success++;
            } catch (error) {
              console.error("Error importing device:", error);
              results.failed++;
              if (error instanceof z.ZodError) {
                results.errors.push(`Row ${results.success + results.failed}: Validation error - ${error.errors.map(e => e.message).join(', ')}`);
              } else {
                results.errors.push(`Row ${results.success + results.failed}: ${error.message || 'Unknown error'}`);
              }
            }
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
      
      // Non-admin users can only see their own reports
      let filterUserId = userId;
      if (sessionData.userRole !== 'admin') {
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
      
      const priorityEmoji = {
        low: "🔵",
        medium: "🟡", 
        high: "🟠",
        urgent: "🔴"
      };

      const notificationTitle = `${priorityEmoji[priority as keyof typeof priorityEmoji]} Problem Report: ${itemDetails}`;
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
      const updates = req.body;
      
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

  app.post('/api/problem-reports/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message, isInternal } = req.body;
      const sessionData = req.session as any;
      
      if (!message || message.trim().length === 0) {
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
      
      const messageData = {
        problemReportId: parseInt(id),
        userId: sessionData.userId,
        message: message.trim(),
        isInternal: sessionData.userRole === 'admin' && isInternal === true
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

  // Start the server
  const server = createServer(app);
  return server;
}
