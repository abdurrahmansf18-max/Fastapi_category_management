import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlatformAuthApi } from "./shared/api/auth";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function SignupApp() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tenant_slug: string;
    verification_link: string;
    dev_verification_token?: string | null;
  } | null>(null);
  const [error, setError] = useState("");

  const effectiveSlug = useMemo(
    () => slugify(tenantSlug || workspaceName),
    [tenantSlug, workspaceName]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await PlatformAuthApi.signup({
        email,
        password,
        workspace_name: workspaceName,
        tenant_slug: effectiveSlug,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-gray-900 p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create documentation workspace</h1>
          <p className="mt-2 text-gray-400">
            Your public docs will be available at <span className="text-emerald-300">/d/{effectiveSlug || "workspace"}</span>.
          </p>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-semibold text-emerald-200">Verification email sent.</p>
              <p className="mt-2 text-sm text-gray-300">
                Open the verification link to activate your workspace.
              </p>
            </div>
            {result.dev_verification_token && (
              <a
                className="block rounded-xl bg-emerald-600 px-4 py-3 text-center font-semibold hover:bg-emerald-500"
                href={`/verify-email?token=${encodeURIComponent(result.dev_verification_token)}`}
              >
                Verify locally
              </a>
            )}
            <Link className="block text-center text-sm text-gray-400 hover:text-white" to="/">
              Back home
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Workspace name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="workspace-slug"
              value={tenantSlug || effectiveSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            <button
              disabled={loading || !effectiveSlug}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create workspace"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
