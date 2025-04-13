import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { fetchJobs } from '../api/jobs';
import { JobData } from '../api/jobs';

const DashboardScreen = () => {
  const { user } = useAuth();
  const { currentLocation, isTracking, startTracking, stopTracking } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState<JobData[]>([]);
  const [activeVisit, setActiveVisit] = useState<JobData | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchJobs();
      setVisits(data);
      
      // Find active visit
      const active = data.find(visit => 
        (visit.status === 'ON_ROUTE' || visit.status === 'IN_SERVICE') &&
        visit.userId === user?.id
      );
      setActiveVisit(active || null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load jobs');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartTracking = async () => {
    try {
      await startTracking();
      Alert.alert('Success', 'Location tracking started');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start tracking');
    }
  };

  const handleStopTracking = async () => {
    try {
      await stopTracking();
      Alert.alert('Success', 'Location tracking stopped');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to stop tracking');
    }
  };

  const navigateToNewJob = () => {
    navigation.navigate('Jobs' as never);
  };

  const navigateToActiveJob = (jobId: string) => {
    navigation.navigate('ActiveJob' as never, { jobId } as never);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#4CAF50';
      case 'ON_ROUTE':
        return '#2196F3';
      case 'IN_SERVICE':
        return '#FFC107';
      case 'PAUSED_NEXT_DAY':
        return '#FF9800';
      case 'BLOCKED':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const renderLocationInfo = () => (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Icon name="map-marker" size={24} color="#1E88E5" />
        <Text style={styles.locationTitle}>Location Status</Text>
      </View>
      
      <View style={styles.locationInfo}>
        {currentLocation ? (
          <>
            <Text style={styles.locationCoordinates}>
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={styles.locationUpdated}>
              Updated: {format(new Date(), 'h:mm a')}
            </Text>
          </>
        ) : (
          <Text style={styles.locationCoordinates}>Waiting for location...</Text>
        )}
      </View>
      
      <View style={styles.trackingButtons}>
        {isTracking ? (
          <TouchableOpacity 
            style={[styles.trackingButton, styles.stopButton]} 
            onPress={handleStopTracking}
          >
            <Icon name="stop-circle" size={18} color="#FFF" />
            <Text style={styles.trackingButtonText}>Stop Tracking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.trackingButton, styles.startButton]} 
            onPress={handleStartTracking}
          >
            <Icon name="play-circle" size={18} color="#FFF" />
            <Text style={styles.trackingButtonText}>Start Tracking</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderActiveJob = () => {
    if (!activeVisit) return null;
    
    return (
      <TouchableOpacity 
        style={styles.activeJobCard}
        onPress={() => navigateToActiveJob(activeVisit.id)}
      >
        <View style={styles.activeJobHeader}>
          <Text style={styles.activeJobTitle}>Active Job</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeVisit.status) }]}>
            <Text style={styles.statusText}>{activeVisit.status}</Text>
          </View>
        </View>
        
        <View style={styles.jobDetails}>
          <Text style={styles.jobId}>Job ID: {activeVisit.jobId}</Text>
          <Text style={styles.jobTimestamp}>
            Started: {format(new Date(activeVisit.startTime), 'MMM d, h:mm a')}
          </Text>
          
          {activeVisit.collaborators && activeVisit.collaborators.length > 0 && (
            <View style={styles.collaboratorsContainer}>
              <Text style={styles.collaboratorsLabel}>Collaborators:</Text>
              <Text style={styles.collaboratorsCount}>{activeVisit.collaborators.length}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetails}>View Details</Text>
          <Icon name="chevron-right" size={20} color="#1E88E5" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecentJobs = () => {
    // Filter to show user's own recent jobs, excluding active one
    const recentJobs = visits
      .filter(visit => visit.userId === user?.id && (!activeVisit || visit.id !== activeVisit.id))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 5);
    
    if (recentJobs.length === 0) {
      return (
        <View style={styles.noJobsContainer}>
          <Text style={styles.noJobsText}>No recent jobs found</Text>
        </View>
      );
    }
    
    return (
      <>
        {recentJobs.map(job => (
          <TouchableOpacity 
            key={job.id}
            style={styles.jobItem}
            onPress={() => navigateToActiveJob(job.id)}
          >
            <View style={styles.jobItemHeader}>
              <Text style={styles.jobItemId}>{job.jobId}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                <Text style={styles.statusText}>{job.status}</Text>
              </View>
            </View>
            
            <Text style={styles.jobTimestamp}>
              {format(new Date(job.startTime), 'MMM d, h:mm a')}
            </Text>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.profile?.name || user?.username}</Text>
        <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      </View>
      
      {renderLocationInfo()}
      
      {renderActiveJob()}
      
      <View style={styles.recentJobsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          <TouchableOpacity onPress={navigateToNewJob}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {renderRecentJobs()}
      </View>
      
      {!activeVisit && (
        <TouchableOpacity 
          style={styles.newJobButton}
          onPress={navigateToNewJob}
        >
          <Icon name="plus" size={20} color="#FFF" />
          <Text style={styles.newJobButtonText}>Start New Job</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    color: '#616161',
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  date: {
    fontSize: 16,
    color: '#757575',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginLeft: 8,
  },
  locationInfo: {
    marginBottom: 15,
  },
  locationCoordinates: {
    fontSize: 16,
    color: '#616161',
    marginBottom: 5,
  },
  locationUpdated: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  trackingButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  activeJobCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeJobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobDetails: {
    marginBottom: 15,
  },
  jobId: {
    fontSize: 16,
    color: '#616161',
    marginBottom: 5,
  },
  jobTimestamp: {
    fontSize: 14,
    color: '#9E9E9E',
    marginBottom: 5,
  },
  collaboratorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  collaboratorsLabel: {
    fontSize: 14,
    color: '#616161',
  },
  collaboratorsCount: {
    fontSize: 14,
    color: '#1E88E5',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  viewDetails: {
    color: '#1E88E5',
    fontWeight: 'bold',
    marginRight: 5,
  },
  recentJobsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  seeAllText: {
    color: '#1E88E5',
    fontWeight: 'bold',
  },
  jobItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 10,
  },
  jobItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  jobItemId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  noJobsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noJobsText: {
    color: '#9E9E9E',
    fontSize: 16,
  },
  newJobButton: {
    backgroundColor: '#1E88E5',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newJobButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default DashboardScreen;