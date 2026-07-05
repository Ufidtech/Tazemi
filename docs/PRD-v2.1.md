# TAZEMI AGRITECH — Operations Dashboard
## Product Requirements Document

**Version 2.1 | July 2026 | Confidential – Internal Use Only**

This document defines the complete product requirements for the Tazemi Operations Dashboard – the web-based backend platform that powers all aggregator management, payment processing, coating QC data, and business intelligence for Tazemi Agritech's coating-as-a-service operations.

This document is the authoritative reference for the frontend and backend development teams. All features described here must be implemented exactly as specified unless a change request is formally approved by the CEO.

> **v2.1 supersedes v2.0.** All 29 findings from the June 2026 PRD audit are resolved in this revision. See Appendix A for the change log.

---

## 1. Product Overview

### 1.1 What is the Tazemi Dashboard?

The Tazemi Operations Dashboard is a web-based platform accessible on desktop and tablet browsers. It serves as the central control system for all Tazemi Processing Hub operations. It connects to Firebase Realtime Database (RTDB) and Firestore, and receives data from two physical devices: **TAPU v2** (payment terminal) and **QC Scanner** (coating quality measurement device).

The dashboard is the only place where aggregator accounts are created, pricing is managed, and formula batches are registered. The physical devices only write field data. All configuration and management happens here.

### 1.2 Who uses it?

Canonical role identifiers (stored in Firestore `/users/{user_id}.role`): **`CEO`**, **`FIELD_OPERATOR`**, **`RND`**. These are the three MVP roles. All references in this document use these identifiers.

| User | Role | Primary actions |
|---|---|---|
| CEO (Qamorudeen) | `CEO` | Full access. Monitor revenue and operations. Update pricing. View all data. Manage devices, users, and settings. |
| Field Operator | `FIELD_OPERATOR` | Register aggregators via RFID scan. Top up balances. Monitor daily transactions. |
| R&D / Formulation (Fatia) | `RND` | View coating batch performance. Manage formula batches. Review QC Scanner data. |

### 1.3 Technology stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS – existing codebase at tazemi.ng |
| Database | Firebase RTDB (device sync and live data) + Firestore (dashboard config, user records, counters, encrypted identity data). See §2.0 for the authoritative path-to-database assignment. |
| Server logic | Firebase Cloud Functions – registration, aggregate stats, scan-request sweeping, device token minting, NIN/BVN encryption |
| Authentication | Firebase Authentication – email/password per role. Role stored in Firestore `/users/{user_id}`. Devices authenticate with per-device custom tokens (§6.1). |
| Real-time sync | Firebase `onValue` listeners on `/batches`, `/aggregators`, `/transactions`, `/scan_requests`, `/devices`, `/pricing`, `/formulas`, `/stats`. Updates reflect without page refresh. |
| TAPU v2 connection | ESP32-S3 writes to RTDB via WiFi using its device identity. Dashboard reads in real time. |
| QC Scanner connection | ESP32-S3 writes PRE/POST coating data and analysis to RTDB using its device identity. Dashboard reads in real time. |

---

## 2. Firebase Data Structure

### 2.0 Database assignment

"Path" refers to RTDB locations; "Collection" refers to Firestore. All financial writes live in RTDB so that multi-path atomic updates apply.

| Location | Database | Rationale |
|---|---|---|
| `/aggregators`, `/batches`, `/transactions` | RTDB | Device-written, live balances, atomic multi-path updates |
| `/scan_requests`, `/scan_request_log` | RTDB | Real-time device↔dashboard bridge |
| `/devices`, `/daily_logs`, `/sync_errors` | RTDB | Device telemetry |
| `/pricing`, `/formulas` | RTDB | Read live by devices |
| `/rfid_index`, `/phone_index` | RTDB | Race-safe uniqueness enforcement |
| `/stats` | RTDB | Maintained aggregates for dashboard metrics |
| `/users` | Firestore | Auth roles and user records |
| `/counters` | Firestore | Transactional ID sequence allocation |
| `/identity/{aggregator_id}` | Firestore | Encrypted NIN/BVN ciphertext (never stored in RTDB) |

### 2.1 Aggregators — `/aggregators/{aggregator_id}` (RTDB)

| Field | Type | Description |
|---|---|---|
| aggregator_id | String | `AGG-001`, `AGG-002`… Allocated via a Firestore transaction on `/counters/aggregators` (race-safe). Prefix `AGG-T` for test accounts. |
| full_name | String | Full name as on NIN or valid ID |
| phone_number | String | Primary contact, normalized to `+234` form. Uniqueness enforced via `/phone_index` (§2.8). |
| market_location | String | Market name and city e.g. Yankaba Market, Kano |
| nin_or_bvn | — | **Not stored here.** Ciphertext lives in Firestore `/identity/{aggregator_id}` (§6.2). RTDB holds only `nin_or_bvn_masked` (e.g. `*******1234`). |
| photo_url | String | Firebase Storage URL of aggregator photo |
| rfid_uid | String | Unique RFID card UID – assigned at registration via TAPU v2 scan. Uniqueness enforced via `/rfid_index` (§2.8). |
| balance | Number | Current account balance in Naira – updated on every transaction |
| account_status | String | `ACTIVE` \| `SUSPENDED` \| `INACTIVE` |
| card_fee_paid | Boolean | True once ₦1,000 card fee deducted. Standard registration always sets this `true` atomically; the `false` state exists only for admin-imported/legacy accounts (§3.2 handles it as a safety net). |
| total_batches | Number | Incremented by **TAPU v2** inside its atomic payment PATCH (§4.1) |
| total_crates_coated | Number | Incremented by **TAPU v2** inside its atomic payment PATCH (§4.1) |
| last_active | Timestamp | Updated by TAPU v2's payment PATCH and by dashboard top-ups. Backs the "Last Active" list column. |
| registered_at | Timestamp | Date and time of registration |
| registered_by | String | Operator user ID who performed registration |

