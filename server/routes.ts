import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { z } from "zod";
import { insertUserSchema, insertDeviceSchema, insertCategorySchema } from "@shared/schema";

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
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
        const count = devices.filter(device => device.categoryId === category.id).length;
        return {
          id: category.id,
          name: category.name,
          count,
          percentage: devices.length > 0 ? Math.round((count / devices.length) * 100) : 0
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

  // Recent activity logs
  app.get('/api/activity', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
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
      res.status(500).json({ message: "Error fetching activity logs" });
    }
  });

  // User routes
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
      
      res.json({ ...user, devices });
    } catch (error) {
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
      const validatedData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating device" });
    }
  });

  app.put('/api/devices/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
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
      res.json(categories);
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
            
            const deviceData = {
              brand: record.brand || record['Brand'] || '',
              model: record.model || record['Model'] || '',
              serialNumber: record.serialNumber || record['Serial Number'] || '',
              assetTag: record.assetTag || record['Asset Tag'] || '',
              categoryId,
              purchaseCost,
              purchaseDate,
              purchasedBy: record.purchasedBy || record['Purchased By'] || '',
              warrantyEOL
            };
            
            // Validate the data
            const validatedData = insertDeviceSchema.parse(deviceData);
            
            // Create the device
            const device = await storage.createDevice(validatedData);
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
      
      // Prepare enhanced device data for export
      const enhancedDevices = devices.map(device => {
        return {
          ...device,
          categoryName: device.categoryId ? categoryMap.get(device.categoryId) : '',
          assignedTo: device.userId ? userMap.get(device.userId) : '',
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
          { key: 'serialNumber', header: 'Serial Number' },
          { key: 'assetTag', header: 'Asset Tag' },
          { key: 'categoryName', header: 'Category' },
          { key: 'purchaseCostFormatted', header: 'Purchase Cost' },
          { key: 'purchaseDateFormatted', header: 'Purchase Date' },
          { key: 'purchasedBy', header: 'Purchased By' },
          { key: 'warrantyEOLFormatted', header: 'Warranty End Date' },
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

  const httpServer = createServer(app);
  return httpServer;
}
