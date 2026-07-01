"use client";

import { create } from "zustand";
import { loginAPI } from "@/services/api";

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await loginAPI(username, password);

    if (error || !data) {
      set({ isLoading: false, error: error || "Login failed" });
      return false;
    }

    // Store token
    localStorage.setItem("apex_token", data.access_token);
    localStorage.setItem("apex_username", username);

    set({
      token: data.access_token,
      username,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    return true;
  },

  logout: () => {
    localStorage.removeItem("apex_token");
    localStorage.removeItem("apex_username");
    localStorage.removeItem("apex_role");

    set({
      token: null,
      username: null,
      role: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    
    const token = localStorage.getItem("apex_token");
    const username = localStorage.getItem("apex_username");
    const role = localStorage.getItem("apex_role");

    if (token) {
      set({
        token,
        username,
        role,
        isAuthenticated: true,
      });
    }
  },
}));
