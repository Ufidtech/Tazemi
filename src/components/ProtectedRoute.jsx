import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep text-white">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user?.role || "read-only";
    const normalizedRole = String(userRole).toLowerCase();

    const isAllowed = allowedRoles.some(
      (role) => String(role).toLowerCase() === normalizedRole,
    );

    if (!isAllowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
