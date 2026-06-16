"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthDialog } from "@/components/AuthDialog";
import { MapPin, Users, Award, TrendingUp, Recycle, Shield, BarChart3, Camera, Leaf } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [platformStats, setPlatformStats] = useState({
    totalReports: 0,
    activeMembers: 0,
    resolvedReports: 0,
    municipalities: 0,
    totalCarbonKg: 0,
  });

  useEffect(() => {
    // Fetch real-time platform stats
    const fetchPlatformStats = async () => {
      try {
        // Get all users
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const users = await usersRes.json();
          const citizens = users.filter((u: any) => u.role === "citizen");
          const municipalities = users.filter((u: any) => u.role === "municipality");
          
          // Calculate total carbon footprint from all citizens
          let totalCarbon = 0;
          for (const user of citizens) {
            const carbonRes = await fetch(`/api/users/${user.id}/carbon-stats?userId=${user.id}`);
            if (carbonRes.ok) {
              const carbonData = await carbonRes.json();
              totalCarbon += carbonData.totalCarbonFootprintKg || 0;
            }
          }
          
          // Get all reports
          const reportsRes = await fetch("/api/reports?limit=1000");
          if (reportsRes.ok) {
            const reports = await reportsRes.json();
            const resolvedReports = reports.filter((r: any) => r.status === "resolved");
            
            setPlatformStats({
              totalReports: reports.length,
              activeMembers: citizens.length,
              resolvedReports: resolvedReports.length,
              municipalities: municipalities.length,
              totalCarbonKg: totalCarbon,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch platform stats:", error);
      }
    };

    fetchPlatformStats();
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div 
        className="fixed inset-0 opacity-5 dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e4b94f1a-1738-4307-8356-aab0db62dbd2/generated_images/abstract-environmental-pattern-backgroun-4174ad59-20251116034817.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Header */}
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <Recycle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              CleanUp Connect
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push("/admin/login")}
              className="text-xs"
            >
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Button>
            <Button onClick={() => setAuthOpen(true)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-32 px-4 overflow-hidden">
        {/* Hero Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e4b94f1a-1738-4307-8356-aab0db62dbd2/generated_images/wide-panoramic-view-of-a-clean-modern-su-d8e08e11-20251116034816.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background z-[1]" />
        
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <Badge className="mb-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 px-4 py-2 text-sm font-semibold shadow-lg" variant="secondary">
            🌍 Civic Engagement Platform
          </Badge>
          <h2 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
            Make Your City{" "}
            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Cleaner
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Report waste with a photo, let AI classify it, and connect with your municipality for faster action.
            Join a community committed to sustainability.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => setAuthOpen(true)} className="text-lg px-10 py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-2xl hover:shadow-green-500/50 transition-all duration-300">
              Report Waste Now
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="text-lg px-10 py-6 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50 border-2 hover:bg-white/80 dark:hover:bg-gray-900/80 shadow-xl">
              Learn More
            </Button>
          </div>
          
          {/* Floating Stats Cards */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[
              { value: platformStats.totalReports.toString(), label: "Active Reports", gradient: "from-blue-500 to-cyan-500", icon: <BarChart3 className="h-5 w-5" /> },
              { value: platformStats.activeMembers.toString(), label: "Community Members", gradient: "from-green-500 to-emerald-500", icon: <Users className="h-5 w-5" /> },
              { value: platformStats.resolvedReports.toString(), label: "Reports Resolved", gradient: "from-purple-500 to-pink-500", icon: <Award className="h-5 w-5" /> },
              { value: platformStats.municipalities.toString(), label: "Municipalities", gradient: "from-orange-500 to-red-500", icon: <MapPin className="h-5 w-5" /> },
              { 
                value: platformStats.totalCarbonKg > 0 ? `${platformStats.totalCarbonKg.toFixed(0)}kg` : "0kg", 
                label: "CO₂e Avoided", 
                gradient: "from-emerald-500 to-teal-500", 
                icon: <Leaf className="h-5 w-5" /> 
              },
            ].map((stat, i) => (
              <div key={i} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 transition-transform duration-300">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center mb-3 mx-auto shadow-lg`}>
                  <div className="text-white">{stat.icon}</div>
                </div>
                <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-2 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to report, track, and resolve waste issues in your community
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Camera className="h-12 w-12" />,
                title: "Photo Reporting",
                description: "Upload photos of waste with location data. AI automatically classifies waste type and severity.",
                gradient: "from-green-500 to-emerald-600"
              },
              {
                icon: <MapPin className="h-12 w-12" />,
                title: "Geolocation Integration",
                description: "Reports are automatically routed to the nearest municipality based on GPS coordinates.",
                gradient: "from-blue-500 to-cyan-600"
              },
              {
                icon: <Shield className="h-12 w-12" />,
                title: "Real-time Status Tracking",
                description: "Track your report from submission to resolution with live status updates.",
                gradient: "from-purple-500 to-pink-600"
              },
              {
                icon: <Users className="h-12 w-12" />,
                title: "Community Engagement",
                description: "Join a community of eco-warriors working together for a cleaner environment.",
                gradient: "from-orange-500 to-red-600"
              },
              {
                icon: <Award className="h-12 w-12" />,
                title: "Gamification & Rewards",
                description: "Earn points and badges for your contributions. Compete on the leaderboard.",
                gradient: "from-yellow-500 to-orange-600"
              },
              {
                icon: <BarChart3 className="h-12 w-12" />,
                title: "Municipality Dashboard",
                description: "Municipal teams get map-based visualization, task assignment, and priority filtering.",
                gradient: "from-red-500 to-pink-600"
              }
            ].map((feature, i) => (
              <Card key={i} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <CardHeader>
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} w-fit mb-4 shadow-lg`}>
                    <div className="text-white">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e4b94f1a-1738-4307-8356-aab0db62dbd2/generated_images/diverse-group-of-happy-volunteers-in-gre-50bf3c30-20251116034816.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 z-[1]" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h3>
            <p className="text-muted-foreground text-lg">Simple steps to make a difference</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Spot Waste", desc: "See garbage or waste in your area that needs attention" },
              { step: "2", title: "Take a Photo", desc: "Upload a photo with location. AI classifies waste type automatically" },
              { step: "3", title: "Municipality Action", desc: "Report is sent to the nearest municipality for assignment and action" },
              { step: "4", title: "Track & Earn", desc: "Monitor progress and earn points for your civic contribution" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-2xl hover:scale-110 transition-transform duration-300">
                  {item.step}
                </div>
                <h4 className="font-bold text-lg mb-3">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: "url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e4b94f1a-1738-4307-8356-aab0db62dbd2/generated_images/beautiful-nature-scene-with-clean-flowin-2eb4d5df-20251116034817.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-[1]" />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center mb-12">
            <h3 className="text-4xl md:text-5xl font-bold mb-4">Our Mission</h3>
          </div>
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
            <CardContent className="pt-8 pb-8 px-8">
              <p className="text-lg mb-6 leading-relaxed">
                CleanUp Connect bridges the gap between citizens and municipalities to create cleaner, more sustainable cities. 
                We believe that every citizen has the power to make a difference, and every municipality deserves efficient tools 
                to manage waste effectively.
              </p>
              <p className="text-lg mb-6 leading-relaxed">
                Our AI-powered platform automatically classifies waste types and severity levels, helping municipalities prioritize 
                and respond faster. By gamifying civic engagement, we encourage continuous participation and build stronger communities.
              </p>
              <p className="text-lg leading-relaxed">
                Together, we're not just reporting waste—we're building a culture of sustainability, accountability, and community action. 
                Join us in making your city cleaner, one report at a time.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 z-0" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)"
        }} />
        
        <div className="container mx-auto max-w-4xl text-center relative z-10 text-white">
          <h3 className="text-4xl md:text-5xl font-bold mb-6">Ready to Make a Difference?</h3>
          <p className="text-xl md:text-2xl mb-10 opacity-95 leading-relaxed">
            Join thousands of citizens and municipalities working together for cleaner cities
          </p>
          <Button size="lg" variant="secondary" onClick={() => setAuthOpen(true)} className="text-lg px-10 py-6 bg-white text-green-700 hover:bg-gray-100 shadow-2xl hover:scale-105 transition-all duration-300">
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <Recycle className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              CleanUp Connect
            </span>
          </div>
          <p className="text-base mb-3">
            Building sustainable communities through civic engagement and technology
          </p>
          <p className="text-sm">© 2024 CleanUp Connect. All rights reserved.</p>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}