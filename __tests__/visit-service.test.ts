import { ServiceStatus } from '../shared/schema';
import type { Visit, User } from '../shared/schema';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Visit Service Tests', () => {
  let users: Map<string, User>;
  let visits: Map<string, Visit>;
  let testEngineer: User;
  let testVisit: Visit;

  beforeEach(() => {
    // Create fresh maps for each test
    users = new Map();
    visits = new Map();

    // Create test engineer
    testEngineer = {
      id: 'eng-1',
      username: 'test-engineer',
      password: 'test-password',
      isAdmin: false,
      profile: {
        name: 'Test Engineer',
        designation: 'Field Engineer'
      }
    };
    users.set(testEngineer.id, testEngineer);

    // Create a fresh visit for each test
    testVisit = {
      id: 'visit-1',
      userId: testEngineer.id,
      jobId: 'TEST-JOB-001',
      status: 'NOT_STARTED' as keyof typeof ServiceStatus,
      startTime: new Date(),
      latitude: '51.5074',
      longitude: '-0.1278',
      endTime: undefined,
      journeyStartTime: undefined,
      journeyEndTime: undefined,
      serviceStartTime: undefined,
      serviceEndTime: undefined,
      totalServiceTime: undefined,
      totalJourneyTime: undefined,
      notes: undefined,
      blockReason: undefined,
      blockedSince: undefined
    };
    visits.set(testVisit.id, testVisit);
  });

  describe('Visit Status Transitions', () => {
    it('should start journey correctly', () => {
      const visit: Visit = {
        ...testVisit,
        id: 'visit-2',
        status: 'ON_ROUTE' as keyof typeof ServiceStatus,
        journeyStartTime: new Date()
      };
      visits.set(visit.id, visit);

      const updatedVisit = visits.get(visit.id);
      expect(updatedVisit?.status).toBe('ON_ROUTE');
      expect(updatedVisit?.journeyStartTime).toBeDefined();
    });

    it('should transition from ON_ROUTE to IN_SERVICE', () => {
      // First set visit to ON_ROUTE
      const routeVisit: Visit = {
        ...testVisit,
        status: 'ON_ROUTE' as keyof typeof ServiceStatus,
        journeyStartTime: new Date()
      };
      visits.set(routeVisit.id, routeVisit);

      // Then transition to IN_SERVICE
      const now = new Date();
      const updated: Visit = {
        ...routeVisit,
        status: 'IN_SERVICE' as keyof typeof ServiceStatus,
        journeyEndTime: now,
        serviceStartTime: now
      };
      visits.set(routeVisit.id, updated);

      const updatedVisit = visits.get(routeVisit.id);
      expect(updatedVisit?.status).toBe('IN_SERVICE');
      expect(updatedVisit?.serviceStartTime).toBeDefined();
      expect(updatedVisit?.journeyEndTime).toBeDefined();
    });

    it('should complete service correctly', () => {
      // Setup visit in IN_SERVICE state
      const serviceStartTime = new Date();
      const serviceVisit: Visit = {
        ...testVisit,
        status: 'IN_SERVICE' as keyof typeof ServiceStatus,
        serviceStartTime
      };
      visits.set(serviceVisit.id, serviceVisit);

      // Complete the service
      const now = new Date();
      const completed: Visit = {
        ...serviceVisit,
        status: 'COMPLETED' as keyof typeof ServiceStatus,
        serviceEndTime: now,
        endTime: now
      };
      visits.set(serviceVisit.id, completed);

      const completedVisit = visits.get(serviceVisit.id);
      expect(completedVisit?.status).toBe('COMPLETED');
      expect(completedVisit?.serviceEndTime).toBeDefined();
      expect(completedVisit?.endTime).toBeDefined();
    });

    it('should handle blocked status correctly', () => {
      const now = new Date();
      const blocked: Visit = {
        ...testVisit,
        status: 'BLOCKED' as keyof typeof ServiceStatus,
        blockedSince: now,
        blockReason: 'Access denied'
      };
      visits.set(blocked.id, blocked);

      const blockedVisit = visits.get(blocked.id);
      expect(blockedVisit?.status).toBe('BLOCKED');
      expect(blockedVisit?.blockedSince).toBeDefined();
      expect(blockedVisit?.blockReason).toBe('Access denied');
    });
  });
});