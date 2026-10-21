import { applyTimezoneHeader } from "./timezone";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export interface LlmModel {
  id: string;
  provider: string;
  displayName: string;
  modelIdentifier: string;
  baseUrl: string;
  isActive: boolean;
  hasApiKey: boolean;
  isAvailable?: boolean;
  unavailableUntil?: string | null;
  unavailableReason?: string | null;
}

export interface AdminLlmConfig extends LlmModel {
  maskedApiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "ADMIN" | "USER";
  createdAt: string;
  projectCount: number;
}

export interface DiagramNode {
  id: string;
  label: string;
  phase?: string;
  type?: "epic" | "feature" | "subfeature";
}

export interface DiagramEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
}

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  revisionPrompt?: string | null;
  prdContent: string;
  diagramData: DiagramData;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  initialPrompt: string;
  clarifications?: Array<{ question: string; answer: string }> | null;
  currentVersionId?: string | null;
  versions: ProjectVersion[];
  currentVersion?: ProjectVersion | null;
  createdAt: string;
  updatedAt: string;
}

export class UnauthorizedError extends Error {
  constructor(message = "Sesi login tidak valid atau telah berakhir") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// Single-flight: several parallel requests can 401 at once; log out only once.
let signOutPromise: Promise<void> | null = null;

function forceReauth(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!signOutPromise) {
    signOutPromise = import("next-auth/react")
      .then(({ signOut }) => signOut({ callbackUrl: "/login" }))
      .catch(() => {
        window.location.href = "/login";
      })
      .finally(() => {
        signOutPromise = null;
      });
  }
  return signOutPromise;
}

export async function fetchWithAuth<T>(
  endpoint: string,
  token?: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Backend forwards this to the LLM so prompts can resolve relative dates
  // against the user's own clock rather than the server's.
  applyTimezoneHeader(headers);

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    // Token expired or signed with a different AUTH_SECRET: drop the NextAuth
    // session and send the user back to the login page.
    await forceReauth();
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // LLM Configs
  getModels: () => fetchWithAuth<{ models: LlmModel[] }>("/llms"),
  getAdminConfigs: (token: string) =>
    fetchWithAuth<{ configs: AdminLlmConfig[] }>("/llms/admin", token),
  
  createAdminConfig: (token: string, body: Record<string, unknown>) =>
    fetchWithAuth<{ config: LlmModel }>("/llms/admin", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAdminConfig: (token: string, id: string, body: Record<string, unknown>) =>
    fetchWithAuth<{ config: LlmModel }>(`/llms/admin/${id}`, token, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteAdminConfig: (token: string, id: string) =>
    fetchWithAuth<{ success: boolean }>(`/llms/admin/${id}`, token, {
      method: "DELETE",
    }),

  // Projects
  getProjects: (token: string) =>
    fetchWithAuth<{ projects: Project[] }>("/projects", token),
  getProject: (token: string, id: string) =>
    fetchWithAuth<{ project: Project }>(`/projects/${id}`, token),
  createProject: (
    token: string,
    body: {
      title: string;
      initialPrompt: string;
      clarifications?: Array<{ question: string; answer: string }>;
    }
  ) =>
    fetchWithAuth<{ project: Project }>("/projects", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateClarifications: (token: string, initialPrompt: string, llmConfigId?: string) =>
    fetchWithAuth<{ questions: Array<{ id: string; question: string; context?: string }> }>(
      "/projects/clarifications",
      token,
      {
        method: "POST",
        body: JSON.stringify({ initialPrompt, llmConfigId }),
      }
    ),
  generateDiagram: (token: string, projectId: string, llmConfigId?: string) =>
    fetchWithAuth<{ diagramData: DiagramData; version: ProjectVersion }>(
      `/projects/${projectId}/generate-diagram`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ llmConfigId }),
      }
    ),
  revertVersion: (token: string, projectId: string, targetVersionNumber: number) =>
    fetchWithAuth<{ message: string; version: ProjectVersion }>(
      `/projects/${projectId}/revert`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ targetVersionNumber }),
      }
    ),
  deleteProject: (token: string, projectId: string) =>
    fetchWithAuth<{ success: boolean }>(`/projects/${projectId}`, token, {
      method: "DELETE",
    }),

  // Admin: user roles
  getUsers: (token: string) =>
    fetchWithAuth<{ users: AdminUser[] }>("/users", token),
  updateUserRole: (token: string, id: string, role: "ADMIN" | "USER") =>
    fetchWithAuth<{ user: AdminUser }>(`/users/${id}/role`, token, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
};

