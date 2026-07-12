import { useState } from "react";

/**
 * RegistrationForm Component
 *
 * Presentational component - renders form UI only, no Firebase logic.
 * Parent component (AggregatorRegistration) handles data + Firebase.
 *
 * Props:
 * - formData: { fullName, phoneNumber, marketLocation, ninOrBVN, photo, rfidUID, topUpAmount }
 * - onChange: (field, value) => void
 * - onScanClick: () => void - "Scan Card" button clicked
 * - onManualUID: (uid) => void - user entered manual UID
 * - isLoading: boolean - disable form during submission
 * - deviceOnline: boolean - enable/disable scan button
 * - scanError: string - error message from RFID scan
 */

export default function RegistrationForm({
  formData,
  onChange,
  onScanClick,
  onManualUID,
  isLoading,
  deviceOnline,
  scanError,
}) {
  const [showManualUID, setShowManualUID] = useState(false);
  const [manualUID, setManualUID] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});

  /**
   * Handle photo file selection
   * Validates: min 200x200px, max 5MB, image format
   */
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, photo: "Photo must be less than 5MB" });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, photo: "Photo must be an image" });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Validate dimensions (min 200x200)
        if (img.width < 200 || img.height < 200) {
          setErrors({
            ...errors,
            photo: "Photo must be at least 200x200 pixels",
          });
          return;
        }
        setPhotoPreview(event.target.result);
        onChange("photo", file);
        setErrors({ ...errors, photo: "" });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle manual UID entry
   * Validates: 8 characters, hex format
   */
  const handleManualUIDSubmit = () => {
    const cleaned = manualUID.toUpperCase().trim();

    // Validate: 8-character hex string
    if (!/^[0-9A-F]{8}$/.test(cleaned)) {
      setErrors({
        ...errors,
        rfidUID: "UID must be 8 hex characters (0-9, A-F)",
      });
      return;
    }

    onManualUID(cleaned);
    setManualUID("");
    setShowManualUID(false);
    setErrors({ ...errors, rfidUID: "" });
  };

  /**
   * Validate phone number (Nigerian format)
   * Accepts: +234XXXXXXXXXX or 0XXXXXXXXXX (11 digits total)
   */
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, "");

    // Must be 10 digits (without country code) or 12 (with +234)
    if (cleaned.length === 10) {
      return "0" + cleaned; // Convert to 0XXXXXXXXXX
    }
    if (cleaned.length === 12 && cleaned.startsWith("234")) {
      return "0" + cleaned.slice(2); // Convert +234 to 0
    }

    return null; // Invalid
  };

  const handlePhoneChange = (value) => {
    onChange("phoneNumber", value);

    // Real-time validation
    const isValid = validatePhoneNumber(value);
    setErrors({
      ...errors,
      phoneNumber: isValid ? "" : "Invalid Nigerian phone number",
    });
  };

  /**
   * Market location options (from PRD)
   */
  const marketLocations = [
    "Yankaba Market Kano",
    "Dawanau Market Kano",
    "Barkin Dogo Market Kaduna",
    "Terminus Market Jos",
    "Other",
  ];

  return (
    <div className="card bg-white p-6 space-y-6 max-w-2xl">
      {/* === FULL NAME === */}
      <div>
        <label className="block text-sm font-semibold text-deep mb-2">
          Full Name *
        </label>
        <input
          type="text"
          placeholder="Enter full name (as on NIN or valid ID)"
          value={formData.fullName}
          onChange={(e) => onChange("fullName", e.target.value)}
          disabled={isLoading}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Minimum 3 characters required
        </p>
        {formData.fullName && formData.fullName.length < 3 && (
          <p className="text-xs text-tomato mt-1">Too short (min 3 chars)</p>
        )}
      </div>

      {/* === PHONE NUMBER === */}
      <div>
        <label className="block text-sm font-semibold text-deep mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          placeholder="Enter Nigerian phone (+234 or 0...)"
          value={formData.phoneNumber}
          onChange={(e) => handlePhoneChange(e.target.value)}
          disabled={isLoading}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-gray-100"
        />
        {errors.phoneNumber && (
          <p className="text-xs text-tomato mt-1">{errors.phoneNumber}</p>
        )}
      </div>

      {/* === MARKET LOCATION === */}
      <div>
        <label className="block text-sm font-semibold text-deep mb-2">
          Market Location *
        </label>
        <select
          value={formData.marketLocation}
          onChange={(e) => onChange("marketLocation", e.target.value)}
          disabled={isLoading}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-gray-100"
        >
          <option value="">-- Select a market --</option>
          {marketLocations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      {/* === NIN / BVN === */}
      <div>
        <label className="block text-sm font-semibold text-deep mb-2">
          NIN or BVN *
        </label>
        <input
          type="text"
          placeholder="Enter 11-digit NIN or BVN (will be encrypted)"
          value={formData.ninOrBVN}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, "");
            if (cleaned.length <= 11) {
              onChange("ninOrBVN", cleaned);
            }
          }}
          disabled={isLoading}
          maxLength="11"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Digits only. Stored securely.
        </p>
        {formData.ninOrBVN && formData.ninOrBVN.length !== 11 && (
          <p className="text-xs text-tomato mt-1">
            Must be exactly 11 digits ({formData.ninOrBVN.length}/11)
          </p>
        )}
      </div>

      {/* === PHOTO === */}
      <div>
        <label className="block text-sm font-semibold text-deep mb-2">
          Photo *
        </label>
        <div className="flex gap-4">
          {/* Photo Input */}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
            <p className="text-xs text-gray-500 mt-1">Min 200x200px, Max 5MB</p>
            {errors.photo && (
              <p className="text-xs text-tomato mt-1">{errors.photo}</p>
            )}
          </div>

          {/* Photo Preview */}
          {photoPreview && (
            <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* === RFID UID === */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="block text-sm font-semibold text-deep mb-3">
          RFID Card UID *
        </label>

        {/* Auto-filled mode */}
        {!showManualUID && formData.rfidUID && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={formData.rfidUID}
              disabled
              className="flex-1 border border-teal rounded-lg px-4 py-3 bg-white text-teal font-mono font-bold"
            />
            <span className="text-2xl text-teal">✓</span>
          </div>
        )}

        {/* Not scanned yet */}
        {!showManualUID && !formData.rfidUID && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onScanClick}
              disabled={isLoading || !deviceOnline}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                deviceOnline
                  ? "bg-teal text-white hover:bg-deep"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {deviceOnline ? "Scan Card" : "TAPU Device Offline"}
            </button>

            <button
              type="button"
              onClick={() => setShowManualUID(true)}
              disabled={isLoading}
              className="w-full text-teal underline py-2 text-sm font-semibold hover:text-deep"
            >
              Or enter UID manually
            </button>

            {!deviceOnline && (
              <p className="text-xs text-orange-600">
                ℹ️ TAPU device is offline. Use manual entry or wait for device
                to reconnect.
              </p>
            )}
          </div>
        )}

        {/* Manual entry mode */}
        {showManualUID && (
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ Warning: Manually entering UID is less secure. Physically
                verify the 8-character code printed on the back of the RFID card
                before proceeding.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="8-char hex (0-9, A-F)"
                value={manualUID}
                onChange={(e) =>
                  setManualUID(e.target.value.toUpperCase().slice(0, 8))
                }
                maxLength="8"
                disabled={isLoading}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={handleManualUIDSubmit}
                disabled={isLoading || manualUID.length !== 8}
                className="px-4 py-3 bg-teal text-white rounded-lg font-semibold hover:bg-deep disabled:bg-gray-300"
              >
                Confirm
              </button>
            </div>

            {errors.rfidUID && (
              <p className="text-xs text-tomato">{errors.rfidUID}</p>
            )}

            <button
              type="button"
              onClick={() => {
                setShowManualUID(false);
                setManualUID("");
              }}
              disabled={isLoading}
              className="w-full text-gray-600 underline py-2 text-sm hover:text-deep"
            >
              Cancel manual entry
            </button>
          </div>
        )}
      </div>

      {/* === INITIAL TOP-UP AMOUNT === */}
      <div>
        <label className="block text-sm font-semibold text-deep mb-2">
          Initial Top-Up Amount *
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-teal">₦</span>
          <input
            type="number"
            placeholder="Enter amount (minimum N5,000)"
            value={formData.topUpAmount}
            onChange={(e) => onChange("topUpAmount", e.target.value)}
            disabled={isLoading}
            min="5000"
            step="1000"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-gray-100"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Note: N1,000 card fee will be deducted from this amount.
        </p>
        {formData.topUpAmount && Number(formData.topUpAmount) < 5000 && (
          <p className="text-xs text-tomato mt-1">
            Minimum N5,000 required (you entered ₦
            {Number(formData.topUpAmount).toLocaleString()})
          </p>
        )}
      </div>

      {/* === SCAN ERROR MESSAGE === */}
      {scanError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">⚠️ {scanError}</p>
        </div>
      )}

      {/* === HELP TEXT === */}
      <div className="bg-mist border border-teal rounded-lg p-4 text-sm text-deep">
        <p className="font-semibold mb-2">ℹ️ How registration works:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Fill all fields above</li>
          <li>Click "Scan Card" - TAPU device will enter scan mode</li>
          <li>Tap the aggregator's RFID card on the TAPU device</li>
          <li>UID will auto-fill (or enter manually if offline)</li>
          <li>Review and click "Save Registration"</li>
          <li>Account created, balance ready to use</li>
        </ol>
      </div>
    </div>
  );
}
