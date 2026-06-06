import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Product from "./pages/public/Product";
import Team from "./pages/public/Team";
import Impact from "./pages/public/Impact";
import Investors from "./pages/public/Investors";
import Contact from "./pages/public/Contact";
import CEODashboard from "./pages/dashboard/CEODashboard";
import IoTMonitoring from "./pages/dashboard/IoTMonitoring";
import {
  Operations,
  Aggregators,
  RnD,
  TruckAnalysis,
} from "./pages/dashboard/DashboardPages";

export default function App() {
  return (
    <BrowserRouter
      basename={process.env.NODE_ENV === "production" ? "/Tazemi/" : "/"}
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/product" element={<Product />} />
        <Route path="/team" element={<Team />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/investors" element={<Investors />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<CEODashboard />} />
        <Route path="/dashboard/iot" element={<IoTMonitoring />} />
        <Route path="/dashboard/operations" element={<Operations />} />
        <Route path="/dashboard/aggregators" element={<Aggregators />} />
        <Route path="/dashboard/rd" element={<RnD />} />
        <Route path="/dashboard/analysis" element={<TruckAnalysis />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-deep text-white flex-col gap-4">
              <div className="text-teal font-black text-6xl">404</div>
              <div className="text-xl">Page not found</div>
              <a
                href="/"
                className="bg-teal text-white px-6 py-3 rounded-lg font-semibold"
              >
                Go Home
              </a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
