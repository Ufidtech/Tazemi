import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Sidebar } from "./Sidebar";

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
