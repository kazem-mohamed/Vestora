import { api, API_URL } from "@/lib/api/client";
import { authStore } from "@/lib/auth/store";
import type {
  ApiMessage,
  Milestone,
  ProjectDocument,
  ProjectUpdate,
  TeamMember,
} from "@/lib/types/api";

/** Public bytes URL for a project-update image (renderable as an image source). */
export function updateImageUrl(id: number): string {
  return `${API_URL}/api/projects/updates/images/${id}`;
}

/** Public bytes URL for a team member's avatar. */
export function teamAvatarUrl(id: number): string {
  return `${API_URL}/api/projects/team/${id}/avatar`;
}

export interface TeamMemberInput {
  name: string;
  role?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  sortOrder: number;
}

export interface MilestoneInput {
  title: string;
  description?: string | null;
  status: string;
  progress: number;
  sortOrder: number;
  date?: string | null;
}

export const storyApi = {
  // Updates
  updates: (projectId: number) =>
    api.get<ProjectUpdate[]>(`/api/projects/${projectId}/updates`),
  createUpdate: (projectId: number, body: { title: string; body: string }) =>
    api.post<{ message: string; updateId: number }>(`/api/projects/${projectId}/updates`, body),
  editUpdate: (updateId: number, body: { title: string; body: string }) =>
    api.put<ApiMessage>(`/api/projects/updates/${updateId}`, body),
  deleteUpdate: (updateId: number) =>
    api.del<ApiMessage>(`/api/projects/updates/${updateId}`),
  uploadUpdateImage: (updateId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ message: string; imageId: number }>(
      `/api/projects/updates/${updateId}/images`,
      fd
    );
  },

  // Milestones
  milestones: (projectId: number) =>
    api.get<Milestone[]>(`/api/projects/${projectId}/milestones`),
  createMilestone: (projectId: number, body: MilestoneInput) =>
    api.post<{ message: string; milestoneId: number }>(`/api/projects/${projectId}/milestones`, body),
  editMilestone: (id: number, body: MilestoneInput) =>
    api.put<ApiMessage>(`/api/projects/milestones/${id}`, body),
  deleteMilestone: (id: number) =>
    api.del<ApiMessage>(`/api/projects/milestones/${id}`),

  // Team
  team: (projectId: number) => api.get<TeamMember[]>(`/api/projects/${projectId}/team`),
  addTeamMember: (projectId: number, body: TeamMemberInput) =>
    api.post<{ message: string; memberId: number }>(`/api/projects/${projectId}/team`, body),
  editTeamMember: (id: number, body: TeamMemberInput) =>
    api.put<ApiMessage>(`/api/projects/team/${id}`, body),
  deleteTeamMember: (id: number) => api.del<ApiMessage>(`/api/projects/team/${id}`),
  uploadTeamAvatar: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ApiMessage>(`/api/projects/team/${id}/avatar`, fd);
  },

  // Documents
  documents: (projectId: number) =>
    api.get<ProjectDocument[]>(`/api/projects/${projectId}/documents`),
  uploadDocument: (projectId: number, file: File, title: string, visibility: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    fd.append("visibility", visibility);
    return api.post<{ message: string; documentId: number }>(
      `/api/projects/${projectId}/documents`,
      fd
    );
  },
  deleteDocument: (id: number) => api.del<ApiMessage>(`/api/projects/documents/${id}`),

  // Auth'd file download (bearer token → blob → browser save).
  downloadDocument: async (id: number, fileName: string) => {
    const token = authStore.getAccessToken();
    const res = await fetch(`${API_URL}/api/projects/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Download failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
