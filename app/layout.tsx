import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlateAndPlan — your free AI workout & meal plan",
  description:
    "Enter your body metrics and food preferences and get a personalized 7-day workout routine, meal plan, and grocery list — free, no sign-up.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-3xl px-4 py-6">
          <header className="mb-8 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              🍽️ PlateAndPlan
            </Link>
            <span className="text-xs text-neutral-500">Free · No sign-up</span>
          </header>
          <main>{children}</main>
          <footer className="mt-16 border-t border-neutral-200 pt-4 text-xs text-neutral-400 dark:border-neutral-800">
            General fitness guidance, not medical advice. Macros are AI-estimated.
          </footer>
        </div>
      </body>
    </html>
  );
}
