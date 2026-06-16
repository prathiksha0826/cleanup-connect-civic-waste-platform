"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: number;
  photoUrl: string;
  location: { lat: number; lng: number; address: string };
  wasteType: string;
  severity: string;
  description: string;
  status: string;
  priorityScore: number;
  createdAt: string;
  assignedMunicipality?: string;
}

interface ReportsListProps {
  userId: number;
  refreshTrigger?: number; // Add refresh trigger
}

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500",
  assigned: "bg-yellow-500",
  in_progress: "bg-purple-500",
  resolved: "bg-green-500",
  rejected: "bg-red-500",
};

const severityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function ReportsList({ userId, refreshTrigger }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [userId, refreshTrigger]); // Add refreshTrigger to dependencies

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/reports?userId=${userId}&limit=50`);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await response.json();
      
      // Parse JSON strings in location field
      const parsedReports = data.map((report: any) => ({
        ...report,
        location: typeof report.location === 'string' ? JSON.parse(report.location) : report.location,
      }));
      
      setReports(parsedReports);
    } catch (error: any) {
      toast.error("Failed to load reports", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-2">No reports yet</p>
          <p className="text-sm text-muted-foreground text-center">
            Submit your first waste report to start making a difference!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-48 h-48 md:h-auto relative">
              <img
                src={report.photoUrl}
                alt="Waste report"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {report.wasteType.charAt(0).toUpperCase() + report.wasteType.slice(1)} Waste
                      <Badge className={severityColors[report.severity]}>
                        {report.severity.toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {report.location.address}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${statusColors[report.status]}`} />
                    <span className="text-sm font-medium capitalize">{report.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{report.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Priority: {report.priorityScore}/100
                  </div>
                  {report.assignedMunicipality && (
                    <div>
                      Assigned to: <span className="font-medium">{report.assignedMunicipality}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}