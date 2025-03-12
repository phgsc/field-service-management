import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Middleware to check if user is admin
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }
    next();
  };

  // Location tracking
  app.post("/api/location", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const location = await storage.createLocation({
        userId: req.user.id,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        timestamp: new Date(),
      });
      res.json(location);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  // Visit management
  app.post("/api/visits/start", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.createVisit({
        userId: req.user.id,
        startTime: new Date(),
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        notes: req.body.notes,
      });
      res.json(visit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.post("/api/visits/:id/end", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.updateVisit(
        parseInt(req.params.id),
        new Date(),
      );
      res.json(visit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.get("/api/visits", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visits = await storage.getVisits(
        req.user.isAdmin ? undefined : req.user.id,
      );
      res.json(visits);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  // Admin routes
  app.get("/api/engineers", requireAdmin, async (req, res) => {
    try {
      const engineers = await storage.getEngineers();
      res.json(engineers);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.get("/api/engineers/:id/location", requireAdmin, async (req, res) => {
    try {
      const locations = await storage.getLocations(parseInt(req.params.id));
      res.json(locations);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
