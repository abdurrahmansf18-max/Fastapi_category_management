import PlatformAdminClient from "./platform-admin-client";

export const metadata = {
  title: "Platform Owner",
  robots: { index: false, follow: false },
};

export default function PlatformAdminPage() {
  return <PlatformAdminClient />;
}
