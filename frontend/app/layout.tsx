import "./globals.css";
import SiteNav from "@/components/SiteNav";

export const metadata = { title: "Discovered — Stop applying. Get discovered.", description: "Members-only hiring network. Upload your resume once — companies come to you. Join the waitlist." };

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
