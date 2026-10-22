"""Journey / Safe-Arrival Timer API routes."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    JourneyStartRequest,
    JourneyResponse,
    JourneyCheckInResponse,
)
from app.models import database

router = APIRouter(prefix="/api/journey", tags=["Journey"])


@router.post("/start", response_model=JourneyResponse)
async def start_journey(request: JourneyStartRequest):
    """
    Start a safe-arrival timer journey.
    
    The user sets a destination and expected arrival time.
    The app will monitor and check in with the user.
    """
    journey_id = str(uuid.uuid4())
    now = datetime.utcnow()
    expected_arrival = now + timedelta(minutes=request.expected_arrival_minutes)

    db = await database.get_db()
    try:
        await db.execute(
            """INSERT INTO journeys 
            (id, user_id, destination, expected_arrival, status, started_at)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (
                journey_id,
                request.user_id,
                request.destination,
                expected_arrival.isoformat(),
                "active",
                now.isoformat(),
            ),
        )
        await db.commit()
    finally:
        await db.close()

    return JourneyResponse(
        journey_id=journey_id,
        destination=request.destination,
        expected_arrival=expected_arrival,
        status="active",
        started_at=now,
    )


@router.post("/check-in", response_model=JourneyCheckInResponse)
async def check_in(journey_id: str):
    """
    User checks in to confirm they arrived safely.
    """
    now = datetime.utcnow()

    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id, status FROM journeys WHERE id = ?", (journey_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Journey not found")
        if row["status"] != "active":
            raise HTTPException(status_code=400, detail="Journey is not active")

        await db.execute(
            "UPDATE journeys SET status = 'completed', ended_at = ? WHERE id = ?",
            (now.isoformat(), journey_id),
        )
        await db.commit()
    finally:
        await db.close()

    return JourneyCheckInResponse(
        journey_id=journey_id,
        checked_in=True,
        message="Glad you arrived safely! Your journey has been marked as complete.",
    )


@router.post("/end")
async def end_journey(journey_id: str):
    """End a journey (user arrived or cancelled)."""
    now = datetime.utcnow()

    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id, status FROM journeys WHERE id = ?", (journey_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Journey not found")

        await db.execute(
            "UPDATE journeys SET status = 'ended', ended_at = ? WHERE id = ?",
            (now.isoformat(), journey_id),
        )
        await db.commit()
    finally:
        await db.close()

    return {"status": "ended", "journey_id": journey_id, "ended_at": now.isoformat()}


@router.get("/status/{journey_id}")
async def get_journey_status(journey_id: str):
    """Get the current status of a journey."""
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM journeys WHERE id = ?", (journey_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Journey not found")

        now = datetime.utcnow()
        expected = datetime.fromisoformat(row["expected_arrival"])
        time_remaining = (expected - now).total_seconds() / 60

        return {
            "journey_id": row["id"],
            "destination": row["destination"],
            "status": row["status"],
            "expected_arrival": row["expected_arrival"],
            "time_remaining_minutes": max(0, round(time_remaining)),
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
        }
    finally:
        await db.close()
