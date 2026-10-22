"""Pydantic models for API request/response validation."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class ConcernLevel(str, Enum):
    SUPPORT = "support"          # GREEN
    CONCERNING = "concerning"    # ORANGE
    IMMEDIATE = "immediate"      # RED


class ContactType(str, Enum):
    PARENT = "parent"
    GUARDIAN = "guardian"
    TEACHER = "teacher"
    RELATIVE = "relative"
    COUNSELOR = "counselor"
    OTHER = "other"


class SessionType(str, Enum):
    JOURNEY = "journey"
    SOS = "sos"
    GENERAL = "general"


# ── AI Models ────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)


class AIAnalyzeRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    history: list[ChatMessage] = Field(default_factory=list)


class RecommendedAction(BaseModel):
    action_type: str  # talk_to_adult, help_me_say_it, safety_plan, sos, share_location, emergency_contacts
    label: str
    description: str


class AIAnalyzeResponse(BaseModel):
    concern_level: ConcernLevel
    category: str
    summary: str
    response_text: str
    explanation: str
    recommended_actions: list[RecommendedAction]
    show_sos: bool = False
    show_location: bool = False
    show_safety_plan: bool = False
    conversation_id: str
    disclaimer: str = (
        "I'm an AI safety assistant, not a replacement for a trusted adult or emergency service."
    )


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    analysis: AIAnalyzeResponse


# ── Contact Models ──────────────────────────────────────────────────────────

class TrustedContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=5, max_length=20)
    contact_type: ContactType
    can_receive_sos: bool = True
    can_receive_location: bool = True


class TrustedContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    contact_type: Optional[ContactType] = None
    can_receive_sos: Optional[bool] = None
    can_receive_location: Optional[bool] = None


class TrustedContact(BaseModel):
    id: str
    name: str
    phone: str
    contact_type: ContactType
    can_receive_sos: bool = True
    can_receive_location: bool = True

    model_config = {"from_attributes": True}


# ── SOS Models ──────────────────────────────────────────────────────────────

class SOSStartRequest(BaseModel):
    user_id: str = "demo-user"
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    message: Optional[str] = None


class SOSResponse(BaseModel):
    sos_id: str
    status: str
    timestamp: datetime
    message: str
    location_shared: bool
    contacts_notified: list[str]


class SOSStopRequest(BaseModel):
    sos_id: str


# ── Location Models ─────────────────────────────────────────────────────────

class LocationShareStartRequest(BaseModel):
    user_id: str = "demo-user"
    contact_ids: list[str] = Field(default_factory=list)


class LocationShareResponse(BaseModel):
    session_id: str
    active: bool
    started_at: datetime
    contacts_notified: list[str]


# ── Journey Models ──────────────────────────────────────────────────────────

class JourneyStartRequest(BaseModel):
    user_id: str = "demo-user"
    destination: str = Field(..., min_length=1, max_length=200)
    expected_arrival_minutes: int = Field(..., ge=1, le=480)


class JourneyResponse(BaseModel):
    journey_id: str
    destination: str
    expected_arrival: datetime
    status: str
    started_at: datetime


class JourneyCheckInResponse(BaseModel):
    journey_id: str
    checked_in: bool
    message: str


# ── Safety Session Models ───────────────────────────────────────────────────

class SafetySessionStartRequest(BaseModel):
    user_id: str = "demo-user"
    session_type: SessionType
    destination: Optional[str] = None
    expected_arrival_minutes: Optional[int] = None


class SafetySessionResponse(BaseModel):
    session_id: str
    session_type: SessionType
    status: str
    started_at: datetime
    details: dict = Field(default_factory=dict)


# ── Map Models ──────────────────────────────────────────────────────────────

class MapPointType(str, Enum):
    HELP_POINT = "help_point"
    HOSPITAL = "hospital"
    SCHOOL = "school"
    POLICE = "police"
    SAFE_HOUSE = "safe_house"
    PUBLIC_BUILDING = "public_building"


class MapPoint(BaseModel):
    id: str
    name: str
    point_type: MapPointType
    lat: float
    lng: float
    address: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None
    verified: bool = True
    reliability: str = "verified"  # verified, available, none


# ── Route Models ────────────────────────────────────────────────────────────

class RouteOption(BaseModel):
    route_id: str
    label: str
    distance_km: float
    duration_min: int
    safety_score: int = Field(..., ge=0, le=100)
    safety_factors: list[str] = Field(default_factory=list)
    help_points_nearby: int = 0
    warnings: list[str] = Field(default_factory=list)
    recommended: bool = False


class SafeRouteRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lng: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lng: float = Field(..., ge=-180, le=180)
    destination_name: Optional[str] = None


class SafeRouteResponse(BaseModel):
    routes: list[RouteOption]
    disclaimer: str = (
        "Safety information cannot guarantee that a route is safe. "
        "Always stay aware of your surroundings."
    )


# ── Safety Plan Models ──────────────────────────────────────────────────────

class SafetyPlanSection(BaseModel):
    title: str
    content: str


class SafetyPlan(BaseModel):
    plan_id: str
    situation_summary: str
    sections: list[SafetyPlanSection]
    created_at: datetime


class SafetyPlanRequest(BaseModel):
    situation: str = Field(..., min_length=1, max_length=2000)
    concern_level: Optional[ConcernLevel] = None


# ── Help Me Say It Models ───────────────────────────────────────────────────

class HelpMeSayItRequest(BaseModel):
    situation: str = Field(..., min_length=1, max_length=2000)
    audience: Optional[str] = "trusted_adult"  # parent, teacher, counselor


class HelpMeSayItResponse(BaseModel):
    conversation_starter: str
    tips: list[str] = Field(default_factory=list)


# ── Error Models ────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


# ── Saved Places Models ─────────────────────────────────────────────────────

class SavedPlaceCategory(str, Enum):
    HOME = "home"
    SCHOOL = "school"
    WORK = "work"
    TRUSTED = "trusted"
    OTHER = "other"


class SavedPlaceCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=60)
    category: SavedPlaceCategory = SavedPlaceCategory.TRUSTED
    name: str = Field(..., min_length=1, max_length=200)
    address: Optional[str] = None
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class SavedPlace(BaseModel):
    id: str
    label: str
    category: SavedPlaceCategory
    name: str
    address: Optional[str] = None
    lat: float
    lng: float
    created_at: datetime

    model_config = {"from_attributes": True}
