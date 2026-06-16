"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface CleanupDrive {
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
}

interface CleanupDrivesListProps {
  userId: number;
  refreshTrigger?: number;
}

export const CleanupDrivesList = ({ userId, refreshTrigger }: CleanupDrivesListProps) => {
  const [drives, setDrives] = useState<CleanupDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningDriveId, setJoiningDriveId] = useState<number | null>(null);
  const [userDriveIds, setUserDriveIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchDrives();
    fetchUserDrives();
  }, [refreshTrigger]);

  const fetchDrives = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cleanup-drives?status=upcoming&limit=50");
      if (res.ok) {
        const data = await res.json();
        setDrives(data);
      }
    } catch (error) {
      console.error("Failed to fetch drives:", error);
      toast.error("Failed to load cleanup drives");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDrives = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/drives?type=joined`);
      if (res.ok) {
        const data = await res.json();
        const ids = new Set(data.map((d: any) => d.id));
        setUserDriveIds(ids);
      }
    } catch (error) {
      console.error("Failed to fetch user drives:", error);
    }
  };

  const handleJoinDrive = async (driveId: number) => {
    setJoiningDriveId(driveId);
    try {
      const res = await fetch(`/api/cleanup-drives/${driveId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Successfully joined the cleanup drive!");
        fetchDrives();
        fetchUserDrives();
      } else {
        if (data.code === "ALREADY_REGISTERED") {
          toast.error("You've already joined this drive");
        } else if (data.code === "DRIVE_AT_CAPACITY") {
          toast.error("This drive is at maximum capacity");
        } else {
          toast.error(data.error || "Failed to join drive");
        }
      }
    } catch (error) {
      console.error("Failed to join drive:", error);
      toast.error("Failed to join drive");
    } finally {
      setJoiningDriveId(null);
    }
  };

  const handleLeaveDrive = async (driveId: number) => {
    setJoiningDriveId(driveId);
    try {
      const res = await fetch(`/api/cleanup-drives/${driveId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        toast.success("Successfully left the cleanup drive");
        fetchDrives();
        fetchUserDrives();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to leave drive");
      }
    } catch (error) {
      console.error("Failed to leave drive:", error);
      toast.error("Failed to leave drive");
    } finally {
      setJoiningDriveId(null);
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
          <p className="text-center text-muted-foreground">No upcoming cleanup drives available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {drives.map((drive) => {
        const isJoined = userDriveIds.has(drive.id);
        const isAtCapacity =
          drive.maxParticipants !== null && drive.currentParticipants >= drive.maxParticipants;

        return (
          <Card key={drive.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{drive.title}</CardTitle>
                <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
              </div>
              <CardDescription className="line-clamp-2">{drive.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
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
                {isAtCapacity && <Badge variant="secondary">Full</Badge>}
              </div>

              <div className="mt-auto pt-4">
                {isJoined ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleLeaveDrive(drive.id)}
                    disabled={joiningDriveId === drive.id}
                  >
                    {joiningDriveId === drive.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Leave Drive
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleJoinDrive(drive.id)}
                    disabled={joiningDriveId === drive.id || isAtCapacity}
                  >
                    {joiningDriveId === drive.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Join Drive
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
