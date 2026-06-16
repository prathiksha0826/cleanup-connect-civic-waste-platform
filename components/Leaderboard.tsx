"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Medal, Award } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  points: number;
  badges: string[];
}

interface LeaderboardProps {
  currentUserId?: number;
}

export function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard?limit=10&role=citizen');
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      const data = await response.json();
      
      // Parse badges if they're strings
      const parsedData = data.map((entry: any) => ({
        ...entry,
        badges: typeof entry.badges === 'string' ? JSON.parse(entry.badges) : entry.badges,
      }));
      
      setLeaders(parsedData);
    } catch (error: any) {
      toast.error("Failed to load leaderboard", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Contributors
        </CardTitle>
        <CardDescription>
          Citizens making the biggest impact in their communities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaders.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                entry.id === currentUserId ? 'bg-green-50 dark:bg-green-950 border-2 border-green-600' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-center w-10">
                {getRankIcon(entry.rank)}
              </div>
              
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-green-600 text-white">
                  {entry.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {entry.name}
                  {entry.id === currentUserId && (
                    <Badge variant="secondary" className="ml-2">You</Badge>
                  )}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.badges.slice(0, 3).map((badge, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{entry.points}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
