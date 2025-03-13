import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertUserSchema, updateProfileSchema, resetPasswordSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Middleware to check if user is admin
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }
    next();
  };

  // Add new route for creating engineer accounts (admin only)
  app.post("/api/engineers", requireAdmin, async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        username: req.body.username,
        password: req.body.password,
        isAdmin: false, // Force isAdmin to false for engineer accounts
        profile: {
          name: req.body.name,
          designation: req.body.designation
        }
      });

      res.status(201).json(user);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  // Profile management routes
  app.get("/api/engineers/:id/profile", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).send("Engineer not found");
      res.json(user.profile);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.patch("/api/engineers/:id/profile", requireAdmin, async (req, res) => {
    try {
      const updateData = updateProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(req.params.id, updateData);
      if (!user) return res.status(404).send("Engineer not found");
      res.json(user);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  // Get single engineer details
  app.get("/api/engineers/:id", requireAdmin, async (req, res) => {
    try {
      const engineer = await storage.getUser(req.params.id);
      if (!engineer) return res.status(404).send("Engineer not found");
      res.json(engineer);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });


  // Update existing reset password route to allow admin-to-admin resets
  app.post("/api/engineers/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const { newPassword } = resetPasswordSchema.parse(req.body);

      // Get the target user
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).send("Engineer not found");

      // Allow reset if:
      // 1. Target is not an admin, or
      // 2. Target is an admin but the requester is also an admin
      if (!targetUser.isAdmin || (targetUser.isAdmin && req.user?.isAdmin)) {
        const user = await storage.resetUserPassword(req.params.id, newPassword);
        return res.json({ message: "Password reset successful" });
      }

      res.status(403).send("Not authorized to reset this user's password");
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

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
  app.post("/api/visits/start-journey", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.createVisit({
        userId: req.user.id,
        jobId: req.body.jobId,
        status: 'in_journey',
        startTime: new Date(),
        journeyStartTime: new Date(),
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      });
      res.json(visit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.post("/api/visits/:id/start-service", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.updateVisitStatus(req.params.id, {
        status: 'in_service',
        journeyEndTime: new Date(),
        serviceStartTime: new Date(),
        totalJourneyTime: req.body.totalJourneyTime,
      });
      res.json(visit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.post("/api/visits/:id/complete", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.updateVisitStatus(req.params.id, {
        status: 'completed',
        endTime: new Date(),
        serviceEndTime: new Date(),
        totalServiceTime: req.body.totalServiceTime,
      });
      res.json(visit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.post("/api/visits/:id/pause", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const now = new Date();
      const updateData = {
        status: req.body.reason === 'next_day' ? 'paused_next_day' : 'blocked',
        endTime: now,
        serviceEndTime: now,
        totalServiceTime: req.body.totalServiceTime,
      };

      if (req.body.reason === 'blocked') {
        updateData.blockedSince = now;
        updateData.blockReason = req.body.blockReason;
      }

      const visit = await storage.updateVisitStatus(req.params.id, updateData);
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
      const locations = await storage.getLocations(req.params.id);
      res.json(locations);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}