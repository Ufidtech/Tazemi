export function StatCard({ label, value, sub, icon }) {
  return (
    <div className="bg-deep text-white rounded-xl p-4 sm:p-5">
      {icon && <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{icon}</div>}
      <div className="text-xl sm:text-3xl font-bold text-teal">{value}</div>
      <div className="text-sm font-medium mt-1 leading-snug">{label}</div>
      {sub && (
        <div className="text-xs text-white/60 mt-1 leading-snug">{sub}</div>
      )}
    </div>
  );
}
