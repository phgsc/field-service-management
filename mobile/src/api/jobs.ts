import api from './api';

export interface JobData {
  id: string;
  jobId: string;
  userId: string;
  status: string;
  startTime: string;
  endTime?: string;
  journeyStartTime?: string;
  journeyEndTime?: string;
  serviceStartTime?: string;
  serviceEndTime?: string;
  latitude: string;
  longitude: string;
  notes?: string;
  blockReason?: string;
  blockedSince?: string;
  totalServiceTime?: number;
  totalJourneyTime?: number;
  collaborators?: string[];
  collaborationNotes?: string;
}

export const fetchJobs = async () => {
  try {
    return await api.get('/visits');
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch jobs');
  }
};

export const startJob = async (jobId: string, locationData?: { latitude: string; longitude: string }) => {
  try {
    const payload: any = { jobId };
    
    if (locationData) {
      payload.latitude = locationData.latitude;
      payload.longitude = locationData.longitude;
    }
    
    return await api.post('/visits/start-journey', payload);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to start job');
  }
};

export const startService = async (visitId: string) => {
  try {
    return await api.post(`/visits/${visitId}/start-service`, {});
  } catch (error: any) {
    throw new Error(error.message || 'Failed to start service');
  }
};

export const completeService = async (visitId: string) => {
  try {
    return await api.post(`/visits/${visitId}/complete`, {});
  } catch (error: any) {
    throw new Error(error.message || 'Failed to complete service');
  }
};

export const pauseService = async (visitId: string, reason: 'next_day' | 'blocked') => {
  try {
    return await api.post(`/visits/${visitId}/pause`, { reason });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to pause service');
  }
};

export const resumeVisit = async (visitId: string, resumeType: 'journey' | 'service') => {
  try {
    return await api.post(`/visits/${visitId}/resume`, { resumeType });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to resume visit');
  }
};

export const unblockVisit = async (visitId: string) => {
  try {
    return await api.post(`/visits/${visitId}/unblock`, {});
  } catch (error: any) {
    throw new Error(error.message || 'Failed to unblock visit');
  }
};

export const joinJob = async (visitId: string, locationData?: { latitude: string; longitude: string }) => {
  try {
    const payload: any = {};
    
    if (locationData) {
      payload.latitude = locationData.latitude;
      payload.longitude = locationData.longitude;
    }
    
    return await api.post(`/visits/${visitId}/join`, payload);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to join job');
  }
};

export const getJobDetails = async (visitId: string) => {
  try {
    return await api.get(`/visits/${visitId}`);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get job details');
  }
};