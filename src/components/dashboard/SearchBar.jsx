export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5 sm:mb-6">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          🔍
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal bg-white"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
