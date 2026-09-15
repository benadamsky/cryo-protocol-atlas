import Link from "next/link";
import { PageHeader } from "@/components/atlas-ui";

export default function NotFound() {
  return (
    <>
      <PageHeader note="There is no page at this address." title="Not found" />
      <p className="line">
        <Link href="/">Back to the recommendation</Link>
      </p>
    </>
  );
}
