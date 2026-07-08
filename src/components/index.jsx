import logo from "../assets/Tazemi-logo.png";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getDataSource, subscribeDataSource } from "../services/liveData";

export function PageMeta({ title, description, url, image }) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (selector, attr, value) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        const tag = selector.startsWith("meta") ? "meta" : "link";
        element = document.createElement(tag);
        if (selector.includes("[name='")) {
          element.setAttribute("name", selector.match(/name='(.+?)'/)[1]);
        } else if (selector.includes("[property='")) {
          element.setAttribute(
            "property",
            selector.match(/property='(.+?)'/)[1],
          );
        } else if (selector.includes("[rel='")) {
          element.setAttribute("rel", selector.match(/rel='(.+?)'/)[1]);
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attr, value);
    };

    if (description)
      setMeta("meta[name='description']", "content", description);
    if (title) {
      setMeta("meta[property='og:title']", "content", title);
      setMeta("meta[name='twitter:title']", "content", title);
    }
    if (description) {
      setMeta("meta[property='og:description']", "content", description);
      setMeta("meta[name='twitter:description']", "content", description);
    }
    if (url) setMeta("link[rel='canonical']", "href", url);
    if (image) {
      setMeta("meta[property='og:image']", "content", image);
      setMeta("meta[name='twitter:image']", "content", image);
      setMeta("meta[name='twitter:card']", "content", "summary_large_image");
    } else {
      setMeta("meta[name='twitter:card']", "content", "summary_large_image");
    }
  }, [title, description, url, image]);

  return null;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    ["Home", "/"],
    ["About", "/about"],
    ["Product", "/product"],
    ["Team", "/team"],
    ["Impact", "/impact"],
    ["Investors", "/investors"],
    ["Contact", "/contact"],
  ];

  return (
    <nav className="bg-deep text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Tazémi" className="h-8 w-auto" />
            <span className="text-teal font-black text-xl tracking-wide">
              TAZÉMI
            </span>
            <span className="text-white/70 text-sm font-medium hidden sm:block">
              AGRITECH
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {links.map(([l, h]) => (
              <Link
                key={l}
                to={h}
                className="hover:text-teal transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-3 text-sm">
            {links.map(([l, h]) => (
              <Link key={l} to={h} className="hover:text-teal">
                {l}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="bg-deep text-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="text-teal font-black text-xl mb-2">TAZÉMI</div>
          <p className="text-white/60 text-sm leading-relaxed">
            Preserving Nigeria's Harvest. Organic. Intelligent. Built for our
            infrastructure reality.
          </p>
        </div>
        <div>
          <div className="font-semibold mb-3">Navigation</div>
          <div className="flex flex-col gap-2 text-sm text-white/70">
            {[
              ["About", "https://ufidtech.github.io/Tazemi/#/about"],
              ["Product", "https://ufidtech.github.io/Tazemi/#/product"],
              ["Team", "https://ufidtech.github.io/Tazemi/#/team"],
              ["Impact", "https://ufidtech.github.io/Tazemi/#/impact"],
              ["Investors", "https://ufidtech.github.io/Tazemi/#/investors"],
              ["Contact", "https://ufidtech.github.io/Tazemi/#/contact"],
            ].map(([l, h]) => (
              <a key={l} href={h} className="hover:text-teal transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="font-semibold mb-3">Contact</div>
          <div className="text-sm text-white/70 flex flex-col gap-1">
            <span>ojoqamorudeen88@gmail.com</span>
            <span>tazemi.com</span>
            <span>@tazemi</span>
            <span>Nigeria</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/40">
        © 2026 Tazémi Agritech. All rights reserved.
      </div>
    </footer>
  );
}

export function Sidebar({ active }) {
  const { user } = useAuth();
  const links = [
    ["📊", "CEO Dashboard", "/dashboard"],
    ["📡", "IoT Monitoring", "/dashboard/iot"],
    ["⚙️", "Coating Operations", "/dashboard/operations"],
    ["🏢", "Aggregator Directory", "/dashboard/aggregators"],
    ["🔬", "Bio-Shield R&D", "/dashboard/rd"],
    ["📈", "Truck Data Analysis", "/dashboard/analysis"],
    ...(String(user?.role).toLowerCase() === "ceo"
      ? [["👥", "Staff Management", "/dashboard/staff"]]
      : []),
  ];
  return (
    <aside className="w-full md:w-64 bg-deep text-white md:min-h-screen flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between md:justify-start">
        <Link to="/" className="flex items-center gap-2">
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

export function DemoBanner() {
  const [source, setSource] = useState(getDataSource());

  useEffect(() => subscribeDataSource(setSource), []);

  // Only warn when bundled demo data is actually on screen.
  // Live DB or backend API data → no banner.
  if (source !== "demo") return null;

  return (
    <div className="demo-banner">
      <span className="text-amber-600 text-lg">⚠</span>
      <div>
        <span className="font-bold text-amber-800 text-sm">DEMO DATA — </span>
        <span className="text-amber-700 text-sm">
          All figures are simulated. Real operational data will populate
          automatically once field pilots begin.
        </span>
      </div>
    </div>
  );
}

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

export function DashboardLayout({ children, active, title }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      <Sidebar active={active} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div>
              {title && (
                <h1 className="text-xl sm:text-3xl font-bold text-deep">
                  {title}
                </h1>
              )}
              {user?.email && (
                <div className="text-xs text-gray-500 mt-1 break-all leading-snug">
                  Signed in as {user.email}
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate("/auth", { replace: true });
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-deep text-white text-sm font-semibold hover:bg-teal transition-colors"
            >
              Logout
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
