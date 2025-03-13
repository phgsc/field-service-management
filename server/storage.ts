import type { User, InsertUser, Location, InsertLocation, Visit, InsertVisit, UpdateProfile } from "@shared/schema";
import session from "express-session";
import { User as UserModel, Location as LocationModel, Visit as VisitModel } from "./db";
import createMemoryStore from "memorystore";
import { hashPassword } from "./auth";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, profile: UpdateProfile): Promise<User | undefined>;
  resetUserPassword(id: string, newPassword: string): Promise<User | undefined>;
  getLocations(userId: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  getVisits(userId?: string): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisitStatus(id: string, update: Partial<Visit>): Promise<Visit>;
  getEngineers(): Promise<User[]>;
  getAdmins(): Promise<User[]>;
  getVisit(id: string): Promise<Visit | undefined>;
  sessionStore: session.Store;
}

// Helper function to convert MongoDB document to our interface type
function convertDocument<T extends { id: string }>(doc: any): T {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj as T;
}

export class MongoStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await UserModel.findById(id);
    return user ? convertDocument<User>(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username });
    return user ? convertDocument<User>(user) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await UserModel.create(insertUser);
    return convertDocument<User>(user);
  }

  async updateUserProfile(id: string, profile: UpdateProfile): Promise<User | undefined> {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: { profile } },
      { new: true }
    );
    return user ? convertDocument<User>(user) : undefined;
  }

  async resetUserPassword(id: string, newPassword: string): Promise<User | undefined> {
    const hashedPassword = await hashPassword(newPassword);
    const user = await UserModel.findByIdAndUpdate(
      id,
      { 
        $set: { 
          password: hashedPassword,
          'profile.lastPasswordReset': new Date()
        }
      },
      { new: true }
    );
    return user ? convertDocument<User>(user) : undefined;
  }

  async getLocations(userId: string): Promise<Location[]> {
    const locations = await LocationModel.find({ userId });
    return locations.map(loc => convertDocument<Location>(loc));
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const newLocation = await LocationModel.create(location);
    return convertDocument<Location>(newLocation);
  }

  async getVisits(userId?: string): Promise<Visit[]> {
    const query = userId ? { userId } : {};
    const visits = await VisitModel.find(query);
    return visits.map(visit => convertDocument<Visit>(visit));
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const newVisit = await VisitModel.create(visit);
    return convertDocument<Visit>(newVisit);
  }

  async updateVisitStatus(id: string, update: Partial<Visit>): Promise<Visit> {
    const updatedVisit = await VisitModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );
    if (!updatedVisit) throw new Error("Visit not found");
    return convertDocument<Visit>(updatedVisit);
  }

  async getEngineers(): Promise<User[]> {
    const engineers = await UserModel.find({ isAdmin: false });
    return engineers.map(eng => convertDocument<User>(eng));
  }

  async getAdmins(): Promise<User[]> { 
    const admins = await UserModel.find({ isAdmin: true });
    return admins.map(admin => convertDocument<User>(admin));
  }
  async getVisit(id: string): Promise<Visit | undefined> {
    const visit = await VisitModel.findById(id);
    return visit ? convertDocument<Visit>(visit) : undefined;
  }
}

export const storage = new MongoStorage();