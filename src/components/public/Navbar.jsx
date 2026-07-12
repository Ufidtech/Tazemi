import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../../assets/Tazemi-logo.png";

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
