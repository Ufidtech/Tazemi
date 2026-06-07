# Tazémi Backend

FastAPI backend scaffold for the Tazémi Agritech platform.

## Stack

- FastAPI
- Pydantic
- Firebase Admin SDK / Realtime Database
- Uvicorn

## Current status

This backend is still in a Phase 2 scaffold stage. A number of core paths are present, but the PRD work is not complete yet.

### Already in place

- FastAPI app entrypoint
- Versioned API prefix: `/api/v1`
- Router structure for:
  - health
  - auth
  - dashboard
  - trucks
  - batches
  - aggregators
  - trials
  - insights
  - reports
  - notes
  - sensors
  - alerts
  - ingest
- Demo in-memory data fallback
- CORS middleware
- Basic service/repository separation
- Firebase bootstrap helpers
- Bearer-token authentication scaffolding
- Basic role-based permission checks
- Rate limiting for write paths
- Input sanitization on write paths
- HTTPS expectations for production deployments
- Read endpoints for core operational data
- Basic reporting/export scaffolding
- Basic alert threshold detection on sensor ingestion

### Yet to do

The following PRD items still need to be completed or hardened:

#### 3) Write endpoints

- Core CRUD/write support is now in place for:
  - Trucks
  - Sensor readings
  - Batches
  - Aggregators
  - Trials
  - CTO notes
  - Alerts
- Create and patch schemas have been added for the core write resources
- Basic validation is now applied to write payloads

Remaining work:

- Add stronger business-rule validation and cross-field checks
- Add stronger business-rule validation and cross-field checks
- Add rate limiting across all write surfaces
- Add input sanitization across all write surfaces
- Add audit logging coverage to any remaining write paths
- Add auth guards everywhere needed
- Enforce HTTPS and production-only security expectations

#### 4) Analytics services

- Implement spoilage trend calculations
- Implement route-level analysis
- Implement correlation analysis
- Implement KPI aggregation from stored data
- Implement formulation recommendation generation
- Implement alert/threshold analytics
- Derive dashboard metrics from actual records instead of hardcoded values

#### 5) Reporting/export services

- Generate PDF reports for:
  - batch detail
  - truck detail
  - aggregator profile
- Support CSV and Excel exports
- Add printable summary endpoints

#### 6) Alerts engine

- Add full threshold detection rules
- Expand alert creation on sensor breaches
- Store alert history
- Support alert clearing/resolution
- Add geofence logic
- Add deduplication/cooldown handling

#### 7) Validation and security hardening

- Add request validation on all write endpoints
- Add rate limiting
- Add input sanitization
- Add audit logging
- Add auth guards everywhere needed
- Add deployment/security expectations for HTTPS and production use

### Requirement status summary

- FastAPI scaffold: Partial
- Demo read endpoints: Partial
- Firebase integration: Not done
- Authentication: Not done
- CRUD/write endpoints: Not done
- Analytics engine: Not done
- Reporting/export: Not done
- Alerts system: Not done
- Persistence layer: Not done
- Security hardening: Not done

### Environment variables

Create `backend/.env` locally with the following values:

Required:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL`

Credential options:

- `FIREBASE_SERVICE_ACCOUNT_JSON` = raw service account JSON string
- `FIREBASE_CREDENTIALS_JSON` = alias for the same JSON payload
- `GOOGLE_APPLICATION_CREDENTIALS` = path to a service account JSON file

Optional:

- `FIREBASE_SYNC_ON_STARTUP=true` to copy demo records into Firebase during bootstrapping
- `PYTHONPATH=.` for direct module execution

### Firebase-backed data flow

- All services go through `backend.services.repository.Repository`
- Firebase reads/writes use the same wrapper as demo mode, which keeps the service API stable
- Realtime Database paths are collection-based, keyed by record `id`
- When Firebase is configured, writes persist immediately to Realtime Database
- When Firebase is not configured, the app continues to use the in-memory demo store
- Startup can auto-seed demo data into Firebase when `FIREBASE_SYNC_ON_STARTUP` is set
- Session auth supports Firebase ID tokens first, then demo session fallback for local development

### Migration path from demo store

1. Set the Firebase environment variables above.
2. Start the backend once with Firebase enabled.
3. If you want automatic seeding, set `FIREBASE_SYNC_ON_STARTUP=true`.
4. On startup, demo records are copied into Firebase for the core collections.
5. For manual seeding, call `Repository(collection).migrate_demo_to_firebase()`.
6. After verifying data in Realtime Database, keep Firebase enabled in all environments.

### Notes

- Read endpoints are available, but protected routes require a valid bearer token.
- Set Firebase custom claims with `role=admin` for write access.
- Demo data remains the fallback for local development when Firebase is not configured.
- The backend now initializes Firebase Admin on startup and seeds demo data when requested.
