import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { enableDemoMode } from "../lib/demo-mode";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: string;
    fullName: string;
  };
};

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      localStorage.setItem("userRole", result.user.role);
      navigate("/stock", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  function onDemo() {
    enableDemoMode();
    navigate("/stock", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-md" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold text-primary">Connexion</h1>
        <p className="text-sm text-foreground/70">Espace sécurisé Bartoli</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email"
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Mot de passe"
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-70"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        <button
          type="button"
          onClick={onDemo}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-medium hover:bg-accent"
        >
          Entrer en mode démo visuel
        </button>
      </form>
    </div>
  );
}
