import api from './api';

export interface LocationData {
  latitude: string;
  longitude: string;
}

export const saveLocation = async (locationData: LocationData) => {
  try {
    return await api.post('/location', locationData);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to save location');
  }
};

export const getLocationHistory = async () => {
  try {
    const user = await api.get('/user');
    return await api.get(`/engineers/${user.id}/location`);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get location history');
  }
};