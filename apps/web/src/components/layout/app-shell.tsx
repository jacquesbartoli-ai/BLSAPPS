import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { disableDemoMode, isDemoMode } from "../../lib/demo-mode";

const items = [
  { to: "/stock", label: "Stock" },
  { to: "/recettes", label: "Recettes" },
  { to: "/production", label: "Production" },
  { to: "/fiches-lot", label: "Fiche de lot" },
  { to: "/commandes", label: "Commandes" },
  { to: "/bl", label: "BL" },
  { to: "/avoirs", label: "Avoirs" },
  { to: "/traceabilite", label: "Traçabilité" },
  { to: "/reglages", label: "Réglages" }
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");
  const demoMode = isDemoMode();

  if (!token && !demoMode) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  function logout() {
    disableDemoMode();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Bartoli — Gestion artisanale</h1>
            {demoMode ? (
              <p className="mt-1 inline-block rounded-full bg-accent px-2 py-1 text-xs font-medium">
                MODE DÉMO VISUEL
              </p>
            ) : null}
          </div>
          <button
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            onClick={logout}
          >
            Déconnexion
          </button>
        </div>
      </header>
      <nav className="sticky top-0 z-10 overflow-x-auto border-b border-border bg-card/90 backdrop-blur">
        <ul className="flex min-w-max gap-2 p-2">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm ${
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
