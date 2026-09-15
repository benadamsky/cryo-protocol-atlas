import { getDecisionDomainsData } from "./decision-data";

/** Domain tabs for the discovery pages, ordered like the recommendation (lead first). */
export async function discoveryTabs(active: string) {
  const domains = await getDecisionDomainsData();

  return {
    lead: domains[0].domain,
    tabs: domains.map((domain, index) => ({
      label: domain.label,
      href: index === 0 ? "/discovery" : `/discovery/${domain.domain}`,
      active: domain.domain === active
    }))
  };
}
