import "../styles/globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthStatus } from "@/components/AuthStatus";
import { WelcomeMessage } from "@/components/WelcomeMessage";

export const metadata: Metadata = {
  title: "Salesforce Interview Prep",
  description: "Flashcards and MCQs for Salesforce Developer interviews"
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
                <h1>Salesforce Developer Interview Prep</h1>
                <WelcomeMessage />
              </div>
              <AuthStatus />
            </header>
            <main>{children}</main>
            <footer className="footer">
              <span>Built with Next.js + Supabase</span>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
