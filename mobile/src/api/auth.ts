import api from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
}

export const login = async (username: string, password: string) => {
  try {
    return await api.post('/login', { username, password });
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

export const register = async (username: string, password: string) => {
  try {
    return await api.post('/register', { username, password });
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const logout = async () => {
  try {
    return await api.post('/logout', {});
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};

export const getUserProfile = async () => {
  try {
    return await api.get('/user');
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch user profile');
  }
};

export const updateProfile = async (data: { name: string; designation: string }) => {
  try {
    const user = await getUserProfile();
    return await api.patch(`/engineers/${user.id}/profile`, data);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update profile');
  }
};

export const changePassword = async (newPassword: string) => {
  try {
    const user = await getUserProfile();
    return await api.post(`/engineers/${user.id}/reset-password`, { newPassword });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to change password');
  }
};