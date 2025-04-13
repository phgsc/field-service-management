import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { fetchJobs, startJob } from '../api/jobs';
import { JobData } from '../api/jobs';

const JobsScreen = () => {
  const { user } = useAuth();
  const { currentLocation } = useLocation();
  const navigation = useNavigation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState<JobData[]>([]);
  const [jobId, setJobId] = useState('');
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [activeJobs, setActiveJobs] = useState<JobData[]>([]);
  const [myJobs, setMyJobs] = useState<JobData[]>([]);
  const [showStartJob, setShowStartJob] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const jobsData = await fetchJobs();
      setVisits(jobsData);
      
      // Filter jobs for this engineer
      const engineerJobs = jobsData.filter(job => job.userId === user?.id);
      setMyJobs(engineerJobs);
      
      // Check if engineer has any active jobs
      const active = engineerJobs.filter(job => 
        job.status === 'ON_ROUTE' || job.status === 'IN_SERVICE'
      );
      setHasActiveJob(active.length > 0);
      
      // Get active jobs from other engineers that can be joined
      const otherActiveJobs = jobsData.filter(job => 
        (job.status === 'ON_ROUTE' || job.status === 'IN_SERVICE') &&
        job.userId !== user?.id &&
        !(job.collaborators?.includes(user?.id || ''))
      );
      setActiveJobs(otherActiveJobs);
      
      // Show start job form if no active jobs and not collaborating
      const isCollaborating = jobsData.some(job => 
        job.collaborators?.includes(user?.id || '')
      );
      
      setShowStartJob(!active.length && !isCollaborating);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load jobs');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleStartJob = async () => {
    if (!jobId.trim()) {
      Alert.alert('Error', 'Please enter a Job ID');
      return;
    }
    
    try {
      setIsStartingJob(true);
      
      // Prepare location data if available
      const locationData = currentLocation ? {
        latitude: currentLocation.latitude.toString(),
        longitude: currentLocation.longitude.toString()
      } : undefined;
      
      await startJob(jobId.trim(), locationData);
      
      Alert.alert('Success', 'Job started successfully', [
        { text: 'OK', onPress: () => {
          setJobId('');
          loadJobs();
        }}
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start job');
    } finally {
      setIsStartingJob(false);
    }
  };
  
  const handleJoinJob = (jobId: string) => {
    navigation.navigate('JoinJob' as never, { jobId } as never);
  };

  const navigateToJob = (jobId: string) => {
    navigation.navigate('ActiveJob' as never, { jobId } as never);
  };

  const renderStartJobForm = () => {
    if (!showStartJob) return null;
    
    return (
      <View style={styles.startJobCard}>
        <Text style={styles.startJobTitle}>Start New Job</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Job ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Job ID"
            value={jobId}
            onChangeText={setJobId}
          />
        </View>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartJob}
          disabled={isStartingJob}
        >
          {isStartingJob ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="play" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Start Journey</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderJoinableJobs = () => {
    if (activeJobs.length === 0) return null;
    
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Join Existing Jobs</Text>
        
        <FlatList
          data={activeJobs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.jobCard}
              onPress={() => handleJoinJob(item.id)}
            >
              <View style={styles.jobHeader}>
                <Text style={styles.jobId}>{item.jobId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              
              <View style={styles.jobDetail}>
                <Icon name="account" size={16} color="#757575" />
                <Text style={styles.jobDetailText}>Engineer ID: {item.userId}</Text>
              </View>
              
              <View style={styles.jobDetail}>
                <Icon name="map-marker" size={16} color="#757575" />
                <Text style={styles.jobDetailText}>
                  Location: {item.latitude || 'N/A'}, {item.longitude || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.jobDetail}>
                <Icon name="clock" size={16} color="#757575" />
                <Text style={styles.jobDetailText}>
                  Started: {format(new Date(item.startTime), 'MMM d, h:mm a')}
                </Text>
              </View>
              
              <View style={styles.joinButtonContainer}>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoinJob(item.id)}
                >
                  <Icon name="account-plus" size={16} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Join Job</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No active jobs to join</Text>
          }
        />
      </View>
    );
  };
  
  const renderMyJobs = () => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>My Jobs</Text>
        
        <FlatList
          data={myJobs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.jobCard}
              onPress={() => navigateToJob(item.id)}
            >
              <View style={styles.jobHeader}>
                <Text style={styles.jobId}>{item.jobId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              
              <View style={styles.jobDetail}>
                <Icon name="clock" size={16} color="#757575" />
                <Text style={styles.jobDetailText}>
                  Started: {format(new Date(item.startTime), 'MMM d, h:mm a')}
                </Text>
              </View>
              
              {item.endTime && (
                <View style={styles.jobDetail}>
                  <Icon name="clock-check" size={16} color="#757575" />
                  <Text style={styles.jobDetailText}>
                    Ended: {format(new Date(item.endTime), 'MMM d, h:mm a')}
                  </Text>
                </View>
              )}
              
              {(item.collaborators && item.collaborators.length > 0) && (
                <View style={styles.jobDetail}>
                  <Icon name="account-group" size={16} color="#757575" />
                  <Text style={styles.jobDetailText}>
                    Collaborators: {item.collaborators.length}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigateToJob(item.id)}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Icon name="chevron-right" size={16} color="#1E88E5" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No jobs found</Text>
          }
        />
      </View>
    );
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {renderStartJobForm()}
            {renderJoinableJobs()}
          </>
        }
        ListFooterComponent={renderMyJobs}
        data={[]} // We're using ListHeaderComponent and ListFooterComponent instead
        keyExtractor={() => 'dummy-key'}
        renderItem={() => null}
      />
    </View>
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
  startJobCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  startJobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F5F7FA',
    height: 45,
    borderRadius: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  startButton: {
    backgroundColor: '#1E88E5',
    height: 45,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 15,
  },
  jobCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobId: {
    fontSize: 16,
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
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  jobDetailText: {
    fontSize: 14,
    color: '#616161',
    marginLeft: 5,
  },
  joinButtonContainer: {
    marginTop: 10,
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    height: 40,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 5,
  },
  viewDetailsText: {
    color: '#1E88E5',
    fontWeight: 'bold',
    marginRight: 5,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#9E9E9E',
    padding: 20,
  },
});

export default JobsScreen;