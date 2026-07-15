import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Tazemi-logo.png";

/**
 * Updated for NewTazemi.docx (5-page nav). Batches page not built yet —
 * data fetcher exists (fetchBatches) but no dedicated UI matching the new
 * spec's fields, so it's deliberately left out of nav until built.
 */
export function Sidebar({ active }) {
  const { user } = useAuth();
  const isCeo = String(user?.role).toLowerCase() === "ceo";
  const links = [
    ...(isCeo ? [["📊", "Dashboard", "/dashboard"]] : []),
    ["🏢", "Aggregators", "/dashboard/aggregators"],
    ["📦", "Crates", "/dashboard/crates"],
    ["💳", "Transactions", "/dashboard/transactions"],
    ...(isCeo ? [["⚙️", "Settings", "/dashboard/settings"]] : []),
  ];
  return (
    <aside className="w-full md:w-64 bg-deep text-white md:min-h-screen flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between md:justify-start">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Tazémi" className="h-7 w-auto" />
          <span className="text-teal font-black text-lg">TAZÉMI</span>
          <span className="text-white/60 text-xs">DASHBOARD</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-row md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible">
        {links.map(([icon, label, href]) => (
          <Link
            key={href}
            to={href}
            className={`flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              active === href
                ? "bg-teal text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-white/10 hidden md:block">
        <Link
          to="/"
          className="text-white/50 hover:text-teal text-xs transition-colors"
        >
          ← Back to Website
        </Link>
      </div>
    </aside>
  );
}
