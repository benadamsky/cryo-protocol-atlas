import Link from "next/link";
import { EmptyState, PageIntro, Section } from "@/components/atlas-ui";

export default function NotFound() {
  return (
    <>
      <PageIntro
        eyebrow="Route Not Found"
        title="This atlas view does not exist."
        summary="The requested route is outside the current public Atlas surface."
      />
      <Section title="Available routes">
        <EmptyState
          title="Use the top navigation or jump back to the overview."
          detail="The current scaffold supports overview, domain summaries, atlas views, benchmark views, and review queues."
        />
        <p>
          <Link href="/">Return to overview</Link>
        </p>
      </Section>
    </>
  );
}
