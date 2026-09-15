import { notFound } from "next/navigation";
import { RecommendationView } from "@/components/recommendation-view";
import { getDecisionDomainsData } from "@/lib/decision-data";
import { parseDomainId, staticDomainParams } from "@/lib/domain";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
}

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain: rawDomain } = await params;
  let domain;

  try {
    domain = parseDomainId(rawDomain);
  } catch {
    notFound();
  }

  const domains = await getDecisionDomainsData();

  return <RecommendationView domain={domain} domains={domains} />;
}
