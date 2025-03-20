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
import { isAuthenticated, isAdmin } from "./auth";
import { 
  insertUserSchema, insertDeviceSchema, insertCategorySchema,
  insertSoftwareSchema, insertSoftwareAssignmentSchema, insertMaintenanceRecordSchema,
  insertQrCodeSchema, insertNotificationSchema, insertBrandingSettingsSchema
} from "@shared/schema";

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
      const departments = [...new Set(users.map(user => user.department).filter(Boolean))];
      
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
      const userId = req.session.userId;
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

  app.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertUserSchema.partial().parse(req.body);
      
      const user = await storage.updateUser(id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating user" });
    }
  });

  app.delete('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      
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
      
      // Get assignment history
      const history = await storage.getAssignmentHistory(id);
      
      // Enrich history with user information
      const enrichedHistory = await Promise.all(
        history.map(async (entry) => {
          const assignedToUser = entry.userId ? await storage.getUserById(entry.userId) : null;
          const assignedByUser = entry.assignedBy ? await storage.getUserById(entry.assignedBy) : null;
          
          return {
            ...entry,
            assignedTo: assignedToUser ? {
              id: assignedToUser.id,
              name: `${assignedToUser.firstName} ${assignedToUser.lastName}`
            } : null,
            assignedBy: assignedByUser ? {
              id: assignedByUser.id,
              name: `${assignedByUser.firstName} ${assignedByUser.lastName}`
            } : null
          };
        })
      );
      
      res.json({
        ...device,
        category: category ? { id: category.id, name: category.name } : null,
        user: user ? { 
          id: user.id, 
          name: `${user.firstName} ${user.lastName}`, 
          department: user.department 
        } : null,
        history: enrichedHistory
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching device" });
    }
  });

  app.post('/api/devices', async (req: Request, res: Response) => {
    try {
      // The insertDeviceSchema now handles date conversion
      const validatedData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      console.error("Error creating device:", error);
      res.status(500).json({ message: "Error creating device" });
    }
  });

  app.put('/api/devices/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // The insertDeviceSchema now handles date conversion
      const validatedData = insertDeviceSchema.partial().parse(req.body);
      
      const device = await storage.updateDevice(id, validatedData);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      console.error("Error updating device:", error);
      res.status(500).json({ message: "Error updating device" });
    }
  });

  app.delete('/api/devices/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDevice(id);
      
      if (!success) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting device" });
    }
  });

  // Assign device to user
  app.post('/api/devices/:id/assign', async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { userId, assignedBy } = req.body;
      
      if (!userId || !assignedBy) {
        return res.status(400).json({ message: "userId and assignedBy are required" });
      }
      
      const device = await storage.assignDevice(deviceId, userId, assignedBy);
      if (!device) {
        return res.status(404).json({ message: "Device or user not found" });
      }
      
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Error assigning device" });
    }
  });

  // Unassign device
  app.post('/api/devices/:id/unassign', async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      
      const device = await storage.unassignDevice(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Error unassigning device" });
    }
  });

  // Category routes
  app.get('/api/categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      const devices = await storage.getDevices();
      
      // Add device counts to each category
      const enrichedCategories = await Promise.all(categories.map(async (category) => {
        // Find devices in this category
        const categoryDevices = devices.filter(device => device.categoryId === category.id);
        
        return {
          ...category,
          devices: categoryDevices
        };
      }));
      
      res.json(enrichedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
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

  app.post('/api/categories', async (req: Request, res: Response) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating category" });
    }
  });

  app.put('/api/categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCategorySchema.partial().parse(req.body);
      
      const category = await storage.updateCategory(id, validatedData);
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

  app.delete('/api/categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCategory(id);
      
      if (!success) {
        return res.status(404).json({ message: "Category not found or still has devices" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // Import/Export routes
  // Import users from CSV
  app.post('/api/import/users', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const results: any[] = [];
    const parser = parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true
    });
    
    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        results.push(record);
      }
    });
    
    parser.on('error', function(err) {
      return res.status(400).json({ message: "CSV parsing error", error: err.message });
    });
    
    parser.on('end', async function() {
      try {
        // Map and validate CSV data to user schema
        const importedUsers = [];
        
        for (const record of results) {
          try {
            const userData = {
              firstName: record.firstName || record['First Name'] || '',
              lastName: record.lastName || record['Last Name'] || '',
              email: record.email || record['Email'] || '',
              phoneNumber: record.phoneNumber || record['Phone Number'] || '',
              department: record.department || record['Department'] || ''
            };
            
            // Validate the data
            const validatedData = insertUserSchema.parse(userData);
            
            // Create the user
            const user = await storage.createUser(validatedData);
            importedUsers.push(user);
          } catch (error) {
            // Skip invalid records
            console.error('Error importing user:', record, error);
          }
        }
        
        res.json({ 
          message: `Imported ${importedUsers.length} users`,
          users: importedUsers
        });
      } catch (error) {
        res.status(500).json({ message: "Error processing import" });
      }
    });
    
    // Feed the file buffer to the parser
    parser.write(req.file.buffer.toString());
    parser.end();
  });
  
  // Import devices from CSV
  app.post('/api/import/devices', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const results: any[] = [];
    const parser = parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true
    });
    
    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        results.push(record);
      }
    });
    
    parser.on('error', function(err) {
      return res.status(400).json({ message: "CSV parsing error", error: err.message });
    });
    
    parser.on('end', async function() {
      try {
        // Get categories for lookup
        const categories = await storage.getCategories();
        const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
        
        // Map and validate CSV data to device schema
        const importedDevices = [];
        
        for (const record of results) {
          try {
            // Try to find category by name
            let categoryId = null;
            if (record.category || record['Category']) {
              const categoryName = (record.category || record['Category']).toLowerCase();
              categoryId = categoryMap.get(categoryName);
              
              // Create category if it doesn't exist
              if (!categoryId && categoryName) {
                const newCategory = await storage.createCategory({
                  name: record.category || record['Category'],
                  description: ''
                });
                categoryId = newCategory.id;
                categoryMap.set(categoryName, categoryId);
              }
            }
            
            // Parse purchase cost to cents if provided
            let purchaseCost = null;
            if (record.purchaseCost || record['Purchase Cost']) {
              const costStr = record.purchaseCost || record['Purchase Cost'];
              // Remove currency symbol and convert to cents
              const cost = parseFloat(costStr.replace(/[^0-9.-]+/g, ""));
              if (!isNaN(cost)) {
                purchaseCost = Math.round(cost * 100); // Convert to cents
              }
            }
            
            // Parse dates if provided
            let purchaseDate = null;
            if (record.purchaseDate || record['Purchase Date']) {
              const dateStr = record.purchaseDate || record['Purchase Date'];
              purchaseDate = new Date(dateStr);
              if (isNaN(purchaseDate.getTime())) purchaseDate = null;
            }
            
            let warrantyEOL = null;
            if (record.warrantyEOL || record['Warranty EOL']) {
              const dateStr = record.warrantyEOL || record['Warranty EOL'];
              warrantyEOL = new Date(dateStr);
              if (isNaN(warrantyEOL.getTime())) warrantyEOL = null;
            }
            
            // Try to find the user by email for assignment
            let userId = null;
            if (record.assignedTo || record['Assigned To']) {
              const email = record.assignedTo || record['Assigned To'];
              
              // Find all users to search by email
              const users = await storage.getUsers();
              const user = users.find(u => u.email === email);
              
              if (user) {
                userId = user.id;
              }
            }
            
            const deviceData = {
              brand: record.brand || record['Brand'] || '',
              model: record.model || record['Model'] || '',
              serialNumber: record.serialNumber || record['Serial Number'] || '',
              assetTag: record.assetTag || record['Asset Tag'] || '',
              categoryId,
              purchaseCost,
              purchaseDate,
              purchasedBy: record.purchasedBy || record['Purchased By'] || '',
              warrantyEOL,
              userId
            };
            
            // Validate the data
            const validatedData = insertDeviceSchema.parse(deviceData);
            
            // Create the device
            const device = await storage.createDevice(validatedData);
            
            // If there's a userId, manually create the assignment history record
            if (userId) {
              await storage.createAssignmentHistory({
                deviceId: device.id,
                userId: userId,
                assignedBy: 1, // Admin user
                assignedAt: new Date(),
                unassignedAt: null,
                notes: 'Assigned during import'
              });
            }
            
            importedDevices.push(device);
          } catch (error) {
            // Skip invalid records
            console.error('Error importing device:', record, error);
          }
        }
        
        res.json({ 
          message: `Imported ${importedDevices.length} devices`,
          devices: importedDevices
        });
      } catch (error) {
        res.status(500).json({ message: "Error processing import" });
      }
    });
    
    // Feed the file buffer to the parser
    parser.write(req.file.buffer.toString());
    parser.end();
  });
  
  // Export users to CSV
  app.get('/api/export/users', async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      
      const stringifier = stringify({
        header: true,
        columns: [
          { key: 'id', header: 'ID' },
          { key: 'firstName', header: 'First Name' },
          { key: 'lastName', header: 'Last Name' },
          { key: 'email', header: 'Email' },
          { key: 'phoneNumber', header: 'Phone Number' },
          { key: 'department', header: 'Department' }
        ]
      });
      
      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      
      // Stream the CSV data
      stringifier.pipe(res);
      
      // Write users to the stringifier
      users.forEach(user => {
        stringifier.write(user);
      });
      
      stringifier.end();
    } catch (error) {
      res.status(500).json({ message: "Error exporting users" });
    }
  });
  
  // Export devices to CSV
  app.get('/api/export/devices', async (req: Request, res: Response) => {
    try {
      const devices = await storage.getDevices();
      const categories = await storage.getCategories();
      const users = await storage.getUsers();
      
      // Create category and user lookup maps
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
      
      // Get email map for users
      const userEmailMap = new Map(users.map(u => [u.id, u.email]));
      
      // Prepare enhanced device data for export
      const enhancedDevices = devices.map(device => {
        return {
          ...device,
          categoryName: device.categoryId ? categoryMap.get(device.categoryId) : '',
          assignedTo: device.userId ? userEmailMap.get(device.userId) : '',
          // Convert cents to dollars for the export
          purchaseCostFormatted: device.purchaseCost ? `$${(device.purchaseCost / 100).toFixed(2)}` : '',
          // Format dates
          purchaseDateFormatted: device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : '',
          warrantyEOLFormatted: device.warrantyEOL ? new Date(device.warrantyEOL).toLocaleDateString() : ''
        };
      });
      
      const stringifier = stringify({
        header: true,
        columns: [
          { key: 'id', header: 'ID' },
          { key: 'brand', header: 'Brand' },
          { key: 'model', header: 'Model' },
          { key: 'assetTag', header: 'Asset Tag' },          
          { key: 'serialNumber', header: 'Serial Number' },
          { key: 'categoryName', header: 'Category' },
          { key: 'purchaseDateFormatted', header: 'Purchase Date' },
          { key: 'purchasedBy', header: 'Purchased By' },
          { key: 'warrantyEOLFormatted', header: 'Warranty End Date' },
          { key: 'purchaseCostFormatted', header: 'Purchase Cost' },
          { key: 'assignedTo', header: 'Assigned To' }
        ]
      });
      
      // Set response headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=devices.csv');
      
      // Stream the CSV data
      stringifier.pipe(res);
      
      // Write devices to the stringifier
      enhancedDevices.forEach(device => {
        stringifier.write(device);
      });
      
      stringifier.end();
    } catch (error) {
      res.status(500).json({ message: "Error exporting devices" });
    }
  });

  // Software routes
  app.get('/api/software', async (req: Request, res: Response) => {
    try {
      const software = await storage.getSoftware();
      res.json(software);
    } catch (error) {
      res.status(500).json({ message: "Error fetching software" });
    }
  });

  app.get('/api/software/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const softwareItem = await storage.getSoftwareById(id);
      
      if (!softwareItem) {
        return res.status(404).json({ message: "Software not found" });
      }
      
      res.json(softwareItem);
    } catch (error) {
      res.status(500).json({ message: "Error fetching software details" });
    }
  });

  app.post('/api/software', async (req: Request, res: Response) => {
    try {
      const validatedData = insertSoftwareSchema.parse(req.body);
      const softwareItem = await storage.createSoftware(validatedData);
      res.status(201).json(softwareItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid software data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating software" });
    }
  });

  app.put('/api/software/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSoftwareSchema.partial().parse(req.body);
      
      const softwareItem = await storage.updateSoftware(id, validatedData);
      if (!softwareItem) {
        return res.status(404).json({ message: "Software not found" });
      }
      
      res.json(softwareItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid software data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating software" });
    }
  });

  app.delete('/api/software/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSoftware(id);
      
      if (!success) {
        return res.status(404).json({ message: "Software not found or has active assignments" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting software" });
    }
  });

  app.get('/api/software/status/:status', async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      
      if (!['active', 'expired', 'pending'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be one of: active, expired, pending" });
      }
      
      const softwareItems = await storage.getSoftwareByStatus(status);
      res.json(softwareItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching software by status" });
    }
  });

  app.get('/api/software/expiring/:days', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.params.days);
      
      if (isNaN(days) || days < 1) {
        return res.status(400).json({ message: "Days parameter must be a positive number" });
      }
      
      const softwareItems = await storage.getSoftwareExpiringSoon(days);
      res.json(softwareItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching expiring software" });
    }
  });

  // Software Assignment routes
  app.get('/api/software-assignments/software/:softwareId', async (req: Request, res: Response) => {
    try {
      const softwareId = parseInt(req.params.softwareId);
      const assignments = await storage.getSoftwareAssignments(softwareId);
      
      // Enrich assignments with user and device details
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const user = assignment.userId 
            ? await storage.getUserById(assignment.userId) 
            : null;
            
          const device = assignment.deviceId 
            ? await storage.getDeviceById(assignment.deviceId) 
            : null;
            
          return {
            ...assignment,
            user: user || null,
            device: device || null
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching software assignments:", error);
      res.status(500).json({ message: "Error fetching software assignments" });
    }
  });

  app.get('/api/software-assignments/user/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const assignments = await storage.getSoftwareAssignmentsByUser(userId);
      
      // Enrich assignments with software details
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const software = assignment.softwareId 
            ? await storage.getSoftwareById(assignment.softwareId) 
            : null;
            
          return {
            ...assignment,
            software: software || null
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching user software assignments:", error);
      res.status(500).json({ message: "Error fetching user software assignments" });
    }
  });

  app.get('/api/software-assignments/device/:deviceId', async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const assignments = await storage.getSoftwareAssignmentsByDevice(deviceId);
      
      // Enrich assignments with software details
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const software = assignment.softwareId 
            ? await storage.getSoftwareById(assignment.softwareId) 
            : null;
            
          return {
            ...assignment,
            software: software || null
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching device software assignments:", error);
      res.status(500).json({ message: "Error fetching device software assignments" });
    }
  });

  app.post('/api/software-assignments', async (req: Request, res: Response) => {
    try {
      const validatedData = insertSoftwareAssignmentSchema.parse(req.body);
      const assignment = await storage.createSoftwareAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating software assignment" });
    }
  });

  app.put('/api/software-assignments/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSoftwareAssignmentSchema.partial().parse(req.body);
      
      const assignment = await storage.updateSoftwareAssignment(id, validatedData);
      if (!assignment) {
        return res.status(404).json({ message: "Software assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating software assignment" });
    }
  });

  app.delete('/api/software-assignments/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSoftwareAssignment(id);
      
      if (!success) {
        return res.status(404).json({ message: "Software assignment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting software assignment" });
    }
  });

  // ===== Maintenance Records =====
  // Get all maintenance records
  app.get('/api/maintenance', async (req: Request, res: Response) => {
    try {
      const records = await storage.getMaintenanceRecords();
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Error fetching maintenance records" });
    }
  });

  // Get scheduled maintenance
  app.get('/api/maintenance/scheduled', async (req: Request, res: Response) => {
    try {
      const records = await storage.getScheduledMaintenance();
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Error fetching scheduled maintenance" });
    }
  });

  // Get maintenance record by ID
  app.get('/api/maintenance/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.getMaintenanceRecordById(id);
      
      if (!record) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }
      
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Error fetching maintenance record" });
    }
  });

  // Get maintenance records for device
  app.get('/api/devices/:id/maintenance', async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      const records = await storage.getMaintenanceRecordsByDevice(deviceId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Error fetching device maintenance records" });
    }
  });

  // Create maintenance record
  app.post('/api/maintenance', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMaintenanceRecordSchema.parse(req.body);
      const record = await storage.createMaintenanceRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating maintenance record" });
    }
  });

  // Update maintenance record
  app.put('/api/maintenance/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMaintenanceRecordSchema.partial().parse(req.body);
      
      const record = await storage.updateMaintenanceRecord(id, validatedData);
      if (!record) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }
      
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating maintenance record" });
    }
  });

  // Delete maintenance record
  app.delete('/api/maintenance/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMaintenanceRecord(id);
      
      if (!success) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting maintenance record" });
    }
  });

  // ===== QR Codes =====
  // Get all QR codes
  app.get('/api/qrcodes', async (req: Request, res: Response) => {
    try {
      const qrCodes = await storage.getQrCodes();
      res.json(qrCodes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching QR codes" });
    }
  });

  // Get QR code by ID
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

  // Get QR code by code value
  app.get('/api/qrcodes/code/:code', async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      res.json(qrCode);
    } catch (error) {
      res.status(500).json({ message: "Error fetching QR code" });
    }
  });
  
  // Record QR code scan by code
  app.post('/api/qrcodes/code/:code/scan', async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const qrCode = await storage.getQrCodeByCode(code);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      // Update the QR code scan info
      const updatedQrCode = await storage.recordQrCodeScan(qrCode.id);
      
      // Get the device details to include in the response
      let deviceDetails = null;
      if (updatedQrCode && updatedQrCode.deviceId) {
        deviceDetails = await storage.getDeviceById(updatedQrCode.deviceId);
      }
      
      // Log the activity
      await storage.createActivityLog({
        actionType: 'qr_scan',
        details: `QR code for device ID ${qrCode.deviceId} was scanned`,
        userId: null
      });
      
      // Return QR code with device details
      res.json({
        ...updatedQrCode,
        device: deviceDetails
      });
    } catch (error) {
      console.error('Error recording QR code scan:', error);
      res.status(500).json({ message: "Error recording QR code scan" });
    }
  });

  // Get QR code for device
  app.get('/api/devices/:id/qrcode', async (req: Request, res: Response) => {
    try {
      const deviceId = parseInt(req.params.id);
      const qrCode = await storage.getQrCodeByDeviceId(deviceId);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found for device" });
      }
      
      res.json(qrCode);
    } catch (error) {
      res.status(500).json({ message: "Error fetching device QR code" });
    }
  });

  // Create QR code
  app.post('/api/qrcodes', async (req: Request, res: Response) => {
    try {
      const validatedData = insertQrCodeSchema.parse(req.body);
      const qrCode = await storage.createQrCode(validatedData);
      res.status(201).json(qrCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid QR code data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating QR code" });
    }
  });

  // Update QR code
  app.put('/api/qrcodes/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertQrCodeSchema.partial().parse(req.body);
      
      const qrCode = await storage.updateQrCode(id, validatedData);
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

  // Delete QR code
  app.delete('/api/qrcodes/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteQrCode(id);
      
      if (!success) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting QR code" });
    }
  });

  // Record QR code scan
  app.post('/api/qrcodes/:id/scan', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const qrCode = await storage.recordQrCodeScan(id);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        actionType: 'qr_scan',
        details: `QR code for device ID ${qrCode.deviceId} was scanned`,
        userId: null,
        timestamp: new Date()
      });
      
      res.json(qrCode);
    } catch (error) {
      console.error('Error recording QR code scan:', error);
      res.status(500).json({ message: "Error recording QR code scan" });
    }
  });
  
  // Get scan history for a QR code
  app.get('/api/qrcodes/:id/history', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Get the qrCode to verify it exists
      const qrCode = await storage.getQrCodeById(id);
      
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }
      
      // Get relevant activity logs for this QR code
      const logs = await storage.getActivityLogs();
      
      // Filter logs that are related to this QR code
      const scanHistory = logs
        .filter(log => 
          log.actionType === 'qr_scan' && 
          log.details.includes(`device ID ${qrCode.deviceId}`)
        )
        .map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          scannedBy: log.userId ? {
            id: log.userId,
            // Include additional user info if needed
          } : null,
          location: null // Future enhancement
        }))
        .sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      
      res.json(scanHistory);
    } catch (error) {
      console.error('Error fetching QR code scan history:', error);
      res.status(500).json({ message: "Error fetching QR code scan history" });
    }
  });

  // ===== Notifications =====
  // Get user notifications
  app.get('/api/users/:id/notifications', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  // Get unread notifications
  app.get('/api/users/:id/notifications/unread', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching unread notifications" });
    }
  });

  // Create notification
  app.post('/api/notifications', async (req: Request, res: Response) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating notification" });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
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

  // Delete notification
  app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
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

  // ===== Branding =====
  // Get branding settings
  app.get('/api/branding', async (req: Request, res: Response) => {
    try {
      const branding = await storage.getBrandingSettings();
      res.json(branding || {});
    } catch (error) {
      res.status(500).json({ message: "Error fetching branding settings" });
    }
  });

  // Update branding settings
  app.put('/api/branding', async (req: Request, res: Response) => {
    try {
      const validatedData = insertBrandingSettingsSchema.partial().parse(req.body);
      const branding = await storage.updateBrandingSettings(validatedData);
      
      // Update theme.json file if primaryColor is provided
      if (validatedData.primaryColor) {
        try {
          // Read the current theme.json
          const themeFilePath = path.resolve('./theme.json');
          const themeJson = JSON.parse(fs.readFileSync(themeFilePath, 'utf8'));
          
          // Update the primary color
          themeJson.primary = validatedData.primaryColor;
          
          // Write the updated theme back to file
          fs.writeFileSync(themeFilePath, JSON.stringify(themeJson, null, 2));
          
          // Force a restart to apply changes (in production, you'd use a different approach)
          console.log('Theme updated, application will reload to apply changes');
        } catch (fsError) {
          console.error('Error updating theme.json:', fsError);
          // Continue with the response even if theme update fails
        }
      }
      
      res.json(branding);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid branding data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating branding settings" });
    }
  });
  
  // Upload company logo
  app.post('/api/branding/logo', upload.single('logo'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No logo file uploaded" });
      }
      
      // Convert the file to base64
      const logoBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Update the branding settings with the new logo
      const branding = await storage.updateBrandingSettings({ logo: logoBase64 });
      
      res.json({ 
        message: "Logo uploaded successfully",
        branding
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Error uploading logo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
