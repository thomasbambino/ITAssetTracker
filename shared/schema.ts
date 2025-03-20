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
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  tempPassword: text("temp_password"),
  tempPasswordExpiry: timestamp("temp_password_expiry"),
  passwordResetRequired: boolean("password_reset_required").default(true),
  role: text("role").default('user'),
  active: boolean("active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
  passwordSalt: true,
  tempPassword: true,
  tempPasswordExpiry: true,
  passwordResetRequired: true,
  lastLogin: true,
}).extend({
  role: z.enum(['user', 'admin']).optional().default('user'),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

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
  // Make these fields optional for CSV import
  serialNumber: z.string().default(() => `SN-${Math.floor(Math.random() * 1000000)}`),
  assetTag: z.string().default(() => `AT-${Math.floor(Math.random() * 1000000)}`)
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
  status: text("status").default('active'),
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
export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  maintenanceType: text("maintenance_type").notNull(), // 'repair', 'upgrade', 'cleaning', etc.
  description: text("description").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  cost: integer("cost"), // Store in cents
  performedBy: text("performed_by"),
  status: text("status").default('scheduled'),
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
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(),
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
  siteNameColor: text("site_name_color").default('#1E40AF'),
  siteNameColorSecondary: text("site_name_color_secondary").default('#3B82F6'),
  siteNameGradient: boolean("site_name_gradient").default(true),
  companyTagline: text("company_tagline"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertBrandingSettings = z.infer<typeof insertBrandingSettingsSchema>;
export type BrandingSettings = typeof brandingSettings.$inferSelect;

// Email Settings Table
export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key"),
  domain: text("domain"),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  isEnabled: boolean("is_enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;
