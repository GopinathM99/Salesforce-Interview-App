import "../styles/globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthStatus } from "@/components/AuthStatus";

export const metadata: Metadata = {
  title: "Salesforce Interview Prep",
  description: "Flashcards and MCQs for Salesforce Developer interviews",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-icon.png'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="container">
            <header className="header">
              <div className="header-title">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  role="img"
                  aria-label="Interview app logo"
                  style={{ width: 80, height: 80, flexShrink: 0 }}
                >
                  <rect
                    x="4"
                    y="4"
                    width="56"
                    height="56"
                    rx="14"
                    ry="14"
                    fill="#0f172a"
                  />
                  <g transform="translate(12,6) scale(0.7)">
                    <path
                      d="M18 12h28c4.4 0 8 3.6 8 8v10c0 4.4-3.6 8-8 8h-8l-6 6c-.8.8-2.1.8-2.9 0-.4-.4-.6-.9-.6-1.4V38H18c-4.4 0-8-3.6-8-8V20c0-4.4 3.6-8 8-8z"
                      fill="#111827"
                      stroke="#e5e7eb"
                      strokeWidth="2.8"
                    />
                    <circle
                      cx="24"
                      cy="22"
                      r="4"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2.8"
                    />
                    <line x1="32" y1="20" x2="44" y2="20"
                      stroke="#e5e7eb" strokeWidth="2.8" strokeLinecap="round" />
                    <line x1="32" y1="25" x2="48" y2="25"
                      stroke="#e5e7eb" strokeWidth="2.8" strokeLinecap="round" />
                    <line x1="32" y1="30" x2="40" y2="30"
                      stroke="#e5e7eb" strokeWidth="2.8" strokeLinecap="round" />
                  </g>
                  <circle cx="22" cy="46" r="4" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                  <path
                    d="M16 55c0-3 2.5-5 6-5s6 2 6 5"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="42" cy="46" r="4" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                  <path
                    d="M36 55c0-3 2.5-5 6-5s6 2 6 5"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <h1>Salesforce Developer Interview Prep</h1>
              </div>
              <AuthStatus />
            </header>
            <main>{children}</main>
            <footer className="footer">
              <span>Built with Next.js + Supabase</span>
              <span style={{ margin: "0 8px" }}>•</span>
              <a href="/contact" style={{ color: "#007bff", textDecoration: "none" }}>
                Contact Us
              </a>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
