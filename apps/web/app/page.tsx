import { RecommendationView } from "@/components/recommendation-view";
import { getDecisionDomainsData } from "@/lib/decision-data";

export default async function RecommendationPage() {
  const domains = await getDecisionDomainsData();

  return <RecommendationView domain={domains[0].domain} domains={domains} />;
}
