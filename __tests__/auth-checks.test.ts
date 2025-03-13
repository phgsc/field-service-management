import { MongoStorage } from '../server/storage';
import { ServiceStatus } from '../shared/schema';
import type { Visit, User } from '../shared/schema';
import mongoose from 'mongoose';

describe('Authorization Checks', () => {
  let storage: MongoStorage;
  let engineer: User;
  let admin: User;
  let visit: Visit;

  beforeAll(async () => {
    // Set up test database connection
    const testDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-field-service-db';
    await mongoose.connect(testDbUri);
    storage = new MongoStorage();

    // Create test users
    engineer = await storage.createUser({
      username: 'test-engineer',
      password: 'test-password',
      isAdmin: false
    });

    admin = await storage.createUser({
      username: 'test-admin',
      password: 'test-password',
      isAdmin: true
    });

    // Create a test visit
    visit = await storage.createVisit({
      userId: engineer.id,
      jobId: 'TEST-JOB-001',
      status: ServiceStatus.NOT_STARTED,
      startTime: new Date(),
      latitude: '51.5074',
      longitude: '-0.1278'
    });
  });

  afterAll(async () => {
    // Clean up database and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Visit Access Control', () => {
    it('should allow engineer to access their own visits', async () => {
      const visits = await storage.getVisits(engineer.id);
      expect(visits.some(v => v.id === visit.id)).toBeTruthy();
    });

    it('should allow admin to access all visits', async () => {
      const allVisits = await storage.getVisits();
      expect(allVisits.length).toBeGreaterThan(0);
    });

    it('should not return other engineers visits', async () => {
      const otherEngineer = await storage.createUser({
        username: 'other-engineer',
        password: 'test-password',
        isAdmin: false
      });

      const visits = await storage.getVisits(otherEngineer.id);
      expect(visits.some(v => v.userId === engineer.id)).toBeFalsy();
    });
  });

  describe('Engineer Management', () => {
    it('should list all engineers for admin', async () => {
      const engineers = await storage.getEngineers();
      expect(engineers.length).toBeGreaterThan(0);
      engineers.forEach(eng => {
        expect(eng.isAdmin).toBeFalsy();
      });
    });

    it('should list all admins', async () => {
      const admins = await storage.getAdmins();
      expect(admins.length).toBeGreaterThan(0);
      admins.forEach(admin => {
        expect(admin.isAdmin).toBeTruthy();
      });
    });
  });
});