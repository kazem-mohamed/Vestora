import { api, API_URL } from "@/lib/api/client";
import type {
  ApiMessage,
  ProjectCard,
  PublicProfileDetail,
  UserProfile,
} from "@/lib/types/api";

export interface UpdateProfileInput {
  userName?: string;
  briefBio?: string;
  phone?: string;
  birthDate?: string; // yyyy-MM-dd
  websiteUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  /** Investor-only; backend ignores it for other roles. */
  preferredIndustries?: string;
  investmentThesis?: string;
  ticketMin?: number | null;
  ticketMax?: number | null;
  notifyOnFollow?: boolean;
  notifyOnProjectUpdate?: boolean;
  avatar?: File | null;
  cover?: File | null;
}

function toProfileFormData(input: UpdateProfileInput): FormData {
  const fd = new FormData();
  if (input.userName != null) fd.append("UserName", input.userName);
  if (input.briefBio != null) fd.append("BriefBio", input.briefBio);
  if (input.phone != null) fd.append("Phone", input.phone);
  if (input.birthDate) fd.append("BirthDate", input.birthDate);
  if (input.websiteUrl != null) fd.append("WebsiteUrl", input.websiteUrl);
  if (input.linkedinUrl != null) fd.append("LinkedinUrl", input.linkedinUrl);
  if (input.twitterUrl != null) fd.append("TwitterUrl", input.twitterUrl);
  if (input.preferredIndustries != null) fd.append("PreferredIndustries", input.preferredIndustries);
  if (input.investmentThesis != null) fd.append("InvestmentThesis", input.investmentThesis);
  if (input.ticketMin != null) fd.append("TicketMin", String(input.ticketMin));
  if (input.ticketMax != null) fd.append("TicketMax", String(input.ticketMax));
  if (input.notifyOnFollow != null) fd.append("NotifyOnFollow", String(input.notifyOnFollow));
  if (input.notifyOnProjectUpdate != null) fd.append("NotifyOnProjectUpdate", String(input.notifyOnProjectUpdate));
  if (input.avatar) fd.append("ProfileImage", input.avatar);
  if (input.cover) fd.append("CoverImage", input.cover);
  return fd;
}

export const usersApi = {
  /** Close your own account. Soft delete — see UsersController.DeleteMe. */
  deleteMe: (currentPassword: string) =>
    api.del<ApiMessage>("/api/users/me", { body: { currentPassword } }),

  // Public profile of any user — anonymous-friendly, but sends the bearer when
  // present so `isFollowedByMe` / `isMe` resolve for the viewer.
  getProfile: (id: number) => api.get<PublicProfileDetail>(`/api/users/${id}`),

  // Ventures an investor has backed (approved), shaped like browse cards.
  backedVentures: (id: number) => api.get<ProjectCard[]>(`/api/users/${id}/backed`),

  updateMe: (input: UpdateProfileInput) =>
    api.put<UserProfile>("/api/users/me", toProfileFormData(input)),
};

export const avatarUrl = (id: number) => `${API_URL}/api/users/${id}/avatar`;
export const coverUrl = (id: number) => `${API_URL}/api/users/${id}/cover`;