### 2.2 Batches — `/batches/{batch_id}` (RTDB)

| Field | Type | Description |
|---|---|---|
| batch_id | String | Device-scoped: `BATCH-{device_id}-{seq}` e.g. `BATCH-TKN01-000123`. Sequence auto-incremented by TAPU v2 in NVS. Collision-free across devices and hubs. |
| aggregator_id | String | Reference to aggregator |
| aggregator_name | String | Denormalised for query performance |
| is_test | Boolean | Denormalised at write time: `true` when `aggregator_id` starts with `AGG-T`. All aggregations filter on this flag. |
| crate_count | Number | Number of crates in this batch |
| amount_charged | Number | Total amount charged in Naira |
| rate_per_crate | Number | Rate active at the time of transaction (standard season rate or CEO custom override) |
| season | String | `scarcity` \| `glut` |
| stale_rate | Boolean | Unified definition (§4.4): `true` iff the device could not fetch fresh pricing at transaction time **and** its cached pricing `last_updated` was >24h old |
| payment_status | String | `PAID` \| `PENDING` \| `FAILED` — see §4.5 for PENDING/FAILED lifecycle |
| batch_status | String | `OPEN` \| `QC_IN_PROGRESS` \| `COMPLETE` \| `DISPATCHED` |
| created_at | Timestamp | When batch was opened by TAPU v2 |
| closed_at | Timestamp | When batch was completed by QC Scanner |
| operator_id | String | Field operator who processed the batch |
| hub_id | String | Processing hub location: `HUB-KN-01` (Kano) |
| pre_coating | Object | Written by QC Scanner: temp_avg, humidity_avg, voc_index_avg, surface_temp_avg, weight_kg, timestamp, crates_scanned, readings_per_crate |
| post_coating | Object | Written by QC Scanner: same fields as pre_coating |
| analysis | Object | Written by QC Scanner: voc_reduction_pct, coating_mass_g_per_kg, temp_change, humidity_change, coating_effective (boolean), formula_batch_ref |

### 2.3 Transactions — `/transactions/{transaction_id}` (RTDB)

| Field | Type | Description |
|---|---|---|
| transaction_id | String | Device writes: `TXN-{device_id}-{millis}`. Dashboard writes: `TXN-DASH-{operator_uid_short}-{millis}` (`DASH` is a reserved device-ID namespace). |
| aggregator_id | String | Reference to aggregator |
| batch_id | String | Reference to batch – null for top-ups |
| is_test | Boolean | Denormalised: `true` when `aggregator_id` starts with `AGG-T` |
| type | String | `TOPUP` \| `PAYMENT` \| `CARD_FEE` \| `REFUND` — REFUND flow defined in §3.2 |
| amount | Number | Transaction amount in Naira – negative for debits |
| balance_before | Number | Balance before transaction |
| balance_after | Number | Balance after transaction |
| method | String | `RFID` \| `CASH` \| `TRANSFER` |
| timestamp | Timestamp | Exact time of transaction (device timestamp for offline-queued items) |
| operator_id | String | Who processed the transaction |
| stale_rate | Boolean | Unified definition — see §4.4 |
| note | String | Optional note e.g. "Card replacement" or "First top-up" |

### 2.4 Pricing — `/pricing/current` (RTDB)

| Field | Type | Description |
|---|---|---|
| current_season | String | `scarcity` \| `glut` – controls which rate is active |
| scarcity_rate | Number | **₦1,500** per crate |
| glut_rate | Number | **₦875** per crate *(canonical value — the ₦1,000 figure in PRD v2.0 §3.4 was an error)* |
| active_rate | Number | Current active rate – TAPU v2 subscribes via live listener and reads on startup |
| crate_deposit | Number | ₦500 per crate – refundable on return (post-MVP) |
| card_fee | Number | ₦1,000 – deducted from first top-up |
| last_updated | Timestamp | Written on every pricing save – used by TAPU v2 to detect stale pricing (>24h) |
| updated_by | String | CEO user ID – only CEO can update pricing |

Pricing changes are recorded in `/pricing/changelog/{push_id}`: timestamp, changed_by, old_rate, new_rate, old_season, new_season.

### 2.5 Formulas — `/formulas/{formula_id}` (RTDB)

Maintained by the R&D role (Fatia). Read by QC Scanner in real time for the formula selection screen.

| Field | Type | Description |
|---|---|---|
| formula_id | String | `BIO-001`, `BIO-002`… Allocated via Firestore transaction on `/counters/formulas`. |
| name | String | Display name e.g. Bio-Shield Batch 003 |
| date_created | Date | Date formula batch was prepared |
| notes | String | Formulation notes e.g. "Increased aloe vera ratio" |
| active | Boolean | True = shown on QC Scanner selection screen. False = archived. |
| created_by | String | `RND` user ID |

### 2.6 Scan Requests — `/scan_requests/{session_id}` (RTDB)

Communication bridge between the dashboard and TAPU v2 for RFID card registration. The dashboard creates the request; TAPU v2 fulfils it via a **live RTDB listener** (not polling); the dashboard listens in real time and auto-fills the UID field on completion.

| Field | Type | Description |
|---|---|---|
| session_id | String | Auto-generated UUID – created by dashboard when operator clicks Scan Card |
| device_id | String | Target TAPU device e.g. `TAPU-KN-01`. MVP: single device per hub, configured in Settings (§3.9). |
| status | String | `PENDING` \| `SCANNING` \| `COMPLETE` \| `EXPIRED` |
| uid | String | RFID card UID written by TAPU v2 after card tap e.g. `A3B4C5D6`. Null until scanned. |
| created_at | Timestamp | When dashboard created the request |
| scanned_at | Timestamp | When TAPU v2 read the card. Null until scanned. |
| created_by | String | Operator user ID who initiated the scan |

**Status lifecycle**

