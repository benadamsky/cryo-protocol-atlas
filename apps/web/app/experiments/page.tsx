import { Defs, Packet, PageHeader, PaperLink } from "@/components/atlas-ui";
import { getExperimentsPageData, type DecisionDomainData } from "@/lib/decision-data";
import { paperHrefByTitle } from "@/lib/paper-links";
import { shortDate } from "@/lib/ui-copy";

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function countWord(value: number) {
  return COUNT_WORDS[value] ?? String(value);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function runLine(arms: string[], readouts: string[]) {
  const armList = arms.slice(0, 3).join(" vs ");
  const readoutList = readouts.join(" and ");
  return `${capitalize(armList || "minimal arm set")}, scored on ${readoutList || "the primary readouts"}.`;
}

function paperList(domainData: DecisionDomainData["domainData"], titles: string[]) {
  if (titles.length === 0) {
    return "No supporting papers surfaced yet.";
  }

  return titles.map((title, index) => (
    <span key={title}>
      {index > 0 ? " · " : null}
      <PaperLink href={paperHrefByTitle(domainData, title)} title={title} />
    </span>
  ));
}

/** The packet's own blocker: the first uncertainty no other packet in the domain shares, else its first. */
function watchOut(packetId: string, uncertainties: string[], siblings: Array<{ packetId: string; keyUncertainties: string[] }>) {
  const shared = new Set(siblings.filter((sibling) => sibling.packetId !== packetId).flatMap((sibling) => sibling.keyUncertainties));
  return uncertainties.find((item) => !shared.has(item)) ?? uncertainties[0] ?? "No explicit blocker recorded.";
}

export default async function ExperimentsPage() {
  const data = await getExperimentsPageData();
  const leadDomain = data.domains[0];
  const leadPacketId = leadDomain?.nextExperiment?.packetId ?? null;
  const packets = [...data.packets].sort((left, right) => {
    const leftLead = left.packet.packetId === leadPacketId ? 0 : 1;
    const rightLead = right.packet.packetId === leadPacketId ? 0 : 1;
    const leftDomain = left.domain === leadDomain?.domain ? 0 : 1;
    const rightDomain = right.domain === leadDomain?.domain ? 0 : 1;
    return leftLead - rightLead || leftDomain - rightDomain || right.packet.priorityScore - left.packet.priorityScore;
  });

  return (
    <>
      <PageHeader
        note={`${capitalize(countWord(packets.length))} packets across ${countWord(data.domains.length)} domains, each a lab test worth running next on the literature as of ${shortDate(data.generatedAt)}.`}
        title="Experiments"
      />

      <div className="packets">
        {packets.map((entry) => {
          const domainData = data.domains.find((domain) => domain.domain === entry.domain)?.domainData;
          const packet = entry.packet;

          return (
            <Packet
              details={
                <Defs
                  items={[
                    { label: "Question", value: packet.decisionQuestion },
                    { label: "Proposed", value: packet.proposedExperiment },
                    { label: "Fixed", value: packet.fixedVariables.join(", ") || "n/a" },
                    { label: "Arms", value: packet.comparisonArms.join(", ") || "n/a" },
                    {
                      label: "Readouts",
                      value: `${packet.primaryReadouts.join(", ") || "n/a"}${packet.secondaryReadouts.length > 0 ? `; secondary: ${packet.secondaryReadouts.join(", ")}` : ""}`
                    },
                    { label: "Papers", value: domainData ? paperList(domainData, packet.supportingPaperTitles) : packet.supportingPaperTitles.join(" · ") },
                    { label: "Uncertain", value: packet.keyUncertainties.join("; ") || "No explicit blocker recorded." },
                    { label: "Authority", value: packet.authorityNotes.join("; ") || "No authority notes recorded." },
                    { label: "Rationale", value: packet.translationalRationale },
                    { label: "Priority", value: <span className="mono">{packet.priorityScore.toFixed(2)}</span> }
                  ]}
                />
              }
              items={[
                { label: "Run", value: runLine(packet.comparisonArms, packet.primaryReadouts) },
                {
                  label: "Supports",
                  value: domainData ? paperList(domainData, packet.supportingPaperTitles.slice(0, 2)) : packet.supportingPaperTitles.slice(0, 2).join(" · ")
                },
                {
                  label: "Watch out",
                  value: watchOut(
                    packet.packetId,
                    packet.keyUncertainties,
                    data.packets.filter((sibling) => sibling.domain === entry.domain).map((sibling) => sibling.packet)
                  )
                }
              ]}
              key={packet.packetId}
              kicker={entry.domainLabel}
              lead={packet.packetId === leadPacketId}
              title={packet.title}
              why={packet.claim}
            />
          );
        })}
      </div>
    </>
  );
}
