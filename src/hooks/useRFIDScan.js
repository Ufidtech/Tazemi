import { useEffect, useState, useCallback, useRef } from "react";
import { onValue, ref, set } from "firebase/database";
import { database } from "../services/firebaseClient";
import {
  archiveScanRequest,
  expireScanRequest,
  deleteScanRequest,
} from "../services/tazemiDb";

/**
 * useRFIDScan — RFID scan-on-demand hook (PRD v2.1 §2.6, §3.1)
 *
 * Flow:
 * 1. startScan() writes /scan_requests/{sessionId} with status PENDING
 * 2. TAPU v2's listener picks it up and sets SCANNING within 2s
 * 3. Liveness check (§3.1 step 5): if no SCANNING within 5s →
 *    status "not_responding" (device offline/unresponsive)
 * 4. Card tap → TAPU writes uid + COMPLETE → hook auto-fills uid
 * 5. Dashboard-side expiry (§2.6): if no COMPLETE by 65s, the hook
 *    sets EXPIRED itself (covers a device dying mid-scan)
 * 6. Completed requests are archived to /scan_request_log AFTER the
 *    aggregator is saved (caller passes sessionId to the register
 *    service). Expired/cancelled requests are archived/removed here.
 */

const LIVENESS_MS = 5000; // §3.1 step 5
const EXPIRY_MS = 65000; // §2.6 dashboard-side expiry
const COUNTDOWN_S = 60;

function uuidv4() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useRFIDScan(deviceId, operatorId) {
  // status: idle | pending | scanning | complete | expired | not_responding | error
  const [status, setStatus] = useState("idle");
  const [uid, setUid] = useState("");
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionId, setSessionId] = useState(null);

  const unsubscribeRef = useRef(null);
  const timersRef = useRef({ countdown: null, liveness: null, expiry: null });
  const sessionRef = useRef(null);

  const clearTimers = () => {
    const t = timersRef.current;
    if (t.countdown) clearInterval(t.countdown);
    if (t.liveness) clearTimeout(t.liveness);
    if (t.expiry) clearTimeout(t.expiry);
    timersRef.current = { countdown: null, liveness: null, expiry: null };
  };

  const stopListening = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  };

  const startScan = useCallback(async () => {
    if (sessionRef.current) return; // scan already in progress

    try {
      setError("");
      setUid("");

      const id = uuidv4();
      sessionRef.current = id;
      setSessionId(id);

      await set(ref(database, `scan_requests/${id}`), {
        session_id: id,
        device_id: deviceId,
        status: "PENDING",
        uid: null,
        created_at: Date.now(),
        scanned_at: null,
        created_by: operatorId || "unknown",
      });

      setStatus("pending");
      setTimeRemaining(COUNTDOWN_S);

      // Countdown for the modal UI
      let remaining = COUNTDOWN_S;
      timersRef.current.countdown = setInterval(() => {
        remaining -= 1;
        setTimeRemaining(Math.max(0, remaining));
        if (remaining <= 0) clearInterval(timersRef.current.countdown);
      }, 1000);

      // §3.1 step 5 — liveness check: SCANNING must arrive within 5s
      timersRef.current.liveness = setTimeout(() => {
        setStatus((s) => {
          if (s !== "pending") return s;
          setError("Device not responding. Retry or enter the UID manually.");
          return "not_responding";
        });
      }, LIVENESS_MS);

      // §2.6 — dashboard-side expiry at 65s (device may have died mid-scan)
      timersRef.current.expiry = setTimeout(async () => {
        if (sessionRef.current !== id) return;
        clearTimers();
        stopListening();
        sessionRef.current = null;
        setStatus("expired");
        setError("Scan timed out. No card detected. Try again or enter manually.");
        await expireScanRequest(id).catch(() => {});
      }, EXPIRY_MS);

      // Real-time listener on the scan request
      unsubscribeRef.current = onValue(ref(database, `scan_requests/${id}`), (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();

        if (data.status === "SCANNING") {
          if (timersRef.current.liveness) clearTimeout(timersRef.current.liveness);
          setStatus("scanning");
        }

        if (data.status === "COMPLETE" && data.uid) {
          clearTimers();
          stopListening();
          setUid(String(data.uid).toUpperCase());
          setStatus("complete");
          // NOT archived here — §2.6 archival happens after the
          // aggregator record is saved (registerAggregator does it).
        }

        if (data.status === "EXPIRED") {
          clearTimers();
          stopListening();
          sessionRef.current = null;
          setStatus("expired");
          setError("Scan timed out. No card detected. Try again or enter manually.");
          archiveScanRequest(id).catch(() => {});
        }
      });
    } catch (err) {
      setError(`Failed to start scan: ${err.message}`);
      setStatus("error");
      sessionRef.current = null;
    }
  }, [deviceId, operatorId]);

  const cancelScan = useCallback(async () => {
    const id = sessionRef.current;
    clearTimers();
    stopListening();
    sessionRef.current = null;
    setSessionId(null);
    setStatus("idle");
    setUid("");
    setError("");
    setTimeRemaining(0);
    if (id) await deleteScanRequest(id).catch(() => {});
  }, []);

  /** Reset hook state after the caller has consumed the UID. */
  const resetScan = useCallback(() => {
    clearTimers();
    stopListening();
    sessionRef.current = null;
    setSessionId(null);
    setStatus("idle");
    setUid("");
    setError("");
    setTimeRemaining(0);
  }, []);

  // Cleanup on unmount — cancel any in-flight request
  useEffect(() => {
    return () => {
      clearTimers();
      stopListening();
      const id = sessionRef.current;
      if (id) deleteScanRequest(id).catch(() => {});
    };
  }, []);

  return {
    scanning: status === "pending" || status === "scanning",
    status, // idle | pending | scanning | complete | expired | not_responding | error
    uid,
    error,
    timeRemaining,
    sessionId, // pass to registerAggregator for post-save archival (§2.6)
    startScan,
    cancelScan,
    resetScan,
  };
}
