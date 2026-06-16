"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Navigation, Leaf } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: number;
  photoUrl: string;
  location: { lat: number; lng: number; address: string };
  wasteType: string;
  biodegradable: string;
  severity: string;
  status: string;
  priorityScore: number;
  description: string;
}

interface ReportsMapProps {
  municipalityName: string;
}

const severityColors: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

export function ReportsMap({ municipalityName }: ReportsMapProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      // Fetch only reports assigned to this municipality
      const response = await fetch(`/api/reports?limit=100&municipality=${encodeURIComponent(municipalityName)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await response.json();
      
      // Parse JSON strings and filter active reports
      const parsedReports = data
        .map((report: any) => ({
          ...report,
          location: typeof report.location === 'string' ? JSON.parse(report.location) : report.location,
        }))
        .filter((r: Report) => !['resolved', 'rejected'].includes(r.status));
      
      setReports(parsedReports);
    } catch (error: any) {
      toast.error("Failed to load map data", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate map bounds based on actual GPS coordinates
  const getMapBounds = () => {
    if (reports.length === 0) return { minLat: 0, maxLat: 100, minLng: 0, maxLng: 100 };
    
    const lats = reports.map(r => r.location.lat);
    const lngs = reports.map(r => r.location.lng);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  };

  // Convert GPS coordinates to map position percentage
  const getMarkerPosition = (lat: number, lng: number) => {
    const bounds = getMapBounds();
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;
    
    // Add 10% padding
    const left = 10 + ((lng - bounds.minLng) / lngRange) * 80;
    const top = 10 + ((bounds.maxLat - lat) / latRange) * 80;
    
    return { left, top };
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

  const bounds = getMapBounds();

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Map Visualization */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Reports Map View (GPS Coordinates)
          </CardTitle>
          <CardDescription>
            Geographic distribution of active waste reports with exact GPS locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-[500px] bg-muted rounded-lg overflow-hidden border-2">
            {/* Map coordinate labels */}
            <div className="absolute top-2 left-2 bg-background/90 px-2 py-1 rounded text-xs font-mono">
              Lat: {bounds.maxLat.toFixed(4)}° N
            </div>
            <div className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 rounded text-xs font-mono">
              Lat: {bounds.minLat.toFixed(4)}° N
            </div>
            <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-mono">
              Lng: {bounds.maxLng.toFixed(4)}° E
            </div>
            <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-mono">
              Lng: {bounds.minLng.toFixed(4)}° E
            </div>
            
            {/* Grid background to simulate map */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-1 p-4 opacity-10">
              {[...Array(48)].map((_, i) => (
                <div key={i} className="border border-muted-foreground" />
              ))}
            </div>
            
            {/* Plot reports as markers using actual GPS coordinates */}
            {reports.map((report) => {
              const { left, top } = getMarkerPosition(report.location.lat, report.location.lng);
              
              return (
                <div
                  key={report.id}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform group"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    zIndex: selectedReport?.id === report.id ? 10 : 1,
                  }}
                  onClick={() => setSelectedReport(report)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg ring-2 ring-background"
                    style={{ backgroundColor: severityColors[report.severity] }}
                  >
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-background border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                    {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}
                  </div>
                </div>
              );
            })}
            
            {reports.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">No active reports to display</p>
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: severityColors.critical }} />
              <span className="text-sm">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: severityColors.high }} />
              <span className="text-sm">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: severityColors.medium }} />
              <span className="text-sm">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: severityColors.low }} />
              <span className="text-sm">Low</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Report Details */}
      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>
            {selectedReport ? "Location and classification info" : "Select a report from the map"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedReport ? (
            <div className="space-y-4">
              <img
                src={selectedReport.photoUrl}
                alt="Report"
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {selectedReport.wasteType.charAt(0).toUpperCase() + selectedReport.wasteType.slice(1)}
                  </Badge>
                  <Badge className={
                    selectedReport.severity === 'critical' ? 'bg-red-600' :
                    selectedReport.severity === 'high' ? 'bg-orange-600' :
                    selectedReport.severity === 'medium' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }>
                    {selectedReport.severity.toUpperCase()}
                  </Badge>
                  <Badge variant={selectedReport.biodegradable === "biodegradable" ? "default" : "secondary"} className={selectedReport.biodegradable === "biodegradable" ? "bg-green-600" : "bg-orange-600"}>
                    <Leaf className="h-3 w-3 mr-1" />
                    {selectedReport.biodegradable === "biodegradable" ? "Bio" : "Non-Bio"}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    GPS Location:
                  </p>
                  <p className="font-mono text-xs bg-muted p-2 rounded">
                    Latitude: {selectedReport.location.lat.toFixed(6)}°<br/>
                    Longitude: {selectedReport.location.lng.toFixed(6)}°
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedReport.location.address}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedReport.description}
                </p>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Priority Score: <span className="font-semibold">{selectedReport.priorityScore}/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Status: <span className="font-semibold">{selectedReport.status.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click on a marker to view report details with exact GPS coordinates
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}