export type DeviceType = "Desktop" | "Laptop" | "Tablet" | "Mobile" | "Unknown";
export type LoginResult = "success" | "failed" | "mfa_required" | "suspicious";
export type SecurityEventType =
  | "new_device"
  | "new_country"
  | "new_region"
  | "multiple_countries"
  | "failed_login"
  | "suspicious_login"
  | "vpn_proxy"
  | "password_changed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "session_revoked"
  | "trusted_device_removed";
export type Severity = "safe" | "warning" | "critical";

export interface ParsedDeviceInfo {
  fingerprint: string;
  deviceType: DeviceType;
  deviceName?: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  cpuArchitecture?: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  language: string;
  timezone: string;
  touchSupport: boolean;
  cookiesEnabled: boolean;
  onlineStatus: boolean;
}

export interface GeoLocationInfo {
  ip: string;
  ipVersion?: "IPv4" | "IPv6";
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface UserDevice {
  id: number;
  user_id: string;
  fingerprint: string;
  device_type?: string;
  device_name?: string;
  browser?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  cpu_architecture?: string;
  screen_resolution?: string;
  viewport_size?: string;
  device_pixel_ratio?: number;
  language?: string;
  timezone?: string;
  touch_support?: boolean;
  cookies_enabled?: boolean;
  is_trusted?: boolean;
  first_seen?: string;
  last_seen?: string;
  last_seen_ip?: string;
  first_seen_ip?: string;
  ip_version?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  ip_history?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface LoginHistoryEntry {
  id: number;
  user_id: string;
  device_id?: number;
  ip_address?: string;
  ip_version?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  auth_provider?: string;
  login_result: LoginResult;
  failure_reason?: string;
  session_id?: string;
  created_at: string;
  user_devices?: UserDevice | null;
}

export interface SecurityEvent {
  id: number;
  user_id: string;
  device_id?: number;
  event_type: SecurityEventType;
  severity: Severity;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface DeviceAnalytics {
  primaryDevice?: string;
  mostUsedBrowser?: string;
  mostUsedOS?: string;
  desktopPercentage: number;
  mobilePercentage: number;
  tabletPercentage: number;
  averageSessionDurationSeconds?: number;
  totalDevices: number;
  totalLogins: number;
  weeklyUsage: { label: string; count: number }[];
  monthlyUsage: { label: string; count: number }[];
}

export interface BrowserDistributionEntry {
  name: string;
  count: number;
  color?: string;
}

export interface OSDistributionEntry {
  name: string;
  count: number;
  color?: string;
}

export interface SecurityRecommendation {
  id: string;
  severity: Severity;
  message: string;
  actionLabel?: string;
}

export interface SecurityAnalysis {
  activeSessions: number;
  multipleCountriesDetected: boolean;
  newDeviceDetected: boolean;
  newCountryDetected: boolean;
  newRegionDetected: boolean;
  failedLoginAttempts: number;
  suspiciousLoginAttempts: number;
  vpnProxyDetected: boolean;
  trustedDeviceCount: number;
  securityScore: number;
  recommendations: SecurityRecommendation[];
}

export interface UserAuthSecurityInfo {
  mfaEnabled: boolean;
  passwordLastChangedAt?: string;
  email?: string;
  phone?: string;
}
