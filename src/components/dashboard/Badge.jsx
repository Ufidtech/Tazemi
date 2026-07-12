/**
 * TODO: the status map below covers the OLD feature set (trucks, trials,
 * coating). NewTazemi.docx introduces new statuses you'll need to add here
 * rather than duplicating this component: crate statuses (available,
 * in_use, dispatched, returned, damaged, lost) and batch statuses
 * (in_progress, dispatched). Add them as new keys in `map`, don't fork.
 */
export function Badge({ status }) {
  const map = {
    active: ["bg-teal text-white", "Active"],
    delivered: ["bg-teal text-white", "Delivered"],
    in_transit: ["bg-blue-600 text-white", "In Transit"],
    alert: ["bg-tomato text-white", "Alert"],
    pilot: ["bg-amber-600 text-white", "Pilot"],
    inactive: ["bg-gray-400 text-white", "Inactive"],
    complete: ["bg-teal text-white", "Complete"],
    ongoing: ["bg-blue-600 text-white", "Ongoing"],
    target_achieved: ["bg-teal text-white", "Target ✓"],
    failed: ["bg-tomato text-white", "Failed"],
    coated: ["bg-blue-600 text-white", "Coated"],
  };
  const [cls, label] = map[status] || ["bg-gray-400 text-white", status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
