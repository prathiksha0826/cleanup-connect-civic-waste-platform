"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Leaf, Map, Eye } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: number;
  photoUrl: string;
  location: { lat: number; lng: number; address: string };
  wasteType: string;
  biodegradable: string;
  severity: string;
  description: string;
  status: string;
  priorityScore: number;
  createdAt: string;
  userId: number;
  assignedTo?: number;
  assignedMunicipality?: string;
}

interface MunicipalityReportsListProps {
  municipalityName: string;
  municipalityUserId: number;
  highlightReportId?: number | null;
}

const statusOptions = [
  { value: "all", label: "All Reports" },
  { value: "submitted", label: "Submitted" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const severityOptions = [
  { value: "all", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

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

export function MunicipalityReportsList({ municipalityName, municipalityUserId, highlightReportId }: MunicipalityReportsListProps) {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const reportRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchReports();
  }, [statusFilter, severityFilter, municipalityName]);

  // Scroll to highlighted report when it's loaded
  useEffect(() => {
    if (highlightReportId && reports.length > 0 && reportRefs.current[highlightReportId]) {
      setTimeout(() => {
        reportRefs.current[highlightReportId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [highlightReportId, reports]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Fetch only reports assigned to this municipality
      let url = `/api/reports?limit=100&municipality=${encodeURIComponent(municipalityName)}`;
      
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      if (severityFilter !== "all") {
        url += `&severity=${severityFilter}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await response.json();
      
      // Parse JSON strings and sort by priority
      const parsedReports = data
        .map((report: any) => ({
          ...report,
          location: typeof report.location === 'string' ? JSON.parse(report.location) : report.location,
        }))
        .sort((a: Report, b: Report) => b.priorityScore - a.priorityScore);
      
      setReports(parsedReports);
    } catch (error: any) {
      toast.error("Failed to load reports", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: number, newStatus: string) => {
    setUpdating(reportId);
    try {
      const updates: any = { status: newStatus };
      
      // Get the report to find the citizen userId
      const report = reports.find(r => r.id === reportId);
      if (!report) {
        throw new Error("Report not found");
      }
      
      // Auto-assign if moving to assigned status
      if (newStatus === "assigned" && !report.assignedTo) {
        updates.assignedTo = municipalityUserId;
        updates.assignedMunicipality = municipalityName;
      }
      
      // Set resolved timestamp if resolving
      if (newStatus === "resolved") {
        updates.resolvedAt = new Date().toISOString();
      }

      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update report");
      }

      // Award bonus points to citizen when report is resolved
      if (newStatus === "resolved" && report.userId) {
        try {
          await fetch("/api/contributions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: report.userId,
              reportId: reportId,
              actionType: "report_resolved",
              pointsEarned: 20, // Bonus points for resolved report
            }),
          });
          
          toast.success(`Report resolved! Citizen earned 20 bonus points`, {
            description: "The report creator has been rewarded for their contribution",
          });
        } catch (contributionError) {
          console.error("Failed to award points:", contributionError);
          // Don't fail the status update if contribution fails
          toast.success(`Report status updated to ${newStatus}`);
        }
      } else {
        toast.success(`Report status updated to ${newStatus}`);
      }
      
      fetchReports();
    } catch (error: any) {
      toast.error("Failed to update status", {
        description: error.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  const assignToMe = async (reportId: number) => {
    setUpdating(reportId);
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "assigned",
          assignedTo: municipalityUserId,
          assignedMunicipality: municipalityName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign report");
      }

      toast.success("Report assigned to you");
      fetchReports();
    } catch (error: any) {
      toast.error("Failed to assign report", {
        description: error.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleViewReport = (reportId: number) => {
    // Store the report ID and redirect to municipality dashboard
    router.push(`/municipality?reportId=${reportId}`);
  };

  const openInGoogleMaps = (lat: number, lng: number, address: string) => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    // Check if we're in an iframe
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      // Post message to parent to open in new tab
      window.parent.postMessage(
        { type: "OPEN_EXTERNAL_URL", data: { url: googleMapsUrl } },
        "*"
      );
    } else {
      // Open directly in new tab
      window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
    }
    
    toast.success("Opening location in Google Maps");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
          <CardDescription>Reports assigned to your municipality based on location</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No reports found</p>
            <p className="text-sm text-muted-foreground text-center">
              No reports have been assigned to your municipality yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card 
              key={report.id} 
              ref={(el) => {
                if (el) reportRefs.current[report.id] = el;
              }}
              className={`overflow-hidden transition-all duration-300 ${
                highlightReportId === report.id 
                  ? 'ring-4 ring-blue-500 shadow-2xl scale-[1.02]' 
                  : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-48 h-48 lg:h-auto relative">
                  <img
                    src={report.photoUrl}
                    alt="Waste report"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          {report.wasteType.charAt(0).toUpperCase() + report.wasteType.slice(1)} Waste
                          <Badge className={severityColors[report.severity]}>
                            {report.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={report.biodegradable === "biodegradable" ? "default" : "secondary"} className={report.biodegradable === "biodegradable" ? "bg-green-600" : "bg-orange-600"}>
                            <Leaf className="h-3 w-3 mr-1" />
                            {report.biodegradable === "biodegradable" ? "Biodegradable" : "Non-Biodegradable"}
                          </Badge>
                          <Badge variant="outline">
                            Priority: {report.priorityScore}/100
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {report.location.address} (Lat: {report.location.lat.toFixed(6)}, Lng: {report.location.lng.toFixed(6)})
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
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {/* View Report Button - Always visible */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewReport(report.id)}
                        className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Report
                      </Button>

                      {/* View on Map Button - Always visible */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInGoogleMaps(report.location.lat, report.location.lng, report.location.address)}
                        className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        <Map className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>

                      {report.status === "submitted" && (
                        <Button
                          size="sm"
                          onClick={() => assignToMe(report.id)}
                          disabled={updating === report.id}
                        >
                          {updating === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Assign to Me"
                          )}
                        </Button>
                      )}
                      
                      {report.status === "assigned" && (
                        <Button
                          size="sm"
                          onClick={() => updateReportStatus(report.id, "in_progress")}
                          disabled={updating === report.id}
                        >
                          {updating === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Start Work"
                          )}
                        </Button>
                      )}
                      
                      {report.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => updateReportStatus(report.id, "resolved")}
                          disabled={updating === report.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {updating === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark as Resolved
                            </>
                          )}
                        </Button>
                      )}
                      
                      {["submitted", "assigned"].includes(report.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReportStatus(report.id, "rejected")}
                          disabled={updating === report.id}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}