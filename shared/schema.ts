import { pgTable, text, serial, integer, boolean, timestamp, unique, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number"),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Category schema for device tags
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Device schema
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number").notNull().unique(),
  assetTag: text("asset_tag").notNull().unique(),
  categoryId: integer("category_id").references(() => categories.id),
  purchaseCost: integer("purchase_cost"),  // Store in cents
  purchaseDate: timestamp("purchase_date"),
  purchasedBy: text("purchased_by"),
  warrantyEOL: timestamp("warranty_eol"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Base schema that matches database structure
const baseDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

// Enhanced schema with custom date validation
export const insertDeviceSchema = baseDeviceSchema.extend({
  // Override the date fields to accept strings
  purchaseDate: z.union([
    z.string().transform((str) => new Date(str)), 
    z.date(),
    z.null()
  ]).optional(),
  warrantyEOL: z.union([
    z.string().transform((str) => new Date(str)), 
    z.date(),
    z.null()
  ]).optional(),
  // Make these fields required
  serialNumber: z.string().min(1, "Serial number is required"),
  assetTag: z.string().min(1, "Asset tag is required")
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

// Assignment history for tracking device assignments
export const assignmentHistory = pgTable("assignment_history", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  userId: integer("user_id").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: integer("assigned_by").references(() => users.id),
  unassignedAt: timestamp("unassigned_at"),
  notes: text("notes"),
});

export const insertAssignmentHistorySchema = createInsertSchema(assignmentHistory).omit({
  id: true,
});

export type InsertAssignmentHistory = z.infer<typeof insertAssignmentHistorySchema>;
export type AssignmentHistory = typeof assignmentHistory.$inferSelect;

// Activity log for tracking all actions
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  actionType: text("action_type").notNull(), // 'device_assigned', 'device_added', etc.
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  timestamp: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// Software management schemas
export const softwareStatus = pgEnum('software_status', ['active', 'expired', 'pending']);

export const software = pgTable("software", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull(),
  licenseType: text("license_type").notNull(), // 'perpetual', 'subscription', 'open_source'
  purchaseCost: integer("purchase_cost"), // Store in cents
  purchaseDate: timestamp("purchase_date"),
  expiryDate: timestamp("expiry_date"),
  licenseKey: text("license_key"),
  seats: integer("seats"), // Number of allowed users
  notes: text("notes"),
  status: softwareStatus("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSoftwareSchema = createInsertSchema(software).omit({
  id: true,
  createdAt: true,
});

export type InsertSoftware = z.infer<typeof insertSoftwareSchema>;
export type Software = typeof software.$inferSelect;

// Software assignment
export const softwareAssignments = pgTable("software_assignments", {
  id: serial("id").primaryKey(),
  softwareId: integer("software_id").notNull().references(() => software.id),
  userId: integer("user_id").references(() => users.id),
  deviceId: integer("device_id").references(() => devices.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: integer("assigned_by").references(() => users.id),
  notes: text("notes"),
});

export const insertSoftwareAssignmentSchema = createInsertSchema(softwareAssignments).omit({
  id: true,
});

export type InsertSoftwareAssignment = z.infer<typeof insertSoftwareAssignmentSchema>;
export type SoftwareAssignment = typeof softwareAssignments.$inferSelect;

// Maintenance tracking
export const maintenanceStatus = pgEnum('maintenance_status', ['scheduled', 'in_progress', 'completed', 'cancelled']);

export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  maintenanceType: text("maintenance_type").notNull(), // 'repair', 'upgrade', 'cleaning', etc.
  description: text("description").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  cost: integer("cost"), // Store in cents
  performedBy: text("performed_by"),
  status: maintenanceStatus("status").default('scheduled'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;

// QR/Barcode tracking
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  deviceId: integer("device_id").references(() => devices.id),
  generatedAt: timestamp("generated_at").defaultNow(),
  lastScanned: timestamp("last_scanned"),
  scanCount: integer("scan_count").default(0),
});

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  generatedAt: true,
  scanCount: true,
});

export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type QrCode = typeof qrCodes.$inferSelect;

// Notifications
export const notificationTypes = pgEnum('notification_type', ['warranty_expiry', 'maintenance_due', 'license_expiry', 'device_assigned']);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: notificationTypes("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: integer("related_id"), // ID of related item (device, software, etc.)
  relatedType: text("related_type"), // Type of related item ('device', 'software', etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Custom branding
export const brandingSettings = pgTable("branding_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name"),
  logo: text("logo"), // URL to logo image
  primaryColor: text("primary_color").default('#1E40AF'),
  accentColor: text("accent_color").default('#3B82F6'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertBrandingSettings = z.infer<typeof insertBrandingSettingsSchema>;
export type BrandingSettings = typeof brandingSettings.$inferSelect;
