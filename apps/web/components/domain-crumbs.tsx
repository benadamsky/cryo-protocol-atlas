import { Crumbs } from "@/components/atlas-ui";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";
import type { DomainId } from "../../../packages/shared/src/schema";

export function DomainCrumbs(props: { domain: DomainId; current: "overview" | "atlas" | "benchmark" | "review" | "debug" }) {
  const items = [
    { id: "overview", label: "Wedge", href: `/domains/${props.domain}` },
    { id: "atlas", label: "Matrix", href: `/domains/${props.domain}/atlas` },
    { id: "benchmark", label: "Benchmark", href: `/domains/${props.domain}/benchmark` },
    { id: "review", label: "Evidence", href: `/domains/${props.domain}/review` },
    { id: "debug", label: "Debug", href: `/domains/${props.domain}/debug` }
  ].filter((item) => INTERNAL_DEBUG_ENABLED || item.id !== "debug");

  return <Crumbs items={items.map((item) => ({ ...item, active: item.id === props.current }))} />;
}
