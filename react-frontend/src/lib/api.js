const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      window.dispatchEvent(new Event("session-expired"));
    }
    const error = new Error(data.message || "The request failed. Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}
