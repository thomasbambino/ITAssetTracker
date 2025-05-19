import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import session from "express-session";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { updateMailgunService } from "./direct-mailgun";
import { addStatusField } from "./migrations/add-status-field";
import { addSitesTableMigration } from "./migrations/add-sites-table";
import { addNotesField } from "./migrations/add-notes-field";
import { addDepartmentsTable } from "./migrations/add-departments-table";
import { migrateDepartmentsData } from "./migrations/migrate-departments-data";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'itassetmanagement-secret-key',
  resave: true,
  saveUninitialized: true,
  name: 'asset.sid', // Custom name to avoid default name collisions
  cookie: {
    secure: false, // Set to false even in production for now to debug
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' // Allow cookies in same-site context
  }
}));

// Debug middleware for logging and session tracking
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Debug session data on authentication endpoints
  if (path.startsWith("/api/auth") || path === "/api/users/me") {
    log(`Session debug - Route: ${path}, SessionID: ${req.sessionID || 'none'}, SessionData: ${JSON.stringify(req.session) || 'none'}`);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Log session data after authentication endpoints
      if ((path.startsWith("/api/auth") || path === "/api/users/me") && res.statusCode === 200) {
        log(`Session after successful ${path}: ${JSON.stringify(req.session || {})}`);
      }
    }
  });

  next();
});

(async () => {
  // Initialize the database
  try {
    log('Initializing database...');
    await initializeDatabase();
    log('Database initialization completed.');
    
    // Run schema migrations
    log('Running database migrations...');
    await addStatusField();
    await addSitesTableMigration();
    await addNotesField();
    await addDepartmentsTable();
    await migrateDepartmentsData();
    log('Database migrations completed.');
    
    // Initialize direct mailgun service with settings from the database
    try {
      log('Initializing direct mailgun service...');
      const emailSettings = await storage.getEmailSettings();
      if (emailSettings) {
        // Log the settings we retrieved (without exposing API key)
        log(`Email settings found: domain=${emailSettings.domain}, fromEmail=${emailSettings.fromEmail}, isEnabled=${emailSettings.isEnabled}, hasApiKey=${!!emailSettings.apiKey}`);
        
        // Update direct mailgun service with retrieved settings
        const updatedService = updateMailgunService(emailSettings);
        
        // Check if direct mailgun service is properly configured
        const isConfigured = updatedService.isConfigured();
        log(`Direct mailgun service initialized and ${isConfigured ? 'properly configured' : 'not fully configured'}.`);
        
        if (!isConfigured) {
          log('Warning: Direct mailgun service is not fully configured, emails will not be sent.');
        }
      } else {
        log('No email settings found in database. Direct mailgun service will use default configuration.');
      }
    } catch (emailError) {
      log(`Direct mailgun service initialization failed: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
      // Continue application startup even if email service fails
    }
  } catch (error) {
    log(`Database initialization failed: ${error}`);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
