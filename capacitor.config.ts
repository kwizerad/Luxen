import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.navo.lite',
  appName: 'Navo Lite',
  webDir: 'dist',
  
  // Server configuration for Capacitor
  // IMPORTANT: For mobile app to work, you need to either:
  // 1. Set NEXT_PUBLIC_LIVE_URL to your deployed backend URL (Vercel/Netlify)
  // 2. Or use local dev server with --host flag for mobile testing
  server: {
    // Use deployed URL for production mobile app, or local IP for dev
    // Example local dev: 'http://192.168.1.100:3000' (your computer's IP)
    url: process.env.NEXT_PUBLIC_LIVE_URL || '',
    // Allow cleartext HTTP for local development
    cleartext: true,
    androidScheme: 'https',
    // Enable capacitor-native http for API calls (allows calling external APIs)
    allowNavigation: ['*'],
  },

  // Android specific configuration
  android: {
    // Allow mixed content (HTTP/HTTPS) if needed for specific use cases
    allowMixedContent: false,
    // Capture back button presses for in-app navigation
    captureInput: true,
    // Background color for the webview during load
    backgroundColor: '#3b82f6',
  },

  // Plugins configuration
  plugins: {
    // Splash screen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#3b82f6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Status bar configuration
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#3b82f6',
      overlaysWebView: false,
    },
    // Keyboard configuration
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
  },

  // Cordova preferences (for compatibility)
  cordova: {
    preferences: {
      // Disable overscroll for native feel
      DisallowOverscroll: 'true',
      // Enable web view debugging in development
      EnableWebViewDebugging: process.env.NODE_ENV === 'development' ? 'true' : 'false',
      // Hide keyboard form accessory bar
      HideKeyboardFormAccessoryBar: 'true',
      // Allow inline media playback
      AllowInlineMediaPlayback: 'true',
      // Media playback requires user action
      MediaPlaybackRequiresUserAction: 'false',
      // Suppresses 3D touch menu
      Suppresses3DTouchGesture: 'true',
    },
  },

  // Logging behavior
  loggingBehavior: process.env.NODE_ENV === 'development' ? 'debug' : 'production',
};

export default config;
