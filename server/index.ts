import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { responseCache } from "./cache";

const app = express();

// Increase payload size limits for photo uploads
// Set to 50MB to handle multiple high-resolution photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Add request timeout handling
app.use((req, res, next) => {
  // Set a 5-minute timeout for upload-heavy requests
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
});

// Response logging and caching middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    const duration = Date.now() - start;
    
    // Log slow requests only
    if (duration > 200 && path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms (slow)`);
    }
    
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  next();
});

(async () => {
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
