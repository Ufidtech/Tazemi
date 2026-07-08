import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Product from "./pages/public/Product";
import Team from "./pages/public/Team";
import Impact from "./pages/public/Impact";
import Investors from "./pages/public/Investors";
import Contact from "./pages/public/Contact";
import Auth from "./pages/public/Auth";
import CEODashboard from "./pages/dashboard/CEODashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import IoTMonitoring from "./pages/dashboard/IoTMonitoring";
import AggregatorRegistration from "./pages/dashboard/AggregatorRegistration";
import StaffManagement from "./pages/dashboard/StaffManagement";
import {
  Operations,
  Aggregators,
  RnD,
  TruckAnalysis,
} from "./pages/dashboard/DashboardPages";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/product" element={<Product />} />
        <Route path="/team" element={<Team />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/investors" element={<Investors />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CEODashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/iot"
          element={
            <ProtectedRoute>
              <IoTMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/operations"
          element={
            <ProtectedRoute>
              <Operations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/aggregators"
          element={
            <ProtectedRoute>
              <Aggregators />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/aggregators/register"
          element={
            <ProtectedRoute allowedRoles={["ceo", "field_operator"]}>
              <AggregatorRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/staff"
          element={
            <ProtectedRoute allowedRoles={["ceo"]}>
              <StaffManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/rd"
          element={
            <ProtectedRoute>
              <RnD />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/analysis"
          element={
            <ProtectedRoute>
              <TruckAnalysis />
            </ProtectedRoute>
          }
        />

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
    </HashRouter>
  );
}
