"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearUser, setUser as saveUserToStorage } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Recycle, LogOut, Plus, TrendingUp, Award, MapPin, Users, Calendar } from "lucide-react";
import { ReportForm } from "@/components/ReportForm";
import { ReportsList } from "@/components/ReportsList";
import { UserStats } from "@/components/UserStats";
import { Leaderboard } from "@/components/Leaderboard";
import { CleanupDrivesList } from "@/components/CleanupDrivesList";
import { CreateDriveForm } from "@/components/CreateDriveForm";
import { MyDrivesList } from "@/components/MyDrivesList";

export default function CitizenDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("reports");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    if (currentUser.role !== "citizen") {
      router.push("/municipality");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleReportSuccess = async () => {
    // Fetch updated user data to get new points
    try {
      const userRes = await fetch(`/api/auth/me?id=${user.id}`);
      const userData = await userRes.json();
      
      // Update user state with new points
      const updatedUser = { ...user, points: userData.points };
      setUser(updatedUser);
      saveUserToStorage(updatedUser); // Save to localStorage
      
      // Trigger refresh of stats and reports
      setRefreshTrigger(prev => prev + 1);
      setActiveTab("reports");
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const handleDriveSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab("my-drives");
  };

  const handleLogout = () => {
    clearUser();
    router.push("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-emerald-50/80 to-teal-50/80 relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-30">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e4b94f1a-1738-4307-8356-aab0db62dbd2/generated_images/abstract-environmental-pattern-with-soft-1cb3ad1b-20251116034524.jpg')",
          }}
        />
      </div>

      {/* Header with Glassmorphism - Responsive */}
      <header className="border-b backdrop-blur-xl bg-white/70 shadow-sm sticky top-0 z-50 relative">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-1.5 rounded-lg shadow-lg">
                <Recycle className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                CleanUp
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right bg-white/50 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-100">
                <p className="text-xs font-semibold text-gray-800 truncate max-w-[80px]">{user.name}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  <Award className="h-3 w-3" />
                  {user.points || 0}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="bg-white/80 backdrop-blur-sm hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 px-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-xl shadow-lg">
                <Recycle className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                CleanUp Connect
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-green-100">
                <p className="font-semibold text-gray-800">{user.name}</p>
                <p className="text-sm text-green-600 flex items-center gap-1 font-medium">
                  <Award className="h-3 w-3" />
                  {user.points || 0} points
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="bg-white/80 backdrop-blur-sm hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Beautiful Background - Responsive */}
      <div className="relative z-10">
        <div 
          className="relative h-40 sm:h-52 md:h-64 bg-cover bg-center overflow-hidden"
          style={{
            backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e4b94f1a-1738-4307-8356-aab0db62dbd2/generated_images/wide-panoramic-view-of-a-clean-sustainab-17f6608e-20251116034528.jpg')",
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/70 via-emerald-800/60 to-teal-900/70" />
          
          {/* Content - Responsive */}
          <div className="relative container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12 h-full flex flex-col justify-center">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-2 md:mb-3 drop-shadow-lg">
              Welcome back, {user.name}! 🌱
            </h2>
            <p className="text-white/90 text-sm sm:text-base md:text-lg max-w-2xl drop-shadow-md">
              Make a difference in your community by reporting waste and joining cleanup drives
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-7xl relative z-10">
        {/* Stats Cards - Responsive margin */}
        <div className="transform -mt-12 sm:-mt-16 md:-mt-20 mb-4 sm:mb-6 md:mb-8">
          <UserStats userId={user.id} refreshTrigger={refreshTrigger} />
        </div>

        {/* Tabs with Enhanced Styling - Responsive */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 sm:mt-6 md:mt-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-1 sm:p-2 shadow-lg border border-white/50">
            {/* Mobile: Scrollable tabs */}
            <TabsList className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 w-full bg-gradient-to-r from-green-50/50 to-emerald-50/50 h-auto gap-1">
              <TabsTrigger 
                value="reports"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm px-2 py-2 flex items-center justify-center gap-1"
              >
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">My Reports</span>
                <span className="sm:hidden">Reports</span>
              </TabsTrigger>
              <TabsTrigger 
                value="new"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm px-2 py-2 flex items-center justify-center gap-1"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">New Report</span>
                <span className="sm:hidden">New</span>
              </TabsTrigger>
              <TabsTrigger 
                value="leaderboard"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm px-2 py-2 flex items-center justify-center gap-1"
              >
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
                <span className="sm:hidden">Board</span>
              </TabsTrigger>
              <TabsTrigger 
                value="drives"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm px-2 py-2 flex items-center justify-center gap-1"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Cleanup Drives</span>
                <span className="sm:hidden">Drives</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create-drive"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm px-2 py-2 flex items-center justify-center gap-1"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Organize Drive</span>
                <span className="sm:hidden">Organize</span>
              </TabsTrigger>
              <TabsTrigger 
                value="my-drives"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm px-2 py-2 flex items-center justify-center gap-1"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">My Drives</span>
                <span className="sm:hidden">Mine</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="reports" className="mt-4 sm:mt-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <ReportsList userId={user.id} refreshTrigger={refreshTrigger} />
            </div>
          </TabsContent>

          <TabsContent value="new" className="mt-4 sm:mt-6">
            <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/50">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-green-800">Report Waste</CardTitle>
                <CardDescription>
                  Upload a photo, add location details, and help keep your community clean
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ReportForm userId={user.id} onSuccess={handleReportSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4 sm:mt-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <Leaderboard currentUserId={user.id} />
            </div>
          </TabsContent>

          <TabsContent value="drives" className="mt-4 sm:mt-6">
            <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/50 relative overflow-hidden">
              {/* Background decoration */}
              <div 
                className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e4b94f1a-1738-4307-8356-aab0db62dbd2/generated_images/community-volunteers-working-together-in-87f8cae0-20251116034528.jpg')",
                }}
              />
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 relative z-10">
                <CardTitle className="text-green-800">Join Cleanup Drives</CardTitle>
                <CardDescription>
                  Browse and join community cleanup drives organized by NGOs, schools, and citizen groups
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                <CleanupDrivesList userId={user.id} refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-drive" className="mt-4 sm:mt-6">
            <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/50">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-green-800">Organize Cleanup Drive</CardTitle>
                <CardDescription>
                  Create and organize a cleanup drive for your community
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <CreateDriveForm userId={user.id} onSuccess={handleDriveSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-drives" className="mt-4 sm:mt-6">
            <Card className="bg-white/80 backdrop-blur-xl shadow-xl border-white/50">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-green-800">My Cleanup Drives</CardTitle>
                <CardDescription>
                  View all cleanup drives you've joined or organized
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <MyDrivesList userId={user.id} refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}