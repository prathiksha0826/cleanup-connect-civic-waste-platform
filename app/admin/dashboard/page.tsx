"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Shield, 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  LogOut,
  Filter,
  Search,
  UserPlus,
  Trash2,
  Loader2
} from "lucide-react";

interface Report {
  id: number;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  wardNumber: string;
  photoUrl: string;
  wasteType: string;
  severity: string;
  status: string;
  userId: number;
  assignedTeamId: number | null;
  assignedTeamName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: number;
  name: string;
  serviceArea: string | { lat: number; lng: number; radius: number };
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusKm: number | null;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

interface TeamMember {
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  assignedAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [wardFilter, setWardFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Dialogs
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [gettingTeamLocation, setGettingTeamLocation] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    centerLatitude: "",
    centerLongitude: "",
    radiusKm: "",
    wardNumbers: "",
    contactEmail: "",
    contactPhone: ""
  });
  
  const [teamDetailsDialogOpen, setTeamDetailsDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Helper function to format service area
  const formatServiceArea = (serviceArea: string | { lat: number; lng: number; radius: number } | undefined): string => {
    if (!serviceArea) return 'N/A';
    if (typeof serviceArea === 'string') return serviceArea;
    return `Area: ${serviceArea.lat?.toFixed(4)}, ${serviceArea.lng?.toFixed(4)} (${serviceArea.radius}km radius)`;
  };

  useEffect(() => {
    verifyAdmin();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, statusFilter, severityFilter, wardFilter, searchQuery]);

  const verifyAdmin = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/verify", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }

      await fetchData();
    } catch (error) {
      console.error("Verification failed:", error);
      router.push("/admin/login");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      
      // Fetch all reports
      const reportsRes = await fetch("/api/admin/reports", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }
      
      // Fetch all teams
      const teamsRes = await fetch("/api/admin/teams", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (severityFilter !== "all") {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }
    
    if (wardFilter !== "all") {
      filtered = filtered.filter(r => r.wardNumber === wardFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.description.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query) ||
        r.wasteType.toLowerCase().includes(query)
      );
    }
    
    setFilteredReports(filtered);
  };

  const handleAssignTask = (report: Report) => {
    setSelectedReport(report);
    setSelectedTeamId("");
    setAssignDialogOpen(true);
  };

