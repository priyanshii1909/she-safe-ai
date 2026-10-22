"""
SHE SAFE AI — Database Layer

Uses SQLite with aiosqlite for async database operations.
Designed for minimal personal data storage (competition/demo mode).
"""
from __future__ import annotations

import aiosqlite
import os
from datetime import datetime, timedelta
from typing import Optional

# Allow the DB location to be overridden via DB_PATH (used by cloud deploys,
# where the local filesystem is ephemeral). Defaults to the local data folder.
DB_PATH = os.environ.get("DB_PATH") or os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "she_safe.db"
)


async def get_db() -> aiosqlite.Connection:
    """Get a database connection."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    """Initialize database tables."""
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS trusted_contacts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                contact_type TEXT NOT NULL,
                can_receive_sos INTEGER DEFAULT 1,
                can_receive_location INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS safety_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_type TEXT NOT NULL,
                status TEXT NOT NULL,
                destination TEXT,
                expected_arrival TEXT,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                details TEXT
            );

            CREATE TABLE IF NOT EXISTS sos_alerts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                status TEXT NOT NULL,
                message TEXT,
                location_lat REAL,
                location_lng REAL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                contacts_notified TEXT
            );

            CREATE TABLE IF NOT EXISTS location_share_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                contact_ids TEXT
            );

            CREATE TABLE IF NOT EXISTS ai_conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                messages TEXT NOT NULL,
                concern_level TEXT,
                category TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS journeys (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                destination TEXT NOT NULL,
                expected_arrival TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT
            );

            CREATE TABLE IF NOT EXISTS saved_places (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                category TEXT NOT NULL,
                name TEXT NOT NULL,
                address TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        await db.commit()
    finally:
        await db.close()


async def seed_demo_data():
    """Seed the database with fictional demo contacts."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM trusted_contacts")
        row = await cursor.fetchone()
        if row and row[0] > 0:
            return  # Already seeded

        now = datetime.utcnow().isoformat()
        demo_contacts = [
            ("demo-contact-1", "Parent Demo", "+00 00000 00000", "parent", 1, 1),
            ("demo-contact-2", "Trusted Teacher Demo", "+00 00000 00000", "teacher", 1, 1),
            ("demo-contact-3", "Counselor Demo", "+00 00000 00000", "counselor", 1, 0),
        ]

        await db.executemany(
            """INSERT INTO trusted_contacts 
            (id, name, phone, contact_type, can_receive_sos, can_receive_location, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [(c[0], c[1], c[2], c[3], c[4], c[5], now, now) for c in demo_contacts],
        )
        await db.commit()
    finally:
        await db.close()


async def seed_demo_places():
    """Seed a few example saved places (Delhi) so the demo works immediately.

    These are editable examples: the user can add or delete places from the app.
    """
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM saved_places")
        row = await cursor.fetchone()
        if row and row[0] > 0:
            return  # Already seeded

        now = datetime.utcnow().isoformat()
        demo_places = [
            (
                "demo-place-home",
                "Home",
                "home",
                "Home — Lajpat Nagar",
                "Lajpat Nagar, New Delhi",
                28.5679,
                77.2433,
            ),
            (
                "demo-place-school",
                "School",
                "school",
                "Delhi Public School, R.K. Puram",
                "Sector 12, R.K. Puram, New Delhi",
                28.5687,
                77.1762,
            ),
            (
                "demo-place-trusted",
                "Trusted",
                "trusted",
                "Family friend — Greater Kailash",
                "Greater Kailash I, New Delhi",
                28.5494,
                77.2426,
            ),
        ]

        await db.executemany(
            """INSERT INTO saved_places
            (id, label, category, name, address, lat, lng, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [(p[0], p[1], p[2], p[3], p[4], p[5], p[6], now) for p in demo_places],
        )
        await db.commit()
    finally:
        await db.close()
