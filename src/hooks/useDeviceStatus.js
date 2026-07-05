import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { database } from "../services/firebaseClient";

/**
 * useDeviceStatus — device heartbeat monitor (PRD v2.1 §3.8, §5.3)
 *
 * Subscribes to /devices/{deviceId}/heartbeat and derives:
 * - ONLINE           last heartbeat < 10 min, inside operating hours
 * - OFFLINE          last heartbeat ≥ 10 min, inside operating hours
 * - SLEEPING         outside operating hours (6AM–8PM WAT)
 * - NEVER_CONNECTED  no heartbeat has ever been written
 *
 * Battery tier (§3.8): green ≥20%, amber 10–19%, red <10%.
 * The 30-minute alert tier (§3.5 overview red card) is exposed as
 * `alerting` — distinct from the 10-minute status tier by design (§8/#24).
 */

const ONLINE_WINDOW_MS = 10 * 60 * 1000;
const ALERT_WINDOW_MS = 30 * 60 * 1000;
const OPERATING_START_WAT = 6; // 6AM WAT
const OPERATING_END_WAT = 20; // 8PM WAT

/** Current hour in West Africa Time (UTC+1). */
function watHour(now = new Date()) {
  return (now.getUTCHours() + 1) % 24;
}

export function isOperatingHours(now = new Date()) {
  const h = watHour(now);
  return h >= OPERATING_START_WAT && h < OPERATING_END_WAT;
}

export function deriveDeviceStatus(heartbeat, now = Date.now()) {
  if (!heartbeat || !heartbeat.timestamp) return "NEVER_CONNECTED";
  // Device timestamps may be in seconds (ESP32) or milliseconds
  const ts = heartbeat.timestamp < 1e12 ? heartbeat.timestamp * 1000 : heartbeat.timestamp;
  const age = now - ts;
  if (!isOperatingHours(new Date(now)) && age >= ONLINE_WINDOW_MS) return "SLEEPING";
  return age < ONLINE_WINDOW_MS ? "ONLINE" : "OFFLINE";
}

export function batteryTier(batteryPct) {
  if (batteryPct == null) return "unknown";
  if (batteryPct >= 20) return "green";
  if (batteryPct >= 10) return "amber";
  return "red";
}

export function useDeviceStatus(deviceId) {
  // Snapshot of { heartbeat, loaded, now } — recomputed on every heartbeat
  // write and every 30s, so a silent device flips to OFFLINE on time.
  const [snapshot, setSnapshot] = useState({ heartbeat: null, loaded: false, now: 0 });

  useEffect(() => {
    if (!database || !deviceId) return undefined;
    let latest = null;
    let loaded = false;
    const publish = () => setSnapshot({ heartbeat: latest, loaded, now: Date.now() });
    const unsubscribe = onValue(ref(database, `devices/${deviceId}/heartbeat`), (snap) => {
      latest = snap.exists() ? snap.val() : null;
      loaded = true;
      publish();
    });
    const interval = setInterval(publish, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [deviceId]);

  return useMemo(() => {
    const { heartbeat, loaded, now } = snapshot;
    const status = deriveDeviceStatus(heartbeat, now);
    const ts = heartbeat?.timestamp
      ? heartbeat.timestamp < 1e12
        ? heartbeat.timestamp * 1000
        : heartbeat.timestamp
      : null;
    return {
      loaded,
      heartbeat,
      status, // ONLINE | OFFLINE | SLEEPING | NEVER_CONNECTED
      online: status === "ONLINE",
      alerting: status === "OFFLINE" && ts !== null && now - ts >= ALERT_WINDOW_MS, // §3.5 red card
      battery: heartbeat?.battery_pct ?? null,
      batteryTier: batteryTier(heartbeat?.battery_pct),
      lowBattery: (heartbeat?.battery_pct ?? 100) < 20,
      wifiConnected: heartbeat?.wifi_connected ?? false,
      queuedTxCount: heartbeat?.queued_tx_count ?? 0,
      fwVersion: heartbeat?.fw_version ?? null,
      lastSeen: ts,
    };
  }, [snapshot]);
}
