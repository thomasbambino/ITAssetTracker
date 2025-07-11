import { pgTable, text, serial, integer, boolean, timestamp, unique, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Departments Table
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  manager: text("manager"),
  budget: integer("budget"),  // Store in cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number"),
  department: text("department"),  // Legacy field, kept for backward compatibility
  departmentId: integer("department_id").references(() => departments.id),  // New field for foreign key relationship
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  tempPassword: text("temp_password"),
  tempPasswordExpiry: timestamp("temp_password_expiry"),
  passwordResetRequired: boolean("password_reset_required").default(true),
  role: text("role").default('user'),
  isManager: boolean("is_manager").default(false),
  managedDepartmentIds: text("managed_department_ids"), // JSON array of department IDs this user manages
  active: boolean("active").default(true),
  lastLogin: timestamp("last_login"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorBackupCodes: text("two_factor_backup_codes"), // JSON array of backup codes
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
  role: z.enum(['user', 'manager', 'admin']).optional().default('user'),
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
  hasSpecs: boolean("has_specs").default(false), // Enable specs for this category
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Sites/Offices schema for device location tracking
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
});

export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sites.$inferSelect;

// Device schema
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name"),  // New device name field
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number").unique(),
  assetTag: text("asset_tag").unique(),
  categoryId: integer("category_id").references(() => categories.id),
  siteId: integer("site_id").references(() => sites.id),
  purchaseCost: integer("purchase_cost"),  // Store in cents
  purchaseDate: timestamp("purchase_date"),
  purchasedBy: text("purchased_by"),
  warrantyEOL: timestamp("warranty_eol"),
  userId: integer("user_id").references(() => users.id),
  invoiceFile: text("invoice_file"),  // Store file data as base64
  invoiceFileName: text("invoice_file_name"), // Original filename
  invoiceFileType: text("invoice_file_type"), // MIME type of the file
  status: text("status").default('active'), // Values: active, lost, broken, retired, etc.
  isIntuneOnboarded: boolean("is_intune_onboarded").default(false), // Tracks if device is onboarded in Intune
  intuneComplianceStatus: text("intune_compliance_status").default('unknown'), // Values: compliant, noncompliant, unknown
  intuneLastSync: timestamp("intune_last_sync"), // When device last synced with Intune
  notes: text("notes"), // Comments about the device
  address: text("address"), // Physical street address where device is located
  specs: text("specs"), // JSON string containing device specifications
  createdAt: timestamp("created_at").defaultNow(),
});

// Base schema that matches database structure
const baseDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

