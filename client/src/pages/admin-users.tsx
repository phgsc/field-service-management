import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2, Key } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminNav } from "@/components/admin-nav";

// Password Reset Form Component
function ResetPasswordForm({ 
  admin, 
  onSuccess 
}: { 
  admin: User; 
  onSuccess: () => void;
}) {
  const form = useForm({
    defaultValues: { newPassword: "" }
  });
  const { toast } = useToast();

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const res = await apiRequest("POST", `/api/engineers/${admin.id}/reset-password`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset successful" });
      form.reset();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to reset password", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <form onSubmit={form.handleSubmit((data) => resetPasswordMutation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input id="newPassword" type="password" {...form.register("newPassword")} required />
      </div>
      <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
        {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Reset Password
      </Button>
    </form>
  );
}

export default function AdminUsersPage() {
  const { user, logoutMutation } = useAuth();
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  const { data: admins } = useQuery<User[]>({
    queryKey: ["/api/engineers"],
    select: (users) => users.filter(u => u.isAdmin)
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <AdminNav />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Admin Users Management</CardTitle>
          <Button
            variant="destructive"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Logout
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins?.map((admin) => (
              <Card key={admin.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {admin.profile?.name || admin.username}
                      </span>
                      {admin.profile?.designation && (
                        <p className="text-sm text-muted-foreground">
                          {admin.profile.designation}
                        </p>
                      )}
                      {admin.profile?.lastPasswordReset && (
                        <p className="text-xs text-muted-foreground">
                          Last password reset: {new Date(admin.profile.lastPasswordReset).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Dialog
                      open={isResetPasswordOpen && selectedAdmin?.id === admin.id}
                      onOpenChange={(open) => {
                        setIsResetPasswordOpen(open);
                        if (!open) setSelectedAdmin(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAdmin(admin)}
                          disabled={admin.id === user?.id} // Only disable self-reset
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset Admin Password</DialogTitle>
                        </DialogHeader>
                        {selectedAdmin && (
                          <ResetPasswordForm
                            admin={selectedAdmin}
                            onSuccess={() => setIsResetPasswordOpen(false)}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
