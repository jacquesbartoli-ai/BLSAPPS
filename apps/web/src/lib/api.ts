const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const secretPath = import.meta.env.VITE_SECRET_PATH ?? "espace-bartoli-xxxxx";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${apiBaseUrl}/${secretPath}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Erreur API");
  }
  return response.json() as Promise<T>;
}
