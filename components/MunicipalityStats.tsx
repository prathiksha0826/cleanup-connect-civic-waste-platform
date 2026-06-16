"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface MunicipalityStatsProps {
  municipalityName: string;
}

export function MunicipalityStats({ municipalityName }: MunicipalityStatsProps) {
  const [stats, setStats] = useState({
    totalReports: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [municipalityName]);

  const fetchStats = async () => {
    try {
      // Fetch only reports assigned to this municipality
      const response = await fetch(`/api/reports?limit=1000&municipality=${encodeURIComponent(municipalityName)}`);
      const reports = await response.json();
      
      const totalReports = reports.length;
      const pending = reports.filter((r: any) => r.status === 'submitted').length;
      const inProgress = reports.filter((r: any) => ['assigned', 'in_progress'].includes(r.status)).length;
      const resolved = reports.filter((r: any) => r.status === 'resolved').length;
      
      setStats({
        totalReports,
        pending,
        inProgress,
        resolved,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const statsConfig = [
    {
      title: "Total Reports",
      value: stats.totalReports,
      icon: FileText,
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30",
      iconBg: "bg-blue-100 dark:bg-blue-900/50"
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: AlertTriangle,
      gradient: "from-yellow-500 to-orange-600",
      bgGradient: "from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30",
      iconBg: "bg-yellow-100 dark:bg-yellow-900/50"
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30",
      iconBg: "bg-purple-100 dark:bg-purple-900/50"
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CheckCircle,
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
      iconBg: "bg-green-100 dark:bg-green-900/50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={index}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            <CardContent className="pt-6">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} rounded-t-xl`} />
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">{stat.title}</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}