| Status | Meaning |
|---|---|
| PENDING | Dashboard created request; TAPU v2's listener should transition it within 2 seconds |
| SCANNING | TAPU v2 acknowledged and activated scan mode. TFT shows amber Scan Mode screen. |
| COMPLETE | Card tapped, UID written. Dashboard auto-fills field. |
| EXPIRED | No card tap in time. Set by TAPU v2 at 60s, **or by the dashboard at 65s** if no COMPLETE arrived (covers a device dying mid-scan). |

**Liveness check:** if the dashboard does not observe `SCANNING` within **5 seconds** of creating a request, it shows *"Device not responding"* with Retry and Enter-manually options. The sidebar heartbeat indicator is advisory only and does not guarantee scan availability.

**Archival rule (replaces v2.0 delete rule):** after the UID is saved to the aggregator record, the dashboard performs one multi-path write that copies the record to `/scan_request_log/{session_id}` and deletes it from `/scan_requests`. An hourly Cloud Function sweeps `/scan_requests` and expires+archives any non-COMPLETE record older than 1 hour (including stuck SCANNING states). Module 8's activity panel reads `/scan_request_log`.

### 2.7 Devices — `/devices/{device_id}/heartbeat` (RTDB)

Written by TAPU v2 and QC Scanner every 5 minutes while awake and connected to WiFi.

```json
/devices/TAPU-KN-01/heartbeat: {
  "battery_pct":     82,
  "wifi_connected":  true,
  "queued_tx_count": 0,
  "fw_version":      "3.0",
  "timestamp":       1782900000
}
```

### 2.8 Uniqueness indexes (RTDB)

Race-safe uniqueness for phone numbers and RFID UIDs. Security rules forbid overwriting an existing key.

- `/phone_index/{normalized_phone}` → `aggregator_id`. Written atomically with registration. Phone normalized to `+234…` before indexing.
- `/rfid_index/{uid}` → `aggregator_id`. Written atomically with registration and card replacement. Manual UID entry validates against this index before save.

### 2.9 Stats — `/stats` (RTDB)

Maintained by Cloud Function triggers on batch/transaction writes (excluding `is_test = true` records). The CEO Overview reads only this path — **never full collections** (§6 performance NFR).

- `/stats/daily/{YYYY-MM-DD}`: revenue, batch_count, crate_count, stale_rate_count, per hub
- `/stats/totals`: all-time revenue, batch/crate counts
- `/stats/qc`: running `sum` + `count` for voc_reduction_pct and coating_mass_g_per_kg (averages computed client-side from sum/count)
- `/stats/top_aggregators/{YYYY-MM}`: revenue per aggregator for the month

---

## 3. Dashboard Modules

The dashboard has **9 modules**. Each is a separate page accessible from the sidebar navigation.

| # | Module | Access | Phase |
|---|---|---|---|
| 1 | Aggregator Registration | CEO + FIELD_OPERATOR | 1 |
| 2 | Aggregator Management | CEO + FIELD_OPERATOR | 1 |
| 3 | Batch Management | CEO + FIELD_OPERATOR | 2 |
| 4 | Pricing Management | CEO only | 1 |
| 5 | CEO Dashboard Overview | CEO only | 2 |
| 6 | R&D View | CEO + RND | 3 |
| 7 | Formula Management | CEO + RND | 3 |
| 8 | Device Management | CEO only | 3 |
| 9 | Settings | CEO only | 3 |

### 3.1 Module 1 – Aggregator Registration

**Purpose:** register new aggregators, assign RFID cards via TAPU v2 device scan, load initial balance, and activate accounts. All data entry happens on the dashboard. The physical card scan is handled by the TAPU v2 device on the same WiFi network. No manual UID transcription required.

Registration is executed by a **callable Cloud Function `registerAggregator`** (not direct client writes) so that ID allocation, NIN/BVN encryption, uniqueness indexing, and the financial writes happen in one server-controlled operation.

**Fields to collect**

| Field | Input type | Validation |
|---|---|---|
| Full name | Text input | Required. Minimum 3 characters. |
| Phone number | Text input | Required. Valid Nigerian number (+234 or 0 prefix), normalized to +234. Unique — enforced via `/phone_index`, checked client-side and enforced server-side. |
| Market location | Dropdown | Required. Options: Yankaba Market Kano, Dawanau Market Kano, Barkin Dogo Market Kaduna, Terminus Market Jos, Other |
| NIN or BVN | Text input | Required. 11 digits. Sent only to the Cloud Function over TLS; encrypted server-side with a KMS-backed key; ciphertext stored in Firestore `/identity/{aggregator_id}`; masked value stored in RTDB. |
| Photo | Camera capture or file upload | Required. Min 200×200px. Max 5MB, resized client-side to max 800px longest edge before upload. Stored in the default project bucket at `aggregator-photos/{aggregator_id}.jpg`. Storage rules: write restricted to `CEO`/`FIELD_OPERATOR` roles; read requires authentication. |
| RFID UID | Auto-filled via TAPU v2 scan | Required. 8-character hex string. Unique — enforced via `/rfid_index`. Manual entry fallback if device offline. |
| Initial top-up amount | Number input | Required. Minimum ₦5,000. |

**RFID card scan flow** *(core registration feature — TAPU v2 must be online)*

1. Operator fills all fields above except RFID UID.
2. Operator clicks **Scan Card**. Button is active when the target TAPU shows online (green dot in sidebar); this indicator is advisory (see step 5).
3. Dashboard generates a UUID session ID and writes `/scan_requests/{session_id} = { status: PENDING, device_id, created_by }`.
4. Dashboard shows modal: *"Waiting for card scan on TAPU device…"* with 60-second countdown and Cancel button.
5. **Liveness check:** if status has not reached `SCANNING` within 5 seconds, modal switches to *"Device not responding"* with Retry / Enter manually.
6. TAPU v2's listener picks up the PENDING request; TFT shows amber SCAN MODE screen; status → `SCANNING`.
7. Hub operator physically taps the new RFID card on the TAPU device.
8. TAPU v2 writes `{ uid, status: COMPLETE, scanned_at }`.
9. Dashboard listener detects COMPLETE. Modal closes. RFID UID field populates, shown read-only with green tick.
10. Operator reviews all fields and clicks **Save Registration** → invokes `registerAggregator`.
11. On success the dashboard archives the scan request to `/scan_request_log` and deletes it from `/scan_requests` in one multi-path write.

