import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { JobsTable } from "@/components/jobs-table";
import { useQuery } from "@tanstack/react-query";
import { Visit, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";

export default function JobsPage() {
  const { user, logoutMutation } = useAuth();

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
  });

  const { data: engineers } = useQuery<User[]>({
    queryKey: ["/api/engineers"],
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <AdminNav />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Jobs Overview</CardTitle>
          <Button
            variant="destructive"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Logout
          </Button>
        </CardHeader>
        <CardContent>
          <JobsTable visits={visits || []} engineers={engineers || []} />
        </CardContent>
      </Card>
    </div>
  );
}