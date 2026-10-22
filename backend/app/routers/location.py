"""Location sharing API routes."""
from __future__ import annotations

import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import LocationShareStartRequest, LocationShareResponse
from app.models import database

router = APIRouter(prefix="/api/location", tags=["Location"])


@router.post("/share/start", response_model=LocationShareResponse)
async def start_location_sharing(request: LocationShareStartRequest):
    """
    Start a location sharing session.
    
    In a real deployment, this would:
    1. Request location permissions from the device
    2. Start background location updates
    3. Send location to trusted contacts via push notification or SMS
    
    For the competition prototype, we simulate the session.
    """
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Get contacts that can receive location
    db = await database.get_db()
    try:
        if request.contact_ids:
            placeholders = ",".join("?" * len(request.contact_ids))
            cursor = await db.execute(
                f"SELECT id, name FROM trusted_contacts WHERE id IN ({placeholders}) AND can_receive_location = 1",
                request.contact_ids,
            )
        else:
            cursor = await db.execute(
                "SELECT id, name FROM trusted_contacts WHERE can_receive_location = 1"
            )
        contacts = await cursor.fetchall()
        contact_names = [c["name"] for c in contacts]
    finally:
        await db.close()

    # Store the location share session
    db = await database.get_db()
    try:
        await db.execute(
            """INSERT INTO location_share_sessions 
            (id, user_id, active, started_at, contact_ids)
            VALUES (?, ?, ?, ?, ?)""",
            (
                session_id,
                request.user_id,
                1,
                now.isoformat(),
                json.dumps(request.contact_ids),
            ),
        )
        await db.commit()
    finally:
        await db.close()

    return LocationShareResponse(
        session_id=session_id,
        active=True,
        started_at=now,
        contacts_notified=contact_names,
    )


@router.post("/share/stop")
async def stop_location_sharing(session_id: str):
    """
    Stop an active location sharing session.
    """
    now = datetime.utcnow()

    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM location_share_sessions WHERE id = ? AND active = 1",
            (session_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Active location share session not found")

        await db.execute(
            "UPDATE location_share_sessions SET active = 0, ended_at = ? WHERE id = ?",
            (now.isoformat(), session_id),
        )
        await db.commit()
    finally:
        await db.close()

    return {"status": "stopped", "session_id": session_id, "stopped_at": now.isoformat()}


@router.get("/share/status/{session_id}")
async def get_location_share_status(session_id: str):
    """Get the status of a location sharing session."""
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM location_share_sessions WHERE id = ?", (session_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Location share session not found")

        return {
            "session_id": row["id"],
            "active": bool(row["active"]),
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
        }
    finally:
        await db.close()
