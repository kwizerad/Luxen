"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [names, setNames] = useState("");
  const [email, setEmail] = useState("");
  const [examType, setExamType] = useState("math");
  const [year, setYear] = useState("2026");

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-black/10 dark:shadow-white/5 transition-colors duration-300">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Navo</p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Request an exam in one click.</h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              Use the button below to start your exam request, or visit the About page to learn more about Navo’s multi-service platform.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Request Exam
            </button>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              About Navo
            </Link>
          </div>

          <div
            className={`mt-8 overflow-hidden transition-all duration-500 ease-in-out ${
              showForm ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className="space-y-2">
                <label htmlFor="names" className="block text-sm font-medium text-foreground">
                  Names
                </label>
                <input
                  id="names"
                  name="names"
                  type="text"
                  value={names}
                  onChange={(event) => setNames(event.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="examType" className="block text-sm font-medium text-foreground">
                  Exam type
                </label>
                <select
                  id="examType"
                  name="examType"
                  value={examType}
                  onChange={(event) => setExamType(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                >
                  <option value="math">Math</option>
                  <option value="science">Science</option>
                  <option value="english">English</option>
                  <option value="history">History</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-90"
              >
                Submit Request
              </button>
            </form>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">&copy; {year} Navo. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
