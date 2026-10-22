"""Safety Session API routes."""
from __future__ import annotations

import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    SafetySessionStartRequest,
    SafetySessionResponse,
    SessionType,
)
from app.models import database

router = APIRouter(prefix="/api/safety-session", tags=["Safety Session"])


@router.post("/start", response_model=SafetySessionResponse)
async def start_safety_session(request: SafetySessionStartRequest):
    """
    Start a unified safety session.
    
    A Safety Session connects location, timer, AI guidance, trusted contacts,
    and emergency actions into one cohesive experience.
    """
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()

    details = {}
    if request.session_type == SessionType.JOURNEY and request.destination:
        details["destination"] = request.destination
        if request.expected_arrival_minutes:
            details["expected_arrival_minutes"] = request.expected_arrival_minutes

    db = await database.get_db()
    try:
        await db.execute(
            """INSERT INTO safety_sessions 
            (id, user_id, session_type, status, destination, expected_arrival, started_at, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                session_id,
                request.user_id,
                request.session_type.value,
                "active",
                request.destination,
                None,
                now.isoformat(),
                json.dumps(details),
            ),
        )
        await db.commit()
    finally:
        await db.close()

    return SafetySessionResponse(
        session_id=session_id,
        session_type=request.session_type,
        status="active",
        started_at=now,
        details=details,
    )


@router.post("/end")
async def end_safety_session(session_id: str):
    """End an active safety session."""
    now = datetime.utcnow()

    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM safety_sessions WHERE id = ? AND status = 'active'",
            (session_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Active safety session not found")

        await db.execute(
            "UPDATE safety_sessions SET status = 'ended', ended_at = ? WHERE id = ?",
            (now.isoformat(), session_id),
        )
        await db.commit()
    finally:
        await db.close()

    return {"status": "ended", "session_id": session_id, "ended_at": now.isoformat()}


@router.get("/status/{session_id}")
async def get_session_status(session_id: str):
    """Get the status of a safety session."""
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM safety_sessions WHERE id = ?", (session_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Safety session not found")

        return {
            "session_id": row["id"],
            "session_type": row["session_type"],
            "status": row["status"],
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
            "details": json.loads(row["details"] or "{}"),
        }
    finally:
        await db.close()
