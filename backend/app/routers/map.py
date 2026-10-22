"""Safety Map API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import MapPoint, MapPointType

router = APIRouter(prefix="/api/map", tags=["Safety Map"])

# Demo map points — Delhi landmarks used as sample help points.
# Coordinates are real; the records themselves are demo data for the
# competition prototype (contact details intentionally left empty).
DEMO_MAP_POINTS = [
    MapPoint(
        id="map-1",
        name="AIIMS Delhi",
        point_type=MapPointType.HOSPITAL,
        lat=28.5672,
        lng=77.2100,
        address="Ansari Nagar East, New Delhi 110029",
        hours="Open 24 hours",
        verified=True,
        reliability="verified",
    ),
    MapPoint(
        id="map-2",
        name="Sir Ganga Ram Hospital",
        point_type=MapPointType.HOSPITAL,
        lat=28.6406,
        lng=77.1894,
        address="Rajinder Nagar, New Delhi 110060",
        hours="Open 24 hours",
        verified=True,
        reliability="verified",
    ),
    MapPoint(
        id="map-3",
        name="Delhi Police Headquarters",
        point_type=MapPointType.POLICE,
        lat=28.6271,
        lng=77.2262,
        address="Jai Singh Marg, New Delhi 110001",
        hours="Open 24 hours",
        verified=True,
        reliability="verified",
    ),
    MapPoint(
        id="map-4",
        name="Connaught Place Police Station",
        point_type=MapPointType.POLICE,
        lat=28.6329,
        lng=77.2201,
        address="Connaught Place, New Delhi 110001",
        hours="Open 24 hours",
        verified=True,
        reliability="verified",
    ),
    MapPoint(
        id="map-5",
        name="Delhi Public School, R.K. Puram",
        point_type=MapPointType.SCHOOL,
        lat=28.5687,
        lng=77.1762,
        address="Sector 12, R.K. Puram, New Delhi 110022",
        hours="Mon-Fri 8:00 AM - 3:00 PM",
        verified=True,
        reliability="verified",
    ),
    MapPoint(
        id="map-6",
        name="Rajiv Chowk Metro Station",
        point_type=MapPointType.HELP_POINT,
        lat=28.6328,
        lng=77.2197,
        address="Connaught Place, New Delhi 110001",
        hours="5:30 AM - 11:30 PM",
        verified=True,
        reliability="verified",
    ),
    MapPoint(
        id="map-7",
        name="India Gate",
        point_type=MapPointType.PUBLIC_BUILDING,
        lat=28.6129,
        lng=77.2295,
        address="Rajpath, New Delhi 110001",
        hours="Open 24 hours",
        verified=False,
        reliability="available",
    ),
    MapPoint(
        id="map-8",
        name="Central Park, Connaught Place",
        point_type=MapPointType.PUBLIC_BUILDING,
        lat=28.6317,
        lng=77.2167,
        address="Connaught Place, New Delhi 110001",
        hours="Open 24 hours",
        verified=False,
        reliability="available",
    ),
]


@router.get("/points", response_model=list[MapPoint])
async def get_map_points():
    """
    Get all safety map points.

    Returns verified help points and available safety information.
    Areas without reliable data are NOT marked as dangerous.
    """
    return DEMO_MAP_POINTS


@router.get("/points/{point_id}", response_model=MapPoint)
async def get_map_point(point_id: str):
    """Get a specific map point by ID."""
    for point in DEMO_MAP_POINTS:
        if point.id == point_id:
            return point
    return None
