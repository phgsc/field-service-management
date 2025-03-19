import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Query system settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    enabled: user?.isAdmin
  });

  // Mutation to update gamification setting
  const updateGamificationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/settings/gamification", { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>
            Manage system-wide settings and configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Gamification</div>
              <div className="text-sm text-muted-foreground">
                Enable or disable performance tracking and rewards
              </div>
            </div>
            <Switch
              checked={settings?.gamificationEnabled}
              onCheckedChange={(checked) => updateGamificationMutation.mutate(checked)}
              disabled={updateGamificationMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
