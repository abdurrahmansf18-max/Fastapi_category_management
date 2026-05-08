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

export const PlatformAuthApi = {
  signup(payload: SignupPayload) {
    return http.post<SignupResponse>("/auth/signup", payload, { auth: false });
  },
  verifyEmail(token: string) {
    return http.post<VerifyEmailResponse>("/auth/verify-email", { token }, { auth: false });
  },
};
