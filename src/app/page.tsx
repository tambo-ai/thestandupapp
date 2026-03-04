import { withAuth, getSignInUrl } from "@workos-inc/authkit-nextjs";
import Link from "next/link";

export default async function LandingPage() {
  const { user } = await withAuth();
  const signInUrl = user ? null : await getSignInUrl();

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

        {user ? (
          <Link
            href="/app"
            className="mt-9 flex items-center gap-3 rounded-xl bg-[#1A1A1A] px-7 py-3 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#333] hover:shadow-lg login-fade-up"
            style={{ animationDelay: "0.28s" }}
          >
            Go to app
          </Link>
        ) : (
          <a
            href={signInUrl!}
            className="mt-9 flex items-center gap-3 rounded-xl bg-[#1A1A1A] px-7 py-3 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#333] hover:shadow-lg login-fade-up"
            style={{ animationDelay: "0.28s" }}
          >
            Sign in
          </a>
        )}

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