  const handleAutoAssign = async (reportId: number) => {
    try {
      const token = localStorage.getItem("admin_token");
      
      // Decode token to get admin ID
      const tokenPayload = JSON.parse(atob(token!.split('.')[1]));
      const adminId = tokenPayload.userId;
      
      const res = await fetch(`/api/admin/reports/${reportId}/auto-assign`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ adminId })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Assigned to ${data.assignedTeamName} (${data.assignedTeamDistance}km away)`);
        await fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to auto-assign");
      }
    } catch (error) {
      console.error("Auto-assign failed:", error);
      toast.error("Failed to auto-assign task");
    }
  };

  const confirmAssignment = async () => {
    if (!selectedReport || !selectedTeamId) {
      toast.error("Please select a team");
      return;
    }
    
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/reports/${selectedReport.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ teamId: parseInt(selectedTeamId) })
      });
      
      if (res.ok) {
        toast.success("Task assigned successfully");
        setAssignDialogOpen(false);
        await fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to assign task");
      }
    } catch (error) {
      console.error("Assignment failed:", error);
      toast.error("Failed to assign task");
    }
  };

  const getTeamLocation = () => {
    setGettingTeamLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          setNewTeam(prev => ({
            ...prev,
            centerLatitude: latitude.toString(),
            centerLongitude: longitude.toString(),
          }));
          
          setGettingTeamLocation(false);
          toast.success("Location captured successfully", {
            description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get location. Please enter manually.");
          setGettingTeamLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
      setGettingTeamLocation(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name || !newTeam.centerLatitude || 
        !newTeam.centerLongitude || !newTeam.radiusKm || !newTeam.contactEmail || 
        !newTeam.contactPhone || !newTeam.wardNumbers) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Parse ward numbers from comma-separated string
    const wardNumbersArray = newTeam.wardNumbers
      .split(',')
      .map(w => parseInt(w.trim()))
      .filter(w => !isNaN(w));

    if (wardNumbersArray.length === 0) {
      toast.error("Please enter at least one valid ward number");
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTeam.name,
          serviceArea: {
            lat: parseFloat(newTeam.centerLatitude),
            lng: parseFloat(newTeam.centerLongitude),
            radius: parseFloat(newTeam.radiusKm)
          },
          wardNumbers: wardNumbersArray,
          contactEmail: newTeam.contactEmail,
          contactPhone: newTeam.contactPhone
        })
      });
      
      if (res.ok) {
        toast.success("Team created successfully");
        setCreateTeamDialogOpen(false);
        setNewTeam({
          name: "",
          centerLatitude: "",
          centerLongitude: "",
          radiusKm: "",
          wardNumbers: "",
          contactEmail: "",
          contactPhone: ""
        });
        await fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create team");
      }
    } catch (error) {
      console.error("Team creation failed:", error);
      toast.error("Failed to create team");
    }
  };

  const handleViewTeam = async (team: Team) => {
    setSelectedTeam(team);
    
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/teams/${team.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const members = await res.json();
        setTeamMembers(members);
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    }
    
    setTeamDetailsDialogOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !newMemberEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userEmail: newMemberEmail })
      });
      
      if (res.ok) {
        toast.success("Member added successfully");
        setAddMemberDialogOpen(false);
        setNewMemberEmail("");
        
        // Refresh team members
        const membersRes = await fetch(`/api/admin/teams/${selectedTeam.id}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (membersRes.ok) {
          const members = await membersRes.json();
          setTeamMembers(members);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to add member");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedTeam) return;
    
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success("Member removed successfully");
        
        // Refresh team members
        const membersRes = await fetch(`/api/admin/teams/${selectedTeam.id}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (membersRes.ok) {
          const members = await membersRes.json();
          setTeamMembers(members);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "resolved": return "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400";
      case "in_progress": return "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400";
      case "assigned": return "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400";
      default: return "text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    assigned: reports.filter(r => r.status === "assigned").length,
    inProgress: reports.filter(r => r.status === "in_progress").length,
    resolved: reports.filter(r => r.status === "resolved").length,
    teams: teams.length
  };

  const uniqueWards = Array.from(new Set(reports.map(r => r.wardNumber))).sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Super Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">Municipality Management Portal</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.assigned}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Active Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.teams}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-1">
            <TabsTrigger value="reports">Reports Management</TabsTrigger>
            <TabsTrigger value="teams">Teams Management</TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search description, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Severity</Label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Ward</Label>
                    <Select value={wardFilter} onValueChange={setWardFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Wards</SelectItem>
                        {uniqueWards.map(ward => (
                          <SelectItem key={ward} value={ward}>Ward {ward}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reports List */}
            <div className="grid gap-4">
              {filteredReports.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No reports found matching the filters
                  </CardContent>
                </Card>
              ) : (
                filteredReports.map(report => (
                  <Card key={report.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {/* Photo */}
                        <img
                          src={report.photoUrl}
                          alt="Report"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                        
                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getStatusColor(report.status)}>
                                  {report.status.replace("_", " ").toUpperCase()}
                                </Badge>
                                <Badge variant="outline">{report.wasteType}</Badge>
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(report.severity)}`} />
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {report.severity} severity
                                  </span>
                                </div>
                              </div>
                              <h3 className="font-semibold text-lg mb-1">{report.description}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {report.location}
                                </div>
                                <div>Ward {report.wardNumber}</div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {report.status === "pending" && (
                                <>
                                  <Button
                                    onClick={() => handleAutoAssign(report.id)}
                                    variant="outline"
                                    size="sm"
                                    className="whitespace-nowrap"
                                  >
                                    Auto-Assign
                                  </Button>
                                  <Button
                                    onClick={() => handleAssignTask(report)}
                                    size="sm"
                                    className="whitespace-nowrap"
                                  >
                                    Manual Assign
                                  </Button>
                                </>
                              )}
                              {report.assignedTeamName && (
                                <div className="text-sm text-muted-foreground">
                                  Assigned to: <span className="font-semibold">{report.assignedTeamName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            Coordinates: {report.latitude?.toFixed(6) ?? 'N/A'}, {report.longitude?.toFixed(6) ?? 'N/A'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Municipality Teams</h2>
              <Button onClick={() => setCreateTeamDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Team
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {teams.map(team => (
                <Card key={team.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewTeam(team)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      {team.name}
                    </CardTitle>
                    <CardDescription>{formatServiceArea(team.serviceArea)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Center: {team.centerLatitude?.toFixed(4) ?? 'N/A'}, {team.centerLongitude?.toFixed(4) ?? 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Coverage Radius:</span>
                        <span className="font-semibold">{team.radiusKm?.toFixed(1) ?? 'N/A'} km</span>
                      </div>
                      <div className="text-muted-foreground">📧 {team.contactEmail}</div>
                      <div className="text-muted-foreground">📱 {team.contactPhone}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to Team</DialogTitle>
            <DialogDescription>
              Select a municipality team to handle this report
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-semibold mb-2">{selectedReport.description}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedReport.location} • Ward {selectedReport.wardNumber}
                </div>
              </div>
              
              <div>
                <Label>Select Team</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name} - {formatServiceArea(team.serviceArea)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAssignment}>
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Municipality Team</DialogTitle>
            <DialogDescription>
              Add a new team with their service area. Use automatic location detection for accuracy.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Team Name *</Label>
              <Input
                value={newTeam.name}
                onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                placeholder="e.g., North Zone Team"
              />
            </div>
            
            <div>
              <Label>Ward Numbers *</Label>
              <Input
                value={newTeam.wardNumbers}
                onChange={(e) => setNewTeam({...newTeam, wardNumbers: e.target.value})}
                placeholder="e.g., 1, 2, 3, 4"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter ward numbers separated by commas
              </p>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Team Location *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getTeamLocation}
                  disabled={gettingTeamLocation}
                >
                  {gettingTeamLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Use Current Location
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Click the button to automatically detect the team's location coordinates
              </p>
            </div>
            
            <div>
              <Label>Center Latitude *</Label>
              <Input
                type="number"
                step="any"
                value={newTeam.centerLatitude}
                onChange={(e) => setNewTeam({...newTeam, centerLatitude: e.target.value})}
                placeholder="e.g., 40.7128"
                readOnly={gettingTeamLocation}
              />
            </div>
            
            <div>
              <Label>Center Longitude *</Label>
              <Input
                type="number"
                step="any"
                value={newTeam.centerLongitude}
                onChange={(e) => setNewTeam({...newTeam, centerLongitude: e.target.value})}
                placeholder="e.g., -74.0060"
                readOnly={gettingTeamLocation}
              />
            </div>
            
            <div>
              <Label>Coverage Radius (km) *</Label>
              <Input
                type="number"
                step="any"
                value={newTeam.radiusKm}
                onChange={(e) => setNewTeam({...newTeam, radiusKm: e.target.value})}
                placeholder="e.g., 5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Service area radius from the center point
              </p>
            </div>
            
            <div>
              <Label>Contact Phone *</Label>
              <Input
                value={newTeam.contactPhone}
                onChange={(e) => setNewTeam({...newTeam, contactPhone: e.target.value})}
                placeholder="e.g., +1234567890"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label>Contact Email *</Label>
              <Input
                type="email"
                value={newTeam.contactEmail}
                onChange={(e) => setNewTeam({...newTeam, contactEmail: e.target.value})}
                placeholder="e.g., team@municipality.gov"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam}>
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Details Dialog */}
      <Dialog open={teamDetailsDialogOpen} onOpenChange={setTeamDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedTeam?.name}
            </DialogTitle>
            <DialogDescription>{selectedTeam ? formatServiceArea(selectedTeam.serviceArea) : ''}</DialogDescription>
          </DialogHeader>
          
          {selectedTeam && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Service Area Details</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>
                      <span className="text-muted-foreground">Center:</span>{" "}
                      {selectedTeam.centerLatitude?.toFixed(4) ?? 'N/A'}, {selectedTeam.centerLongitude?.toFixed(4) ?? 'N/A'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Radius:</span>{" "}
                      {selectedTeam.radiusKm?.toFixed(1) ?? 'N/A'} km
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>📧 {selectedTeam.contactEmail}</div>
                    <div>📱 {selectedTeam.contactPhone}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Team Members ({teamMembers.length})</h3>
                  <Button onClick={() => setAddMemberDialogOpen(true)} size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {teamMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No team members yet. Add workers to this team.
                    </div>
                  ) : (
                    teamMembers.map(member => (
                      <Card key={member.userId}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{member.userName}</div>
                              <div className="text-sm text-muted-foreground">{member.userEmail}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Added: {new Date(member.assignedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              onClick={() => handleRemoveMember(member.userId)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Enter the email address of a municipality worker to add to this team
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Label>Worker Email Address</Label>
            <Input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="worker@municipality.gov"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}