/**
 * ─── AuthContext ──────────────────────────────────────────────────────────────
 *
 * WHY CONTEXT INSTEAD OF PROP-DRILLING?
 * ──────────────────────────────────────
 * The auth state (token, user) is needed in multiple unrelated parts of the
 * tree: the Navbar reads it to decide which buttons to show; the shorten form
 * reads it to decide whether to attach an Authorization header; a future
 * Dashboard page will read it to gate access. Passing this down through props
 * at every level ("prop drilling") would pollute every intermediate component's
 * interface. React Context solves this by making state available to any
 * descendant without threading props through the tree.
 *
 * WHY LOCALSTORAGE FOR THE TOKEN?
 * ─────────────────────────────────
 * localStorage survives a page refresh — the user stays logged in across
 * sessions without re-entering credentials. The trade-off vs. httpOnly cookies
 * is that localStorage is accessible to JavaScript (XSS risk). For this MVP
 * that trade-off is acceptable; in a production app with sensitive data,
 * httpOnly cookies set by the server are the more secure option.
 *
 * The token is also kept in React state (not just localStorage) so that
 * components that consume this context re-render immediately on login/logout —
 * localStorage reads are synchronous but don't trigger React renders.
 */

import { createContext, useContext, useState } from "react";

const STORAGE_TOKEN = "linksnip_token";
const STORAGE_USER  = "linksnip_user";

// ─── Context object ───────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  // Initialise from localStorage so state survives a page refresh.
  // The lazy initialisers run once on mount — no repeated localStorage reads.
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN));
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // corrupted JSON — start fresh
    }
  });

  /**
   * Persist the JWT and user profile received from the API after a successful
   * login or registration. Both localStorage (persistence) and React state
   * (reactivity) are updated so consumers re-render immediately.
   *
   * @param {string} newToken
   * @param {{ id: string, email: string, createdAt: string }} newUser
   */
  const login = (newToken, newUser) => {
    localStorage.setItem(STORAGE_TOKEN, newToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  /**
   * Clear all auth state — removes from localStorage and resets React state,
   * triggering a re-render of every component that consumes this context.
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * Convenience hook — throws a descriptive error if called outside of an
 * AuthProvider so mis-use surfaces immediately in development.
 *
 * @returns {{ token: string|null, user: object|null, isAuthenticated: boolean, login: Function, logout: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be called inside an <AuthProvider>.");
  return ctx;
}
