export type DeviceType =
  | "desktop"
  | "mobile"
  | "tablet"
  | "smarttv"
  | "wearable"
  | "bot"
  | "unknown";

export interface BrowserDetails {
  name: string;
  version: string;
  major: string;
}

export interface OSDetails {
  name: string;
  version: string;
}

export interface GeoDetails {
  ip: string;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

export interface ClientHints {
  platform: string | null;
  platformVersion: string | null;
  model: string | null;
  mobile: boolean | null;
  bitness: string | null;
}

export interface ServerVisitorDevicePayload {
  requestId: string;
  timestamp: string;
  path: string;
  method: string;
  ip: string;
  isBot: boolean;
  deviceType: DeviceType;
  deviceName?: string | null;
  deviceModel: string | null;
  deviceVendor: string | null;
  browser: BrowserDetails;
  os: OSDetails;
  cpuArchitecture: string | null;
  geo: GeoDetails;
  clientHints: ClientHints;
  referrer: string | null;
  userAgent: string;
}

export interface VisitorLogDbRecord {
  id?: string;
  request_id: string;
  ip_address: string;
  device_type: DeviceType;
  device_name?: string | null;
  device_model: string | null;
  device_vendor: string | null;
  browser_name: string;
  browser_version: string;
  os_name: string;
  os_version: string;
  cpu_architecture: string | null;
  is_bot: boolean;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  path: string;
  method: string;
  referrer: string | null;
  user_agent: string;
  created_at?: string;
}
