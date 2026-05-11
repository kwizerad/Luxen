"use client";



import { useEffect, useState } from "react";

import { GoogleOneTap } from "./google-one-tap";

import { PWAInstallPrompt } from "./pwa-install-prompt";



export function ClientComponents() {

  const [mounted, setMounted] = useState(false);



  useEffect(() => {

    setMounted(true);

  }, []);



  // Don't render anything during SSR to avoid hydration mismatch

  if (!mounted) {

    return null;

  }



  return (

    <>

      <GoogleOneTap />

      <PWAInstallPrompt />

    </>

  );

}

