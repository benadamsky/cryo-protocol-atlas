"use client";

import { useState, type ReactNode } from "react";

/**
 * Wraps a table whose rows past `limit` carry the `is-extra` class; toggles them.
 * `total` is the number of rows actually rendered inside.
 */
export function Truncated(props: { limit: number; total: number; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = props.total > props.limit;

  return (
    <div className={`truncated${truncated && !expanded ? " is-collapsed" : ""}`}>
      {props.children}
      {truncated ? (
        <div className="truncated__note">
          Showing {expanded ? props.total : props.limit} of {props.total} ·{" "}
          <button onClick={() => setExpanded((current) => !current)} type="button">
            {expanded ? "Show fewer" : "Show all"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
