import { users, locations, visits } from "@shared/schema";
import type { User, InsertUser, Location, InsertLocation, Visit, InsertVisit } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLocations(userId: number): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  getVisits(userId?: number): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: number, endTime: Date): Promise<Visit>;
  getEngineers(): Promise<User[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private visits: Map<number, Visit>;
  private currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.visits = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLocations(userId: number): Promise<Location[]> {
    return Array.from(this.locations.values()).filter(
      (location) => location.userId === userId,
    );
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const id = this.currentId++;
    const newLocation: Location = { ...location, id };
    this.locations.set(id, newLocation);
    return newLocation;
  }

  async getVisits(userId?: number): Promise<Visit[]> {
    const visits = Array.from(this.visits.values());
    if (userId) {
      return visits.filter((visit) => visit.userId === userId);
    }
    return visits;
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const id = this.currentId++;
    const newVisit: Visit = { ...visit, id };
    this.visits.set(id, newVisit);
    return newVisit;
  }

  async updateVisit(id: number, endTime: Date): Promise<Visit> {
    const visit = this.visits.get(id);
    if (!visit) throw new Error("Visit not found");
    const updatedVisit = { ...visit, endTime };
    this.visits.set(id, updatedVisit);
    return updatedVisit;
  }

  async getEngineers(): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => !user.isAdmin);
  }
}

export const storage = new MemStorage();
