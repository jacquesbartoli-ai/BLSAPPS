const DEMO_MODE_KEY = "bartoliDemoMode";

export function isDemoMode() {
  return localStorage.getItem(DEMO_MODE_KEY) === "1";
}

export function enableDemoMode() {
  localStorage.setItem(DEMO_MODE_KEY, "1");
  localStorage.setItem("accessToken", "demo-access-token");
  localStorage.setItem("refreshToken", "demo-refresh-token");
  localStorage.setItem("userRole", "admin");
}

export function disableDemoMode() {
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
}
