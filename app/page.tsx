"use client";

import { useState } from "react";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [names, setNames] = useState("");
  const [email, setEmail] = useState("");
  const [examType, setExamType] = useState("math");

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-slate-900">Request Exam</h1>
            <p className="mt-2 text-sm text-slate-500">
              Click the button to request your exam and fill in the details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Request Exam
          </button>
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
              <label htmlFor="names" className="block text-sm font-medium text-slate-700">
                Names
              </label>
              <input
                id="names"
                name="names"
                type="text"
                value={names}
                onChange={(event) => setNames(event.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="examType" className="block text-sm font-medium text-slate-700">
                Exam type
              </label>
              <select
                id="examType"
                name="examType"
                value={examType}
                onChange={(event) => setExamType(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="math">Math</option>
                <option value="science">Science</option>
                <option value="english">English</option>
                <option value="history">History</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Request Exam
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