**Timeout and offline handling**

| Scenario | Behaviour |
|---|---|
| 60s – no card tapped | TAPU v2 sets EXPIRED and returns home. Modal shows *"Scan timed out"* with Retry or Enter manually. |
| No COMPLETE by 65s (device died mid-scan) | Dashboard sets EXPIRED itself and shows the same options. |
| TAPU v2 offline | Scan Card disabled. Tooltip: *"TAPU device offline – connect to WiFi to enable scanning."* Enter-UID-manually link shown. |
| Manual UID entry | 8-character hex field, validated against `/rfid_index` for uniqueness before save. Warning: *"Manual entry – physically verify UID printed on card before saving."* |

**Registration logic (executed by `registerAggregator`)**

- Allocates `aggregator_id` via Firestore transaction on `/counters/aggregators` (`AGG-T` prefix for test accounts)
- Encrypts NIN/BVN (KMS) → Firestore `/identity/{id}`; masked value → RTDB
- Sets `account_status: ACTIVE`, `card_fee_paid: true`
- One atomic RTDB multi-path write: aggregator record + `/phone_index` entry + `/rfid_index` entry + TOPUP transaction (initial amount) + CARD_FEE transaction (−₦1,000)
- Available balance = top-up amount − ₦1,000
- Success screen shows: Aggregator ID, full name, available balance, RFID UID assigned

**Test accounts:** `AGG-T` prefix (AGG-T001 to AGG-T010). Yellow TEST badge on all views. `is_test: true` denormalised onto every batch/transaction they generate; excluded from `/stats`, revenue reporting, and daily summaries.

### 3.2 Module 2 – Aggregator Management

**Aggregator list view**

- Columns: Name, ID, Phone, Market Location, Balance, Status, Total Batches, Last Active (from `last_active` field), Actions
- Search: name, aggregator ID, or phone. Filter: status, market location, test accounts in/out. Sort: name, balance, total batches, last active.
- Export to CSV. Pagination: 20 rows per page.
- Test accounts shown with yellow TEST badge.

**Individual aggregator profile**

- Full profile: photo, name, ID, phone, market location, NIN/BVN (masked; decryption is a CEO-only audited Cloud Function), RFID UID, status, registered date, registered by
- Current balance shown prominently with Top Up button
- Transaction history: paginated, newest first — type, amount, balance before/after, method, timestamp, note
- Batch history: all batches with status, crate count, amount charged, QC summary (voc_reduction_pct if available)
- **Suspend account** (CEO only): requires reason; sets `SUSPENDED`. TAPU v2 rejects suspended cards online, and offline via its cached suspension list (§4.4). *Accepted residual risk: a suspension issued while a device is offline takes effect on that device's next reconnect.*
- **Reactivate account** (CEO only): sets `ACTIVE`.
- **Refund** (CEO only): available from any transaction's detail view. Requires reason. Atomic multi-path write: balance credit + REFUND transaction record referencing the original transaction ID.

**Top-up flow**

1. Operator selects aggregator; clicks Top Up; panel slides open.
2. Enters amount (minimum ₦1,000); selects Cash or Bank Transfer; optional note.
3. Confirm → atomic multi-path write: `/aggregators/{id}/balance`, `last_active`, and `/transactions/{id}` (TOPUP).
4. Balance updates instantly via listener.
5. Safety net: if `card_fee_paid = false` (legacy/admin-imported accounts only — standard registration always sets it true), ₦1,000 CARD_FEE is deducted from this top-up in the same atomic write.

**RFID card replacement**

- Operator clicks Replace Card on profile.
- If balance ≥ ₦1,000: Scan New Card triggers the same scan-on-demand flow as registration.
- If balance < ₦1,000: button disabled with message *"Insufficient balance for card replacement fee (₦1,000). Collect cash and top up first."*
- On successful scan, the fee deduction runs as a **conditional RTDB transaction that aborts if balance < ₦1,000 at commit time** (the UI check is advisory only). Old UID recorded in the transaction note; `/rfid_index` updated (old key removed, new key claimed) in the same operation; CARD_FEE transaction created.

### 3.3 Module 3 – Batch Management

**Live batch feed**

- Real-time list of active batches — `onValue` listener on `/batches`
- Columns: Batch ID, Aggregator, Crates, Amount Charged, Status, Time Opened, QC Status, Stale Rate
- Status colours: OPEN (amber), QC_IN_PROGRESS (blue), COMPLETE (green), DISPATCHED (teal)
- Stale rate: amber indicator where `stale_rate = true`
- QC Status derivation: **Not scanned** (no `pre_coating`), **Scanning** (`pre_coating` present, no `analysis`), **Complete** (`analysis` present)

**Batch detail view**

- Full batch record: aggregator name/ID, crate count, amount charged, season, rate per crate, stale-rate flag, operator, hub, created_at, closed_at
- Payment details: payment_status, transaction ID reference. PENDING batches link to the Reconciliation queue (§4.5); FAILED batches link to the `/sync_errors` entry.
- QC data panel (when QC Scanner has written data): PRE readings, POST readings, Analysis (voc_reduction_pct, coating_mass_g_per_kg, temp_change, humidity_change, coating_effective verdict, formula used)
- Manual close (CEO only): if a device fails mid-session, CEO can set `batch_status` manually. Requires reason.

**Batch history**

