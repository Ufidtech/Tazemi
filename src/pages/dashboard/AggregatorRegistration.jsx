import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import RegistrationForm from "./components/RegistrationForm";
import RFIDScanModal from "./components/RFIDScanModal";
import SuccessScreen from "./components/SuccessScreen";
import { useRFIDScan } from "../../hooks/useRFIDScan";

/**
 * AggregatorRegistration Container Component
 *
 * CONTAINER/SMART component - handles all orchestration logic.
 * Uses:
 * - useRFIDScan hook (Firebase scan logic)
 * - RegistrationForm (presentational)
 * - RFIDScanModal (presentational)
 * - SuccessScreen (presentational)
 *
 * Flow:
 * 1. User fills form → setFormData updates
 * 2. User clicks "Scan Card" → validate, start scan, show modal
 * 3. TAPU scans card → hook receives UID → modal shows success
 * 4. User clicks "Continue" → set rfidUID in form
 * 5. User clicks "Save Registration" → POST to backend
 * 6. Backend returns aggregator → show success screen
 */

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

  // Device online status (TODO: integrate with device heartbeat listener)
  const [deviceOnline, setDeviceOnline] = useState(true);

  // RFID scan hook
  const {
    scanning,
    uid,
    error: scanError,
    timeRemaining,
    startScan,
    cancelScan,
  } = useRFIDScan("TAPU-KN-01");

  /**
   * When UID is received from TAPU, auto-fill form field
   * and show modal success state
   */
  useEffect(() => {
    if (uid && screen === "scanning") {
      setFormData((prev) => ({ ...prev, rfidUID: uid }));
    }
  }, [uid, screen]);

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
   */
  const handleManualUID = (manualUID) => {
    if (!manualUID) return;

    // Validate: 8-char hex
    if (!/^[0-9A-F]{8}$/.test(manualUID)) {
      setGeneralError("UID must be 8 hex characters (0-9, A-F)");
      return;
    }

    // Update form and go back to form screen
    setFormData((prev) => ({ ...prev, rfidUID: manualUID }));
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
   * Save registration to backend
   *
   * Backend should:
   * 1. Generate aggregator ID (AGG-001, etc.)
   * 2. Upload photo to Firebase Storage
   * 3. Encrypt NIN/BVN
   * 4. Create atomic write:
   *    - /aggregators/{id} (all fields)
   *    - /transactions/{id1} (initial TOPUP)
   *    - /transactions/{id2} (CARD_FEE deduction)
   * 5. Return created aggregator
   */
  const handleSaveRegistration = async () => {
    setGeneralError("");

    if (!validateFormBeforeSave()) {
      return;
    }

    setIsLoading(true);

    try {
      // Prepare FormData for multipart upload (photo)
      const submitData = new FormData();
      submitData.append("full_name", formData.fullName);
      submitData.append("phone_number", formData.phoneNumber);
      submitData.append("market_location", formData.marketLocation);
      submitData.append("nin_or_bvn", formData.ninOrBVN);
      submitData.append("rfid_uid", formData.rfidUID.toUpperCase());
      submitData.append("photo", formData.photo);
      submitData.append("initial_topup", Number(formData.topUpAmount));
      submitData.append("created_by", user?.uid || "unknown");

      // Call backend API
      const response = await fetch(`${API_BASE}/aggregators/register`, {
        method: "POST",
        headers: {
          // Note: Don't set Content-Type for FormData - browser sets it automatically
          Authorization: `Bearer ${user?.access_token || ""}`,
        },
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            errorData.detail ||
            `Registration failed (${response.status})`,
        );
      }

      const result = await response.json();
      const aggregator = result?.data || result?.aggregator || result;

      console.log("[Registration] Success:", aggregator);

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
   * Handle successful scan - auto-fill UID and offer to save
   * Called when RFID modal shows success
   */
  const handleScanSuccess = () => {
    // UID is already auto-filled via useEffect
    // Just return to form so user can review and save
    setScreen("form");
  };

  /**
   * Determine current modal status
   * Hook might be scanning, but we also have timeouts
   */
  const getModalStatus = () => {
    if (scanning && !uid && !scanError) return "scanning";
    if (scanError) return "timeout";
    if (uid) return "complete";
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
          onRetry={handleScanClick}
          onManualEntry={() => {
            setScreen("form");
            // Reset for manual entry
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
