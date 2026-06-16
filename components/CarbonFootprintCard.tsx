"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, TreePine, Car, TrendingUp } from "lucide-react";

interface CarbonStats {
  totalCarbonFootprintKg: number;
  reportCount: number;
  equivalentTrees: number;
  equivalentMiles: number;
}

interface CarbonFootprintCardProps {
  userId: number;
  refreshTrigger?: number;
}

export function CarbonFootprintCard({ userId, refreshTrigger }: CarbonFootprintCardProps) {
  const [stats, setStats] = useState<CarbonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarbonStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}/carbon-stats?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch carbon stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCarbonStats();
  }, [userId, refreshTrigger]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Leaf className="h-5 w-5" />
            Carbon Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalCarbonFootprintKg === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Leaf className="h-5 w-5" />
            Carbon Impact
          </CardTitle>
          <CardDescription>Track your environmental contribution</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete reports with weight estimates to see your carbon impact! 🌱
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Leaf className="h-5 w-5" />
          Carbon Impact
        </CardTitle>
        <CardDescription>CO₂ emissions avoided through waste management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Carbon Value */}
        <div className="text-center p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
          <div className="text-5xl font-bold text-white mb-2">
            {stats.totalCarbonFootprintKg.toFixed(1)}
            <span className="text-2xl ml-2">kg</span>
          </div>
          <div className="text-white/90 text-sm font-medium">
            CO₂e Avoided
          </div>
          <Badge className="mt-3 bg-white/20 text-white border-white/30 hover:bg-white/30">
            {stats.reportCount} {stats.reportCount === 1 ? 'Report' : 'Reports'}
          </Badge>
        </div>

        {/* Equivalents Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Trees Equivalent */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <TreePine className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Tree Years</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {stats.equivalentTrees.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Trees for 1 year to offset
            </p>
          </div>

          {/* Car Miles Equivalent */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                <Car className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Car Miles</span>
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {stats.equivalentMiles.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Miles of driving avoided
            </p>
          </div>
        </div>

        {/* Info Footer */}
        <div className="pt-2 border-t border-green-200 dark:border-green-800">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            Based on EPA WARM emission factors for waste recycling vs. landfill
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
