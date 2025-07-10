# IT Asset Management System

## Overview

This is a comprehensive IT asset management system built with a modern full-stack architecture. The application provides user-friendly tools for tracking hardware devices, software licenses, user assignments, and maintenance records. It features role-based access control, email notifications, CSV import/export capabilities, and custom branding options.

## System Architecture

### Full-Stack Architecture
- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for database operations
- **Session Management**: Express sessions for authentication
- **File Handling**: Multer for file uploads (CSV imports, invoice attachments)

### Directory Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend
├── shared/          # Shared TypeScript schemas and types
├── migrations/      # Database migration files
└── dist/           # Production build output
```

## Key Components

### Frontend Architecture
- **React with TypeScript**: Component-based UI built with React 18
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Theme**: Custom theming system with light/dark mode support

### Backend Architecture
- **Express.js**: RESTful API server with middleware for authentication
- **Authentication**: Session-based auth with bcrypt password hashing
- **Database Layer**: PostgreSQL with pg-promise client and Drizzle schema definitions
- **File Storage**: Local file system for invoice attachments and branding assets
- **Email Integration**: Mailgun API integration with fallback simulation mode

### Database Schema
The system uses a relational database with the following key entities:
- **Users**: Employee records with role-based permissions
- **Devices**: Hardware asset tracking with assignment history
- **Categories**: Device categorization system
- **Software**: License and software assignment tracking
- **Departments**: Organizational structure management
- **Sites**: Location-based asset organization
- **Activity Logs**: Comprehensive audit trail
- **Maintenance Records**: Scheduled and completed maintenance tracking

## Data Flow

### Authentication Flow
1. User credentials validated against hashed passwords in database
2. Session established with role-based permissions
3. Protected routes enforce authentication and authorization
4. Password reset functionality with temporary password generation

### Asset Management Flow
1. Devices and users imported via CSV or created individually
2. Assignment relationships tracked with historical records
3. All changes logged to activity log with user attribution
4. Email notifications sent for assignment changes (when configured)

### File Upload Flow
1. Invoice attachments stored locally with database references
2. CSV files processed in-memory for bulk imports
3. Branding assets (logos, favicons) uploaded and served statically

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Email Service**: Mailgun API for email notifications
- **File Processing**: CSV parsing and generation for imports/exports

### Development Dependencies
- **Build Tools**: Vite for frontend bundling, esbuild for backend bundling
- **Type Checking**: TypeScript with strict configuration
- **Linting**: Built-in TypeScript checking

### Third-Party Integrations
- **Mailgun**: Email service with direct API implementation to avoid SDK encoding issues
- **Radix UI**: Accessible component primitives for the UI
- **React Query**: Server state synchronization
- **Zod**: Runtime type validation for forms and API

## Deployment Strategy

### Build Process
1. **Frontend Build**: `vite build` compiles React app to static assets
2. **Backend Build**: `esbuild` bundles Express server for production
3. **Database Setup**: Drizzle migrations handle schema updates
4. **Static Assets**: Built frontend served from Express in production

### Environment Configuration
- **Development**: `npm run dev` with hot reloading via Vite
- **Production**: `npm run build && npm start` for optimized deployment
- **Database**: PostgreSQL connection via DATABASE_URL
- **Session Security**: Configurable session secret for production

### Database Migrations
- Automated schema updates via migration files
- Version-controlled database changes
- Backward-compatible modifications where possible

## User Preferences

Preferred communication style: Simple, everyday language.

### Critical Data Handling Requirements
- **Device Specs Display**: NEVER modify how device specs are pulled from database. Specs are stored as JSON in PostgreSQL devices table and must display exactly as stored (RAM, Storage, Graphics, Display only - no additional fields like Processor, Memory, Connectivity). This is critical and must not break.

## Changelog

Changelog:
- July 01, 2025. Initial setup
- July 02, 2025. Successfully transformed user dashboard device display from expandable sections to static card layout. Removed dropdown toggles and now displays all device information (specs, location, financial, notes) in organized cards for better accessibility and immediate visibility. Updated layout to single column and fixed cost formatting to properly convert from cents to dollars.
- July 02, 2025. Redesigned user dashboard with horizontal 3-column layout for better space utilization. Fixed device specs display to show only actual database fields (RAM, Storage, Graphics, Display) without extra fields. Specs are stored as JSON in PostgreSQL devices table and parsed for display.
- July 02, 2025. Added Address field to devices for tracking physical street addresses. Field appears in device forms and user dashboard Location & Management section when populated.
- July 02, 2025. Fixed context-aware navigation for device detail pages. When navigating from user page to device, back button now shows "Back to User" and returns to user page instead of generic "Back to Devices". Successfully implemented for both table row clicks and action buttons.
- July 02, 2025. Implemented URL field for software with full hyperlink functionality. Added database migration for URL column, updated software forms to include Website URL field with validation, and implemented external link icon display in user dashboard. Links open in new tabs for easy access to software websites or documentation.
- July 02, 2025. Fixed software form dialog scroll capability and URL field save functionality. Added scroll bars to all software dialogs (max-height 90vh) for better user experience with tall forms. Resolved URL field not saving by updating database storage methods to properly handle URL field in create, update, and get operations.
- July 02, 2025. Enhanced software status display formatting. Software status badges now show proper capitalization ("Active" instead of "active") consistent with device status styling throughout the user dashboard. Added formatStatus function to handle consistent status formatting for all software entries.
- July 02, 2025. Created guest user pages and updated navigation structure. Added dedicated "My Devices" and "Software & Portals" pages for regular users with detailed device specs and software information display. Updated navigation labels from "Software" to "Software & Portals" throughout the application. Regular users can now access Dashboard, Devices, Software & Portals, and Notifications pages through the main navigation.
- July 02, 2025. Fixed navigation categorization issue for regular users. Moved Software & Portals from 'management' category to 'main' category in both desktop and mobile navigation components. This ensures the menu item is visible to all users, not just administrators. Navigation structure now properly displays Dashboard, Devices, Software & Portals, and Notifications for regular users.
- July 02, 2025. Cleaned up device detail page header. Removed the blue laptop icon and fixed duplicate device name display. Now shows only the brand and model as a single bold heading in the device information section, creating a cleaner and more focused layout.
- July 02, 2025. Added custom icon upload functionality to software management. Users can now upload custom icons for software entries through the Edit Software form. Icons are stored as base64 strings in the database and display in the Software & Portals page instead of the generic blue icons. Added icon field to software schema, database migration, form upload component with preview/remove functionality, and updated guest software page to display custom icons with Package icon fallback.
- July 02, 2025. Successfully fixed and completed custom icon upload functionality. Resolved database storage issues by updating all software CRUD methods (create, read, update) to properly handle the icon field. Icons now save correctly to the database and display properly on the guest Software & Portals page, replacing generic Package icons with user-uploaded custom icons. Feature is fully functional and tested.
- July 02, 2025. Implemented comprehensive problem reporting system. Users can now report device or software issues directly from their dashboard using a "Report a Problem" button. The system includes priority levels (low, medium, high, urgent) with color-coded badges, device/software selection dropdowns populated with user's assigned items, detailed description fields, and automatic notification creation for all administrators. Added problem_report notification type to database enum and integrated with existing notification system. Problem reports are also logged in the activity system for audit trail. Feature is fully functional and tested.
- July 02, 2025. Enhanced notification date/time display with timezone and locale support. Fixed database field name mismatch (timestamp vs createdAt) that was causing "Unknown date" display. Updated formatDateTime function to automatically adjust to user's browser timezone and locale settings. Notifications now show complete date and time (e.g., "Jan 15, 2025, 2:30 PM" in US or "15 janv. 2025, 14:30" in France) instead of just dates. Added proper styling for problem_report notifications with orange color coding and alert icons.
- July 02, 2025. Optimized dashboard layout by removing tech specs and financial info sections, keeping only basic info and location for space efficiency. Restructured to horizontal layout with device name and serial number prominently displayed on left side, while basic info and location sections display in compact two-column grid on right. This significantly reduces vertical scrolling and creates better space utilization. Dashboard now shows only essential information in clean, streamlined format.
- July 02, 2025. Standardized dashboard layout positioning and cleaned up display. Removed duplicate device name (now shows only bold title), set consistent fixed width for left column ensuring Basic Information always appears in same location, and enforced consistent two-column grid for right side with Basic Info in first column and Location in second column. This creates uniform alignment and easy scanning across all device cards.
- July 02, 2025. Standardized text field alignment across all sections of the devices page. Implemented consistent 80px fixed width for all field labels (w-20 flex-shrink-0) and uniform 12px spacing (gap-3) between labels and values. All text fields in Device Specs, Location & Management, Financial & Warranty, and Notes sections now align vertically with perfect consistency, eliminating gaps and misaligned text. This creates a clean, professional layout that's easy to scan and read.
- July 02, 2025. Repositioned Basic Information section further right on dashboard. Changed from 2-column to 3-column grid layout with empty spacer column in first position. Basic Information now appears in second column and Location & Management in third column, creating better visual balance and more spacing across the dashboard cards.
- July 02, 2025. Added "My Account" section to admin sidebar navigation. Admin users can now access the same pages regular users see (My Dashboard, My Devices, My Software & Portals) but for their own account. Added new navigation category 'user' with routes /user-dashboard, /guest-devices, /guest-software. Section appears between Main and Management categories in both desktop and mobile navigation for better organization.
- July 02, 2025. Updated navigation labels for consistent "My" prefix usage. Regular users now see "My Dashboard", "My Devices", "My Software & Portals", and "My Notifications" for personalized experience. Admin users see standard labels ("Dashboard", "Devices", etc.) in main navigation while retaining "My" prefix only in the separate "My Account" section. Applied to both desktop sidebar and mobile navigation for consistent experience across all devices.
- July 02, 2025. Changed regular user sidebar section header from "Main" to "My Account". Regular users now see a personalized "My Account" section containing their navigation items, while admin users retain the standard "Main" section header for administrative navigation. Updated both desktop and mobile navigation components for consistent user experience.
- July 03, 2025. Implemented comprehensive Two-Factor Authentication (2FA) system with full TOTP support. Added database schema for 2FA fields (secret, enabled, backup codes), created complete backend service using speakeasy library for token generation and verification, built comprehensive API routes for setup/verification/management, integrated 2FA into login flow with session management, created Two-Factor Settings page with QR code setup and backup codes management, added Security tab to admin settings, and updated navigation to include 2FA access for all users. Users can now secure their accounts with authenticator apps and backup codes through Settings > Security or /settings/two-factor.
- July 03, 2025. Added dedicated user settings page for all users accessible via "My Settings" navigation menu. Created comprehensive user settings interface with Security and Account tabs. Security tab includes 2FA management with direct link to setup page and password change functionality with form validation. Account tab displays user information (name, email, role) in read-only format. Updated both desktop and mobile navigation to include user settings route for regular users and admins. Route configured in App.tsx for proper access control, ensuring all users can manage their personal account settings and security preferences.
- July 03, 2025. Successfully completed comprehensive Two-Factor Authentication (2FA) system implementation. Fixed critical database query issue in getUserByEmail method that was preventing login flow from detecting 2FA status. All components now working: TOTP setup with QR codes, login flow requiring 2FA verification, backup codes generation/regeneration, enable/disable functionality, and proper status display in settings. System uses speakeasy library for token generation/verification and stores 2FA data in PostgreSQL. Both admin and regular users can access 2FA through Settings > Security. Complete end-to-end 2FA security implementation successfully tested and operational.
- July 07, 2025. Implemented comprehensive enhanced problem reporting system with full ticket management capabilities. Created database tables for problem_reports and problem_report_messages with proper foreign key relationships. Built complete admin interface at /problem-reports with ticket list, status management, assignment controls, and messaging system. Added full messaging thread functionality between users and admins with internal/external message types. Implemented status tracking (open, in_progress, completed, archived), priority levels with color coding, and admin-only archiving functionality. Added Problem Reports navigation item to Management section for administrators. System includes complete CRUD operations, real-time messaging, and comprehensive ticket lifecycle management. Fixed build error in routes.ts constant assignment issue. Feature is fully operational and ready for production use.
- July 07, 2025. Enhanced notification reply system for problem reports with threaded conversations. Removed emoji from notification titles for cleaner display. Implemented automatic refresh for notifications (30 seconds) and problem report conversations (5 seconds). For regular users, grouped problem report notifications by thread to show one conversation per issue instead of multiple separate notifications. Added role-based UI controls - removed trash button from regular user view, only admins can delete notifications. Fixed authentication retry issues that caused loading loops. System now shows "Issue Thread" instead of individual notifications for users, with proper conversation threading and real-time message updates.
- July 07, 2025. Redesigned problem report dialog layout with side-by-side view. Ticket information now displays on left side and chat conversation on right side for better space utilization. Removed "Problem Report #X" prefix from titles for cleaner appearance. Updated notification sound to be subtle and quieter (0.1 volume). Added auto-scroll functionality that smoothly scrolls to bottom when new messages arrive. Admin trash button now archives problem reports instead of just deleting notifications. All users now see grouped thread notifications for cleaner interface.
- July 07, 2025. Fixed dual scroll bars in problem report dialog and implemented notification counter clearing. Dialog window now properly scales to 90% viewport height with overflow controls at multiple levels. Only chat messages section scrolls when needed, eliminating confusing dual scroll bars. Added automatic notification marking as read when users open problem report chat dialogs - this clears the notification counter for viewed conversations, providing proper read/unread status tracking for problem report messages.
- July 07, 2025. Implemented comprehensive file attachment system for problem reports with complete upload, download, and management capabilities. Added problem_report_attachments database table with proper foreign key relationships to problem_reports. Created multer-based file upload configuration supporting images (PNG, JPG, JPEG, GIF) and PDFs up to 10MB. Built complete API routes for file upload, download, and deletion with proper authentication and access control. Developed React components (FileUpload and AttachmentList) for intuitive file management UI. Integrated file upload functionality into both problem report creation form and detail dialog message composition. Users can now attach screenshots, photos, or PDF documents when creating problem reports or responding to existing tickets. Files are stored securely in server uploads directory with database references. System includes proper file validation, download functionality with original filename preservation, and delete capabilities for attachment uploaders and administrators. Feature is fully operational and tested.
- July 07, 2025. Enhanced notification system with real-time updates and audio alerts. Fixed problem report dialog prop mismatch preventing "View Details" from opening. Added undefined data safety checks for priority and status fields to prevent crashes. Implemented real-time notification polling (10-second intervals) in NotificationBell component with automatic badge updates. Added audio notification system that plays subtle "ding" sound when new messages arrive. Updated admin navigation structure moving "My Settings" from System to "My Account" section. Regular users now have "SYSTEM" section with Settings separate from main account features. Complete notification workflow: admin replies to user → server creates notification → user gets real-time badge update + audio alert within 10 seconds.
- July 07, 2025. Fixed audio notification system and dark mode visibility issues. Replaced complex AudioContext with simple Audio element using base64 WAV file for better browser compatibility. Fixed dark mode notification styling by changing from bg-white to bg-card dark:bg-card ensuring text remains readable in both light and dark themes. Removed emoji from problem report notifications in notification bell dropdown for cleaner appearance. Added comprehensive logging for audio notification debugging. Audio notifications now work reliably when users receive new messages from admin replies.
- July 08, 2025. Fixed missing settings link for regular users in navigation sidebar. Updated both desktop and mobile navigation system sections to include user settings routes. Regular users now have access to "My Settings" in the System section of both desktop sidebar and mobile navigation. This provides consistent navigation access to user account settings including security and account management features.
- July 08, 2025. Performed comprehensive database cleanup as requested. Wiped all content except for user 41 (Tommy Shorez - tommy.shorez@satellitephonestore.com). Removed 45 users, 132 devices, 4 sites, 18 categories, 9 departments, 596 activity logs, all software, notifications, problem reports, QR codes, maintenance records, assignment history, and sessions. Preserved user 41 with admin role in IT department, maintained email/branding settings, and allowed system to reinitialize default categories. Database now contains only essential admin user and system configuration.
- July 08, 2025. Reset password for user 41 (Tommy Shorez - tommy.shorez@satellitephonestore.com). Set new temporary password 'TempPass123!' with password reset flag enabled. User will be prompted to change password on first login. Password is securely hashed and stored in database. User retains full admin privileges.
- July 09, 2025. Fixed comprehensive CSV device import functionality that was only processing handful of devices. Made database schema more flexible by allowing null values in brand, model, serial_number, and asset_tag columns. Enhanced category mapping with fallback logic for unrecognized categories. Fixed empty value handling to properly convert empty strings to null for unique fields. Improved currency parsing and user assignment logic. CSV import now successfully processes 104 out of 116 devices (89% success rate) with proper distribution across categories, sites, and user assignments.
- July 09, 2025. Enhanced device CSV import to automatically create assignment history records when devices are assigned to users during import. When a device is imported with an "AssignedTo" field, the system now creates a corresponding assignment history record with the importing user as the assignor and notes indicating "Device assigned during CSV import". This ensures complete tracking of all device assignments, even those created through bulk import operations.
- July 09, 2025. Improved warranty date parsing in device CSV import functionality. Enhanced date parsing to handle multiple warranty date column variations (WarrantyEOL, Warranty End, Warranty EOL, Warranty Expiration, Warranty Expires, etc.) and improved date format recognition. Now correctly handles 2-digit years (converts 00-30 to 20XX, 31-99 to 19XX), processes N/A and null values as null, and provides robust date parsing for various CSV date formats. Warranty dates are now properly imported and stored during device CSV imports.
- July 09, 2025. Cleared database for production use. Removed all 124 devices, 178 activity logs, and 7 assignment history records from the database while preserving admin user 41 (tommy.shorez@satellitephonestore.com) and system configuration. Database is now clean and ready for production data import. All functionality remains intact including CSV import, email service configuration, and user management features.
- July 09, 2025. Fixed comprehensive login page styling issues. Updated background gradient to use fixed positioning (fixed inset-0) ensuring full screen coverage with no white edges. Removed white rounded square background from company logo display. Added dark mode toggle to top right of both login and Two-Factor Authentication pages for consistent theme switching. Fixed global CSS to ensure html, body, and #root elements take full viewport with no margins or padding.
- July 09, 2025. Fixed Two-Factor Authentication QR code generation to properly display "Connecta" as issuer. Updated speakeasy configuration to use proper name format (Connecta:email) and manually constructed OTP Auth URL with correct issuer parameter. QR codes now display in authenticator apps as "Connecta" service with user email as account instead of just showing email address.
- July 09, 2025. Fixed critical maintenance record form bugs for date fields and cost handling. Updated maintenance record schema to properly handle date fields (scheduledDate, completedDate) with flexible validation accepting strings, dates, or null values. Fixed cost field conversion from dollars to cents for storage and cents to dollars for display. Resolved form validation errors that prevented setting scheduled/completed dates and cost values. Cost field now properly displays $30.00 instead of $0.30 when entering 30. Date picker calendars now work correctly for both scheduled and completed dates.
- July 09, 2025. Enhanced maintenance record interaction behavior and dialog functionality. Changed maintenance record row clicks to open record details dialog instead of navigating to device page for better user experience. Added maintenance record dialog to device details page with full form functionality. Enhanced maintenance dialog scroll capability (max-height 90vh with overflow) for better usability on smaller screens. Added "Go to Device" action button in Maintenance Tracker page actions menu to provide quick navigation to device details when needed. All maintenance record interactions now stay in context while providing easy access to related device information.
- July 09, 2025. Implemented comprehensive multi-select user assignment for software management. Created MultiSelectDropdown component with search functionality and badge-based selection display. Built BulkSoftwareAssignmentForm supporting multiple user or device selection with same search capabilities as single assignments. Updated software assignment dialog with tabs for "Single Assignment" and "Multiple Users" options. Users can now select multiple people at once when assigning software, maintaining all existing search and filtering capabilities. Multi-select supports badge removal, clear all functionality, and proper form validation. All assignment types (single/bulk) create individual assignment records with proper activity logging and cache invalidation.
- July 10, 2025. Simplified software assignment interface by removing redundant "Single Assignment" option. Multi-select dropdown now handles both single and multiple user selections directly, providing cleaner user experience. Updated both main software list and individual software detail pages to use unified assignment interface. This streamlines the workflow while maintaining full functionality for assigning software to one or multiple users simultaneously.
- July 10, 2025. Enhanced dashboard with comprehensive Open Tickets card and improved responsive design. Added new API endpoint to count all non-closed problem reports (open, in_progress, etc.) and display in purple-themed card. Updated grid layout to responsive 4-column design (lg:grid-cols-4) for better space utilization. Implemented dynamic font sizing in StatCard component to prevent text truncation - longer titles automatically use smaller fonts. Reduced icon sizes by 25% and fixed footer alignment issues with flexbox layout. Removed unassigned devices card for cleaner, more focused dashboard showing only essential metrics: Total Devices, Assigned Devices, Expiring Warranties, and Open Tickets.
