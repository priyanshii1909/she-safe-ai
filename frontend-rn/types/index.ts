// SHE SAFE AI — TypeScript Types
// These types mirror the backend Pydantic schemas exactly.

// ── Enums ────────────────────────────────────────────────────────────────────

export type ConcernLevel = 'support' | 'concerning' | 'immediate';

export type ContactType =
  | 'parent'
  | 'guardian'
  | 'teacher'
  | 'relative'
  | 'counselor'
  | 'other';

export type SessionType = 'journey' | 'sos' | 'general';

export type MapPointType =
  | 'help_point'
  | 'hospital'
  | 'school'
  | 'police'
  | 'safe_house'
  | 'public_building';

// ── AI Models ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RecommendedAction {
  action_type: string;
  label: string;
  description: string;
}

export interface AIAnalyzeResponse {
  concern_level: ConcernLevel;
  category: string;
  summary: string;
  response_text: string;
  explanation: string;
  recommended_actions: RecommendedAction[];
  show_sos: boolean;
  show_location: boolean;
  show_safety_plan: boolean;
  conversation_id: string;
  disclaimer: string;
}

// ── Contact Models ──────────────────────────────────────────────────────────

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  contact_type: ContactType;
  can_receive_sos: boolean;
  can_receive_location: boolean;
}

// ── SOS Models ──────────────────────────────────────────────────────────────

export interface SOSResponse {
  sos_id: string;
  status: string;
  timestamp: string;
  message: string;
  location_shared: boolean;
  contacts_notified: string[];
}

// ── Journey Models ──────────────────────────────────────────────────────────

export interface JourneyResponse {
  journey_id: string;
  destination: string;
  expected_arrival: string;
  status: string;
  started_at: string;
}

export interface JourneyCheckInResponse {
  journey_id: string;
  checked_in: boolean;
  message: string;
}

// ── Map Models ──────────────────────────────────────────────────────────────

export interface MapPoint {
  id: string;
  name: string;
  point_type: MapPointType;
  lat: number;
  lng: number;
  address?: string;
  hours?: string;
  phone?: string;
  verified: boolean;
  reliability: string;
}

// ── Route Models ────────────────────────────────────────────────────────────

export interface RouteOption {
  route_id: string;
  label: string;
  distance_km: number;
  duration_min: number;
  safety_score: number;
  safety_factors: string[];
  help_points_nearby: number;
  warnings: string[];
  recommended: boolean;
}

export interface SafeRouteResponse {
  routes: RouteOption[];
  disclaimer: string;
}

// ── Safety Plan Models ──────────────────────────────────────────────────────

export interface SafetyPlanSection {
  title: string;
  content: string;
}

export interface SafetyPlan {
  plan_id: string;
  situation_summary: string;
  sections: SafetyPlanSection[];
  created_at: string;
}

// ── Help Me Say It Models ───────────────────────────────────────────────────

export interface HelpMeSayItResponse {
  conversation_starter: string;
  tips: string[];
}

// ── Saved Places Models ─────────────────────────────────────────────────────

export type SavedPlaceCategory = 'home' | 'school' | 'work' | 'trusted' | 'other';

export interface SavedPlace {
  id: string;
  label: string;
  category: SavedPlaceCategory;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  created_at: string;
}

// ── Location Models ─────────────────────────────────────────────────────────

export interface LocationShareResponse {
  session_id: string;
  active: boolean;
  started_at: string;
  contacts_notified: string[];
}
