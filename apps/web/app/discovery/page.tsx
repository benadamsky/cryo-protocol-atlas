import { DiscoveryView } from "@/components/discovery-view";
import { getDiscoveryData } from "@/lib/data";
import { discoveryTabs } from "@/lib/discovery-tabs";
import { getDiscoveryQueueRows } from "@/lib/discovery-queue";
import { getDecisionDomainsData } from "@/lib/decision-data";

export default async function DiscoveryPage() {
  const domains = await getDecisionDomainsData();
  const domain = domains[0].domain;
  const [data, rows, { tabs }] = await Promise.all([
    getDiscoveryData(),
    getDiscoveryQueueRows(domain),
    discoveryTabs(domain)
  ]);

  return <DiscoveryView data={data} domain={domain} rows={rows} tabs={tabs} />;
}
