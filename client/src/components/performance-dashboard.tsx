import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Clock, Truck, CheckCircle, Star } from "lucide-react";
import { Achievement, AchievementType, Points, User } from "@shared/schema";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface PerformanceDashboardProps {
  user: User;
  achievements: Achievement[];
  points: Points[];
  weeklyStats?: {
    completedVisits: number;
    avgServiceTime: number;
    avgJourneyTime: number;
    pointsEarned: number;
  };
}

const RANKS = [
  { min: 0, name: "Rookie", color: "bg-zinc-500" },
  { min: 1000, name: "Pro", color: "bg-blue-500" },
  { min: 5000, name: "Expert", color: "bg-purple-500" },
  { min: 10000, name: "Master", color: "bg-yellow-500" },
  { min: 25000, name: "Legend", color: "bg-red-500" }
];

const ACHIEVEMENT_ICONS = {
  [AchievementType.SPEED_DEMON]: Clock,
  [AchievementType.ROAD_WARRIOR]: Truck,
  [AchievementType.TASK_MASTER]: CheckCircle,
  [AchievementType.PERFECT_WEEK]: Star,
  [AchievementType.FIRST_RESPONSE]: Trophy,
  [AchievementType.CONSISTENCY_KING]: Award
};

export function PerformanceDashboard({ 
  user, 
  achievements, 
  points,
  weeklyStats 
}: PerformanceDashboardProps) {
  // Query for system settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings"]
  });

  // If settings are loading or gamification is disabled, don't render
  if (isLoadingSettings || settings?.gamificationEnabled === false) {
    return null;
  }

  const totalPoints = points.reduce((sum, p) => sum + p.amount, 0);
  const currentRank = RANKS.reduce((prev, curr) => 
    totalPoints >= curr.min ? curr : prev
  );

  const nextRank = RANKS.find(r => r.min > totalPoints);
  const progressToNext = nextRank 
    ? ((totalPoints - currentRank.min) / (nextRank.min - currentRank.min)) * 100
    : 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Track your achievements and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">{currentRank.name}</span>
                {nextRank && (
                  <span className="text-sm text-muted-foreground">
                    Next: {nextRank.name} ({nextRank.min - totalPoints} points needed)
                  </span>
                )}
              </div>
              <Progress value={progressToNext} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{achievements.length}</div>
                  <div className="text-sm text-muted-foreground">Achievements</div>
                </CardContent>
              </Card>
            </div>

            {weeklyStats && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {weeklyStats.completedVisits}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Visits This Week
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {weeklyStats.pointsEarned}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Points This Week
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {achievements.slice(0, 5).map((achievement) => {
              const Icon = ACHIEVEMENT_ICONS[achievement.type] || Trophy;
              return (
                <div
                  key={achievement.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">{achievement.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(achievement.earnedAt), "PPp")}
                      </div>
                    </div>
                  </div>
                  {achievement.metadata?.value && (
                    <Badge variant="secondary">
                      {achievement.metadata.value} pts
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}