// Enhanced schema with custom date validation and purchase cost handling
export const insertDeviceSchema = baseDeviceSchema.extend({
  // Handle purchase cost as number, string, or null
  purchaseCost: z.union([
    z.string().transform((str) => {
      // Parse string to number - handle empty strings
      if (str === '' || str === null || str === undefined) return null;
      const num = Number(str);
      return isNaN(num) ? null : num;
    }),
    z.number(),
    z.null()
  ]).optional().nullable(),
  
  // Add support for categoryId as string or number
  categoryId: z.union([
    z.string().transform((str) => {
      if (str === '' || str === null || str === undefined) return null;
      const num = parseInt(str);
      return isNaN(num) ? null : num;
    }),
    z.number(),
    z.null()
  ]).optional().nullable(),
  
  // Add support for siteId as string or number
  siteId: z.union([
    z.string().transform((str) => {
      if (str === '' || str === null || str === undefined) return null;
      const num = parseInt(str);
      return isNaN(num) ? null : num;
    }),
    z.number(),
    z.null()
  ]).optional().nullable(),
  
  // Support for isIntuneOnboarded as string or boolean
  isIntuneOnboarded: z.union([
    z.string().transform((str) => {
      if (str === 'true') return true;
      if (str === 'false') return false;
      return false; // Default value
    }),
    z.boolean(),
    z.null().transform(() => false)
  ]).optional().default(false),
  
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
  intuneLastSync: z.union([
    z.string().transform((str) => new Date(str)), 
    z.date(),
    z.null()
  ]).optional(),
  // Make these fields optional
  serialNumber: z.string().optional().nullable(),
  assetTag: z.string().optional().nullable(),
  // Status field with default
  status: z.string().optional().default('active'),
  // Default for intuneComplianceStatus
  intuneComplianceStatus: z.string().optional().default('unknown'),
  // Notes field for device comments
  notes: z.string().optional().nullable(),
  // Specs field for device specifications (JSON string)
  specs: z.string().optional().nullable(),
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
  url: text("url"), // Website URL for the software
  notificationEmail: text("notification_email"), // Email address for access request notifications
  sendAccessNotifications: boolean("send_access_notifications").default(false), // Whether to send notifications
  icon: text("icon"), // Base64 encoded icon image or file path
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
}).extend({
  // Allow assignedAt to be a string or date object
  assignedAt: z.union([
    z.string().transform((str) => new Date(str)), 
    z.date(),
    z.null()
  ]).optional(),
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
}).extend({
  // Override the date fields to accept strings, dates, or null
  scheduledDate: z.union([
    z.string().transform((str) => new Date(str)), 
    z.date(),
    z.null()
  ]).optional().nullable(),
  completedDate: z.union([
    z.string().transform((str) => new Date(str)), 
    z.date(),
    z.null()
  ]).optional().nullable(),
  // Override cost to accept number or null
  cost: z.union([
    z.number(),
    z.null()
  ]).optional().nullable(),
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
  logo: text("logo"), // URL to logo image or base64 data
  favicon: text("favicon"), // URL to favicon image or base64 data
  primaryColor: text("primary_color").default('#1E40AF'),
  accentColor: text("accent_color").default('#3B82F6'),
  siteNameColor: text("site_name_color").default('#1E40AF'),
  siteNameColorSecondary: text("site_name_color_secondary").default('#3B82F6'),
  siteNameGradient: boolean("site_name_gradient").default(true),
  companyTagline: text("company_tagline"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  siteTitle: text("site_title").default('IT Asset Manager'),
  siteDescription: text("site_description").default('A comprehensive IT asset management system for tracking hardware, software, and maintenance.'),
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

// Problem Reports and Messages System
export const problemReportStatusEnum = pgEnum("problem_report_status", ["open", "in_progress", "completed", "archived"]);
export const problemReportPriorityEnum = pgEnum("problem_report_priority", ["low", "medium", "high", "urgent"]);

export const problemReports = pgTable("problem_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'device' or 'software'
  itemId: integer("item_id").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: problemReportPriorityEnum("priority").default("medium"),
  status: problemReportStatusEnum("status").default("open"),
  assignedToId: integer("assigned_to_id").references(() => users.id), // Admin assigned to handle this
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  completedById: integer("completed_by_id").references(() => users.id),
});

export const problemReportMessages = pgTable("problem_report_messages", {
  id: serial("id").primaryKey(),
  problemReportId: integer("problem_report_id").references(() => problemReports.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false), // For admin-only notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Problem Report Attachments Table
export const problemReportAttachments = pgTable("problem_report_attachments", {
  id: serial("id").primaryKey(),
  problemReportId: integer("problem_report_id").references(() => problemReports.id).notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProblemReportSchema = createInsertSchema(problemReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  completedById: true,
});

export const insertProblemReportMessageSchema = createInsertSchema(problemReportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertProblemReportAttachmentSchema = createInsertSchema(problemReportAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertProblemReport = z.infer<typeof insertProblemReportSchema>;
export type ProblemReport = typeof problemReports.$inferSelect;
export type InsertProblemReportMessage = z.infer<typeof insertProblemReportMessageSchema>;
export type ProblemReportMessage = typeof problemReportMessages.$inferSelect;
export type InsertProblemReportAttachment = z.infer<typeof insertProblemReportAttachmentSchema>;
export type ProblemReportAttachment = typeof problemReportAttachments.$inferSelect;

// Game High Scores Table
export const gameHighScores = pgTable("game_high_scores", {
  id: serial("id").primaryKey(),
  gameName: text("game_name").notNull(),
  highScore: integer("high_score").notNull(),
  playerName: text("player_name"),
  userId: integer("user_id").references(() => users.id),
  achievedAt: timestamp("achieved_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueGameName: unique().on(table.gameName),
}));

export const insertGameHighScoreSchema = createInsertSchema(gameHighScores).omit({
  id: true,
  achievedAt: true,
  updatedAt: true,
});

export type InsertGameHighScore = z.infer<typeof insertGameHighScoreSchema>;
export type GameHighScore = typeof gameHighScores.$inferSelect;
