import { api } from "@/lib/api/client";
import { getRefreshToken } from "@/lib/auth/tokens";
import type { ApiMessage, LoginResponse, UserProfile, UserType } from "@/lib/types/api";

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
  birthDate: string; // yyyy-MM-dd
  phone: string;
  briefBio?: string;
  profileImage?: File | null;
}

function toRegisterFormData(input: RegisterInput): FormData {
  const fd = new FormData();
  fd.append("FirstName", input.firstName);
  fd.append("LastName", input.lastName);
  fd.append("Email", input.email);
  fd.append("Password", input.password);
  fd.append("ConfirmPassword", input.confirmPassword);
  fd.append("UserType", input.userType);
  fd.append("BirthDate", input.birthDate);
  fd.append("Phone", input.phone);
  if (input.briefBio) fd.append("BriefBio", input.briefBio);
  if (input.profileImage) fd.append("ProfileImage", input.profileImage);
  return fd;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }, { auth: false }),

  register: (input: RegisterInput) =>
    api.post<ApiMessage>("/api/auth/register", toRegisterFormData(input), { auth: false }),

  verifyEmail: (email: string, token: string) =>
    api.post<ApiMessage>("/api/auth/verify-email", { email, token }, { auth: false }),

  resendVerification: (email: string) =>
    api.post<ApiMessage>("/api/auth/resend-verification", { email }, { auth: false }),

  forgotPassword: (email: string) =>
    api.post<ApiMessage>("/api/auth/forgot-password", { email }, { auth: false }),

  resetPassword: (input: {
    email: string;
    otp: string;
    password: string;
    confirmPassword: string;
  }) => api.post<ApiMessage>("/api/auth/reset-password", input, { auth: false }),

  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => api.post<ApiMessage>("/api/auth/change-password", input),

  logout: () =>
    api.post<ApiMessage>("/api/auth/logout", { refreshToken: getRefreshToken() }),

  me: () => api.get<UserProfile>("/api/users/me"),
};
