"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, MapPin, Clock, TrendingUp, Users, AlertCircle, Home } from "lucide-react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useBrandingConfig } from "@/lib/branding-config";
import Link from "next/link";

export default function DriverDashboard() {
  const { config } = useBrandingConfig();
  
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
      
      <div className="container mx-auto px-4 py-4 md:py-8 pt-16 md:pt-8 pb-24 md:pb-8">
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
                <Badge variant="default" className="bg-green-500">Available</Badge>
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
              <Button className="w-full mt-4">
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Today's Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Today's Stats
              </CardTitle>
              <CardDescription>Your daily performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">12</div>
                <div className="text-sm text-muted-foreground">Trips Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">4.8</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">RWF 45,000</div>
                <div className="text-sm text-muted-foreground">Today's Earnings</div>
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
                {[1, 2, 3].map((request) => (
                  <div key={request} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Request #{request}</div>
                        <div className="text-sm text-muted-foreground">From Kigali to Nyabugogo</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">5 min</Badge>
                      <Button size="sm">Accept</Button>
                    </div>
                  </div>
                ))}
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
              <CardDescription>Important notifications and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">High Demand Area</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Increased demand detected in Nyamirambo area
                </p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Shift Reminder</span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">
                  Your evening shift starts in 2 hours
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Car className="h-6 w-6 mb-2" />
                  <span className="text-sm">Start Trip</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <MapPin className="h-6 w-6 mb-2" />
                  <span className="text-sm">Update Location</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">View History</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span className="text-sm">View Stats</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileBottomNav />
    </>
  );
}
