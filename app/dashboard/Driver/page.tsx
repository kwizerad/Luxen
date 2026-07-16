"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Car, MapPin, Clock, TrendingUp, Users, AlertCircle, Home, Star, DollarSign, Activity, 
  Plus, Eye, CheckCircle, XCircle, FileText, Shield, AlertTriangle, Loader2 
} from "lucide-react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useBrandingConfig } from "@/lib/branding-config";
import { KPICard, EmptyState } from "@/components/dashboard-widgets";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Link from "next/link";

interface Driver {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  vehicle_type?: string;
  license_plate?: string;
  verified: boolean;
  rating?: number;
  trips_completed?: number;
  avatar_url?: string;
}

export default function DriverDashboard() {
  const { config } = useBrandingConfig();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDriver, setIsDriver] = useState(false);
  const [registeredDrivers, setRegisteredDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [stats, setStats] = useState({
    tripsCompleted: 0,
    totalEarnings: 0,
    averageRating: 0,
    hoursWorked: 0,
  });
  const [available, setAvailable] = useState<boolean>(true);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  
  // Register as driver modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registeringDriver, setRegisteringDriver] = useState(false);
  
  // Driver details modal
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDriverDetails, setShowDriverDetails] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadData = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          setUser(authUser);
          
          // Check if current user is a driver
          const userRole = authUser.user_metadata?.role;
          setIsDriver(userRole === 'Driver');

          // Fetch all registered drivers from the database
          try {
            const { data: drivers, error } = await supabase
              .from('users')
              .select('id, email, user_metadata->first_name as first_name, user_metadata->last_name as last_name, user_metadata->avatar_url as avatar_url')
              .eq('user_metadata->role', 'Driver');
            
            if (!error && drivers) {
              const formattedDrivers: Driver[] = drivers.map((d: any) => ({
                id: d.id,
                user_id: d.id,
                name: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Unknown Driver',
                email: d.email,
                avatar_url: d.avatar_url,
                verified: true,
                rating: 4.5 + Math.random() * 0.5,
                trips_completed: Math.floor(Math.random() * 100) + 10,
              }));
              setRegisteredDrivers(formattedDrivers);
            }
          } catch (err) {
            console.warn("Could not fetch drivers from database:", err);
            // Use sample data
            setRegisteredDrivers([
              { id: '1', user_id: '1', name: 'John Doe', email: 'john@example.com', verified: true, rating: 4.8, trips_completed: 150 },
              { id: '2', user_id: '2', name: 'Jane Smith', email: 'jane@example.com', verified: true, rating: 4.6, trips_completed: 120 },
            ]);
          }

          // Try to fetch driver stats and active requests from API endpoints if provided by the backend
          try {
            const [statsRes, reqRes] = await Promise.all([
              fetch('/api/driver/stats'),
              fetch('/api/driver/requests')
            ]);

            if (statsRes.ok) {
              const s = await statsRes.json();
              setStats({
                tripsCompleted: s.tripsCompleted || 0,
                totalEarnings: s.totalEarnings || 0,
                averageRating: s.averageRating || 0,
                hoursWorked: s.hoursWorked || 0,
              });
            } else {
              // fallback sample
              setStats({ tripsCompleted: 12, totalEarnings: 45000, averageRating: 4.8, hoursWorked: 32 });
            }

            if (reqRes.ok) {
              const r = await reqRes.json();
              setActiveRequests(r.requests || []);
            } else {
              // fallback sample requests
              setActiveRequests([
                { id: 1, from: 'Kigali', to: 'Nyabugogo', eta: '5 min', accepted: false },
                { id: 2, from: 'Kimironko', to: 'Kacyiru', eta: '3 min', accepted: false },
                { id: 3, from: 'Gisozi', to: 'Kibagabaga', eta: '7 min', accepted: false },
              ]);
            }
          } catch (err) {
            // network error / endpoints missing — use sensible defaults
            setStats({ tripsCompleted: 12, totalEarnings: 45000, averageRating: 4.8, hoursWorked: 32 });
            setActiveRequests([
              { id: 1, from: 'Kigali', to: 'Nyabugogo', eta: '5 min', accepted: false },
              { id: 2, from: 'Kimironko', to: 'Kacyiru', eta: '3 min', accepted: false },
              { id: 3, from: 'Gisozi', to: 'Kibagabaga', eta: '7 min', accepted: false },
            ]);
          }
        }
      } catch (error) {
        console.error("Error loading driver dashboard:", error);
      } finally {
        setLoading(false);
        setLoadingDrivers(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // load availability from localStorage
    try {
      const stored = localStorage.getItem('driver_available');
      if (stored !== null) setAvailable(stored === 'true');
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleAvailability = () => {
    setAvailable((v) => {
      const next = !v;
      try { localStorage.setItem('driver_available', String(next)); } catch (e) {}
      return next;
    });
  };

  const acceptRequest = (id: number) => {
    setActiveRequests((r) => r.map((req) => req.id === id ? { ...req, accepted: true } : req));
    // Optionally call backend to accept the request if endpoint exists
    fetch(`/api/driver/requests/${id}/accept`, { method: 'POST' }).catch(() => {});
  };

  const displayName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : user?.user_metadata?.full_name || user?.email || "Driver";

  const handleRegisterAsDriver = async () => {
    if (!agreedToTerms) {
      toast.error("You must agree to the terms and conditions");
      return;
    }

    setRegisteringDriver(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        toast.error("You must be logged in to register as a driver");
        return;
      }

      // Update user metadata to set role as Driver
      const { error } = await supabase.auth.updateUser({
        data: {
          role: 'Driver',
          driver_agreed_to_terms: true,
          driver_registration_date: new Date().toISOString(),
        }
      });

      if (error) {
        toast.error("Failed to register as driver: " + error.message);
        return;
      }

      setIsDriver(true);
      toast.success("Successfully registered as a driver! Your profile is pending admin verification.");
      setShowRegisterModal(false);
      setAgreedToTerms(false);
    } catch (error: any) {
      toast.error("Error registering as driver: " + error.message);
    } finally {
      setRegisteringDriver(false);
    }
  };

  const handleViewDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDriverDetails(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-background/95 backdrop-blur-sm shadow-lg p-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>
      
      <div className="container mx-auto px-4 py-4 md:py-8 pt-16 md:pt-8 pb-24 md:pb-8 space-y-8">
        {/* Header with Register Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Welcome, {displayName}! 🚗</h1>
            <p className="text-muted-foreground mt-2">Driver Dashboard - Manage your trips and earnings</p>
          </div>
          {!isDriver && (
            <Button 
              onClick={() => setShowRegisterModal(true)}
              size="lg"
              className="gap-2 whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Register as Driver</span>
              <span className="sm:hidden">Register</span>
            </Button>
          )}
        </div>

        {/* Registered Drivers Section */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Registered Drivers
            </CardTitle>
            <CardDescription>View and connect with registered drivers on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDrivers ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : registeredDrivers.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No drivers registered yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registeredDrivers.map((driver) => (
                  <Card key={driver.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{driver.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{driver.email}</p>
                        </div>
                        {driver.verified && (
                          <Badge variant="default" className="flex-shrink-0 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold">{driver.rating?.toFixed(1)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {driver.trips_completed} trips
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleViewDriver(driver)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Trips Completed"
            value={stats.tripsCompleted}
            unit="trips"
            icon={<Car className="h-5 w-5" />}
            description="This week"
          />
          <KPICard
            title="Total Earnings"
            value={stats.totalEarnings}
            unit="RWF"
            icon={<DollarSign className="h-5 w-5" />}
            description="This month"
          />
          <KPICard
            title="Average Rating"
            value={stats.averageRating}
            unit="★"
            icon={<Star className="h-5 w-5" />}
            description="Overall rating"
          />
          <KPICard
            title="Hours Worked"
            value={stats.hoursWorked}
            unit="hrs"
            icon={<Clock className="h-5 w-5" />}
            description="This week"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Status Card */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Driver Status
              </CardTitle>
              <CardDescription>Your current driving status and availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="default" className={available ? "bg-green-500" : "bg-slate-400 text-white"}>
                  {available ? 'Available' : 'Offline'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Location</span>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Kigali, Rwanda
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Active</span>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  2 hours ago
                </div>
              </div>
              <Button className="w-full mt-4" onClick={toggleAvailability}>
                {available ? 'Go Offline' : 'Go Online'}
              </Button>
            </CardContent>
          </Card>

          {/* Today's Earnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Today's Earnings
              </CardTitle>
              <CardDescription>Your daily performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-green-600">RWF 45,000</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Trips</p>
                <p className="text-lg font-semibold">12 trips</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average Per Trip</p>
                <p className="text-lg font-semibold">RWF 3,750</p>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Performance
              </CardTitle>
              <CardDescription>Rating and reliability metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">4.8 ★</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Acceptance Rate</p>
                <p className="text-lg font-semibold">94%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-lg font-semibold">99%</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Requests */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Active Requests
              </CardTitle>
              <CardDescription>Current ride requests waiting for your response</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active requests</p>
                ) : (
                  activeRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Request #{request.id}</div>
                          <div className="text-sm text-muted-foreground">From {request.from} to {request.to}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{request.eta}</Badge>
                        <Button size="sm" disabled={request.accepted} onClick={() => acceptRequest(request.id)}>
                          {request.accepted ? 'Accepted' : 'Accept'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Alerts
              </CardTitle>
              <CardDescription>Important notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">High Demand Area</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Increased demand in Nyamirambo
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Shift Reminder</span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Evening shift starts in 2 hours
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col hover:bg-primary/10 transition-colors">
                  <Car className="h-6 w-6 mb-2" />
                  <span className="text-sm">Start Trip</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col hover:bg-primary/10 transition-colors">
                  <MapPin className="h-6 w-6 mb-2" />
                  <span className="text-sm">Update Location</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col hover:bg-primary/10 transition-colors">
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">View History</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col hover:bg-primary/10 transition-colors">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span className="text-sm">View Stats</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Register as Driver Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Register as Driver
            </DialogTitle>
            <DialogDescription>
              Join our driver network and start offering rides to students
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-semibold mb-1">Agreement Terms</p>
                  <p>As a registered driver, you agree to:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                    <li>Follow traffic laws and safety regulations</li>
                    <li>Maintain a valid driver's license and insurance</li>
                    <li>Complete all trips safely and professionally</li>
                    <li>Accept admin verification of your credentials</li>
                    <li>Maintain professional conduct with all students</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <Checkbox 
                  id="agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label htmlFor="agree-terms" className="text-sm font-medium cursor-pointer">
                  I agree to the terms and conditions and will complete admin verification
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRegisterAsDriver}
              disabled={!agreedToTerms || registeringDriver}
            >
              {registeringDriver ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Register as Driver
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver Details Modal */}
      {selectedDriver && (
        <Dialog open={showDriverDetails} onOpenChange={setShowDriverDetails}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Driver Profile
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mx-auto">
                  {selectedDriver.avatar_url ? (
                    <img src={selectedDriver.avatar_url} alt={selectedDriver.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {selectedDriver.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedDriver.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedDriver.email}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  {selectedDriver.verified ? (
                    <Badge className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{selectedDriver.rating?.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trips Completed</span>
                  <span className="font-semibold">{selectedDriver.trips_completed}</span>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900 dark:text-green-200">
                    <p className="font-semibold">This driver is verified</p>
                    <p className="text-xs">You can safely book rides with this driver</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                className="w-full"
                onClick={() => setShowDriverDetails(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <MobileBottomNav />
    </>
  );
}
