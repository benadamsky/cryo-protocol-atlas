import type { ReactNode } from "react";
import Link from "next/link";
import { PrimaryNav } from "@/components/primary-nav";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <div className="column">
        <PrimaryNav />
        <main>{children}</main>
      </div>
    </div>
  );
}

export function PageHeader(props: { title: string; note: string }) {
  return (
    <div className="page-header">
      <h1>{props.title}</h1>
      <p>{props.note}</p>
    </div>
  );
}

export function DomainTabs(props: {
  tabs: Array<{ label: string; href: string; active: boolean }>;
}) {
  return (
    <nav className="tabs" aria-label="Domain">
      {props.tabs.map((tab) => (
        <Link
          aria-current={tab.active ? "page" : undefined}
          className={tab.active ? "is-active" : undefined}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function Section(props: { label: string; first?: boolean; children: ReactNode }) {
  return (
    <section className={joinClasses("section", props.first && "section--first")}>
      <div className="k">{props.label}</div>
      <div className="section__body">{props.children}</div>
    </section>
  );
}

export function Facts(props: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="facts">
      {props.items.map((item) => (
        <div key={item.label}>
          <dt className="k">{item.label}</dt>
          <dd className="facts__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Funnel(props: { steps: Array<{ value: number; label: string }> }) {
  return (
    <div className="funnel">
      {props.steps.map((step, index) => (
        <div className="funnel__step" key={step.label}>
          <div>
            <div className="funnel__value">{new Intl.NumberFormat("en-US").format(step.value)}</div>
            <div className="funnel__label">{step.label}</div>
          </div>
          {index < props.steps.length - 1 ? (
            <div className="funnel__arrow" aria-hidden="true">
              →
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Status(props: { tone: "ok" | "warn"; children: ReactNode }) {
  return (
    <span className={`status status--${props.tone}`}>
      <span className="status__dot" aria-hidden="true" />
      {props.children}
    </span>
  );
}

export function Tag(props: { children: ReactNode }) {
  return <span className="tag">{props.children}</span>;
}

export function Kicker(props: { children: ReactNode }) {
  return <div className="k">{props.children}</div>;
}

export type TableColumn = string | { label: string; className?: string };

export function Table(props: {
  columns: TableColumn[];
  rows: Array<Array<ReactNode>>;
  rowClassName?: (index: number) => string | undefined;
  empty?: string;
}) {
  const columns = props.columns.map((column) =>
    typeof column === "string" ? { label: column, className: undefined } : column
  );

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.label}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.length === 0 && props.empty ? (
            <tr>
              <td className="empty" colSpan={columns.length}>
                {props.empty}
              </td>
            </tr>
          ) : null}
          {props.rows.map((row, rowIndex) => (
            <tr className={props.rowClassName?.(rowIndex)} key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td className={columns[cellIndex]?.className} key={cellIndex}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Defs(props: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="defs">
      {props.items.map((item) => (
        <div style={{ display: "contents" }} key={item.label}>
          <dt className="k">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Packet(props: {
  kicker: ReactNode;
  title: string;
  lead?: boolean;
  why: string;
  items: Array<{ label: string; value: ReactNode }>;
  details?: ReactNode;
}) {
  return (
    <article className="packet">
      <div className="k">{props.kicker}</div>
      <h2>
        {props.title}
        {props.lead ? <Status tone="ok">lead</Status> : null}
      </h2>
      <p className="packet__why">{props.why}</p>
      <Defs items={props.items} />
      {props.details ? (
        <details>
          <summary>Design details</summary>
          <div className="packet__details">{props.details}</div>
        </details>
      ) : null}
    </article>
  );
}

export function Footnote(props: { children: ReactNode }) {
  return <p className="footnote">{props.children}</p>;
}

export function Crumbs(props: { items: Array<{ label: string; href: string; active?: boolean }>; foot?: boolean }) {
  return (
    <nav className={joinClasses("crumbs", props.foot && "crumbs--foot")} aria-label="Domain views">
      {props.items.map((item) => (
        <Link className={item.active ? "is-active" : undefined} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function ArtifactList(props: {
  artifacts: Array<{
    label: string;
    relativePath: string;
    sourceLabel: "worktree" | "primary";
    generatedAt: string | null;
  }>;
}) {
  return (
    <Table
      columns={["Artifact", { label: "Path", className: "tag" }, { label: "Source", className: "tag" }, { label: "Generated", className: "tag" }]}
      rows={props.artifacts.map((artifact) => [
        artifact.label,
        artifact.relativePath,
        artifact.sourceLabel,
        artifact.generatedAt ?? "n/a"
      ])}
    />
  );
}

export function RawJson(props: { title: string; data: unknown; open?: boolean }) {
  return (
    <details open={props.open}>
      <summary className="small">{props.title}</summary>
      <pre>{JSON.stringify(props.data, null, 2)}</pre>
    </details>
  );
}

export function PaperLink(props: { title: string; href: string | null }) {
  if (!props.href) {
    return <>{props.title}</>;
  }

  return (
    <a href={props.href} rel="noreferrer" target="_blank">
      {props.title}
    </a>
  );
}
