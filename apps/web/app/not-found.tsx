import Link from "next/link";
import { PageHeader } from "@/components/atlas-ui";

export default function NotFound() {
  return (
    <>
      <PageHeader note="The requested route is outside the current Atlas surface." title="Not found" />
      <p className="line">
        <Link href="/">Back to the recommendation</Link>
      </p>
    </>
  );
}
