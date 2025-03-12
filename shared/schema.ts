import { z } from "zod";

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isAdmin: z.boolean().default(false),
});

export const insertLocationSchema = z.object({
  userId: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  timestamp: z.date().optional(),
});

export const insertVisitSchema = z.object({
  userId: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  latitude: z.string(),
  longitude: z.string(),
  notes: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;

// Update interfaces to use id instead of _id to match the client expectations
export interface User {
  id: string; // Changed from _id to id
  username: string;
  password: string;
  isAdmin: boolean;
}

export interface Location {
  id: string; // Changed from _id to id
  userId: string;
  latitude: string;
  longitude: string;
  timestamp: Date;
}

export interface Visit {
  id: string; // Changed from _id to id
  userId: string;
  startTime: Date;
  endTime?: Date;
  latitude: string;
  longitude: string;
  notes?: string;
}