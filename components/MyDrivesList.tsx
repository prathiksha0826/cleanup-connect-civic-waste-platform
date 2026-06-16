"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Clock } from "lucide-react";

interface Drive {
  id: number;
  organizationId: number;
  title: string;
  description: string;
  location: { lat: number; lng: number; address: string };
  scheduledDate: string;
  durationHours: number | null;
  maxParticipants: number | null;
  currentParticipants: number;
  status: string;
  createdByUserId: number;
  participantStatus: string | null;
  joinedAt: string | null;
  participationType: string;
}

interface MyDrivesListProps {
  userId: number;
  refreshTrigger?: number;
}

export const MyDrivesList = ({ userId, refreshTrigger }: MyDrivesListProps) => {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDrives();
  }, [userId, refreshTrigger]);

  const fetchDrives = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/drives?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setDrives(data);
      }
    } catch (error) {
      console.error("Failed to fetch drives:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500";
      case "ongoing":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const joinedDrives = drives.filter((d) => d.participationType === "joined");
  const createdDrives = drives.filter((d) => d.participationType === "created");

  const renderDriveCard = (drive: Drive) => (
    <Card key={drive.id}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{drive.title}</CardTitle>
          <div className="flex gap-2">
            <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
            {drive.participationType === "created" && <Badge variant="outline">Organizer</Badge>}
          </div>
        </div>
        <CardDescription className="line-clamp-2">{drive.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span>{formatDate(drive.scheduledDate)}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{drive.location.address}</span>
        </div>
        {drive.durationHours && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{drive.durationHours} hours</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>
            {drive.currentParticipants}
            {drive.maxParticipants ? `/${drive.maxParticipants}` : ""} participants
          </span>
        </div>
        {drive.participantStatus && (
          <div className="pt-2">
            <Badge variant="secondary">Status: {drive.participantStatus}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (drives.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You haven't joined or created any cleanup drives yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="all">All ({drives.length})</TabsTrigger>
        <TabsTrigger value="joined">Joined ({joinedDrives.length})</TabsTrigger>
        <TabsTrigger value="created">Created ({createdDrives.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drives.map(renderDriveCard)}
        </div>
      </TabsContent>

      <TabsContent value="joined" className="mt-6">
        {joinedDrives.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">You haven't joined any drives yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {joinedDrives.map(renderDriveCard)}
          </div>
        )}
      </TabsContent>

      <TabsContent value="created" className="mt-6">
        {createdDrives.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                You haven't created any drives yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {createdDrives.map(renderDriveCard)}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
