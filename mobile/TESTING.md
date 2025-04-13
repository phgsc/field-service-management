# Mobile App Testing Guide

This document provides a comprehensive guide for testing the Field Service Mobile app for both iOS and Android platforms.

## Table of Contents

1. [Setting Up the Testing Environment](#setting-up-the-testing-environment)
2. [Unit Testing](#unit-testing)
3. [Component Testing](#component-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Performance Testing](#performance-testing)
7. [Location Testing](#location-testing)
8. [Offline Mode Testing](#offline-mode-testing)
9. [Background Process Testing](#background-process-testing)
10. [Device-Specific Testing](#device-specific-testing)

## Setting Up the Testing Environment

### Prerequisites

- Node.js v18 or higher
- Xcode 14+ (for iOS)
- Android Studio (for Android)
- Jest and React Native Testing Library
- Detox for E2E testing

### Installation

```bash
# Install dependencies
npm install

# Install iOS-specific dependencies
cd ios && pod install && cd ..

# Install Detox CLI globally
npm install -g detox-cli
```

## Unit Testing

We use Jest for unit testing logic functions, API calls, and utilities.

### Running Unit Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/utils/locationUtils.test.js
```

### Example Unit Test

```javascript
// src/utils/locationUtils.test.js
import { formatCoordinates, calculateDistance } from '../utils/locationUtils';

describe('Location Utilities', () => {
  test('formatCoordinates should format latitude and longitude', () => {
    const result = formatCoordinates(37.7749, -122.4194);
    expect(result).toBe('37.7749, -122.4194');
  });

  test('calculateDistance should compute distance between two coordinates', () => {
    const distance = calculateDistance(
      { latitude: 37.7749, longitude: -122.4194 },
      { latitude: 37.7848, longitude: -122.4294 }
    );
    // Approximate expected distance in kilometers
    expect(distance).toBeCloseTo(1.3, 1);
  });
});
```

## Component Testing

We use React Native Testing Library to test components.

### Running Component Tests

```bash
# Run component tests
npm test -- --testPathPattern=src/components
```

### Example Component Test

```javascript
// src/components/JobCard.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import JobCard from '../components/JobCard';

describe('JobCard Component', () => {
  const mockJob = {
    id: '123',
    jobId: 'JOB-123',
    status: 'ON_ROUTE',
    location: {
      latitude: '37.7749',
      longitude: '-122.4194'
    },
    startTime: new Date().toISOString()
  };
  
  const mockNavigate = jest.fn();
  
  test('renders job details correctly', () => {
    const { getByText } = render(
      <JobCard job={mockJob} onPress={mockNavigate} />
    );
    
    expect(getByText('JOB-123')).toBeTruthy();
    expect(getByText('ON_ROUTE')).toBeTruthy();
  });
  
  test('calls navigate function when pressed', () => {
    const { getByTestId } = render(
      <JobCard job={mockJob} onPress={mockNavigate} />
    );
    
    fireEvent.press(getByTestId('job-card'));
    expect(mockNavigate).toHaveBeenCalledWith('123');
  });
});
```

## Integration Testing

Integration tests verify that different parts of the application work together correctly.

```javascript
// src/screens/JobsScreen.test.js
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import JobsScreen from '../screens/JobsScreen';
import { AuthProvider } from '../context/AuthContext';
import { fetchJobs } from '../api/jobs';

// Mock the API module
jest.mock('../api/jobs');

describe('JobsScreen Integration', () => {
  beforeEach(() => {
    fetchJobs.mockClear();
  });

  test('fetches and displays jobs', async () => {
    const mockJobs = [
      {
        id: '1',
        jobId: 'JOB-001',
        status: 'ON_ROUTE',
      },
      {
        id: '2',
        jobId: 'JOB-002',
        status: 'IN_SERVICE',
      }
    ];
    
    fetchJobs.mockResolvedValueOnce(mockJobs);
    
    const { getByText, queryByText } = render(
      <AuthProvider>
        <JobsScreen />
      </AuthProvider>
    );
    
    // Initially should show loading
    expect(getByText('Loading jobs...')).toBeTruthy();
    
    // After API resolves
    await waitFor(() => {
      expect(queryByText('Loading jobs...')).toBeNull();
      expect(getByText('JOB-001')).toBeTruthy();
      expect(getByText('JOB-002')).toBeTruthy();
    });
  });
});
```

## End-to-End Testing

We use Detox for end-to-end testing on real devices or simulators.

### Setting Up Detox

```bash
# Initialize Detox
detox init

# Build the app for testing
detox build --configuration ios.sim.debug

# Run Detox tests
detox test --configuration ios.sim.debug
```

### Example E2E Test

```javascript
// e2e/login.test.js
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully', async () => {
    await element(by.id('username')).typeText('testEngineer');
    await element(by.id('password')).typeText('password123');
    await element(by.id('login-button')).tap();
    
    // Verify we reached the dashboard
    await expect(element(by.text('Dashboard'))).toBeVisible();
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('username')).typeText('wronguser');
    await element(by.id('password')).typeText('wrongpass');
    await element(by.id('login-button')).tap();
    
    // Check for error message
    await expect(element(by.text('Invalid username or password'))).toBeVisible();
  });
});
```

## Performance Testing

### Memory Usage Monitoring

Use the React Native Performance Monitor to track memory usage:

```bash
# Install the performance monitor
npm install --save-dev react-native-performance-monitor

# Add instrumentation to your code
import { PerformanceMonitor } from 'react-native-performance-monitor';

// In your component
useEffect(() => {
  PerformanceMonitor.startTracking('JobScreen');
  return () => {
    PerformanceMonitor.stopTracking('JobScreen');
  };
}, []);
```

### CPU and Battery Usage

For iOS:
- Use Xcode's Instruments to monitor CPU, memory, and energy impact
- Profile with the Energy Log instrument

For Android:
- Use Android Profiler in Android Studio
- Monitor battery usage in developer options

## Location Testing

### Simulating Location Changes

1. For development testing, use the Location simulation in Xcode or Android Emulator
2. For automated testing, mock the geolocation APIs:

```javascript
// In your test setup
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// Then in your test
import Geolocation from 'react-native-geolocation-service';

// Simulate location updates
Geolocation.getCurrentPosition.mockImplementation((success) => {
  success({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 0,
      accuracy: 5,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  });
});
```

### Testing Background Location

For manual testing:
1. Start location tracking in your app
2. Press the home button (app goes to background)
3. Move to a different location (physically or using simulator)
4. Return to the app and verify the new location was captured

For automated testing with background tracking, use platform-specific methods to simulate background states.

## Offline Mode Testing

1. Enable airplane mode or disable network in the device settings
2. Use the app and perform operations
3. Re-enable network and verify data synchronization

### Automated Network Testing

```javascript
// Mock the NetInfo module
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn()
}));

