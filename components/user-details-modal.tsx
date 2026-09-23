"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Calendar, Shield, Hash, CheckCircle, XCircle, MapPin, Cake, FileText } from "lucide-react";
import { UserFullActionReport } from "@/components/admin/user-full-action-report";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface UserDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function UserDetailsModal({ open, onOpenChange, user }: UserDetailsModalProps) {
  if (!user) return null;

  const getInitials = (user: any) => {
    const name = user.user_metadata?.full_name || user.user_metadata?.username || user.email;
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl">
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20 shrink-0">
          <DialogTitle>User Details & Audit Dossier</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border shadow-xs">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} />
              <AvatarFallback className="text-2xl font-bold">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold truncate">{user.user_metadata?.full_name || user.user_metadata?.username || "Unknown"}</h3>
              <p className="text-muted-foreground flex items-center gap-2 mt-1 text-xs sm:text-sm">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant={user.banned ? "destructive" : "default"}>
                  {user.banned ? <XCircle className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                  {user.banned ? "Banned" : "Active"}
                </Badge>
                <Badge variant="outline">
                  <Shield className="h-3 w-3 mr-1" />
                  {user.user_metadata?.role || "Student"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Tabs for Profile vs Comprehensive Action Dossier */}
          <Tabs defaultValue="actions" className="space-y-4">
            <TabsList className="w-full justify-start rounded-xl h-10 p-1 bg-muted/50 gap-1">
              <TabsTrigger value="actions" className="gap-1.5 text-xs sm:text-sm rounded-lg px-3 font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                <span>Full Action Dossier & History</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-1.5 text-xs sm:text-sm rounded-lg px-3 font-medium">
                <User className="h-4 w-4" />
                <span>Account & Demographics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-4 m-0">
              <UserFullActionReport userId={user.id} nationalId={user.user_metadata?.national_id} userFallback={user} />
            </TabsContent>

            <TabsContent value="details" className="space-y-6 m-0">
              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Account Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono text-xs">{user.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Username:</span>
                      <span>{user.user_metadata?.username || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Joined:</span>
                      <span>{formatDate(user.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Sign In:</span>
                      <span>{formatDate(user.last_sign_in_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Personal Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">First Name:</span>
                      <span>{user.user_metadata?.first_name || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Name:</span>
                      <span>{user.user_metadata?.last_name || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Cake className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Birthdate:</span>
                      <span>{formatDate(user.user_metadata?.birthdate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Nationality:</span>
                      <span>{user.user_metadata?.nationality || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Gender:</span>
                      <span>{user.user_metadata?.gender || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {user.user_metadata && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Raw Metadata</h4>
                  <div className="bg-muted/50 p-4 rounded-xl border">
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(user.user_metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
