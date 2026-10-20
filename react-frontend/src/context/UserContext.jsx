import { useEffect, useState } from "react";
import { UserContext } from "./UserContext.js";
import { api } from "../lib/api";

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState("");

  useEffect(() => {
    let active = true;
    api("/me")
      .then((data) => { if (active) setUser(data.user); })
      .catch((error) => {
        if (active && error.status !== 401) setInitializationError(error.message);
      })
      .finally(() => { if (active) setIsInitializing(false); });
    const clearSession = () => setUser(null);
    window.addEventListener("session-expired", clearSession);
    return () => {
      active = false;
      window.removeEventListener("session-expired", clearSession);
    };
  }, []);

  async function login(email, password) {
    const data = await api("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setInitializationError("");
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <UserContext.Provider value={{ user, isInitializing, initializationError, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}
