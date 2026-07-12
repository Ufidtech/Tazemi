// import logo from "../assets/Tazemi-logo.png";
// import React, { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { Menu, X } from "lucide-react";
// import { useAuth } from "../context/AuthContext";
// import { getDataSource, subscribeDataSource } from "../services/liveData";

/**
 * Barrel file — re-exports everything so existing `import { X } from
 * "@components"` calls across the app keep working unchanged.
 * Actual component code now lives in components/public/ and
 * components/dashboard/, split one-component-per-file. Add new
 * components to the appropriate subfolder and export them here.
 */
export { PageMeta } from "./public/PageMeta";
export { Navbar } from "./public/Navbar";
export { Footer } from "./public/Footer";

export { Sidebar } from "./dashboard/Sidebar";
export { DemoBanner } from "./dashboard/DemoBanner";
export { SearchBar } from "./dashboard/SearchBar";
export { Badge } from "./dashboard/Badge";
export { StatCard } from "./dashboard/StatCard";
export { DashboardLayout } from "./dashboard/DashboardLayout";
