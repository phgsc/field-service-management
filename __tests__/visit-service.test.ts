import { MongoStorage } from '../server/storage';
import { ServiceStatus } from '../shared/schema';
import type { Visit, User } from '../shared/schema';
import mongoose from 'mongoose';

describe('Visit Service Tests', () => {
  let storage: MongoStorage;
  let testEngineer: User;
  let testVisit: Visit;

  beforeAll(async () => {
    // Set up test database connection
    const testDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-field-service-db';
    await mongoose.connect(testDbUri);
    storage = new MongoStorage();

    // Create test engineer
    testEngineer = await storage.createUser({
      username: 'test-engineer',
      password: 'test-password',
      isAdmin: false,
      profile: {
        name: 'Test Engineer',
        designation: 'Field Engineer'
      }
    });
  });

  beforeEach(async () => {
    // Create a fresh visit for each test
    testVisit = await storage.createVisit({
      userId: testEngineer.id,
      jobId: 'TEST-JOB-001',
      status: ServiceStatus.NOT_STARTED,
      startTime: new Date(),
      latitude: '51.5074',
      longitude: '-0.1278'
    });
  });

  afterEach(async () => {
    // Clean up visits after each test
    const collections = mongoose.connection.collections;
    await collections.visits.deleteMany({});
  });

  afterAll(async () => {
    // Clean up database and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Visit Status Transitions', () => {
    it('should start journey correctly', async () => {
      const visit = await storage.createVisit({
        userId: testEngineer.id,
        jobId: 'TEST-JOB-002',
        status: ServiceStatus.ON_ROUTE,
        startTime: new Date(),
        journeyStartTime: new Date(),
        latitude: '51.5074',
        longitude: '-0.1278'
      });

      expect(visit.status).toBe(ServiceStatus.ON_ROUTE);
      expect(visit.journeyStartTime).toBeDefined();
    });

    it('should transition from ON_ROUTE to IN_SERVICE', async () => {
      // First set visit to ON_ROUTE
      await storage.updateVisitStatus(testVisit.id, {
        status: ServiceStatus.ON_ROUTE,
        journeyStartTime: new Date()
      });

      // Then transition to IN_SERVICE
      const now = new Date();
      const updated = await storage.updateVisitStatus(testVisit.id, {
        status: ServiceStatus.IN_SERVICE,
        journeyEndTime: now,
        serviceStartTime: now
      });

      expect(updated.status).toBe(ServiceStatus.IN_SERVICE);
      expect(updated.serviceStartTime).toBeDefined();
      expect(updated.journeyEndTime).toBeDefined();
    });

    it('should complete service correctly', async () => {
      // Setup visit in IN_SERVICE state
      const serviceStartTime = new Date();
      await storage.updateVisitStatus(testVisit.id, {
        status: ServiceStatus.IN_SERVICE,
        serviceStartTime
      });

      // Complete the service
      const now = new Date();
      const completed = await storage.updateVisitStatus(testVisit.id, {
        status: ServiceStatus.COMPLETED,
        serviceEndTime: now,
        endTime: now
      });

      expect(completed.status).toBe(ServiceStatus.COMPLETED);
      expect(completed.serviceEndTime).toBeDefined();
      expect(completed.endTime).toBeDefined();
    });

    it('should handle blocked status correctly', async () => {
      const now = new Date();
      const blocked = await storage.updateVisitStatus(testVisit.id, {
        status: ServiceStatus.BLOCKED,
        blockedSince: now,
        blockReason: 'Access denied'
      });

      expect(blocked.status).toBe(ServiceStatus.BLOCKED);
      expect(blocked.blockedSince).toBeDefined();
      expect(blocked.blockReason).toBe('Access denied');
    });
  });

  describe('Visit Assignment Tests', () => {
    let otherEngineer: User;

    beforeAll(async () => {
      otherEngineer = await storage.createUser({
        username: 'other-engineer',
        password: 'test-password',
        isAdmin: false,
        profile: {
          name: 'Other Engineer',
          designation: 'Field Engineer'
        }
      });
    });

    it('should reassign visit to another engineer', async () => {
      const reassigned = await storage.updateVisitStatus(testVisit.id, {
        userId: otherEngineer.id
      });

      expect(reassigned.userId).toBe(otherEngineer.id);
    });

    it('should get visits for specific engineer', async () => {
      const engineerVisits = await storage.getVisits(testEngineer.id);

      engineerVisits.forEach(visit => {
        expect(visit.userId).toBe(testEngineer.id);
      });
    });
  });
});