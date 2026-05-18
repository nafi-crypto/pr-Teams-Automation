import { getRules } from "@/lib/config";
import { getUserRepositories, GitHubRepository } from "@/lib/github";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { LoginButton } from "@/components/login-button";
import { UserProfile } from "@/components/user-profile";
import { DashboardTabs } from "@/components/dashboard-tabs";

export const metadata: Metadata = {
  title: "PR Teams Automation — Webhook Routing Engine",
  description: "Route GitHub webhook events to Microsoft Teams and Slack channels with a visual, data-driven routing engine.",
};

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const rules = getRules();
  let availableRepos: GitHubRepository[] = [];

  if (session?.accessToken) {
    availableRepos = await getUserRepositories(session.accessToken);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-20 container mx-auto max-w-5xl px-6 py-6 flex justify-end">
        {isLoggedIn ? <UserProfile /> : null}
      </nav>

      <main className="relative z-10 container mx-auto max-w-5xl px-6 pb-20">
        {/* Hero */}
        <header className="mb-12 text-center animate-fade-in-down pt-6">
          <div className="inline-flex items-center justify-center space-x-3 mb-5 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-medium tracking-wide text-indigo-200">Routing Engine Online</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 mb-4 drop-shadow-sm">
            PR Teams Automation
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Data-driven webhook routing from <strong className="text-white font-semibold">GitHub</strong> to{" "}
            <strong className="text-white font-semibold">Teams</strong> &amp;{" "}
            <strong className="text-white font-semibold">Slack</strong>
          </p>
        </header>

        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center mt-12 p-12 rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 shadow-2xl">
            <div className="h-16 w-16 mb-6 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white">Access Required</h2>
            <p className="text-slate-400 mb-8 max-w-md text-center">
              Sign in with GitHub to access the routing dashboard.
            </p>
            <LoginButton />
          </div>
        ) : (
          <DashboardTabs rules={rules} availableRepos={availableRepos} />
        )}
      </main>
    </div>
  );
}