- Filterable by date range, aggregator, hub, status, formula batch, stale rate
- Summary row: total crates, total revenue, average voc_reduction_pct for the filtered set
- Export filtered view to CSV

### 3.4 Module 4 – Pricing Management (CEO only)

TAPU v2 devices hold a **live RTDB listener on `/pricing/current` while awake and online**, so pricing changes reach online devices within 2 seconds. Devices additionally read pricing on every startup and cache it to SD for offline resilience. Offline devices pick up changes on next reconnect.

**Active pricing display**

| Field | Default | Notes |
|---|---|---|
| Active season | scarcity | Displayed on TAPU v2 home screen |
| Active rate per crate | ₦1,500 | Rate TAPU v2 charges |
| Scarcity rate | ₦1,500 | Reference |
| Glut rate | **₦875** | Reference *(corrected from erroneous ₦1,000 in v2.0)* |
| Crate deposit | ₦500 | Informational – post-MVP |
| Card fee | ₦1,000 | Deducted from first top-up |
| Last updated | Auto | TAPU v2 uses this to detect stale pricing (>24h) |

**Season toggle**

- CEO clicks Toggle Season (Scarcity ⇄ Glut)
- Confirmation modal: *"Devices online now update within 2 seconds; offline devices update on next reconnect. New rate: ₦[amount]. Confirm?"*
- On confirm: `active_rate`, `current_season`, `last_updated`, `updated_by` written; changelog entry created.

**Manual rate override**

- CEO can set a custom `active_rate` outside the standard season rates. Same confirmation modal. Custom rate flagged: *"Custom rate (not standard season rate)"*.

**Pricing change log:** last 20 entries from `/pricing/changelog` shown at bottom of page.

**Stale rate review:** lists all transactions where `stale_rate = true` — batch ID, aggregator, amount, date, rate used. CEO can annotate and mark Reviewed.

### 3.5 Module 5 – CEO Dashboard Overview

**Live key metrics** — all read from `/stats` (maintained aggregates, §2.9); never full-collection scans. Test accounts excluded at write time.

| Metric | Source |
|---|---|
| Total revenue today / week / month / all time | `/stats/daily`, `/stats/totals` |
| Total batches today | `/stats/daily/{today}.batch_count` |
| Total crates coated today | `/stats/daily/{today}.crate_count` |
| Active aggregators | `/stats/totals.active_aggregators` (maintained on status change) |
| Average VOC reduction % | `/stats/qc.voc_sum / voc_count` |
| Average coating mass g/kg | `/stats/qc.mass_sum / mass_count` |
| Stale rate transactions today | `/stats/daily/{today}.stale_rate_count` |

**Reconciliation queue** — panel listing transactions with `payment_status: PENDING` from offline sync (§4.5). CEO resolves each: confirm top-up received, or issue refund. Badge count shown when non-empty.

**Revenue charts** (Recharts): daily revenue line chart (last 30 days, from `/stats/daily`); top-10 aggregators bar chart (from `/stats/top_aggregators`).

**Device status strip** — one card per device: ID, type, online/offline, battery %, queued transaction count, last seen. Red card background if offline for **more than 30 continuous minutes during operating hours** (alert tier — distinct from the 10-minute *status* tier in §3.8; both thresholds are intentional).

### 3.6 Module 6 – R&D View (CEO + RND only)

Data sourced entirely from the QC Scanner.

- **Batch coating performance table:** all completed batches with QC data — Batch ID, Date, Aggregator, Crates, Formula, PRE voc_index, POST voc_index, VOC reduction %, Coating mass g/kg, Effective verdict (green YES / red NO). Filter: date range, hub, formula. Export CSV.
- **Performance charts:** voc_reduction_pct over time (line); coating mass per kg by batch (bar). Both filterable by formula batch for BIO-001 vs BIO-002 vs BIO-003 comparison.
- **Individual batch QC detail:** expandable full PRE/POST/analysis data. Sensor note: readings labelled `voc_index` (MQ-135 general VOC index, not certified ethylene).

### 3.7 Module 7 – Formula Management (CEO + RND only)

- **Formula list:** ID, Name, Date Created, Notes, Status (Active/Archived), Created By. Active first. QC Scanner picks up changes within 2 seconds via listener.
- **Add formula:** ID allocated via `/counters/formulas` transaction (BIO-001, BIO-002…). Fields: Name (required), Date prepared (required), Notes (optional). Active by default.
- **Archive formula:** sets `active = false`; removed from QC Scanner selection; historical batch references retained; still visible in R&D filters.

### 3.8 Module 8 – Device Management (CEO only)

**Device status table** — from `/devices/{device_id}/heartbeat`:

| Column | Description |
|---|---|
| Device ID | e.g. TAPU-KN-01, QC-KN-01 |
| Type | TAPU v2 or QC Scanner |
| Hub | e.g. Kano Hub – HUB-KN-01 |
| Status | **Online** (green) if last heartbeat <10 min during operating hours; **Offline** (red) if older; **Sleeping** (gray) outside operating hours; **Never connected** if no heartbeat ever |
| Battery | Green ≥20%, Amber 10–19%, Red <10% |
| WiFi | From `wifi_connected` |
| Queue | From `queued_tx_count` |
| Firmware | From `fw_version` |
| Last seen | Last heartbeat in WAT |

**Sync errors panel:** entries from `/sync_errors` (failed atomic writes after device retries, §4.5) with device, payload summary, and timestamp.

**Sensor errors panel:** entries from `/devices/{id}/sensor_errors` (§4.2) — sensor, error code, message, timestamp. Last 50, filterable by device.

**Scan request activity panel** — reads `/scan_request_log` (last 20). COMPLETE rows green; EXPIRED rows amber; PENDING-never-SCANNING rows red (device was offline/unresponsive).

### 3.9 Module 9 – Settings (CEO only)

