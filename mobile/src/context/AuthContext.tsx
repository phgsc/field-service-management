import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import { login, register, getUserProfile, logout } from '../api/auth';

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  profile?: {
    name?: string;
    designation?: string;
    lastPasswordReset?: Date;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing auth token on app load
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      setIsLoading(true);
      // Check if we have a stored session
      const storedUser = await AsyncStorage.getItem('@user');
      
      if (storedUser) {
        const credentials = await Keychain.getGenericPassword();
        
        if (credentials) {
          // If we have stored credentials, get fresh user data
          const userData = await getUserProfile();
          setUser(userData);
        } else {
          // If keychain is missing but we have user data, we need to re-authenticate
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load authentication state', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userData = await login(username, password);
      
      // Store user data in AsyncStorage
      await AsyncStorage.setItem('@user', JSON.stringify(userData));
      
      // Store credentials securely in Keychain
      await Keychain.setGenericPassword(username, password);
      
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userData = await register(username, password);
      
      // After registration, log the user in automatically
      await AsyncStorage.setItem('@user', JSON.stringify(userData));
      await Keychain.setGenericPassword(username, password);
      
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Call logout API
      await logout();
      
      // Clear local storage
      await AsyncStorage.removeItem('@user');
      await Keychain.resetGenericPassword();
      
      setUser(null);
    } catch (err: any) {
      console.error('Logout error', err);
      setError(err.message || 'Failed to logout');
      
      // Even if the API call fails, we should clear local state
      await AsyncStorage.removeItem('@user');
      await Keychain.resetGenericPassword();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        clearError,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};