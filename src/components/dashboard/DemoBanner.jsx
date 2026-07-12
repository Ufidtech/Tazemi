import { useState, useEffect } from "react";
import { getDataSource, subscribeDataSource } from "../../services/liveData";

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
