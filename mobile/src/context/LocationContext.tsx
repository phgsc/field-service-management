import React, { createContext, useContext, useState, useEffect } from 'react';
import BackgroundGeolocation from 'react-native-background-geolocation';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

import { saveLocation } from '../api/location';

interface LocationContextType {
  isTracking: boolean;
  currentLocation: GeolocationCoordinates | null;
  lastSyncTime: Date | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  getCurrentPosition: () => Promise<GeolocationCoordinates>;
}

interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationCoordinates | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineLocations, setOfflineLocations] = useState<GeolocationCoordinates[]>([]);

  // Setup network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      
      // If we're back online and have offline locations, sync them
      if (state.isConnected && offlineLocations.length > 0) {
        syncOfflineLocations();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [offlineLocations]);

  // Setup background geolocation when the app starts
  useEffect(() => {
    configureBackgroundGeolocation();
    
    return () => {
      // Clean up when component unmounts
      stopBackgroundGeolocation();
    };
  }, []);

  const configureBackgroundGeolocation = async () => {
    // Configure the background geolocation plugin
    await BackgroundGeolocation.ready({
      // Debug config
      debug: __DEV__, // Enable debug in development mode
      logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      
      // Tracking config
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10, // Minimum distance in meters between location updates
      stationaryRadius: 25, // Radius around stationary location in meters
      
      // Activity Recognition
      stopTimeout: 5, // Minutes to wait before declaring device stationary
      
      // Application config
      stopOnTerminate: false, // Keep tracking when app is terminated
      startOnBoot: true, // Resume tracking when device reboots
      
      // HTTP & Persistence config
      url: '',  // We'll handle HTTP posting ourselves
      autoSync: false, // We'll sync manually
      maxRecordsToPersist: 1000,
      
      // iOS specific config
      allowsBackgroundLocation: true,
      
      // Android specific
      foregroundService: true,
      notification: {
        title: 'Field Service App',
        text: 'Tracking your location for service visits',
        channelName: 'Location Tracking',
      },
    });

    // Configure location events
    BackgroundGeolocation.onLocation(handleLocationUpdate);
    BackgroundGeolocation.onMotionChange(handleMotionChange);
    BackgroundGeolocation.onProviderChange(handleProviderChange);
    BackgroundGeolocation.onHeartbeat(handleHeartbeat);
  };

  const stopBackgroundGeolocation = async () => {
    BackgroundGeolocation.removeListeners();
    await BackgroundGeolocation.stop();
  };

  const handleLocationUpdate = async (location: any) => {
    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
    
    setCurrentLocation(locationData);
    
    // Attempt to send to server
    await sendLocationToServer(locationData);
  };

  const handleMotionChange = (event: any) => {
    // Handle device motion state changes (stationary vs moving)
    console.log('[MOTION] Device is now', event.isMoving ? 'moving' : 'stationary');
  };

  const handleProviderChange = (event: any) => {
    // Handle changes to location provider (GPS enabled/disabled)
    console.log('[PROVIDER] Location provider changed:', event.status);
  };

  const handleHeartbeat = async (event: any) => {
    // Handle heartbeat events (periodic updates while stationary)
    console.log('[HEARTBEAT] Received at:', new Date(event.timestamp));
    
    // Optionally force a location update during heartbeat
    if (isTracking) {
      await BackgroundGeolocation.getCurrentPosition({
        samples: 1,
        persist: true,
      });
    }
  };

  const sendLocationToServer = async (location: GeolocationCoordinates) => {
    try {
      if (!isOnline) {
        // Store location for later sync
        setOfflineLocations(prev => [...prev, location]);
        return;
      }
      
      await saveLocation({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      });
      
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to send location to server:', error);
      // Store location for later sync
      setOfflineLocations(prev => [...prev, location]);
    }
  };

  const syncOfflineLocations = async () => {
    if (offlineLocations.length === 0) return;
    
    try {
      // Process offline locations in batches to avoid overwhelming the server
      const batchSize = 10;
      const batches = Math.ceil(offlineLocations.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batch = offlineLocations.slice(i * batchSize, (i + 1) * batchSize);
        
        // Process batch in parallel
        await Promise.all(
          batch.map(location => 
            saveLocation({
              latitude: location.latitude.toString(),
              longitude: location.longitude.toString(),
            })
          )
        );
      }
      
      // Clear synced locations
      setOfflineLocations([]);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to sync offline locations:', error);
    }
  };

  const startTracking = async () => {
    if (isTracking) return;
    
    // Get permission for iOS
    if (Platform.OS === 'ios') {
      const authResult = await BackgroundGeolocation.requestPermission();
      if (!authResult) {
        throw new Error('Location permission denied');
      }
    }
    
    // Start tracking
    await BackgroundGeolocation.start();
    setIsTracking(true);
  };

  const stopTracking = async () => {
    if (!isTracking) return;
    
    await BackgroundGeolocation.stop();
    setIsTracking(false);
  };

  const getCurrentPosition = async (): Promise<GeolocationCoordinates> => {
    const location = await BackgroundGeolocation.getCurrentPosition({
      samples: 1,
      persist: true,
    });
    
    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
    
    setCurrentLocation(locationData);
    return locationData;
  };

  return (
    <LocationContext.Provider
      value={{
        isTracking,
        currentLocation,
        lastSyncTime,
        startTracking,
        stopTracking,
        getCurrentPosition,
      }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};