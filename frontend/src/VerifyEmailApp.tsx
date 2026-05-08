import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlatformAuthApi } from "./shared/api/auth";

export default function VerifyEmailApp() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError("Verification token is missing.");
      setLoading(false);
      return;
    }
    PlatformAuthApi.verifyEmail(token)
      .then((res) => setTenantSlug(res.tenant_slug))
      .catch((err) => setError(err?.message || "Verification failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-8 text-center shadow-2xl">
        {loading ? (
          <p className="text-gray-300">Verifying...</p>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold text-red-200">Verification failed</h1>
            <p className="mt-3 text-gray-300">{error}</p>
            <Link className="mt-6 inline-block rounded-xl bg-gray-800 px-4 py-3 hover:bg-gray-700" to="/signup">
              Create a new workspace
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-emerald-200">Workspace activated</h1>
            <p className="mt-3 text-gray-300">Your documentation site is ready.</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500" to={`/d/${tenantSlug}/admin`}>
                Open admin panel
              </Link>
              <Link className="rounded-xl bg-gray-800 px-4 py-3 hover:bg-gray-700" to={`/d/${tenantSlug}`}>
                View public site
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
