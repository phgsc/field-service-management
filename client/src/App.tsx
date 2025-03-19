import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs-page";
import AdminUsersPage from "@/pages/admin-users";
import EngineerView from "@/pages/engineer-view";
import AdminCalendar from "@/pages/admin-calendar";
import EngineerCalendar from "@/pages/engineer-calendar";
import AdminSettings from "@/pages/admin-settings";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import MapView from "@/pages/map-view";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/jobs" component={JobsPage} />
      <ProtectedRoute path="/admin-users" component={AdminUsersPage} />
      <ProtectedRoute path="/engineer" component={EngineerView} />
      <ProtectedRoute path="/map/:engineerId" component={MapView} />
      <ProtectedRoute path="/admin-calendar" component={AdminCalendar} />
      <ProtectedRoute path="/engineer-calendar" component={EngineerCalendar} />
      <ProtectedRoute path="/admin-settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
