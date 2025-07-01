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

## Changelog

Changelog:
- July 01, 2025. Initial setup