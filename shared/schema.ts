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