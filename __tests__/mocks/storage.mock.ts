import { IStorage } from '../../server/storage';
import { User, Visit, Location, InsertUser, InsertLocation, InsertVisit, UpdateProfile } from '@shared/schema';
import session from 'express-session';
import createMemoryStore from 'memorystore';

const MemoryStore = createMemoryStore(session);

export class MockStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private visits: Map<string, Visit> = new Map();
  private locations: Map<string, Location> = new Map();
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser = {
      ...user,
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUserProfile(id: string, profile: UpdateProfile): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      profile: {
        ...user.profile,
        ...profile
      }
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async resetUserPassword(id: string, newPassword: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      password: newPassword,
      profile: {
        ...user.profile,
        lastPasswordReset: new Date()
      }
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getLocations(userId: string): Promise<Location[]> {
    return Array.from(this.locations.values()).filter(loc => loc.userId === userId);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const newLocation = {
      ...location,
      id: `loc_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: location.timestamp || new Date()
    };
    this.locations.set(newLocation.id, newLocation);
    return newLocation;
  }

  async getVisits(userId?: string): Promise<Visit[]> {
    const allVisits = Array.from(this.visits.values());
    return userId ? allVisits.filter(visit => visit.userId === userId) : allVisits;
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const newVisit = {
      ...visit,
      id: `visit_${Math.random().toString(36).substr(2, 9)}`,
    };
    this.visits.set(newVisit.id, newVisit);
    return newVisit;
  }

  async updateVisitStatus(id: string, update: Partial<Visit>): Promise<Visit> {
    const visit = this.visits.get(id);
    if (!visit) throw new Error("Visit not found");
    
    const updatedVisit = {
      ...visit,
      ...update
    };
    this.visits.set(id, updatedVisit);
    return updatedVisit;
  }

  async getVisit(id: string): Promise<Visit | undefined> {
    return this.visits.get(id);
  }

  async getEngineers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => !user.isAdmin);
  }

  async getAdmins(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isAdmin);
  }
}
