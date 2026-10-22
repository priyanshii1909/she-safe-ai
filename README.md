# SHE SAFE AI

**Helping students take the first safe step toward human help.**

AI-powered student safety companion for school competitions.

---

## Quick Start

### Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Frontend (Flutter)

```bash
cd frontend

# Get dependencies
flutter pub get

# Run on emulator/device
flutter run
```

**Important**: Update `baseUrl` in `lib/services/api_service.dart`:
- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://localhost:8000`
- Physical device: your computer's IP address

---

## Running Tests

```bash
cd backend
python tests/test_safety_engine.py
```

---

## Project Structure

```
she-safe-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings
│   │   ├── models/
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   └── database.py      # SQLite layer
│   │   ├── routers/             # API endpoints
│   │   │   ├── ai.py
│   │   │   ├── sos.py
│   │   │   ├── location.py
│   │   │   ├── journey.py
│   │   │   ├── contacts.py
│   │   │   ├── map.py
│   │   │   ├── safety_session.py
│   │   │   └── routes.py
│   │   └── services/
│   │       ├── safety_engine.py     # Core classification
│   │       ├── ai_service.py        # Response generation
│   │       └── response_validator.py # Safety guardrails
│   ├── tests/
│   │   └── test_safety_engine.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── services/
│   │   │   └── api_service.dart
│   │   └── screens/
│   │       ├── home_screen.dart
│   │       ├── ai_chat_screen.dart
│   │       ├── sos_screen.dart
│   │       ├── safe_route_screen.dart
│   │       ├── journey_screen.dart
│   │       ├── safety_map_screen.dart
│   │       ├── contacts_screen.dart
│   │       ├── help_me_say_it_screen.dart
│   │       └── safety_plan_screen.dart
│   └── pubspec.yaml
└── docs/
    └── ARCHITECTURE.md
```

---

## Features

1. **AI Safety Assistant** — Classifies situations into GREEN/ORANGE/RED concern levels
2. **Help Me Say It** — Generates conversation starters for talking to trusted adults
3. **Safety Plan** — Creates personalized safety plans
4. **One-Tap SOS** — Emergency alert with location sharing
5. **Live Location Sharing** — Share location during active SOS
6. **Safe Route** — Compare routes using safety information
7. **Safe-Arrival Timer** — Journey monitoring with check-in
8. **Emergency Contacts** — Manage trusted contacts with call/message actions
9. **Safety Map** — View verified help points and safety information
10. **Safety Session** — Unified safety experience connecting all features

---

## Demo Mode

The app comes pre-configured with fictional demo data:
- Demo contacts (Parent, Teacher, Counselor)
- Demo map points (School, Hospital, Police Station)
- No real personal data required

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_PROVIDER` | AI provider (openai/anthropic) | No |
| `AI_API_KEY` | API key for external AI | No |
| `AI_MODEL` | Model name | No |
| `CORS_ORIGINS` | Allowed CORS origins | No |

---

## Safety Philosophy

- AI → guidance
- App → safety tools
- Trusted adults → real-world support
- Emergency services → emergencies

The AI NEVER replaces a parent, teacher, counselor, guardian, or emergency service.

---

## React Native app (primary client)

The Flutter code in `frontend/` is kept as reference. The shipping client is
`frontend-rn/` (Expo SDK 51 + React Native + TypeScript).

```powershell
cd frontend-rn
npm install
npx expo start          # press w for web, a for Android
```

### API URL

`services/api.ts` uses `EXPO_PUBLIC_API_URL` when it is set, otherwise it falls
back to `http://localhost:8000` (web/iOS) or `http://10.0.2.2:8000` (Android
emulator). Production builds get the URL from `eas.json`:

```json
"env": { "EXPO_PUBLIC_API_URL": "https://your-service.onrender.com" }
```

### Deploy the backend (Render, free)

A `render.yaml` blueprint lives at the repo root.

1. Push the repo to GitHub.
2. Render → **New +** → **Blueprint** → pick the repo → **Apply**.
3. Render builds `backend/` and exposes `https://<name>.onrender.com`.
4. Check `https://<name>.onrender.com/health` returns `{"status":"healthy"}`.

Manual alternative: **New +** → **Web Service**, root directory `backend`,
build `pip install -r requirements.txt`,
start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`,
env `DB_PATH=/tmp/she_safe.db`, `CORS_ORIGINS=*`.

Free tier note: the filesystem is ephemeral, so SQLite data (saved places) is
reset when the service restarts and re-seeded on the next boot.

### Build the APK (EAS, free)

```powershell
cd frontend-rn
npx eas login
npx eas build --platform android --profile production
```

`eas.json` sets `android.buildType: "apk"`, so the build produces an
installable `.apk` instead of a Play Store `.aab`. Download it from the EAS
link on the phone and install it (allow "install from unknown sources").

### Data sources (no API key needed)

| Layer | Source |
|-------|--------|
| Map tiles | OpenStreetMap raster tiles |
| Place search / nearby hospitals, police, schools | Nominatim (OSM) |
| Walking routes + geometry | OSRM (`routing.openstreetmap.de`) |
| Safety scores, curated points, saved places | This FastAPI backend |

Google Maps is **not** wired in: it requires a billing-enabled API key. The
provider calls are isolated in `frontend-rn/services/places.ts` if you later
want to swap them.

