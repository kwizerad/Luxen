"use client";

<<<<<<< HEAD


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

=======
import { useEffect, useState } from "react";
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
      <PWAInstallPrompt />
    </>
  );
}
>>>>>>> f0bd8b7b5e571701abc6f1ecf61f9c53eb35cfe6
