# Field Service Mobile App

React Native mobile application for iOS and Android that enables field service engineers to track their location and manage service visits with robust background tracking.

## Key Features

- Background location tracking on iOS and Android
- Engineer service visit management 
- Job collaboration capabilities
- Offline support for remote areas
- Push notifications for job updates
- Integration with main backend API

## Setup Instructions

1. Install dependencies: `npm install`
2. Install iOS dependencies: `cd ios && pod install && cd ..`
3. Run on iOS: `npm run ios`
4. Run on Android: `npm run android`

## Project Structure

- `/src/api` - API communication layer
- `/src/screens` - Main application screens
- `/src/components` - Reusable UI components
- `/src/services` - Business logic and services
- `/src/navigation` - Navigation configuration
- `/src/context` - React contexts and state management
- `/src/utils` - Utility functions
- `/src/assets` - Images, fonts, and other assets