# SHE SAFE AI — Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FLUTTER MOBILE APP                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │AI Chat  │ │SOS      │ │Journey  │ │Map      │       │
│  │Screen   │ │Screen  │ │Timer    │ │Screen  │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       └───────────┴───────────┴───────────┘             │
│                         │                                │
│                    HTTP Client                           │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS/JSON
┌─────────────────────────┼───────────────────────────────┐
│                  FASTAPI BACKEND                          │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │              API Routers                         │    │
│  │  /api/ai/*  /api/sos/*  /api/journey/*         │    │
│  │  /api/contacts/*  /api/map/*  /api/routes/*    │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                                │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │            Safety Engine                         │    │
│  │  • Input Preprocessing                           │    │
│  │  • Keyword Matching                              │    │
│  │  • Weighted Scoring                              │    │
│  │  • Category Detection                            │    │
│  │  • Concern Level Classification                  │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                                │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │            AI Service                            │    │
│  │  • Built-in Safety Engine (primary)              │    │
│  │  • External AI API (optional enhancement)        │    │
│  │  • Response Generation                           │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                                │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │         Response Validator                       │    │
│  │  • No replacement claims                         │    │
│  │  • No safety guarantees                          │    │
│  │  • No dangerous instructions                     │    │
│  │  • No blame/judgment                             │    │
│  │  • No chain-of-thought exposure                  │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                                │
│  ┌──────────────────────▼──────────────────────────┐    │
│  │         Database (SQLite)                        │    │
│  │  • Trusted Contacts                             │    │
│  │  • Safety Sessions                               │    │
│  │  • SOS Alerts                                    │    │
│  │  • Journeys                                      │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

### AI Chat Flow
1. User sends message → Flutter app
2. App → POST /api/ai/analyze → FastAPI
3. Safety Engine classifies message (keyword matching + scoring)
4. AI Service generates response (built-in engine or external API)
5. Response Validator checks response against safety rules
6. Structured response returned to app
7. App displays response with concern level badge and action buttons

### SOS Flow
1. User presses SOS → Confirmation screen
2. User confirms → POST /api/sos/start
3. Backend identifies trusted contacts (can_receive_sos = true)
4. Backend creates SOS alert record
5. App shows active SOS with location sharing status
6. User can stop SOS → POST /api/sos/stop

### Journey Timer Flow
1. User sets destination + expected arrival time
2. POST /api/journey/start → Backend creates journey record
3. App shows countdown timer
4. When timer expires → "Are you safe?" prompt
5. User checks in → POST /api/journey/check-in
6. If no response → Escalation process (reminders → trusted contact alert)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/analyze | Analyze message and return classification |
| POST | /api/ai/chat | Full chat with analysis |
| POST | /api/ai/help-me-say-it | Generate conversation starter |
| POST | /api/ai/safety-plan | Generate personalized safety plan |
| POST | /api/sos/start | Start SOS alert |
| POST | /api/sos/stop | Stop SOS alert |
| GET | /api/sos/status/{id} | Get SOS status |
| POST | /api/location/share/start | Start location sharing |
| POST | /api/location/share/stop | Stop location sharing |
| POST | /api/journey/start | Start safe-arrival timer |
| POST | /api/journey/check-in | Check in (arrived safely) |
| GET | /api/contacts | List trusted contacts |
| POST | /api/contacts | Add trusted contact |
| PUT | /api/contacts/{id} | Update contact |
| DELETE | /api/contacts/{id} | Delete contact |
| GET | /api/map/points | Get safety map points |
| POST | /api/routes/safe | Get safety-aware routes |
| POST | /api/safety-session/start | Start safety session |
| POST | /api/safety-session/end | End safety session |

## Safety Levels

| Level | Color | Trigger | Response Style |
|-------|-------|---------|----------------|
| SUPPORT | GREEN | Everyday social/friendship issues | Warm, supportive, suggest talking to someone |
| CONCERNING | ORANGE | Bullying, harassment, threats | Recommend adult involvement, provide next steps |
| IMMEDIATE | RED | Danger to life, self-harm, weapons | Urgent, prioritize safety, immediate human contact |

## External APIs (Optional)

### AI Provider (optional)
- **OpenAI**: gpt-4o-mini — Enhanced AI responses
- **Anthropic**: claude-3-5-sonnet — Enhanced AI responses
- Set `AI_API_KEY` in `.env` to enable

### Maps (future)
- Google Maps or OpenStreetMap for real map display
- Currently using static map points for demo

### Notifications (future)
- Firebase Cloud Messaging for push notifications
- Twilio for SMS alerts to trusted contacts
