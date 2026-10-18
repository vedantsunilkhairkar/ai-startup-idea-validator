/**
 * API Client for FastAPI backend integration
 * Supports Authentication, Validation Pipeline, Past Ideas Archive, and Google Trends.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000/api";

const TOKEN_KEY = "antigravity_auth_token";
const USER_KEY = "antigravity_auth_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  created_at?: string;
  last_login_at?: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  user: AuthUser;
}

export interface ValidateRequest {
  title?: string;
  idea: string;
  industry?: string;
  target_audience?: string;
  constraints?: string[];
}

export interface CompetitorItem {
  name: string;
  domain?: string;
  about?: string;
  strengths?: string[];
  weaknesses?: string[];
  gaps?: string[];
}

export interface MVPFeature {
  title: string;
  why?: string;
  kpi?: string;
}

export interface ValidationProgressEvent {
  type: "agent_progress" | "error";
  agent?: string;
  step?: number;
  agent_name?: string;
  status?: string;
  message?: string;
  done?: boolean;
  result?: ValidationResultData;
  error?: string;
}

export interface ValidationResultData {
  id: string;
  title: string;
  idea: string;
  industry?: string;
  target_audience?: string;
  constraints?: string[];
  validation_score: number;
  launch_readiness_verdict: string;
  scores_breakdown: {
    market_demand: number;
    feasibility: number;
    competition_barrier: number;
    business_viability: number;
  };
  idea_extraction?: {
    summary?: string;
    core_value_proposition?: string;
    target_persona?: string;
    industry?: string;
    search_keywords?: string[];
  };
  market_trends?: {
    keyword?: string;
    trend_badge?: string;
    summary?: string;
    interest_series?: number[];
    average_interest?: number;
    trend_direction?: string;
  };
  news_headlines?: Array<{
    title: string;
    source?: string;
    link?: string;
    pubDate?: string;
    date?: string;
  }>;
  competitors?: CompetitorItem[];
  swot_analysis?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  mvp_recommendation?: {
    must_have?: MVPFeature[] | string[];
    nice_to_have?: MVPFeature[] | string[];
    future_scope?: MVPFeature[] | string[];
  };
  risks?: Array<{
    category?: string;
    risk?: string;
    severity?: string;
    mitigation?: string;
  }>;
  visual_statistics?: {
    radar_chart?: Array<{ pillar: string; you: number; benchmark: number }>;
    search_trends_chart?: Array<{ month: string; interest: number }>;
    competitor_matrix_chart?: Array<{ name: string; breadth: number; ux: number; price: number }>;
    risk_profile?: {
      composite_risk_percent: number;
      risk_factors: Array<{ label: string; value: number }>;
    };
  };
  report?: {
    executive_summary?: string;
    founder_recommendations?: string;
    verdict_explanation?: string;
    visual_statistics?: any;
  };
  errors?: string[];
  created_at?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string"
          ? errJson.detail
          : JSON.stringify(errJson.detail);
      } else if (errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const authApi = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.token) {
      setStoredToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.token) {
      setStoredToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  async getMe(): Promise<AuthUser> {
    const user = await request<AuthUser>("/auth/me");
    setStoredUser(user);
    return user;
  },

  logout(): void {
    removeStoredToken();
  },
};

export const validationApi = {
  async validate(data: ValidateRequest): Promise<{ status: string; data: ValidationResultData }> {
    return request<{ status: string; data: ValidationResultData }>("/validate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async validateStream(
    data: ValidateRequest,
    onProgress: (event: ValidationProgressEvent) => void
  ): Promise<ValidationResultData> {
    const url = `${API_BASE_URL}/validate/stream`;
    const token = getStoredToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorDetail = `Request failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson.message) {
          errorDetail = errJson.message;
        }
      } catch {
        // ignore json parse error
      }
      throw new Error(errorDetail);
    }

    if (!response.body) {
      throw new Error("No response stream available from server.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let finalResult: ValidationResultData | null = null;

    const processPart = (part: string) => {
      const lines = part.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const eventData: ValidationProgressEvent = JSON.parse(jsonStr);
            if (eventData.type === "error") {
              throw new Error(eventData.error || "Agent pipeline execution failed.");
            }
            onProgress(eventData);
            if (eventData.done && eventData.result) {
              finalResult = eventData.result;
            }
          } catch (e: any) {
            if (e.message && !e.message.includes("JSON")) {
              throw e;
            }
          }
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const part of parts) {
        processPart(part);
      }
    }

    if (buffer.trim()) {
      processPart(buffer.trim());
    }

    if (!finalResult) {
      throw new Error("Pipeline finished without emitting a validation report.");
    }

    return finalResult;
  },

  async getIdeas(): Promise<{ status: string; count: number; data: ValidationResultData[] }> {
    return request<{ status: string; count: number; data: ValidationResultData[] }>("/ideas");
  },

  async getIdea(id: string): Promise<{ status: string; data: ValidationResultData }> {
    return request<{ status: string; data: ValidationResultData }>(`/ideas/${id}`);
  },

  async deleteIdea(id: string): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>(`/ideas/${id}`, {
      method: "DELETE",
    });
  },
};

export const trendsApi = {
  async getTrends(keyword: string): Promise<{ status: string; data: any }> {
    return request<{ status: string; data: any }>(`/trends?keyword=${encodeURIComponent(keyword)}`);
  },
};

export interface AdminSummary {
  total_users: number;
  admin_users: number;
  total_validations: number;
  validations_7d: number;
  validations_30d: number;
  active_users_30d: number;
  average_score: number;
}

export interface AdminValidation {
  id: string;
  title: string;
  idea: string;
  industry: string;
  validation_score?: number;
  launch_readiness_verdict: string;
  created_at?: string;
  user_name: string;
  user_email: string;
  user_id?: string | null;
}

export interface AdminValidationDetail extends AdminValidation {
  target_audience?: string;
  constraints?: string;
  scores_breakdown?: unknown;
  idea_extraction?: unknown;
  market_analysis?: unknown;
  market_trends?: unknown;
  news_headlines?: unknown;
  competitors?: unknown;
  swot_analysis?: unknown;
  mvp_recommendation?: unknown;
  risks?: unknown;
  visual_statistics?: unknown;
  report?: Record<string, unknown>;
  errors?: unknown;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  created_at?: string;
  last_login_at?: string;
  validation_count: number;
  last_validation_at?: string;
}

export const adminApi = {
  getOverview(): Promise<{
    summary: AdminSummary;
    daily_validations: Array<{ date: string; count: number }>;
    top_industries: Array<{ industry: string; count: number }>;
    recent_validations: AdminValidation[];
  }> {
    return request<{
      summary: AdminSummary;
      daily_validations: Array<{ date: string; count: number }>;
      top_industries: Array<{ industry: string; count: number }>;
      recent_validations: AdminValidation[];
    }>("/admin/overview");
  },

  getUsers(q = "", skip = 0, limit = 25): Promise<{ total: number; data: AdminUser[] }> {
    const params = new URLSearchParams({ q, skip: String(skip), limit: String(limit) });
    return request<{ total: number; data: AdminUser[] }>(`/admin/users?${params.toString()}`);
  },

  getValidations(q = "", skip = 0, limit = 30): Promise<{ total: number; data: AdminValidation[] }> {
    const params = new URLSearchParams({ q, skip: String(skip), limit: String(limit) });
    return request<{ total: number; data: AdminValidation[] }>(`/admin/validations?${params.toString()}`);
  },

  getValidation(id: string): Promise<AdminValidationDetail> {
    return request<AdminValidationDetail>(`/admin/validations/${encodeURIComponent(id)}`);
  },
};
