import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import session from "express-session";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { updateEmailService } from "./email-service-improved";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve the emergency access page
app.get('/emergency', (req, res) => {
  const emergencyPath = path.resolve('emergency.html');
  if (fs.existsSync(emergencyPath)) {
    res.sendFile(emergencyPath);
  } else {
    res.status(404).send('Emergency access page not found');
  }
});

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'itassetmanagement-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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
    
    // Initialize email service with settings from the database
    try {
      log('Initializing email service...');
      const emailSettings = await storage.getEmailSettings();
      if (emailSettings) {
        updateEmailService(emailSettings);
        log('Email service initialized with settings from database.');
      } else {
        log('No email settings found in database. Email service will use default configuration.');
      }
    } catch (emailError) {
      log(`Email service initialization failed: ${emailError}`);
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
