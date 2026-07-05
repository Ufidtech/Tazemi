import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import RegistrationForm from "./components/RegistrationForm";
import RFIDScanModal from "./components/RFIDScanModal";
import SuccessScreen from "./components/SuccessScreen";
import { useRFIDScan } from "../../hooks/useRFIDScan";
import { useDeviceStatus } from "../../hooks/useDeviceStatus";
import { registerAggregator, isRfidAvailable, archiveScanRequest } from "../../services/tazemiDb";
import { auth } from "../../services/firebaseClient";

/**
 * AggregatorRegistration Container Component (PRD v2.1 §3.1)
 *
 * Save path is BACKEND-FIRST:
 * 1. FastAPI /aggregators/register — NIN/BVN encryption (Fernet), photo
 *    upload, atomic multi-location write via Admin SDK, audit log (§6.2)
 * 2. Fallback (backend unreachable only): client-side Firebase write via
 *    tazemiDb.registerAggregator — stores masked NIN only, never raw
 *
 * Real-time concerns (device heartbeat, RFID scan bridge) stay on
 * Firebase listeners — the backend cannot push those.
 */

const TAPU_DEVICE_ID = import.meta.env.VITE_TAPU_DEVICE_ID || "TAPU-KN-01";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export default function AggregatorRegistration() {
  const { user } = useAuth();

  // Screen state: "form" | "scanning" | "success"
  const [screen, setScreen] = useState("form");
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    marketLocation: "",
    ninOrBVN: "",
    photo: null,
    rfidUID: "",
    topUpAmount: "",
  });

  // Successfully created aggregator (shown on success screen)
  const [newAggregator, setNewAggregator] = useState(null);

  // Live device status from /devices/{id}/heartbeat (§5.3 — advisory)
  const { online: deviceOnline } = useDeviceStatus(TAPU_DEVICE_ID);

  // RFID scan hook (§2.6/§3.1)
  const {
    scanning,
    status: scanStatus,
    uid,
    error: scanError,
    timeRemaining,
    sessionId: scanSessionId,
    startScan,
    cancelScan,
  } = useRFIDScan(TAPU_DEVICE_ID, user?.uid);

  /**
   * Handle form field changes
   * Updates formData state
   */
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setGeneralError(""); // Clear error when user changes field
  };

  /**
   * Validate form before scanning
   * All fields required EXCEPT rfidUID (which we'll get from scan)
   */
  const validateFormBeforeScan = () => {
    if (!formData.fullName || formData.fullName.length < 3) {
      setGeneralError("Full name must be at least 3 characters");
      return false;
    }

    if (!formData.phoneNumber) {
      setGeneralError("Phone number is required");
      return false;
    }

    if (!formData.marketLocation) {
      setGeneralError("Market location is required");
      return false;
    }

    if (!formData.ninOrBVN || formData.ninOrBVN.length !== 11) {
      setGeneralError("NIN or BVN must be 11 digits");
      return false;
    }

    if (!formData.photo) {
      setGeneralError("Photo is required");
      return false;
    }

    if (!formData.topUpAmount || Number(formData.topUpAmount) < 5000) {
      setGeneralError("Top-up amount must be at least N5,000");
      return false;
    }

    return true;
  };

  /**
   * Handle "Scan Card" button click
   * Validate form, then show modal and start RFID scan
   */
  const handleScanClick = async () => {
    setGeneralError("");

    if (!validateFormBeforeScan()) {
      return;
    }

    if (!deviceOnline) {
      setGeneralError(
        "TAPU device is offline. Please connect to WiFi or enter UID manually.",
      );
      return;
    }

    // Show modal and start scan
    setScreen("scanning");
    startScan();
  };

  /**
   * Handle manual UID entry (if scan times out or device offline)
   * Called when user enters UID manually and clicks "Confirm"
   * §3.1: validated against /rfid_index for uniqueness before accept.
   */
  const handleManualUID = async (manualUID) => {
    if (!manualUID) return;

    const candidate = String(manualUID).toUpperCase();

    // Validate: 8-char hex
    if (!/^[0-9A-F]{8}$/.test(candidate)) {
      setGeneralError("UID must be 8 hex characters (0-9, A-F)");
      return;
    }

    // §2.8 uniqueness check (advisory; rules enforce no-overwrite)
    try {
      if (!(await isRfidAvailable(candidate))) {
        setGeneralError("This RFID card is already assigned to another aggregator");
        return;
      }
    } catch {
      // Index unreachable — final enforcement happens at save via rules
    }

    // Update form and go back to form screen
    setFormData((prev) => ({ ...prev, rfidUID: candidate }));
    setScreen("form");
    setGeneralError("");
  };

  /**
   * Validate all form data before saving
   */
  const validateFormBeforeSave = () => {
    if (!formData.fullName || formData.fullName.length < 3) {
      setGeneralError("Full name is required (minimum 3 characters)");
      return false;
    }

    if (!formData.phoneNumber) {
      setGeneralError("Phone number is required");
      return false;
    }

    if (!formData.marketLocation) {
      setGeneralError("Market location is required");
      return false;
    }

    if (!formData.ninOrBVN || formData.ninOrBVN.length !== 11) {
      setGeneralError("NIN or BVN must be 11 digits");
      return false;
    }

    if (!formData.photo) {
      setGeneralError("Photo is required");
      return false;
    }

    if (!formData.rfidUID || !/^[0-9A-F]{8}$/.test(formData.rfidUID)) {
      setGeneralError("Valid RFID UID is required");
      return false;
    }

    if (!formData.topUpAmount || Number(formData.topUpAmount) < 5000) {
      setGeneralError("Top-up amount must be at least N5,000");
      return false;
    }

    return true;
  };

  /**
   * Save registration (PRD v2.1 §3.1) — backend-first.
   *
   * The FastAPI backend encrypts NIN/BVN, uploads the photo, performs the
   * atomic write via the Admin SDK, and audit-logs the action. Only if the
   * backend is UNREACHABLE (network error — not a 4xx rejection) does the
   * client-side Firebase fallback run, storing the masked NIN only.
   */
  const registerViaBackend = async () => {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    const submitData = new FormData();
    submitData.append("full_name", formData.fullName);
    submitData.append("phone_number", formData.phoneNumber);
    submitData.append("market_location", formData.marketLocation);
    submitData.append("nin_or_bvn", formData.ninOrBVN);
    submitData.append("rfid_uid", formData.rfidUID.toUpperCase());
    submitData.append("initial_topup", Number(formData.topUpAmount));
    submitData.append("created_by", user?.uid || "unknown");
    submitData.append("photo", formData.photo);

    const response = await fetch(`${API_BASE}/aggregators/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user?.access_token || idToken || ""}`,
      },
      body: submitData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(
        errorData.detail || errorData.message || `Registration failed (${response.status})`,
      );
      err.httpStatus = response.status;
      throw err;
    }

    const result = await response.json();
    return result?.data || result?.aggregator || result;
  };

  const handleSaveRegistration = async () => {
    setGeneralError("");

    if (!validateFormBeforeSave()) {
      return;
    }

    setIsLoading(true);

    try {
      let aggregator;
      try {
        aggregator = await registerViaBackend();
        console.log("[Registration] Saved via backend:", aggregator?.id);
        if (scanSessionId) await archiveScanRequest(scanSessionId).catch(() => {});
      } catch (backendError) {
        // 4xx/5xx = real rejection (validation, auth, duplicate) — surface it.
        if (backendError.httpStatus) throw backendError;

        // Network failure — backend unreachable. Client-side Firebase fallback.
        console.warn("[Registration] Backend unreachable, using Firebase fallback");
        aggregator = await registerAggregator({
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          marketLocation: formData.marketLocation,
          ninOrBvn: formData.ninOrBVN,
          photoFile: formData.photo,
          rfidUid: formData.rfidUID,
          initialTopUp: Number(formData.topUpAmount),
          operatorId: user?.uid || "unknown",
          scanSessionId,
        });
      }

      // Show success screen
      setNewAggregator(aggregator);
      setScreen("success");
    } catch (error) {
      console.error("[Registration] Error:", error);
      setGeneralError(error.message || "Failed to save registration");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle successful scan — auto-fill UID and return to form
   * Called when the user clicks "Continue" on the modal's success state.
   */
  const handleScanSuccess = () => {
    if (uid) {
      setFormData((prev) => ({ ...prev, rfidUID: uid }));
    }
    setScreen("form");
  };

  /**
   * Determine current modal status (§3.1)
   * "not_responding" (no SCANNING within 5s) and "expired" both offer
   * Retry / Enter manually — the modal renders them as the timeout state.
   */
  const getModalStatus = () => {
    if (scanStatus === "complete" || uid) return "complete";
    if (scanStatus === "not_responding" || scanStatus === "expired" || scanError)
      return "timeout";
    if (scanning) return "scanning";
    return null;
  };

  // === RENDER: Form Screen ===
  if (screen === "form") {
    return (
      <div className="p-6 bg-mist min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-deep mb-2">
              Register Aggregator
            </h1>
            <p className="text-gray-600">
              Complete all fields to register a new aggregator and assign an
              RFID card.
            </p>
          </div>

          {/* Error Alert */}
          {generalError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">⚠️ {generalError}</p>
            </div>
          )}

          {/* Registration Form */}
          <RegistrationForm
            formData={formData}
            onChange={handleFormChange}
            onScanClick={handleScanClick}
            onManualUID={handleManualUID}
            isLoading={isLoading}
            deviceOnline={deviceOnline}
            scanError={scanError}
          />

          {/* Save Button (only show if UID is filled) */}
          {formData.rfidUID && (
            <div className="mt-6 max-w-2xl">
              <button
                onClick={handleSaveRegistration}
                disabled={isLoading}
                className="w-full px-6 py-4 bg-teal text-white rounded-lg font-bold text-lg hover:bg-deep disabled:bg-gray-400 transition"
              >
                {isLoading ? "Saving..." : "Save Registration"}
              </button>
            </div>
          )}
        </div>

        {/* RFID Scan Modal */}
        <RFIDScanModal
          isOpen={screen === "scanning"}
          status={getModalStatus()}
          timeRemaining={timeRemaining}
          uid={uid}
          onRetry={async () => {
            await cancelScan(); // clear any lingering PENDING request
            handleScanClick();
          }}
          onManualEntry={async () => {
            await cancelScan(); // don't leave an orphaned scan request
            setScreen("form");
          }}
          onCancel={() => {
            setScreen("form");
            cancelScan();
          }}
          onConfirm={handleScanSuccess}
        />
      </div>
    );
  }

  // === RENDER: Success Screen ===
  if (screen === "success" && newAggregator) {
    return (
      <div className="p-6 bg-mist min-h-screen">
        <SuccessScreen
          aggregator={newAggregator}
          onComplete={() => {
            // Navigate to aggregator management
            window.location.hash = "#/dashboard/aggregators";
          }}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="p-6 bg-mist min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-spin">⏳</div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
