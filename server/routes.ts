import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import {
  insertUserSchema,
  updateProfileSchema,
  resetPasswordSchema,
  ServiceStatus,
} from "@shared/schema";

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
          designation: req.body.designation,
        },
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
  app.post(
    "/api/engineers/:id/reset-password",
    requireAdmin,
    async (req, res) => {
      try {
        const { newPassword } = resetPasswordSchema.parse(req.body);

        // Get the target user
        const targetUser = await storage.getUser(req.params.id);
        if (!targetUser) return res.status(404).send("User not found");

        // Prevent self reset through this endpoint
        if (targetUser.id === req.user?.id) {
          return res
            .status(403)
            .send("Cannot reset your own password through this endpoint");
        }

        const user = await storage.resetUserPassword(
          req.params.id,
          newPassword,
        );
        return res.json({ message: "Password reset successful" });
      } catch (err) {
        res.status(500).send((err as Error).message);
      }
    },
  );

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
      // Check if user already has an active visit
      const activeVisits = await storage.getVisits(req.user.id);
      const hasActiveVisit = activeVisits.some((v) =>
        [ServiceStatus.ON_ROUTE, ServiceStatus.IN_SERVICE].includes(v.status),
      );

      if (hasActiveVisit) {
        return res
          .status(400)
          .send("Cannot start new journey while another visit is active");
      }

      const visit = await storage.createVisit({
        userId: req.user.id,
        jobId: req.body.jobId,
        status: ServiceStatus.ON_ROUTE,
        startTime: new Date(),
        journeyStartTime: new Date(),
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      });
      res.json(visit);
    } catch (err) {
      console.log("!Error : " + err);
      res.status(500).send((err as Error).message);
    }
  });

  app.post("/api/visits/:id/start-service", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).send("Visit not found");


      // Compare the string representations of the IDs
      if (visit.userId.toString() !== req.user.id.toString()) {
        return res.status(403).send("Not authorized to modify this visit");
      }

      if (visit.status !== ServiceStatus.ON_ROUTE) {
        return res.status(400).send("Visit must be on route to start service");
      }

      const now = new Date();
      const journeyTimeInMinutes = visit.journeyStartTime ?
        Math.floor((now.getTime() - new Date(visit.journeyStartTime).getTime()) / (1000 * 60)) : 0;

      const updateData: Partial<Visit> = {
        status: ServiceStatus.IN_SERVICE,
        journeyEndTime: now,
        serviceStartTime: now,
        totalJourneyTime: (visit.totalJourneyTime || 0) + journeyTimeInMinutes
      };

      const updatedVisit = await storage.updateVisitStatus(req.params.id, updateData);
      res.json(updatedVisit);
    } catch (err) {
      console.error("Start service error:", err);
      res.status(500).send((err as Error).message);
    }
  });

  // Update the complete route to accumulate service time
  app.post("/api/visits/:id/complete", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).send("Visit not found");

      const now = new Date();
      const serviceTimeInMinutes = visit.serviceStartTime
        ? Math.floor(
            (now.getTime() - new Date(visit.serviceStartTime).getTime()) /
              (1000 * 60),
          )
        : 0;

      const updateData = {
        status: ServiceStatus.COMPLETED, // Corrected to use enum
        endTime: now,
        serviceEndTime: now,
        totalServiceTime: (visit.totalServiceTime || 0) + serviceTimeInMinutes,
      };

      const updatedVisit = await storage.updateVisitStatus(
        req.params.id,
        updateData,
      );
      res.json(updatedVisit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.post("/api/visits/:id/pause", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).send("Visit not found");

      const now = new Date();
      const serviceTimeInMinutes = visit.serviceStartTime
        ? Math.floor(
            (now.getTime() - new Date(visit.serviceStartTime).getTime()) /
              (1000 * 60),
          )
        : 0;

      const updateData: any = {
        status: req.body.reason === "next_day" ? ServiceStatus.PAUSED_NEXT_DAY : ServiceStatus.BLOCKED,
        endTime: now,
        serviceEndTime: now,
        totalServiceTime: (visit.totalServiceTime || 0) + serviceTimeInMinutes,
      };

      if (req.body.reason === "blocked") {
        updateData.blockedSince = now;
        updateData.blockReason = req.body.blockReason;
      }

      const updatedVisit = await storage.updateVisitStatus(req.params.id, updateData);
      res.json(updatedVisit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  // Update resume route
  app.post("/api/visits/:id/resume", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).send("Visit not found");

      // Only allow resuming paused or blocked visits
      if (![ServiceStatus.PAUSED_NEXT_DAY, ServiceStatus.BLOCKED].includes(visit.status)) {
        return res.status(400).send("Visit must be paused or blocked to resume");
      }

      // Check authorization - admin can reassign, engineer can only modify own visits
      if (!req.user.isAdmin && visit.userId.toString() !== req.user.id.toString()) {
        return res.status(403).send("Not authorized to modify this visit");
      }

      const now = new Date();
      const updateData: Partial<Visit> = {
        status: req.body.resumeType === 'journey' ? ServiceStatus.ON_ROUTE : ServiceStatus.IN_SERVICE,
        endTime: null,
        serviceEndTime: null
      };

      // Handle engineer reassignment if admin is making the request
      if (req.user.isAdmin && req.body.newEngineerId) {
        updateData.userId = req.body.newEngineerId;
      }

      if (req.body.resumeType === 'journey') {
        updateData.journeyStartTime = now;
        updateData.journeyEndTime = null;
      } else {
        updateData.serviceStartTime = now;
        updateData.serviceEndTime = null;
      }

      const updatedVisit = await storage.updateVisitStatus(req.params.id, updateData);
      res.json(updatedVisit);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  app.post("/api/visits/:id/unblock", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).send("Visit not found");

      // Check authorization - admin can reassign, engineer can only modify own visits
      if (!req.user.isAdmin && visit.userId.toString() !== req.user.id.toString()) {
        return res.status(403).send("Not authorized to modify this visit");
      }

      if (visit.status !== ServiceStatus.BLOCKED) {
        return res.status(400).send("Visit must be blocked to unblock");
      }

      const updateData: Partial<Visit> = {
        status: ServiceStatus.ON_ROUTE,
        blockReason: null,
        blockedSince: null
      };

      // Handle engineer reassignment if admin is making the request
      if (req.user.isAdmin && req.body.newEngineerId) {
        updateData.userId = req.body.newEngineerId;
      }

      const updatedVisit = await storage.updateVisitStatus(req.params.id, updateData);
      res.json(updatedVisit);
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

  // Add this new route after the existing /api/engineers route
  app.get("/api/admins", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAdmins();
      res.json(users);
    } catch (err) {
      res.status(500).send((err as Error).message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}