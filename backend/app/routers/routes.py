"""Safe Route API routes."""
from __future__ import annotations

import math
import random
from fastapi import APIRouter

from app.models.schemas import SafeRouteRequest, SafeRouteResponse, RouteOption

router = APIRouter(prefix="/api/routes", tags=["Safe Routes"])


def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers."""
    R = 6371  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.post("/safe", response_model=SafeRouteResponse)
async def get_safe_routes(request: SafeRouteRequest):
    """
    Get safety-aware route options between two points.
    
    Returns multiple route options with safety information.
    NEVER labels an area as dangerous — only shows available safety information.
    """
    # Calculate base distance
    base_distance = _haversine_distance(
        request.origin_lat, request.origin_lng,
        request.dest_lat, request.dest_lng,
    )

    # Generate route options (simulated for competition prototype)
    # In a real app, this would use a routing API (Google Maps, OSRM, etc.)
    # combined with safety data sources

    # Route A: Shorter, less safety info
    route_a_distance = base_distance * 1.0
    route_a_duration = max(5, int(route_a_distance * 12))  # ~5 km/h walking
    route_a = RouteOption(
        route_id="route-a",
        label="Route A — Shorter",
        distance_km=round(route_a_distance, 1),
        duration_min=route_a_duration,
        safety_score=random.randint(30, 50),
        safety_factors=[
            "Shorter distance",
            "Less pedestrian traffic",
            "Limited street lighting in some areas",
        ],
        help_points_nearby=random.randint(0, 1),
        warnings=[
            "Based on available safety information.",
            "Safety information cannot guarantee that a route is safe.",
        ],
        recommended=False,
    )

    # Route B: Slightly longer, more safety info
    route_b_distance = base_distance * 1.3
    route_b_duration = max(8, int(route_b_distance * 12))
    route_b = RouteOption(
        route_id="route-b",
        label="Route B — Safer (Recommended)",
        distance_km=round(route_b_distance, 1),
        duration_min=route_b_duration,
        safety_score=random.randint(65, 85),
        safety_factors=[
            "Well-lit main roads",
            "Higher pedestrian traffic",
            "Near verified help points",
            "Good mobile network coverage",
        ],
        help_points_nearby=random.randint(2, 4),
        warnings=[
            "Based on available safety information.",
            "Safety information cannot guarantee that a route is safe.",
        ],
        recommended=True,
    )

    # Route C: Alternative with different trade-offs
    route_c_distance = base_distance * 1.15
    route_c_duration = max(6, int(route_c_distance * 12))
    route_c = RouteOption(
        route_id="route-c",
        label="Route C — Alternative",
        distance_km=round(route_c_distance, 1),
        duration_min=route_c_duration,
        safety_score=random.randint(50, 70),
        safety_factors=[
            "Moderate pedestrian traffic",
            "Some well-lit areas",
            "One nearby help point",
        ],
        help_points_nearby=1,
        warnings=[
            "Based on available safety information.",
            "Safety information cannot guarantee that a route is safe.",
        ],
        recommended=False,
    )

    routes = [route_a, route_b, route_c]

    return SafeRouteResponse(
        routes=routes,
        disclaimer=(
            "Safety information cannot guarantee that a route is safe. "
            "Always stay aware of your surroundings."
        ),
    )
