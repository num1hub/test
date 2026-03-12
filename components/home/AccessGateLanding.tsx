'use client';

export default function AccessGateLanding({
  deployAuthMisconfigured = false,
}: {
  deployAuthMisconfigured?: boolean;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_36%),radial-gradient(circle_at_78%_18%,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(to_bottom,_rgba(15,23,42,0.96),_rgba(2,6,23,1))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <header className="flex flex-col gap-4 border-b border-slate-800/70 pb-8">
          <p className="text-xs uppercase tracking-[0.32em] text-amber-400">N1Hub.com</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Private N1Hub deployment. Access is locked behind the architect route.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
            This deployment does not expose a public workspace, public sign-up, or public login
            surface. Entry is granted only through the private owner link and requires the exact
            owner login, password, and private access code.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Access Posture</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-white">Private Route</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  The credential form is not linked from the root surface and is meant to be
                  reached only through the owner route.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-white">Single Account</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  This deployment is currently configured for one owner account, not a public
                  multi-user auth system.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm font-semibold text-white">Three Checks</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Access requires the correct login, password, and private code. Planned TOTP
                  support can be added later without reopening the public surface.
                </p>
              </article>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-400">Deployment Note</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              Vercel Hobby is running in a locked architect-only mode.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              If you reached this page directly, that is expected. Unauthenticated routes collapse
              back to this entrypoint. Authorized sessions unlock the workspace from the same root
              path after the owner route completes authentication.
            </p>
            <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
              This root page is intentionally not a public preview. It is the access gate.
            </div>
            {deployAuthMisconfigured ? (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm leading-6 text-rose-100">
                Owner access is temporarily unavailable because deployment auth is not fully configured.
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
