"""SOS API routes."""
from __future__ import annotations

import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import SOSStartRequest, SOSResponse, SOSStopRequest
from app.models import database

router = APIRouter(prefix="/api/sos", tags=["SOS"])


@router.post("/start", response_model=SOSResponse)
async def start_sos(request: SOSStartRequest):
    """
    Start an SOS alert session.
    
    In a real deployment, this would:
    1. Send push notifications to trusted contacts
    2. Start location sharing
    3. Log the alert for safety monitoring
    
    For the competition prototype, we simulate the alert and track the session.
    """
    sos_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Get trusted contacts that can receive SOS
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id, name FROM trusted_contacts WHERE can_receive_sos = 1"
        )
        contacts = await cursor.fetchall()
        contact_names = [c["name"] for c in contacts]
    finally:
        await db.close()

    # Store the SOS alert
    db = await database.get_db()
    try:
        await db.execute(
            """INSERT INTO sos_alerts 
            (id, user_id, status, message, location_lat, location_lng, started_at, contacts_notified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sos_id,
                request.user_id,
                "active",
                request.message or "I may need help. Please check on me. My current location is available.",
                request.location_lat,
                request.location_lng,
                now.isoformat(),
                json.dumps(contact_names),
            ),
        )
        await db.commit()
    finally:
        await db.close()

    # In a real app, we would send actual notifications here
    # For demo purposes, we simulate successful notification
    location_shared = request.location_lat is not None and request.location_lng is not None

    return SOSResponse(
        sos_id=sos_id,
        status="active",
        timestamp=now,
        message=request.message or "I may need help. Please check on me. My current location is available.",
        location_shared=location_shared,
        contacts_notified=contact_names,
    )


@router.post("/stop")
async def stop_sos(request: SOSStopRequest):
    """
    Stop an active SOS alert.
    """
    now = datetime.utcnow()

    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM sos_alerts WHERE id = ? AND status = 'active'",
            (request.sos_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Active SOS alert not found")

        await db.execute(
            "UPDATE sos_alerts SET status = 'stopped', ended_at = ? WHERE id = ?",
            (now.isoformat(), request.sos_id),
        )
        await db.commit()
    finally:
        await db.close()

    return {"status": "stopped", "sos_id": request.sos_id, "stopped_at": now.isoformat()}


@router.get("/status/{sos_id}")
async def get_sos_status(sos_id: str):
    """Get the status of an SOS alert."""
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM sos_alerts WHERE id = ?", (sos_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="SOS alert not found")

        return {
            "sos_id": row["id"],
            "status": row["status"],
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
            "location_shared": row["location_lat"] is not None,
            "contacts_notified": json.loads(row["contacts_notified"] or "[]"),
        }
    finally:
        await db.close()
