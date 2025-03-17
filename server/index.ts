import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
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
  try {
    log("Starting server initialization...");

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${err.message}`);
      res.status(status).json({ message });
      console.error(err);
    });

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode...");
      await setupVite(app, server);
    } else {
      log("Setting up static serving for production...");
      serveStatic(app);
    }

    // Graceful shutdown handling
    const gracefulShutdown = () => {
      log("Received kill signal, shutting down gracefully...");
      server.close(() => {
        log("Server closed");
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        log("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    server.listen(5000, "0.0.0.0", () => {
      log(`Server started successfully on port 5000`);
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log("Port 5000 is already in use. Please ensure no other instance is running.");
        process.exit(1);
      }
      log(`Failed to start server: ${error.message}`);
      process.exit(1);
    });

  } catch (error) {
    log(`Failed to initialize server: ${(error as Error).message}`);
    process.exit(1);
  }
})();