- **User management:** create/disable dashboard users; assign role (`CEO`, `FIELD_OPERATOR`, `RND`)
- **Hub configuration:** hub IDs, market location dropdown options, and the target TAPU `device_id` per hub used by scan requests (MVP: one device per hub)
- **Operating hours:** configurable window (default 6AM–8PM WAT) used by device status logic
- **Device registry:** register device IDs and provision per-device secrets (§6.1)

---

## 4. TAPU v2 and QC Scanner Integration

### 4.1 What TAPU v2 writes to Firebase

| Action | Firebase operation |
|---|---|
| Device startup | Reads `/pricing/current` and the suspension list; caches both to SD. Subscribes to `/pricing/current` and its `/scan_requests` filter while awake. |
| Card tap – identity check | Reads `/aggregators` by `rfid_uid` (via `/rfid_index`). Rejects if `account_status = SUSPENDED` (online check, or SD cache when offline). |
| Payment confirmed | Single atomic multi-path PATCH: `/aggregators/{id}` (balance, `total_batches`+1, `total_crates_coated`+n, `last_active`), `/transactions/{txn_id}` (create), `/batches/{batch_id}` (create, OPEN). Write-if-absent semantics (§4.5). |
| Scan request received (listener) | Sets status `SCANNING` within 2 seconds |
| Card tapped in scan mode | Writes uid, `COMPLETE`, `scanned_at`; returns to home |
| Scan timeout (60s) | Sets `EXPIRED`; returns to home |
| Heartbeat (every 5 min) | `/devices/{device_id}/heartbeat`: battery_pct, wifi_connected, queued_tx_count, fw_version, timestamp |
| End of day sync | Uploads queued offline transactions chronologically (§4.5). Writes `/daily_logs/{date}`: batch count, revenue, crates, hub_id. |

### 4.2 What QC Scanner writes to Firebase

| Action | Firebase operation |
|---|---|
| PRE scan complete | `/batches/{id}/pre_coating` + `batch_status: QC_IN_PROGRESS` |
| POST scan complete | `/batches/{id}/post_coating` |
| Analysis complete | `/batches/{id}/analysis` + `batch_status: COMPLETE` + `closed_at` |
| Heartbeat (every 5 min) | Same payload as TAPU v2 |
| Sensor error | Writes `/devices/{device_id}/sensor_errors/{push_id}` per the binding schema below. |
| End of day sync | Uploads queued offline scan data chronologically |

**Sensor error schema (binding — firmware change requests require CEO approval):**

| Field | Type | Description |
|---|---|---|
| sensor | String | `MQ135` \| `DHT22` \| `MLX90614` \| `HX711` |
| error_code | String | `INIT_FAIL` \| `READ_TIMEOUT` \| `OUT_OF_RANGE` \| `CALIBRATION_DRIFT` \| `DISCONNECTED` |
| message | String | Human-readable detail, max 200 chars |
| reading_raw | Number | Raw value that triggered the error — null if none |
| during | String | `PRE_SCAN` \| `POST_SCAN` \| `IDLE` |
| batch_id | String | Batch in progress when the error occurred — null if idle |
| fw_version | String | Firmware version at time of error |
| timestamp | Timestamp | When the error occurred (device clock) |

Errors queue to SD when offline and upload on reconnect, same as other writes. Security rules: create-only, `auth.uid === device_id`.

### 4.3 Real-time dashboard updates

| Firebase path | Dashboard behaviour on update |
|---|---|
| `/batches` | Batch list/live feed refresh instantly |
| `/transactions` | Balance and transaction history refresh instantly |
| `/aggregators` | List balances refresh after payment or top-up |
| `/scan_requests/{session_id}` | Registration modal reacts to SCANNING/COMPLETE/EXPIRED |
| `/devices/{id}/heartbeat` | Sidebar dots and Device Management update in real time |
| `/pricing/current` | Pricing page reflects current values |
| `/formulas` | Formula page and QC Scanner selection update within 2s |
| `/stats` | Overview metrics update in real time |

### 4.4 Offline handling

- Both devices queue failed writes to SD; on reconnect or end-of-day sync, queued data uploads chronologically.
- **Idempotency:** enforced by RTDB security rules — creates on `/transactions/{id}` and `/batches/{id}` are allowed only if the record does not already exist (`!data.exists()`). Firmware treats a rules rejection as already-synced and dequeues the item. (The dashboard plays no role in duplicate detection.)
- **Stale pricing (single definition):** a transaction is marked `stale_rate: true` iff the device could not fetch fresh pricing at transaction time **and** the cached pricing's `last_updated` is more than 24 hours old. A fresh cache (<24h) is not stale.
- **Suspension cache:** TAPU caches the suspended-UID list to SD alongside pricing; offline taps are checked against it.
- Dashboard shows queued transaction count per device in the Overview device strip.

### 4.5 Offline payment reconciliation protocol

Firebase is the **balance authority**; the device's SD cache is advisory.

1. Offline payments are accepted only if the SD-cached balance covers the charge at tap time.
2. On sync, queued transactions replay chronologically by device timestamp.
3. If a replayed transaction would drive the live balance negative (e.g. concurrent dashboard activity while the device was offline), it is written with `payment_status: PENDING` (balance not debited below zero) and appears in the **Reconciliation queue** on the CEO Overview. The CEO resolves it by recording a cash top-up or issuing a refund/void with reason. **SLA:** PENDING items must be resolved within 3 business days; if unresolved after 7 days the aggregator account is auto-suspended (with note) until settled.
4. If an atomic PATCH fails after the device's retry budget, the payload is logged to `/sync_errors` with `payment_status: FAILED` context and surfaced on Device Management. No partial writes occur (multi-path PATCH is all-or-nothing).

---

## 5. UI / UX Requirements

### 5.1 General

