import { useEffect, useState, useCallback, useRef } from "react";
import { onValue, ref, set, remove } from "firebase/database";
import { database } from "../services/firebaseClient";

/**
 * useRFIDScan Hook
 * 
 * Custom React Hook for managing RFID card scan requests.
 * 
 * Flow:
 * 1. Component calls startScan()
 * 2. Hook generates UUID, creates scan_request in Firebase
 * 3. Hook sets up real-time listener on that scan_request
 * 4. TAPU v2 detects the request and taps a card
 * 5. TAPU v2 writes UID to Firebase, sets status COMPLETE
 * 6. Hook listener detects change, extracts UID, cleans up
 * 7. Component receives uid and can use it
 * 
 * This hook SEPARATES Firebase logic from UI components.
 * Components import it and don't need to know Firebase details.
 */

export function useRFIDScan(deviceId) {
    const [scanning, setScanning] = useState(false);
    const [uid, setUid] = useState("");
    const [error, setError] = useState("");
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Refs to track current session and cleanup
    const sessionIdRef = useRef(null);
    const unsubscribeRef = useRef(null);
    const timerRef = useRef(null);
    const timeoutRef = useRef(null);

    /**
     * Generate a simple UUID v4
     * (Simple implementation - for production, use a library)
     */
    const generateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    /**
     * Start a new RFID scan session
     * 
     * What happens:
     * 1. Generate unique session ID (UUID)
     * 2. Create scan_request in Firebase at /scan_requests/{sessionId}
     * 3. Set status to PENDING - TAPU v2 will detect this
     * 4. Start 60-second countdown
     * 5. Set up listener for when TAPU completes the scan
     */
    const startScan = useCallback(async () => {
        if (scanning) return; // Already scanning

        try {
            setError("");

            // Generate unique session ID
            const sessionId = generateUUID();
            sessionIdRef.current = sessionId;

            // Create scan request in Firebase
            // TAPU v2 polls /scan_requests for status=PENDING requests
            const scanRequestPath = `scan_requests/${sessionId}`;
            const scanRequest = {
                session_id: sessionId,
                device_id: deviceId,
                status: "PENDING", // TAPU v2 looks for this
                created_at: Date.now(),
                created_by: "operator_id", // TODO: Get from auth context
            };

            // Write to Firebase
            await set(ref(database, scanRequestPath), scanRequest);

            console.log(`[RFID] Scan started: ${sessionId}`);
            setScanning(true);
            setTimeRemaining(60);

            // Set up listener for TAPU v2 response
            listenForCompletion(sessionId);

            // Start countdown timer (decrements timeRemaining every second)
            startCountdown(sessionId);

            // Set timeout - if no scan after 60 seconds, TAPU v2 will set EXPIRED
            // We check for this after 60 seconds
            timeoutRef.current = setTimeout(() => {
                handleTimeout(sessionId);
            }, 61000); // 61 seconds to account for network delay

        } catch (err) {
            setError(`Failed to start scan: ${err.message}`);
            console.error("[RFID] Error starting scan:", err);
            setScanning(false);
        }
    }, [deviceId, scanning]);

    /**
     * Start countdown timer (UI shows 60, 59, 58... seconds)
     */
    const startCountdown = (sessionId) => {
        let remaining = 60;
        setTimeRemaining(remaining);

        timerRef.current = setInterval(() => {
            remaining -= 1;
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                clearInterval(timerRef.current);
            }
        }, 1000);
    };

    /**
     * Listen for scan request completion
     * 
     * Watches /scan_requests/{sessionId} for changes.
     * When TAPU v2 taps the card, it will write:
     * {
     *   status: "COMPLETE",
     *   uid: "A3B4C5D6",
     *   scanned_at: timestamp
     * }
     */
    const listenForCompletion = useCallback((sessionId) => {
        try {
            const scanPath = ref(database, `scan_requests/${sessionId}`);

            // Set up real-time listener
            unsubscribeRef.current = onValue(scanPath, (snapshot) => {
                if (!snapshot.exists()) {
                    console.log("[RFID] Scan request not found");
                    return;
                }

                const scanData = snapshot.val();
                console.log("[RFID] Scan data updated:", scanData);

                // Case 1: TAPU v2 detected the request
                if (scanData.status === "SCANNING") {
                    console.log("[RFID] TAPU device is now in scan mode");
                    // UI can show "waiting for card..." at this point
                }

                // Case 2: Card was tapped successfully
                if (scanData.status === "COMPLETE" && scanData.uid) {
                    console.log(`[RFID] Scan successful! UID: ${scanData.uid}`);

                    // Stop countdown
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);

                    // Set the UID (auto-fills form field)
                    setUid(scanData.uid);
                    setScanning(false);

                    // Clean up scan request from Firebase
                    // PRD requirement: "Dashboard must delete the scan request record"
                    cleanupScanRequest(sessionId);
                }

                // Case 3: Scan timeout (TAPU v2 didn't receive card tap within 60s)
                if (scanData.status === "EXPIRED") {
                    console.log("[RFID] Scan timeout - no card tapped");
                    setError("Scan timed out. No card detected. Try again or enter manually.");
                    setScanning(false);

                    // Stop countdown
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);

                    // Clean up
                    cleanupScanRequest(sessionId);
                }
            });

        } catch (err) {
            setError(`Failed to listen for scan: ${err.message}`);
            console.error("[RFID] Error setting up listener:", err);
        }
    }, []);

    /**
     * Handle timeout - 60 seconds with no scan
     * This runs on the dashboard side as a safety net
     * TAPU v2 should have set status=EXPIRED by now
     */
    const handleTimeout = useCallback((sessionId) => {
        console.log("[RFID] Timeout handler triggered");

        if (scanning) {
            setError("Scan timed out. Try again or enter UID manually.");
            setScanning(false);
        }

        // Try to clean up (might already be cleaned by listener)
        cleanupScanRequest(sessionId);
    }, [scanning]);

    /**
     * Clean up scan request from Firebase
     * PRD: "Dashboard must delete the scan request record immediately 
     * after the UID is saved to the aggregator record"
     */
    const cleanupScanRequest = async (sessionId) => {
        try {
            const scanPath = ref(database, `scan_requests/${sessionId}`);
            await remove(scanPath);
            console.log(`[RFID] Cleaned up scan request: ${sessionId}`);
        } catch (err) {
            console.error("[RFID] Error cleaning up scan request:", err);
        }
    };

    /**
     * Cancel ongoing scan
     * User clicked Cancel button or is switching away
     */
    const cancelScan = useCallback((sessionId) => {
        if (!sessionId && !sessionIdRef.current) return;

        const id = sessionId || sessionIdRef.current;
        console.log(`[RFID] Cancelling scan: ${id}`);

        // Stop countdown
        if (timerRef.current) clearInterval(timerRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Stop listening
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        // Delete scan request from Firebase
        cleanupScanRequest(id);

        // Reset state
        setScanning(false);
        setUid("");
        setError("");
        setTimeRemaining(0);
        sessionIdRef.current = null;
    }, []);

    /**
     * Cleanup on component unmount
     * Prevents memory leaks: cancel ongoing scan if component is destroyed
     */
    useEffect(() => {
        return () => {
            if (scanning) {
                cancelScan();
            }
        };
    }, [scanning, cancelScan]);

    return {
        scanning,           // boolean: is scan in progress?
        uid,                // string: RFID UID if scan succeeded
        error,              // string: error message if something went wrong
        timeRemaining,      // number: countdown timer (60 → 0)
        startScan,          // function: begin RFID scan session
        listenForCompletion, // function: watch for TAPU v2 response (called by startScan)
        handleTimeout,      // function: handle 60-second timeout
        cancelScan,         // function: cancel ongoing scan
    };
}
