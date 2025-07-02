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
