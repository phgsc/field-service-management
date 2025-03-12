# Field Service Management Application

A comprehensive field service management application that enables efficient tracking of service visits, user authentication, and administrative operations for service engineers.

## Features

- **Role-based Authentication**
  - Admin dashboard for managing service engineers
  - Engineer-specific views for tracking visits
  - Secure password management

- **Service Engineer Management**
  - Create and manage engineer accounts
  - Profile management with name and designation
  - Password reset functionality
  - Real-time status tracking

- **Visit Tracking**
  - Real-time location tracking for service visits
  - Start/End visit functionality
  - Visit history with duration tracking
  - Location logging

## Tech Stack

- MongoDB for database management
- TypeScript for type-safe development
- React with shadcn/ui for the frontend
- Express.js backend
- Authentication using Passport.js
- Real-time location tracking

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `SESSION_SECRET`: Secret for session management

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

- `/client` - React frontend application
- `/server` - Express backend
- `/shared` - Shared TypeScript types and schemas

## License

MIT
