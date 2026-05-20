import { http } from "./client";

export type SignupPayload = {
  email: string;
  password: string;
  workspace_name: string;
  tenant_slug: string;
};

export type SignupResponse = {
  message: string;
  tenant_slug: string;
  verification_link: string;
  dev_verification_token?: string | null;
};

export type VerifyEmailResponse = {
  message: string;
  tenant_slug: string;
};

export type WorkspaceOption = {
  tenant_id: string;
  tenant_slug: string;
  workspace_name: string;
  role: "owner" | "admin" | string;
};

export type CentralLoginResponse = {
  message: string;
  selection_token: string;
  workspaces: WorkspaceOption[];
};

export type WorkspaceSelectResponse = {
  access_token: string;
  token_type: "cookie";
  tenant_slug: string;
};

export const PlatformAuthApi = {
  signup(payload: SignupPayload) {
    return http.post<SignupResponse>("/auth/signup", payload, { auth: false });
  },
  verifyEmail(token: string) {
    return http.post<VerifyEmailResponse>("/auth/verify-email", { token }, { auth: false });
  },
  login(email: string, password: string) {
    return http.post<CentralLoginResponse>("/auth/login", { email, password }, { auth: false });
  },
  selectWorkspace(selectionToken: string, tenantSlug: string) {
    return http.post<WorkspaceSelectResponse>(
      "/auth/select-workspace",
      { selection_token: selectionToken, tenant_slug: tenantSlug },
      { auth: false }
    );
  },
};