- Responsive: desktop first, tablet second. **Mobile support required only for: aggregator registration, top-up, and aggregator profile view.**
- Dark sidebar navigation – consistent with existing tazemi.ng design language
- Brand colours: Deep Earth `#085041` · Harvest Teal `#1D9E75` · Fresh Mist `#E1F5EE` · Tomato `#D85A30`
- All monetary values: ₦ symbol with comma formatting e.g. ₦37,500
- All timestamps in West Africa Time (WAT, UTC+1)
- All tables paginated – 20 rows default, configurable to 50 or 100
- Loading states on all async operations – spinner or skeleton
- Error states on all failed Firebase operations – toast, bottom-right
- Confirmation modals on all destructive actions (suspend, refund, pricing change, manual batch close)

### 5.2 Navigation structure

- Sidebar: Overview | Aggregators | Batches | R&D | Formulas | Devices | Settings
- Role-based visibility: R&D and Formulas → CEO + RND. Devices and Settings → CEO only.
- Active route highlighted; Tazemi logo at top
- Device status indicators at bottom of sidebar (one per device); clicking a dot navigates to Device Management filtered to that device

### 5.3 Sidebar device status indicators

Real-time from `/devices/{id}/heartbeat`. **Advisory only** — scan availability is verified by the 5-second liveness check (§2.6).

| Indicator | Condition |
|---|---|
| Green dot | Last heartbeat within 10 minutes |
| Red dot | No heartbeat for >10 minutes during operating hours |
| Amber dot | Online but battery <20% |
| Gray dot | Outside operating hours – device may be sleeping |

---

## 6. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| Performance | Dashboard loads within 3s on standard Nigerian 4G. All queries paginated; dashboard metrics read `/stats` aggregates — never full-collection scans. |
| Real-time latency | Listener updates reflect within 2 seconds of a write. |
| Uptime | 99% of operating hours (6AM–8PM WAT). Firebase handles backend availability. |
| Security | Rules deny unauthenticated read/write. Role-based per-collection access. NIN/BVN encrypted server-side (KMS), ciphertext in Firestore only, masked elsewhere; decryption CEO-only and audit-logged. |
| Device authentication | See §6.1. No API keys or service-account credentials embedded in firmware. |
| Data integrity | All financial writes atomic (RTDB multi-path). Idempotent device writes enforced by `!data.exists()` rules. Fee deductions use conditional transactions. |
| Scan request security | Scan requests created only by authenticated dashboard users. Devices may write only to `/scan_requests/{id}` where `device_id === auth.uid`. |
| Browser support | Chrome (primary), Firefox, Safari. IE not supported. |
| Data export | CSV for aggregators, batches, transactions, QC data. Excel (.xlsx) stretch goal, Phase 5. |

### 6.1 Device identity and authentication

- Each device is provisioned at flash time with a `device_id` and a per-device secret (registered via Settings → Device registry).
- On boot, the device exchanges its secret with a Cloud Function for a **Firebase custom token** with `uid = device_id` and claim `role: "device"`; it refreshes the token before expiry.
- Security rules scope device writes: `/devices/{$device_id}/**` and `/scan_requests/{$id}` require `auth.uid === device_id`; financial multi-path writes are restricted to the shapes defined in §4.1/§4.2 and to authenticated device identities.
- **Provisioning:** secrets are 32-byte random values generated in Settings → Device registry; only a SHA-256 hash is stored (Firestore `/device_secrets/{device_id}`). The plaintext secret is shown once and flashed to the device over USB serial via the provisioning script — never transmitted over the network except during token exchange (TLS).
- **Rotation/revocation:** regenerating a secret in Settings marks the old hash revoked; the token-minting Cloud Function rejects revoked secrets. Custom tokens expire after 1 hour, so revocation takes full effect within ≤1 hour.

### 6.2 NIN/BVN handling

- Collected in the registration form; transmitted only to the `registerAggregator` callable over TLS.
- Encrypted server-side (AES-256-GCM, KMS-managed key); ciphertext stored at Firestore `/identity/{aggregator_id}`; raw value never persisted in RTDB, logs, or client state.
- RTDB stores `nin_or_bvn_masked` for display.
- Decryption available only via a CEO-role callable with an audit-log entry per access.

---

## 7. Development Phases

> **Phase 1 is the absolute priority.** TAPU v2 cannot be deployed in the field until Phase 1 is complete. An aggregator must be registerable end-to-end from the dashboard – form filled, RFID card scanned via TAPU v2, UID auto-filled, account saved, balance loaded – before the first payment can be processed.

| Phase | Modules | Priority | Target |
|---|---|---|---|
| 1 | Authentication + device auth (§6.1) + Module 1 (Registration with RFID scan) + Module 2 (Aggregator Management) + Module 4 (Pricing Management) + `registerAggregator` / stats / sweep Cloud Functions | Critical | Week 1–2 |
| 2 | Module 3 (Batch Management) + Module 5 (CEO Overview incl. Reconciliation queue) | High | Week 3–4 |
| 3 | Module 6 (R&D View) + Module 7 (Formula Management) + Module 8 (Device Management) + Module 9 (Settings) | Medium | Week 5–6 |
| 4 | Daily summary page + Data export (CSV) + Analytics charts | Low | Week 7–8 |
| 5 | Post-MVP: Crate Management, WhatsApp alerts, Lagos Contact role, PDF generation | Post-MVP | TBD |

### 7.1 Phase 1 definition of done

- Firebase Authentication working for all 3 MVP roles (`CEO`, `FIELD_OPERATOR`, `RND`)
- Device custom-token authentication working for at least one provisioned TAPU v2 (§6.1)
- Aggregator registration complete: form fields, RFID scan-on-demand, 5s liveness check, 60s/65s timeouts, manual fallback with uniqueness validation, atomic save with card-fee deduction via `registerAggregator`
- NIN/BVN encrypted path working end-to-end (§6.2)
- Top-up flow with atomic balance update; card-replacement conditional transaction
- Aggregator list with search and filter; phone/RFID uniqueness indexes enforced by rules
- Pricing management: season toggle + manual rate override + changelog + stale-rate review; glut rate = ₦875
- Device status indicator in sidebar from `/devices/{id}/heartbeat`
- Scan Card disabled when device offline; "device not responding" path verified
- Scan-request archival + hourly sweep function deployed
- A new aggregator can register and immediately process their first payment on TAPU v2 without any manual Firebase editing

