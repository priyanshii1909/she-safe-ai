"""Saved Places API routes.

Users can store their own places (home, school, trusted places) so the
route planner can offer them as start/destination options. Additive feature —
it does not touch any existing endpoint.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import SavedPlace, SavedPlaceCreate
from app.models import database

router = APIRouter(prefix="/api/places", tags=["Saved Places"])


@router.get("", response_model=list[SavedPlace])
async def get_places():
    """Get all saved places (home, school, trusted places…)."""
    db = await database.get_db()
    try:
        cursor = await db.execute("SELECT * FROM saved_places ORDER BY created_at")
        rows = await cursor.fetchall()
        return [
            SavedPlace(
                id=row["id"],
                label=row["label"],
                category=row["category"],
                name=row["name"],
                address=row["address"],
                lat=row["lat"],
                lng=row["lng"],
                created_at=row["created_at"],
            )
            for row in rows
        ]
    finally:
        await db.close()


@router.post("", response_model=SavedPlace)
async def create_place(request: SavedPlaceCreate):
    """Save a new place."""
    place_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    db = await database.get_db()
    try:
        await db.execute(
            """INSERT INTO saved_places
            (id, label, category, name, address, lat, lng, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                place_id,
                request.label,
                request.category.value,
                request.name,
                request.address,
                request.lat,
                request.lng,
                now,
            ),
        )
        await db.commit()
    finally:
        await db.close()

    return SavedPlace(
        id=place_id,
        label=request.label,
        category=request.category,
        name=request.name,
        address=request.address,
        lat=request.lat,
        lng=request.lng,
        created_at=now,
    )


@router.delete("/{place_id}")
async def delete_place(place_id: str):
    """Delete a saved place."""
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM saved_places WHERE id = ?", (place_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Place not found")

        await db.execute("DELETE FROM saved_places WHERE id = ?", (place_id,))
        await db.commit()
    finally:
        await db.close()

    return {"status": "deleted", "place_id": place_id}
