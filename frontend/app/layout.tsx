import "./globals.css";
import SiteNav from "@/components/SiteNav";

export const metadata = { title: "10Apply — Invite-only · Upload once. You're done.", description: "Invite-only hiring network. Candidates upload a resume once — employers reach out by email. 5 invites per member." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteNav />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
