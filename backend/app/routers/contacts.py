"""Emergency Contacts API routes."""
from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    TrustedContactCreate,
    TrustedContactUpdate,
    TrustedContact,
)
from app.models import database

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


@router.get("", response_model=list[TrustedContact])
async def get_contacts():
    """Get all trusted contacts."""
    db = await database.get_db()
    try:
        cursor = await db.execute("SELECT * FROM trusted_contacts ORDER BY created_at")
        rows = await cursor.fetchall()
        return [
            TrustedContact(
                id=row["id"],
                name=row["name"],
                phone=row["phone"],
                contact_type=row["contact_type"],
                can_receive_sos=bool(row["can_receive_sos"]),
                can_receive_location=bool(row["can_receive_location"]),
            )
            for row in rows
        ]
    finally:
        await db.close()


@router.post("", response_model=TrustedContact)
async def create_contact(request: TrustedContactCreate):
    """Add a new trusted contact."""
    contact_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    db = await database.get_db()
    try:
        await db.execute(
            """INSERT INTO trusted_contacts 
            (id, name, phone, contact_type, can_receive_sos, can_receive_location, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                contact_id,
                request.name,
                request.phone,
                request.contact_type.value,
                int(request.can_receive_sos),
                int(request.can_receive_location),
                now,
                now,
            ),
        )
        await db.commit()
    finally:
        await db.close()

    return TrustedContact(
        id=contact_id,
        name=request.name,
        phone=request.phone,
        contact_type=request.contact_type,
        can_receive_sos=request.can_receive_sos,
        can_receive_location=request.can_receive_location,
    )


@router.put("/{contact_id}", response_model=TrustedContact)
async def update_contact(contact_id: str, request: TrustedContactUpdate):
    """Update an existing contact."""
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM trusted_contacts WHERE id = ?", (contact_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Contact not found")

        # Build update fields
        updates = []
        params = []
        if request.name is not None:
            updates.append("name = ?")
            params.append(request.name)
        if request.phone is not None:
            updates.append("phone = ?")
            params.append(request.phone)
        if request.contact_type is not None:
            updates.append("contact_type = ?")
            params.append(request.contact_type.value)
        if request.can_receive_sos is not None:
            updates.append("can_receive_sos = ?")
            params.append(int(request.can_receive_sos))
        if request.can_receive_location is not None:
            updates.append("can_receive_location = ?")
            params.append(int(request.can_receive_location))

        if updates:
            updates.append("updated_at = ?")
            params.append(datetime.utcnow().isoformat())
            params.append(contact_id)

            await db.execute(
                f"UPDATE trusted_contacts SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            await db.commit()

        # Return updated contact
        cursor = await db.execute(
            "SELECT * FROM trusted_contacts WHERE id = ?", (contact_id,)
        )
        row = await cursor.fetchone()
        return TrustedContact(
            id=row["id"],
            name=row["name"],
            phone=row["phone"],
            contact_type=row["contact_type"],
            can_receive_sos=bool(row["can_receive_sos"]),
            can_receive_location=bool(row["can_receive_location"]),
        )
    finally:
        await db.close()


@router.delete("/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a trusted contact."""
    db = await database.get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM trusted_contacts WHERE id = ?", (contact_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Contact not found")

        await db.execute("DELETE FROM trusted_contacts WHERE id = ?", (contact_id,))
        await db.commit()
    finally:
        await db.close()

    return {"status": "deleted", "contact_id": contact_id}
