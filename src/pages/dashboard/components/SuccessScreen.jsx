/**
 * SuccessScreen Component
 *
 * Presentational component - displays confirmation after registration saved.
 * Shows newly created aggregator details.
 *
 * Props:
 * - aggregator: {
 *     id: string,              // e.g., "AGG-001"
 *     name: string,            // Full name
 *     balance: number,         // After N1,000 card fee deducted
 *     rfid_uid: string,        // 8-char hex, e.g., "A3B4C5D6"
 *     phoneNumber: string,
 *     marketLocation: string,
 *     registered_at: timestamp
 *   }
 * - onComplete: () => void - clicked "Back to Management"
 */

export default function SuccessScreen({ aggregator, onComplete }) {
  if (!aggregator) {
    return <div>Loading...</div>;
  }

  // Format balance with Naira symbol and commas
  const formattedBalance = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(aggregator.balance || 0);

  // Format date
  const registeredDate = new Date(aggregator.registered_at).toLocaleDateString(
    "en-NG",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card bg-white p-8 max-w-2xl w-full shadow-lg rounded-lg space-y-8">
        {/* === SUCCESS ICON & HEADING === */}
        <div className="text-center space-y-4">
          <div className="text-7xl text-teal font-black">✓</div>
          <h1 className="text-4xl font-black text-deep">
            Aggregator Registered Successfully!
          </h1>
          <p className="text-gray-600 text-lg">
            The account is now active and ready to process payments.
          </p>
        </div>

        {/* === AGGREGATOR DETAILS === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-mist p-6 rounded-lg">
          {/* Aggregator ID (highlighted) */}
          <div className="md:col-span-2 bg-white border-2 border-teal rounded-lg p-4">
            <p className="text-xs text-gray-500 font-semibold mb-1">
              AGGREGATOR ID
            </p>
            <p className="text-3xl font-black text-teal font-mono">
              {aggregator.id}
            </p>
          </div>

          {/* Full Name */}
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">
              FULL NAME
            </p>
            <p className="text-lg font-semibold text-deep">{aggregator.name}</p>
          </div>

          {/* Phone */}
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">PHONE</p>
            <p className="text-lg font-semibold text-deep">
              {aggregator.phoneNumber}
            </p>
          </div>

          {/* Market Location */}
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">
              MARKET LOCATION
            </p>
            <p className="text-lg font-semibold text-deep">
              {aggregator.marketLocation}
            </p>
          </div>

          {/* Registration Date */}
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">
              REGISTERED
            </p>
            <p className="text-lg font-semibold text-deep">{registeredDate}</p>
          </div>

          {/* Available Balance (after card fee) */}
          <div className="md:col-span-2 bg-gradient-to-r from-teal to-deep rounded-lg p-4 text-white">
            <p className="text-xs font-semibold mb-1 opacity-90">
              AVAILABLE BALANCE
            </p>
            <p className="text-4xl font-black font-mono">{formattedBalance}</p>
            <p className="text-xs mt-2 opacity-75">
              (N1,000 card fee already deducted from initial top-up)
            </p>
          </div>

          {/* RFID UID */}
          <div className="md:col-span-2 bg-white border border-gray-300 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-semibold mb-1">
              RFID CARD UID
            </p>
            <p className="text-2xl font-black text-deep font-mono">
              {aggregator.rfid_uid}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This UID is now linked to the account and cannot be changed
              without admin action.
            </p>
          </div>
        </div>

        {/* === NEXT STEPS === */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-deep mb-4">✓ What happens next:</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-bold text-teal min-w-6">1.</span>
              <span>
                Aggregator can now tap their RFID card on TAPU v2 device at the
                hub
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-teal min-w-6">2.</span>
              <span>
                TAPU will recognize the UID and allow batch processing
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-teal min-w-6">3.</span>
              <span>
                Each batch deducts from their balance (N1,500 or N875 per crate)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-teal min-w-6">4.</span>
              <span>
                Field Operator can top up balance anytime to keep account active
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-teal min-w-6">5.</span>
              <span>
                CEO can view all transactions and manage account status from
                dashboard
              </span>
            </li>
          </ol>
        </div>

        {/* === ACTION BUTTONS === */}
        <div className="space-y-3">
          <button
            onClick={onComplete}
            className="w-full px-6 py-4 bg-teal text-white rounded-lg font-bold text-lg hover:bg-deep transition"
          >
            Back to Aggregator Management
          </button>

          <button
            onClick={() => window.print()}
            className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Print Registration Details
          </button>
        </div>

        {/* === INFO BOX === */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
          <p className="font-semibold mb-1">ℹ️ Important:</p>
          <p>
            Save the Aggregator ID and RFID UID for your records. Field
            Operators will need the Aggregator ID to process top-ups and manage
            the account.
          </p>
        </div>
      </div>
    </div>
  );
}
