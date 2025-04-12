import { z } from "zod";

export const userProfileSchema = z.object({
  name: z.string().optional(),
  designation: z.string().optional(),
  lastPasswordReset: z.date().optional()
});

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isAdmin: z.boolean().default(false),
  profile: userProfileSchema.optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().min(1, "Designation is required")
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

export const insertLocationSchema = z.object({
  userId: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  timestamp: z.date().optional(),
});

// Enhanced visit schema with job tracking
export const ServiceStatus = {
  NOT_STARTED: 'not_started',
  ON_ROUTE: 'on_route',
  IN_SERVICE: 'in_service',
  COMPLETED: 'completed',
  PAUSED_NEXT_DAY: 'paused_next_day',
  BLOCKED: 'blocked'
} as const;

export const insertVisitSchema = z.object({
  userId: z.string(),
  jobId: z.string(),
  status: z.enum([
    ServiceStatus.NOT_STARTED,
    ServiceStatus.ON_ROUTE,
    ServiceStatus.IN_SERVICE,
    ServiceStatus.COMPLETED,
    ServiceStatus.PAUSED_NEXT_DAY,
    ServiceStatus.BLOCKED
  ]),
  startTime: z.date(),
  endTime: z.date().optional(),
  journeyStartTime: z.date().optional(),
  journeyEndTime: z.date().optional(),
  serviceStartTime: z.date().optional(),
  serviceEndTime: z.date().optional(),
  latitude: z.string(),
  longitude: z.string(),
  notes: z.string().optional(),
  blockReason: z.string().optional(),
  blockedSince: z.date().optional(),
  totalServiceTime: z.number().optional(), // in minutes
  totalJourneyTime: z.number().optional(), // in minutes
  collaborators: z.array(z.string()).optional(), // Array of engineer IDs who joined this visit
  collaborationNotes: z.string().optional(), // Notes about the collaboration
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Update interfaces to use id instead of _id to match the client expectations
export interface User {
  id: string;
  username: string;
  password: string;
  isAdmin: boolean;
  profile?: {
    name?: string;
    designation?: string;
    lastPasswordReset?: Date;
  };
  gamification?: UserGamification;
}

export interface Location {
  id: string;
  userId: string;
  latitude: string;
  longitude: string;
  timestamp: Date;
}

export interface Visit {
  id: string;
  userId: string;
  jobId: string;
  status: keyof typeof ServiceStatus;
  startTime: Date;
  endTime?: Date;
  journeyStartTime?: Date;
  journeyEndTime?: Date;
  serviceStartTime?: Date;
  serviceEndTime?: Date;
  latitude: string;
  longitude: string;
  notes?: string;
  blockReason?: string;
  blockedSince?: Date;
  totalServiceTime?: number;
  totalJourneyTime?: number;
  collaborators?: string[]; // Array of engineer IDs who joined this visit
  collaborationNotes?: string; // Notes about the collaboration
}

export const insertScheduleSchema = z.object({
  engineerId: z.string(),
  engineerName: z.string(),
  title: z.string().min(1, "Title is required"),
  type: z.enum([
    'journey', 'service', 'admin', 'sales-call', 'sales-visit',
    'research', 'day-off', 'vacation', 'public-holiday',
    'weekly-off', 'in-office'
  ]),
  start: z.string().or(z.date()),
  end: z.string().or(z.date()),
  allDay: z.boolean().default(false)
});

export interface Schedule {
  id: string;
  engineerId: string;
  engineerName: string;
  title: string;
  type: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export const AchievementType = {
  SPEED_DEMON: 'speed_demon',         // Fast service completion
  ROAD_WARRIOR: 'road_warrior',       // Efficient journey times
  TASK_MASTER: 'task_master',         // High number of completed tasks
  PERFECT_WEEK: 'perfect_week',       // All tasks completed on time in a week
  FIRST_RESPONSE: 'first_response',   // Quick response to new tasks
  CONSISTENCY_KING: 'consistency_king' // Maintaining consistent performance
} as const;

export const insertAchievementSchema = z.object({
  userId: z.string(),
  type: z.enum([
    AchievementType.SPEED_DEMON,
    AchievementType.ROAD_WARRIOR,
    AchievementType.TASK_MASTER,
    AchievementType.PERFECT_WEEK,
    AchievementType.FIRST_RESPONSE,
    AchievementType.CONSISTENCY_KING
  ]),
  earnedAt: z.date(),
  metadata: z.object({
    visitId: z.string().optional(),
    criteria: z.string(),
    value: z.number()
  }).optional()
});

export const insertPointsSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  reason: z.string(),
  timestamp: z.date(),
  visitId: z.string().optional()
});

export interface Achievement {
  id: string;
  userId: string;
  type: keyof typeof AchievementType;
  earnedAt: Date;
  metadata?: {
    visitId?: string;
    criteria: string;
    value: number;
  };
}

export interface Points {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: Date;
  visitId?: string;
}

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type InsertPoints = z.infer<typeof insertPointsSchema>;

// Add gamification-related fields to User interface
export interface UserGamification {
  totalPoints: number;
  achievements: Achievement[];
  weeklyStats?: {
    completedVisits: number;
    avgServiceTime: number;
    avgJourneyTime: number;
    pointsEarned: number;
  };
  rank?: string; // Based on total points
}

// Add system settings schema
export const systemSettingsSchema = z.object({
  id: z.string(),
  gamificationEnabled: z.boolean().default(true),
  lastUpdated: z.date(),
  updatedBy: z.string() // Admin user ID who last updated settings
});

export interface SystemSettings {
  id: string;
  gamificationEnabled: boolean;
  lastUpdated: Date;
  updatedBy: string;
}

export type InsertSystemSettings = z.infer<typeof systemSettingsSchema>;