import { notFound } from "next/navigation";
import { DiscoveryView } from "@/components/discovery-view";
import { getDiscoveryData } from "@/lib/data";
import { discoveryTabs } from "@/lib/discovery-tabs";
import { getDiscoveryQueueRows } from "@/lib/discovery-queue";
import { parseDomainId, staticDomainParams } from "@/lib/domain";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
}

export default async function DiscoveryDomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain: rawDomain } = await params;
  let domain;

  try {
    domain = parseDomainId(rawDomain);
  } catch {
    notFound();
  }

  const [data, rows, { tabs }] = await Promise.all([
    getDiscoveryData(),
    getDiscoveryQueueRows(domain),
    discoveryTabs(domain)
  ]);

  return <DiscoveryView data={data} domain={domain} rows={rows} tabs={tabs} />;
}
