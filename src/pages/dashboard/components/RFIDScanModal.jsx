/**
 * RFIDScanModal Component
 *
 * Presentational component - shows modal while waiting for RFID scan.
 * No Firebase logic - parent (AggregatorRegistration) manages the hook.
 *
 * Three states:
 * 1. SCANNING: Waiting for card tap. Shows timer (60s counting down).
 * 2. TIMEOUT: 60s passed, no card. Offers retry or manual entry.
 * 3. COMPLETE: UID received! Shows success, then closes.
 *
 * Props:
 * - isOpen: boolean - show/hide modal
 * - status: "scanning" | "timeout" | "complete"
 * - timeRemaining: number - seconds left (60 → 0)
 * - uid: string - RFID UID if scan successful
 * - onRetry: () => void - clicked "Try Again" button
 * - onManualEntry: () => void - clicked "Enter Manually" button
 * - onCancel: () => void - clicked Cancel or X button
 * - onConfirm: () => void - clicked "Continue" after success
 */

export default function RFIDScanModal({
  isOpen,
  status,
  timeRemaining,
  uid,
  onRetry,
  onManualEntry,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    // Modal overlay (semi-transparent background)
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* === SCANNING STATE === */}
        {status === "scanning" && (
          <div className="text-center space-y-6">
            {/* Spinner animation */}
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-gray-300 border-t-teal rounded-full animate-spin"></div>
            </div>

            <h2 className="text-2xl font-black text-deep">
              Waiting for Card Scan...
            </h2>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-semibold mb-2">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>TAPU device screen will show "SCAN MODE" (amber screen)</li>
                <li>Tap the RFID card on the TAPU device</li>
                <li>UID will auto-fill when scan completes</li>
              </ol>
            </div>

            {/* Countdown timer */}
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Time remaining:</p>
              <div className="text-5xl font-black text-teal font-mono">
                {timeRemaining}
              </div>
              <p className="text-xs text-gray-500 mt-1">seconds</p>
            </div>

            {/* Cancel button */}
            <button
              onClick={onCancel}
              className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Cancel Scan
            </button>
          </div>
        )}

        {/* === TIMEOUT STATE === */}
        {status === "timeout" && (
          <div className="text-center space-y-6">
            {/* Error icon */}
            <div className="text-6xl text-tomato">⏱️</div>

            <h2 className="text-2xl font-black text-deep">Scan Timed Out</h2>

            <p className="text-gray-700">
              No card was tapped within 60 seconds. TAPU device has returned to
              home screen.
            </p>

            {/* Error details box */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">Common reasons:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>TAPU device is offline or not connected to WiFi</li>
                <li>Card was not detected by TAPU reader</li>
                <li>Network delay prevented communication</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={onRetry}
                className="w-full px-4 py-3 bg-teal text-white rounded-lg font-semibold hover:bg-deep transition"
              >
                Try Again
              </button>

              <button
                onClick={onManualEntry}
                className="w-full px-4 py-3 border-2 border-teal text-teal rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Enter UID Manually
              </button>

              <button
                onClick={onCancel}
                className="w-full px-4 py-3 text-gray-700 text-sm hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* === COMPLETE STATE === */}
        {status === "complete" && uid && (
          <div className="text-center space-y-6">
            {/* Success icon */}
            <div className="text-6xl text-teal">✓</div>

            <h2 className="text-2xl font-black text-teal">Scan Successful!</h2>

            <p className="text-gray-700">
              RFID card has been successfully scanned and UID captured.
            </p>

            {/* UID display */}
            <div className="bg-teal bg-opacity-10 border-2 border-teal rounded-lg p-4">
              <p className="text-xs text-teal font-semibold mb-2">
                RFID Card UID
              </p>
              <p className="text-3xl font-black text-teal font-mono">{uid}</p>
            </div>

            {/* Info box */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
              <p>
                The UID has been auto-filled in the registration form. Review
                all fields and click "Save Registration" to complete.
              </p>
            </div>

            {/* Continue button */}
            <button
              onClick={onConfirm}
              className="w-full px-4 py-3 bg-teal text-white rounded-lg font-semibold hover:bg-deep transition"
            >
              Continue to Form
            </button>
          </div>
        )}

        {/* Close button (X) - only on error/timeout states */}
        {(status === "timeout" || status === "complete") && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Close modal"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