---

## 8. Decisions Log (formerly Open Questions)

All v2.0 open questions are now resolved. Decisions below are binding unless a change request is approved by the CEO.

| Question | Decision | Owner | Spec |
|---|---|---|---|
| Firebase project credentials | Shared via 1Password vault "Tazemi-Firebase" (CEO owner). Runtime config via hosting-provider environment variables; credentials never committed to the repository. | CEO | — |
| Device secret provisioning and rotation | Generated in Settings → Device registry; hash-only storage; USB-serial flashing; revocation effective ≤1h via 1-hour token expiry. | Lead Dev | §6.1 |
| Photo storage | Default project bucket, `aggregator-photos/{aggregator_id}.jpg`; client-side resize to 800px; role-restricted write, authenticated read. | Lead Dev | §3.1 |
| Reconciliation SLA | PENDING resolved within 3 business days; auto-suspend after 7 days until settled. | CEO | §4.5 |
| QC Scanner sensor error logging | `/devices/{device_id}/sensor_errors/{push_id}` — binding schema defined in §4.2 (sensor, error_code, message, reading_raw, during, batch_id, fw_version, timestamp). | Lead Dev | §4.2, §3.8 |
| PDF generation (daily summary) | Client-side jsPDF for MVP — no server cost, offline-capable. Revisit Cloud Function rendering only if layouts outgrow jsPDF. | Lead Dev | Phase 4 |
| Data export format | CSV only for MVP. Excel (.xlsx) deferred to Phase 5 as stretch goal. | CEO | §6 |
| QR crate-return scanning | Browser camera API (`getUserMedia` + jsQR) in the existing dashboard — no dedicated app. | Lead Dev | Phase 5 |
| WhatsApp Business API | Twilio. CEO creates the account before Phase 5; API keys held in Cloud Functions Secret Manager, never client-side. | CEO | Phase 5 |

**No open items remain.** The document is spec-complete; any future change requires a formal change request approved by the CEO.

---

## Appendix A – Change log v2.0 → v2.1

| # | Change |
|---|---|
| 1 | Glut rate unified at ₦875 (§2.4, §3.4) |
| 2 | Pricing propagation: live device listener + startup read + SD cache; modal text corrected (§3.4) |
| 3 | Scan-request immediate delete replaced with archival to `/scan_request_log`; Module 8 panel reads the log (§2.6, §3.8) |
| 4 | Single `stale_rate` definition: offline **and** cache >24h old (§2.2, §2.3, §4.4) |
| 5 | Aggregator counters (`total_batches`, `total_crates_coated`) written by TAPU's atomic PATCH, not the dashboard (§2.1, §4.1) |
| 6 | Idempotency enforced by `!data.exists()` security rules + firmware write-if-absent; dashboard removed as duplicate-detection actor (§4.4) |
| 7 | New offline payment reconciliation protocol; Reconciliation queue on CEO Overview (§4.5, §3.5) |
| 8 | ID generation made collision-safe: Firestore counter transactions for AGG/BIO IDs; device-scoped batch IDs `BATCH-{device_id}-{seq}` (§2.1, §2.2, §2.5) |
| 9 | `card_fee_paid = false` documented as legacy/safety-net path only (§2.1, §3.2) |
| 10 | REFUND flow defined (CEO-only, atomic); PENDING/FAILED lifecycles defined (§3.2, §4.5) |
| 11 | Card-replacement fee is a conditional transaction aborting if balance insufficient at commit (§3.2) |
| 12 | Device authentication specified: per-device secret → Firebase custom token, `auth.uid === device_id` rules (§6.1) |
| 13 | NIN/BVN: server-side KMS encryption via `registerAggregator`; ciphertext in Firestore only; audited CEO-only decryption (§6.2) |
| 14 | RFID UID uniqueness via `/rfid_index` no-overwrite rule; manual entry validated (§2.8, §3.1) |
| 15 | Suspended-UID list cached to device SD for offline rejection; residual risk documented (§3.2, §4.4) |
| 16 | Explicit RTDB/Firestore assignment table added (§2.0) |
| 17 | `/stats` maintained aggregates replace full-collection scans for Overview metrics (§2.9, §3.5) |
| 18 | `is_test` flag denormalised onto batches/transactions at write time (§2.2, §2.3) |
| 19 | TAPU 2s polling replaced with RTDB listener; dashboard 5s SCANNING liveness check added (§2.6, §3.1) |
| 20 | Stuck SCANNING recovery: dashboard 65s expiry + hourly sweep of all non-COMPLETE records (§2.6) |
| 21 | Canonical roles `CEO` / `FIELD_OPERATOR` / `RND`; all CTO/Formulation references replaced (§1.2) |
| 22 | Settings defined as Module 9, CEO only, Phase 3 (§3.9) |
| 23 | `last_active` field added to aggregator schema (§2.1) |
| 24 | 10-min status vs 30-min alert thresholds documented as intentional tiers (§3.5, §3.8) |
| 25 | Dashboard transaction ID format `TXN-DASH-{operator_uid_short}-{millis}` (§2.3) |
| 26 | `rate_per_crate` description no longer hardcodes rates (§2.2) |
| 27 | Phone uniqueness via `/phone_index` no-overwrite rule, atomically written (§2.8) |
| 28 | §5.1 mobile-scope sentence disambiguated |
| 29 | Heartbeat example timestamp updated to a current epoch value (§2.7) |

---

*Tazemi Dashboard PRD v2.1 | July 2026 | © 2026 Tazemi Agritech | Confidential – hello@tazemi.ng | tazemi.ng*
