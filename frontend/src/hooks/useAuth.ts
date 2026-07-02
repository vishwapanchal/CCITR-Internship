"use client";

import { create } from "zustand";
import { loginAPI, signupAPI } from "@/services/api";

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
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

    // Store token securely in cookies
    document.cookie = `apex_token=${data.access_token}; path=/; Secure; SameSite=Strict`;
    document.cookie = `apex_username=${username}; path=/; Secure; SameSite=Strict`;

    set({
      token: data.access_token,
      username,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    return true;
  },

  signup: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await signupAPI(username, password);

    if (error || !data) {
      set({ isLoading: false, error: error || "Signup failed" });
      return false;
    }

    // Store token securely in cookies
    document.cookie = `apex_token=${data.access_token}; path=/; Secure; SameSite=Strict`;
    document.cookie = `apex_username=${username}; path=/; Secure; SameSite=Strict`;

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
    document.cookie = "apex_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "apex_username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "apex_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

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
    
    const cookies = document.cookie.split("; ");
    const getCookie = (name: string) => cookies.find(row => row.startsWith(`${name}=`))?.split("=")[1];

    const token = getCookie("apex_token");
    const username = getCookie("apex_username");
    const role = getCookie("apex_role");

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