import NetInfo from '@react-native-community/netinfo';

// Simulate offline state
NetInfo.fetch.mockResolvedValue({
  isConnected: false,
  isInternetReachable: false
});

// Test component behavior in offline mode
// ...

// Simulate online state
NetInfo.fetch.mockResolvedValue({
  isConnected: true,
  isInternetReachable: true
});

// Test synchronization behavior
// ...
```

## Background Process Testing

1. For iOS:
   - Use Background Task Debugger in Xcode
   - Monitor background fetch events in Console

2. For Android:
   - Use Background Task Inspector in Android Studio
   - Check ADB logs for background service operations

## Device-Specific Testing

### iOS Device Matrix

Test on at least these devices:
- iPhone SE (smaller screen)
- iPhone 12/13 (medium screen)
- iPhone 12/13 Pro Max (larger screen)
- iPad (if supporting tablet layouts)

### Android Device Matrix

Test on at least these device types:
- Small screen device (e.g., Pixel 4a)
- Medium screen device (e.g., Pixel 6)
- Large screen device (e.g., Samsung Galaxy S21 Ultra)
- Different Android versions (at least Android 10, 11, 12)

### Accessibility Testing

- Test with VoiceOver/TalkBack
- Verify that all UI elements have proper accessibility labels
- Check color contrast for text elements
- Test with larger font sizes

## Continuous Integration

Set up GitHub Actions or another CI system to automatically run:
- Linting
- Unit tests
- Component tests
- Integration tests

For E2E tests, consider using a service like Bitrise or App Center that provides device farms.