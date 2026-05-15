import { repoMappings } from "@/lib/config";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { LoginButton } from "@/components/login-button";
import { UserProfile } from "@/components/user-profile";

export const metadata: Metadata = {
  title: "GitHub to Teams Integrator",
  description: "Bridge the gap between GitHub activity and team awareness.",
};

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      
      {/* Navbar with Profile */}
      <nav className="relative z-20 container mx-auto max-w-5xl px-6 py-6 flex justify-end">
        {isLoggedIn ? <UserProfile /> : null}
      </nav>

      <main className="relative z-10 container mx-auto max-w-5xl px-6 pb-20">
        <header className="mb-16 text-center animate-fade-in-down pt-10">
          <div className="inline-flex items-center justify-center space-x-3 mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-medium tracking-wide text-indigo-200">System Online</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 mb-6 drop-shadow-sm">
            PR Teams Automation
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-light leading-relaxed">
            Bridging the gap between <strong className="text-white font-semibold">GitHub activity</strong> and <strong className="text-white font-semibold">team awareness</strong>. Instant notifications, zero delays.
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
              Please sign in with your GitHub account to access the dashboard and manage repository mappings.
            </p>
            <LoginButton />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-8 mb-16 animate-fade-in-up" style={{animationDelay: '100ms'}}>
              <div className="group rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 hover:bg-slate-800/50 hover:border-indigo-500/30 transition-all duration-300 shadow-2xl">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4 text-white">How it Works</h2>
                <ul className="space-y-4 text-slate-400">
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-3">1.</span>
                    GitHub sends an event webhook to this server.
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-3">2.</span>
                    We match the repository to a configured MS Teams channel.
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-3">3.</span>
                    A beautifully formatted adaptive card is delivered instantly.
                  </li>
                </ul>
              </div>

              <div className="group rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 hover:bg-slate-800/50 hover:border-purple-500/30 transition-all duration-300 shadow-2xl">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4 text-white">Setup Instructions</h2>
                <div className="space-y-4 text-slate-400">
                  <p>In your GitHub repository settings, go to Webhooks &gt; Add webhook.</p>
                  <div className="bg-black/50 rounded-xl p-4 border border-slate-800 font-mono text-sm text-indigo-300 break-all">
                    Payload URL: https://&lt;your-domain&gt;/api/github/webhook
                  </div>
                  <p>Set <strong>Content type</strong> to <code>application/json</code> and choose the events you want to track.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 shadow-2xl animate-fade-in-up" style={{animationDelay: '200ms'}}>
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center">
                <svg className="w-6 h-6 mr-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Active Repository Mappings
              </h2>
              
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black/40">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-slate-300">
                    <tr>
                      <th className="px-6 py-4 font-medium">GitHub Repository</th>
                      <th className="px-6 py-4 font-medium">Microsoft Teams Webhook</th>
                      <th className="px-6 py-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-400">
                    {repoMappings.length > 0 ? (
                      repoMappings.map((mapping, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-indigo-300">
                            {mapping.repoName}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs truncate max-w-[200px] md:max-w-[400px]">
                            {mapping.teamsWebhookUrl ? (
                              <span className="text-slate-500 blur-[3px] hover:blur-none transition-all cursor-pointer">
                                {mapping.teamsWebhookUrl.substring(0, 50)}...
                              </span>
                            ) : (
                              <span className="text-yellow-500/80 italic">Not configured</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {mapping.teamsWebhookUrl ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500 border border-yellow-500/20">
                                Missing URL
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">
                          No repository mappings configured yet. Add them in <code className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">lib/config.ts</code>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
