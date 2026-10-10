import "./globals.css";
import SiteNav from "@/components/SiteNav";

export const metadata = {
  title: "rec — Resume-First Hiring Marketplace",
  description:
    "Upload your resume once. Get matched with relevant opportunities through deterministic scoring, transparent evidence, and direct recruiter messaging.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 selection:bg-neutral-900 selection:text-white">
        <SiteNav />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
