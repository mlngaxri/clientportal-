"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../lib/client";
import {
  projectSections,
  phaseLabels,
  type Project,
  type Board,
} from "../lib/model";
import DirectionBoard from "./DirectionBoard";
import Review from "./Review";
import LaunchWorkspace from "./LaunchWorkspace";
import Dialog from "./Dialog";
import PaymentReturn, { usePaymentReturn } from "./PaymentReturn";
import StateEditor from "./StateEditor";
import SiteContentEditor from "./SiteContentEditor";
import SiteSetup from "./SiteSetup";
import AnalyticsWorkspace from "./AnalyticsWorkspace";
import InboxWorkspace from "./InboxWorkspace";
import SettingsWorkspace from "./SettingsWorkspace";
import DomainsWorkspace from "./DomainsWorkspace";
import BillingWorkspace from "./BillingWorkspace";
import BuildHistory from "./BuildHistory";
export default function ProjectWorkspace({
  initialProject,
  initialBoards,
  section,
  operator,
}: {
  initialProject: Project;
  initialBoards: Board[];
  section: string;
  operator: boolean;
}) {
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  useEffect(() => { const media = matchMedia("(max-width: 760px)"); const sync = () => setMobile(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  const [project, setProject] = useState(initialProject),
    [boards, setBoards] = useState(initialBoards),
    [error, setError] = useState(""),
    [approve, setApprove] = useState(false),
    [busy, setBusy] = useState(false),
    [paying, setPaying] = useState("");
  const payment = usePaymentReturn(project.id, () => void refresh());
  async function refresh() {
    const r = await api(`/api/projects/${project.id}`);
    setProject(r.project);
    setBoards(r.boards);
    router.refresh();
  }
  async function action(
    action: string,
    payload: Record<string, unknown> = {},
    board?: Board,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/projects/${project.id}/command`, {
        action,
        payload,
        expected: board?.version ?? project.version,
        key: crypto.randomUUID(),
      });
      setApprove(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pay(kind: string) {
    if (paying || payment.blocked) return;
    setPaying(kind);
    setError("");
    try {
      const r = await api("/api/checkout", { projectId: project.id, kind });
      window.location.assign(r.url);
    } catch (e) {
      setError((e as Error).message);
      setPaying("");
    }
  }
  const initial = boards.find((b) => b.kind === "initial");
  const revision =
    boards.find((b) => b.kind === "revision" && b.status === "DRAFT") ||
    boards.find((b) => b.kind === "revision" && b.status === "SUBMITTED") ||
    boards.filter((b) => b.kind === "revision").at(-1);
  const board = boards.find((b) => b.kind === section);
  const review = section === "review" && revision;
  const build = project.phase === "BUILDING";
  const allSections = projectSections(project.phase, operator);
  const primary = project.phase === "LIVE" ? ["overview", "pages", "analytics", "inbox"] : ["overview", "direction", "review"];
  const sectionLabel = (s: string) => s === "states" ? "States · Pro" : s === "seo" ? "Search" : s === "build" ? "Project history" : s[0].toUpperCase() + s.slice(1);
  const navigationLink = (s: string) => <Link key={s} aria-current={s === section ? "page" : undefined} className={s === section ? "active" : ""} href={`/projects/${project.id}/${s}`}>{sectionLabel(s)}</Link>;
  return (
    <main className="portal-v2 production-portal">
      <header className="portal-v2-topbar">
        <div className="portal-v2-project">
          <Link
            href={
              process.env.NEXT_PUBLIC_MARKETING_URL ||
              "https://fourthform-marketing.vercel.app/"
            }
            className="portal-v2-logo"
          >
            <span className="ff-mark" aria-hidden="true" />
            fourthform
          </Link>
          <span className="portal-v2-slash">/</span>
          <Link href="/app">{project.name}</Link>
        </div>
        <div className="portal-v2-status">{phaseLabels[project.phase]}</div>
        <div className="portal-v2-account">
          <button
            data-leave-editor
            onClick={() =>
              api("/api/auth", { mode: "logout" })
                .then(() => window.location.assign("/start"))
                .catch((e) => setError(e.message))
            }
          >
            Sign out
          </button>
        </div>
      </header>
      <div className={`portal-v2-grid ${review ? "" : "without-inspector"}`}>
        <aside className="portal-v2-sidebar">
          <nav className="portal-v2-nav" aria-label="Project navigation">
            <span className="overline">Form</span>
            {allSections.filter(s => primary.includes(s)).map(navigationLink)}
            <details className="portal-more-nav" open={!mobile || undefined} onClick={event => { if (mobile && (event.target as Element).closest("a")) event.currentTarget.removeAttribute("open"); }}><summary>More{!primary.includes(section) ? ` · ${sectionLabel(section)}` : ""}</summary><div>{allSections.filter(s => !primary.includes(s)).map(navigationLink)}</div></details>
          </nav>
          <div className="portal-project-progress">
            <span className="overline">Project</span>
            {["Direction", "Build", "Review", "Launch"].map((s, i) => (
              <div className={`progress-row ${["DIRECTION", "BUILDING", "REVIEW", "LAUNCH"].indexOf(project.phase) === i ? "current" : ""}`} key={s}>
                <span className="mono">0{i + 1}</span>
                <strong>{s}</strong>
              </div>
            ))}
          </div>
          <Link
            className="portal-back-link"
            href={
              process.env.NEXT_PUBLIC_MARKETING_URL ||
              "https://fourthform-marketing.vercel.app/"
            }
          >
            Marketing site
          </Link>
        </aside>
        {section === "direction" && initial && (
          <div className="initial-and-notes">
            <DirectionBoard
              key={`${initial.id}:${initial.version}:${initial.locked_at}`}
              board={initial}
              initial
              readOnly={!!initial.locked_at}
              onSent={() => void refresh()}
            />
            {initial.locked_at && boards.find((b) => b.kind === "notes") && (
              <DirectionBoard board={boards.find((b) => b.kind === "notes")!} />
            )}
          </div>
        )}
        {review && (
          <Review
            key={revision.id + revision.status + revision.version}
            project={project}
            board={revision}
            otherBoards={boards.filter(
              (b) => b.kind === "revision" && b.id !== revision.id,
            )}
            onRefresh={() => void refresh()}
          />
        )}
        {section === "launch" && (
          <LaunchWorkspace project={project} onRefresh={() => void refresh()} />
        )}
        {section === "states" && board && (
          <StateEditor
            board={board}
            pro={project.pro}
            onUpgrade={() => void pay("pro")}
          />
        )}
        {(section === "pages" || section === "seo") && (
          <SiteContentEditor
            key={section}
            projectId={project.id}
            section={section}
            live={project.phase === "LIVE"}
          />
        )}
        {section === "connections" && (
          <SettingsWorkspace projectId={project.id} connections />
        )}
        {section === "settings" && <SettingsWorkspace projectId={project.id} />}
        {section === "build" && <BuildHistory projectId={project.id} />}
        {section === "billing" && (
          <BillingWorkspace
            busy={!!paying || payment.blocked}
            project={project}
            onPay={(kind) => void pay(kind)}
          />
        )}
        {section === "domains" && <DomainsWorkspace projectId={project.id} />}
        {section === "analytics" && (
          <AnalyticsWorkspace projectId={project.id} />
        )}
        {section === "inbox" && <InboxWorkspace projectId={project.id} />}
        {section === "overview" && (
          <section className="direction-workspace overview">
            <span className="overline">Form / Overview</span>
            <h1>{phaseLabels[project.phase]}</h1>
            <PaymentReturn payment={payment} />
            <p className="overline">{project.phase === "BUILDING" || project.phase === "REVISION_IN_PROGRESS" ? "Next step: Fourthform is preparing your website" : project.phase === "LIVE" ? "Next step: keep your content current" : "Next step: your action"}</p>
            <div className="connected-metrics"><div><span>Saved Directions</span><strong>{boards.reduce((n, b) => n + (b.data.objects?.length || 0), 0)}</strong></div><div><span>Rounds remaining</span><strong>{Math.max(0, project.revision_limit - project.revision_used)}</strong></div></div>
            {project.phase === "DIRECTION" && (
              <>
                <p>
                  Your business information is already in your Initial
                  Direction. Add what matters, then send it to Fourthform.
                </p>
                <Link
                  className="primary"
                  href={`/projects/${project.id}/direction`}
                >
                  Open Direction
                </Link>
              </>
            )}
            {build && (
              <ol className="build-stages">
                {[
                  "Direction received",
                  "Building",
                  "Internal check",
                  "Ready for review",
                ].map((x) => (
                  <li
                    className={project.build_step === x ? "current" : ""}
                    key={x}
                  >
                    {x}
                    {project.build_step === x ? " · Current" : ""}
                  </li>
                ))}
              </ol>
            )}
            {["REVIEW", "REVISION_IN_PROGRESS"].includes(project.phase) && (
              <>
                <p>
                  Your website is the starting point. Review it directly and
                  collect Directions into a batch.
                </p>
                <Link
                  className="primary"
                  href={`/projects/${project.id}/review`}
                >
                  Review website
                </Link>
                {project.phase === "REVIEW" && (
                  <button onClick={() => setApprove(true)}>Approve site</button>
                )}
                {project.revision_used >= project.revision_limit && (
                  <button disabled={!!paying || payment.blocked} onClick={() => void pay("revision")}>
                    Additional revision · A$150
                  </button>
                )}
              </>
            )}
            {project.phase === "APPROVED_AWAITING_FINAL_PAYMENT" && (
              <>
                <p>Your site is approved. The remaining balance is A$1,300.</p>
                <button className="primary" disabled={!!paying || payment.blocked} onClick={() => void pay("final")}>
                  Pay A$1,300
                </button>
                <button onClick={() => void refresh()}>
                  Check payment status
                </button>
              </>
            )}
            {project.phase === "LAUNCH" && (
              <Link className="primary" href={`/projects/${project.id}/launch`}>
                Bring it live
              </Link>
            )}
            {project.phase === "LIVE" && (
              <>
                <p>Core is included with your Fourthform website.</p>
                <Link href={`/projects/${project.id}/billing`}>
                  View billing and subscriptions
                </Link>
                {project.live_url && (
                  <a
                    className="primary"
                    href={project.live_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View your website ↗
                  </a>
                )}
                <details>
                  <summary>Build history</summary>
                  {boards
                    .filter((b) => b.locked_at)
                    .map((b) => (
                      <details key={b.id}>
                        <summary>
                          {b.kind === "initial"
                            ? "Initial Direction"
                            : "Revision"}{" "}
                          · {b.status}
                        </summary>
                        {(b.submitted_data || b.data).objects.map((o) => (
                          <p key={o.id}>{o.text || o.name || o.type}</p>
                        ))}
                      </details>
                    ))}
                </details>
              </>
            )}
            {operator && (
              <details className="operator-tools">
                <summary>Fourthform team actions</summary>
                <SiteSetup project={project} />
                {project.phase === "DIRECTION" && (
                  <button disabled={busy} onClick={() => void action("begin_build")}>
                    Begin building
                  </button>
                )}
                {build && (
                  <>
                    <button disabled={busy} onClick={() => void action("internal_check")}>
                      Internal check
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const url = prompt(
                          "HTTPS review URL. The managed review site is included below.",
                          new URL(
                            `/review/${project.id}`,
                            window.location.origin,
                          ).toString(),
                        );
                        if (url) void action("deliver", { url });
                      }}
                    >
                      Deliver review site
                    </button>
                  </>
                )}
                {boards
                  .filter(
                    (b) =>
                      b.kind === "revision" &&
                      ["SUBMITTED", "IN_PROGRESS"].includes(b.status),
                  )
                  .map((b) => (
                    <button
                      key={b.id}
                      disabled={busy}
                      onClick={() =>
                        void action(
                          b.status === "SUBMITTED"
                            ? "start_revision"
                            : "complete_revision",
                          { boardId: b.id },
                          b,
                        )
                      }
                    >
                      {b.status === "SUBMITTED"
                        ? "Start revision"
                        : "Complete revision"}
                    </button>
                  ))}
              </details>
            )}
          </section>
        )}
      </div>
      {error && (
        <div className="global-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {approve && (
        <Dialog title="Approve this website?" onClose={() => setApprove(false)}>
          <p>Approve the website you have just reviewed. This ends the build and revision stage. Your website becomes public after the balance and final launch checks are complete.</p>
          {project.preview_url && <a href={project.preview_url} target="_blank" rel="noreferrer">Review the current website ↗</a>}
          <p>
            Remaining balance: {project.package === "FIRST" ? "A$0" : "A$1,300"}
          </p>
          <button onClick={() => setApprove(false)}>Back</button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void action("approve")}
          >
            Approve website
          </button>
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
    </main>
  );
}
