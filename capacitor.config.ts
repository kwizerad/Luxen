import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.navo.lite',
  appName: 'Navo Lite',
  webDir: 'dist',
  
  // Server configuration - load from live deployed URL
  server: {
    // Replace with your actual deployed URL (e.g., https://your-app.vercel.app)
    url: process.env.NAVO_LIVE_URL || 'https://your-app.vercel.app',
    // Allow cleartext (HTTP) if needed for development
    cleartext: process.env.NODE_ENV === 'development',
    // Enable debugging in development
    androidScheme: 'https',
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
