import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { formatDateTime, formatPercent, formatScore } from "@/lib/data";
import { getDomainMeta } from "@/lib/domain";
import { PrimaryNav } from "@/components/primary-nav";
import type { DomainId } from "../../../packages/shared/src/schema";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="shell-ribbon">
        <div className="shell-ribbon__copy">
          <span className="shell-ribbon__eyebrow">Atlas Scope</span>
          <p>
            Atlas already narrows cryopreservation wedges, shows what the literature can and cannot support, and
            turns the current read into next experiments. Discovery stays downstream.
          </p>
        </div>
      </div>
      <main className="page-shell">{children}</main>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <Link className="brandmark" href="/">
        <span className="brandmark__signal" />
        <span>
          <strong>Cryo Protocol Atlas</strong>
          <small>Protocol intelligence for wedge validation and experiment planning</small>
        </span>
      </Link>
      <PrimaryNav />
    </header>
  );
}

export function PageIntro(props: {
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
}) {
  return (
    <section className="hero">
      <div className="hero__copy">
        <span className="eyebrow">{props.eyebrow}</span>
        <h1>{props.title}</h1>
        <p>{props.summary}</p>
      </div>
      {props.children ? <div className="hero__aside">{props.children}</div> : null}
    </section>
  );
}

export function SectionNav(props: {
  items: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
}) {
  return (
    <nav className="section-nav" aria-label="Atlas sections">
      {props.items.map((item) => (
        <a className="section-nav__item" href={`#${item.id}`} key={item.id}>
          <strong>{item.label}</strong>
          <span>{item.summary}</span>
        </a>
      ))}
    </nav>
  );
}

export function ProvenanceCallout(props: {
  eyebrow: string;
  title: string;
  summary: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}) {
  return (
    <aside className="provenance-callout">
      <span className="eyebrow">{props.eyebrow}</span>
      <h3>{props.title}</h3>
      <p>{props.summary}</p>
      <div className="provenance-callout__items">
        {props.items.map((item) => (
          <div className="inline-stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function DomainBadge({ domain }: { domain: DomainId }) {
  const meta = getDomainMeta(domain);

  return (
    <span
      className="domain-badge"
      style={
        {
          "--accent": meta.accent,
          "--accent-soft": meta.accentSoft
        } as CSSProperties
      }
    >
      {meta.label}
    </span>
  );
}

export function SourceNote({ sourceLabel }: { sourceLabel: "worktree" | "primary" }) {
  return (
    <div className="source-note">
      <span className="source-note__label">artifact source</span>
      <strong>{sourceLabel === "worktree" ? "web-atlas worktree" : "primary checkout"}</strong>
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="metric-grid">{children}</div>;
}

export function MetricCard(props: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn";
}) {
  return (
    <article className={joinClasses("metric-card", props.tone && `metric-card--${props.tone}`)}>
      <span className="metric-card__label">{props.label}</span>
      <strong className="metric-card__value">{props.value}</strong>
      {props.detail ? <p className="metric-card__detail">{props.detail}</p> : null}
    </article>
  );
}

export function Section(props: {
  id?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-card" id={props.id}>
      <div className="section-card__header">
        <div>
          <h2>{props.title}</h2>
          {props.subtitle ? <p>{props.subtitle}</p> : null}
        </div>
        {props.actions ? <div>{props.actions}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

export function DomainTabs(props: { domain: DomainId; current: string }) {
  const tabs = [
    { id: "overview", label: "Wedge", href: `/domains/${props.domain}` },
    { id: "atlas", label: "Matrix", href: `/domains/${props.domain}/atlas` },
    { id: "benchmark", label: "Benchmark", href: `/domains/${props.domain}/benchmark` },
    { id: "review", label: "Evidence", href: `/domains/${props.domain}/review` },
    { id: "debug", label: "Debug", href: `/domains/${props.domain}/debug` }
  ];

  return (
    <nav className="tab-strip">
      {tabs.map((tab) => (
        <Link
          className={joinClasses("tab-strip__link", tab.id === props.current && "is-active")}
          href={tab.href}
          key={tab.id}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function ScoreBar(props: {
  label: string;
  value: number;
  detail?: string;
  tone?: "teal" | "amber" | "rose";
}) {
  return (
    <div className="score-bar">
      <div className="score-bar__header">
        <span>{props.label}</span>
        <strong>{formatPercent(props.value)}</strong>
      </div>
      <div className={joinClasses("score-bar__track", props.tone && `score-bar__track--${props.tone}`)}>
        <span className="score-bar__fill" style={{ width: `${Math.max(props.value * 100, 3)}%` }} />
      </div>
      {props.detail ? <p className="score-bar__detail">{props.detail}</p> : null}
    </div>
  );
}

export function StatusPill(props: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "hot";
}) {
  return (
    <span className={joinClasses("status-pill", props.tone && `status-pill--${props.tone}`)}>
      {props.children}
    </span>
  );
}

export function EmptyState(props: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <h3>{props.title}</h3>
      <p>{props.detail}</p>
    </div>
  );
}

export function DataTable(props: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InlineStat(props: { label: string; value: string }) {
  return (
    <div className="inline-stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function QuickFacts(props: { items: Array<{ label: string; value: number | string }> }) {
  return (
    <div className="quick-facts">
      {props.items.map((item) => (
        <InlineStat key={item.label} label={item.label} value={String(item.value)} />
      ))}
    </div>
  );
}

export function ScoreTuple(props: { label: string; value: number }) {
  return (
    <div className="score-tuple">
      <span>{props.label}</span>
      <strong>{formatScore(props.value)}</strong>
    </div>
  );
}

export function ArtifactLedger(props: {
  artifacts: Array<{
    label: string;
    relativePath: string;
    sourceLabel: "worktree" | "primary";
    generatedAt: string | null;
  }>;
}) {
  return (
    <div className="artifact-ledger">
      {props.artifacts.map((artifact) => (
        <div className="artifact-ledger__row" key={`${artifact.label}-${artifact.relativePath}`}>
          <div>
            <strong>{artifact.label}</strong>
            <small>{artifact.relativePath}</small>
          </div>
          <div className="artifact-ledger__meta">
            <span>{artifact.sourceLabel}</span>
            <span>{formatDateTime(artifact.generatedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RawArtifactPanel(props: {
  title: string;
  data: unknown;
  open?: boolean;
}) {
  return (
    <details className="raw-panel" open={props.open}>
      <summary>{props.title}</summary>
      <pre>{JSON.stringify(props.data, null, 2)}</pre>
    </details>
  );
}
