"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function AboutPage() {
  const [year, setYear] = useState("2026");

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12 flex flex-col gap-8 rounded-3xl border border-border bg-card p-6 shadow-xl shadow-black/10 dark:shadow-white/5 transition-colors duration-300 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Navo</p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
              One platform for housing, exams, events, tasks, and more.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              Navo is a modern multi-service digital platform that brings everyday needs into one unified experience. Instead of switching between apps, users can access homes, exam prep, wedding planning, productivity tools, and expanding services in one place.
            </p>
          </div>
          <ThemeSwitcher />
        </header>

        <section className="w-full rounded-3xl border border-border bg-card p-8 shadow-xl shadow-black/10 dark:shadow-white/5 transition-colors duration-300">
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-semibold">Built for everyday modern living</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Navo is designed for simplicity, flexibility, and scalability. Each service is a module inside the platform, making it easy to move between features without friction.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-3xl border border-border bg-background p-5">
                  <p className="font-semibold">House rentals & property listings</p>
                  <p className="mt-2 text-sm text-muted-foreground">Browse and manage homes with intuitive listings and rental workflows.</p>
                </article>
                <article className="rounded-3xl border border-border bg-background p-5">
                  <p className="font-semibold">Driving exam preparation</p>
                  <p className="mt-2 text-sm text-muted-foreground">Study and test your knowledge with dedicated exam tools and tracking.</p>
                </article>
                <article className="rounded-3xl border border-border bg-background p-5">
                  <p className="font-semibold">Wedding planning & organization</p>
                  <p className="mt-2 text-sm text-muted-foreground">Keep event details, vendors, and deadlines organized in one place.</p>
                </article>
                <article className="rounded-3xl border border-border bg-background p-5">
                  <p className="font-semibold">Task management & productivity</p>
                  <p className="mt-2 text-sm text-muted-foreground">Manage your daily tasks and stay productive with built-in tools.</p>
                </article>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background p-6">
              <h3 className="text-xl font-semibold">What makes Navo different</h3>
              <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
                <li>• Unified access to multiple essential services</li>
                <li>• Modular service design for fast growth</li>
                <li>• Clean interface for mobile and desktop</li>
                <li>• Smooth navigation between service modules</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-border bg-card p-8">
            <div>
              <h2 className="text-3xl font-semibold">About the exam module</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Navo includes an exam request experience as part of its modular service platform. Use the home page to create and submit your exam request.
              </p>
            </div>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Go to Request page
            </Link>
          </div>
        </section>

        <footer className="mt-12 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-xl shadow-black/10 dark:shadow-white/5 transition-colors duration-300">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-semibold text-foreground">Navo</p>
              <p className="mt-2 max-w-xl">
                Navo helps you organize everyday services in one place with fast workflows and theme support.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <Link href="/" className="transition hover:text-primary">
                Home
              </Link>
              <a href="#" className="transition hover:text-primary">
                Docs
              </a>
              <a href="#" className="transition hover:text-primary">
                Contact
              </a>
            </div>
          </div>
          <p className="mt-6 border-t border-border pt-6 text-xs text-muted-foreground">
            &copy; {year} Navo. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
