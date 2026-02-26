"use client";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  return (
    <div className="relative min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #c5c5c0 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Radial fade from center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, transparent 0%, #FAFAF9 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <p
          className="text-[11px] font-medium tracking-[0.25em] uppercase mb-5 login-fade-up"
          style={{ color: "#999", animationDelay: "0s" }}
        >
          The Standup App
        </p>

        <h1
          className="text-[clamp(32px,5.5vw,48px)] font-semibold tracking-[-0.03em] text-[#1A1A1A] leading-[1.1] max-w-[460px] login-fade-up"
          style={{ animationDelay: "0.08s" }}
        >
          Is there an issue
          <br />
          for that?
        </h1>

        <p
          className="mt-4 text-[15px] leading-relaxed max-w-[340px] login-fade-up"
          style={{ color: "#888", animationDelay: "0.16s" }}
        >
          Your team&apos;s Linear and GitHub activity in one place.
          Ask a question, see your dashboard.
        </p>

        <button
          onClick={handleGoogleSignIn}
          className="mt-9 flex items-center gap-3 rounded-xl bg-[#1A1A1A] px-7 py-3 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#333] hover:shadow-lg cursor-pointer login-fade-up"
          style={{ animationDelay: "0.28s" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Feature pills */}
        <div
          className="flex flex-wrap justify-center gap-2.5 mt-14 login-fade-up"
          style={{ animationDelay: "0.44s" }}
        >
          {[
            { label: "Team overview", color: "#22c55e" },
            { label: "Risk detection", color: "#ef4444" },
            { label: "PR tracking", color: "#6366f1" },
          ].map(({ label, color }) => (
            <span
              key={label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] border bg-white"
              style={{
                color: "#777",
                borderColor: "rgba(0,0,0,0.06)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>

        {/* Mock dashboard preview */}
        <div
          className="mt-16 w-full max-w-[660px] login-fade-up"
          style={{ animationDelay: "0.56s" }}
        >
          <div
            className="rounded-2xl border overflow-hidden bg-white"
            style={{
              borderColor: "rgba(0,0,0,0.08)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
            }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-1.5 px-4 py-2.5 border-b"
              style={{ borderColor: "rgba(0,0,0,0.05)" }}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
              <span className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
              <span className="w-2 h-2 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-[10px] text-[#BBB]">
                standup.tambo.co
              </span>
            </div>

            {/* Mock content */}
            <div className="flex">
              {/* Sidebar mock */}
              <div
                className="w-[160px] shrink-0 p-3.5 border-r hidden sm:block"
                style={{
                  borderColor: "rgba(0,0,0,0.05)",
                  background: "#FDFDFC",
                }}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[rgba(0,0,0,0.06)]" />
                    <div className="h-2 w-14 rounded-full bg-[rgba(0,0,0,0.06)]" />
                  </div>
                  <div className="h-1.5 w-20 rounded-full bg-[rgba(0,0,0,0.04)]" />
                  <div className="h-1.5 w-16 rounded-full bg-[rgba(0,0,0,0.04)]" />
                  <div className="h-1.5 w-24 rounded-full bg-[rgba(0,0,0,0.04)]" />
                  <div className="pt-1.5">
                    <div className="h-6 rounded-lg bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.05)]" />
                  </div>
                </div>
              </div>

              {/* Canvas mock */}
              <div className="flex-1 p-3.5 bg-[#FAFAF9]">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { title: "Team Overview", rows: 4, accent: "#22c55e" },
                    { title: "Risk Report", rows: 3, accent: "#ef4444" },
                    { title: "Weekly Goals", rows: 3, accent: "#3b82f6" },
                    { title: "My PRs", rows: 2, accent: "#a855f7" },
                  ].map(({ title, rows, accent }) => (
                    <div
                      key={title}
                      className="rounded-lg border bg-white p-2.5"
                      style={{ borderColor: "rgba(0,0,0,0.06)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: accent }}
                        />
                        <span className="text-[9px] font-medium text-[#888]">
                          {title}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {Array.from({ length: rows }).map((_, i) => (
                          <div
                            key={i}
                            className="h-1.5 rounded-full bg-[rgba(0,0,0,0.04)]"
                            style={{
                              width: `${65 + Math.sin(i * 2.3) * 30}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fade-out at bottom */}
          <div
            className="h-20 -mt-20 relative z-10"
            style={{
              background:
                "linear-gradient(to top, #FAFAF9 30%, transparent)",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        className="absolute bottom-6 text-[11px] login-fade-up"
        style={{ color: "#BBB", animationDelay: "0.7s" }}
      >
        Built with{" "}
        <a
          href="https://tambo.co"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[#888] transition-colors"
          style={{ color: "#999" }}
        >
          Tambo
        </a>
      </div>
    </div>
  );
}
