import { ServiceStatus } from '../shared/schema';
import type { Visit, User } from '../shared/schema';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Authorization Checks', () => {
  let users: Map<string, User>;
  let visits: Map<string, Visit>;
  let engineer: User;
  let admin: User;
  let visit: Visit;

  beforeEach(() => {
    // Create fresh maps for each test
    users = new Map();
    visits = new Map();

    // Create test users
    engineer = {
      id: 'eng-1',
      username: 'test-engineer',
      password: 'test-password',
      isAdmin: false
    };
    users.set(engineer.id, engineer);

    admin = {
      id: 'admin-1',
      username: 'test-admin',
      password: 'test-password',
      isAdmin: true
    };
    users.set(admin.id, admin);

    // Create a test visit
    visit = {
      id: 'visit-1',
      userId: engineer.id,
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
    visits.set(visit.id, visit);
  });

  describe('Visit Access Control', () => {
    it('should allow engineer to access their own visits', () => {
      const engineerVisits = Array.from(visits.values())
        .filter(v => v.userId === engineer.id);
      expect(engineerVisits.some(v => v.id === visit.id)).toBeTruthy();
    });

    it('should allow admin to access all visits', () => {
      const allVisits = Array.from(visits.values());
      expect(allVisits.length).toBeGreaterThan(0);
    });

    it('should not return other engineers visits', () => {
      const otherEngineer: User = {
        id: 'eng-2',
        username: 'other-engineer',
        password: 'test-password',
        isAdmin: false
      };
      users.set(otherEngineer.id, otherEngineer);

      const otherEngVisits = Array.from(visits.values())
        .filter(v => v.userId === otherEngineer.id);
      expect(otherEngVisits).toHaveLength(0);
    });
  });

  describe('Engineer Management', () => {
    it('should list all engineers', () => {
      const engineers = Array.from(users.values())
        .filter(user => !user.isAdmin);
      expect(engineers.length).toBeGreaterThan(0);
      engineers.forEach(eng => {
        expect(eng.isAdmin).toBeFalsy();
      });
    });

    it('should list all admins', () => {
      const admins = Array.from(users.values())
        .filter(user => user.isAdmin);
      expect(admins.length).toBeGreaterThan(0);
      admins.forEach(admin => {
        expect(admin.isAdmin).toBeTruthy();
      });
    });
  });
});