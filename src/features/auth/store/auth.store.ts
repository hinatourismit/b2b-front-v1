import { create } from "zustand";
import type { Agent } from "../types";

const TOKEN_KEY = "hina-agent-token";

interface AuthState {
  token: string | null;
  agent: Agent | null;
  isLoggedIn: boolean;
  /** true until the bootstrap getReseller call settles */
  isBootstrapping: boolean;
  setSession: (agent: Agent, token: string) => void;
  setAgent: (agent: Agent) => void;
  setBootstrapped: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  agent: null,
  isLoggedIn: false,
  isBootstrapping: localStorage.getItem(TOKEN_KEY) !== null,

  setSession: (agent, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ agent, token, isLoggedIn: true, isBootstrapping: false });
  },

  setAgent: (agent) => set({ agent, isLoggedIn: true, isBootstrapping: false }),

  setBootstrapped: () => set({ isBootstrapping: false }),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, agent: null, isLoggedIn: false, isBootstrapping: false });
  },
}));
