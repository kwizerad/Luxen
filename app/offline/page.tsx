"use client";

import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            You are offline
          </h1>
          <p className="text-muted-foreground text-lg">
            Navo Lite is unable to connect to the internet. Some features may be unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Go Home
            </Button>
          </Link>
        </div>

        <div className="pt-6 text-sm text-muted-foreground">
          <p>
            Some cached content may still be available. Check your connection and try again.
          </p>
        </div>
      </div>
    </div>
  );
}
