import { Link } from "react-router-dom";
import logo from "../../assets/Tazemi-logo.png";

export function Footer() {
  return (
    <footer className="bg-deep text-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Tazémi" className="h-8 w-auto" />
            <span className="text-teal font-black text-xl tracking-wide">
              TAZÉMI
            </span>
            <span className="text-white/70 text-sm font-medium hidden sm:block">
              AGRITECH
            </span>
          </Link>{" "}
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
