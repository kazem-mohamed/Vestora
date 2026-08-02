import { create } from "zustand";
import type { LoginResponse, UserType } from "@/lib/types/api";
import { clearRefreshToken, setRefreshToken } from "@/lib/auth/tokens";

export interface AuthUser {
  id: number;
  userName: string;
  email: string;
  userType: UserType;
}

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setSession: (login: LoginResponse) => void;
  setAccessToken: (token: string) => void;
  setStatus: (status: AuthStatus) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "idle",
  setSession: (login) => {
    setRefreshToken(login.refreshToken);
    set({
      accessToken: login.accessToken,
      user: {
        id: login.userId,
        userName: login.userName,
        email: login.userEmail,
        userType: login.userType,
      },
      status: "authenticated",
    });
  },
  setAccessToken: (token) => set({ accessToken: token }),
  setStatus: (status) => set({ status }),
  clearSession: () => {
    clearRefreshToken();
    set({ accessToken: null, user: null, status: "unauthenticated" });
  },
}));

// Non-hook accessors for use inside the API client (outside React).
export const authStore = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (token: string) => useAuthStore.getState().setAccessToken(token),
  setSession: (login: LoginResponse) => useAuthStore.getState().setSession(login),
  clearSession: () => useAuthStore.getState().clearSession(),
};
