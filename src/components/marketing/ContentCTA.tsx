import Link from "next/link";
import { Shield } from "lucide-react";
import { MicroTrust } from "@/components/marketing/MicroTrust";

export function ContentCTA() {
  return (
    <div className="mt-12 p-8 bg-page rounded-xl text-center border border-border">
      <h3 className="text-xl font-semibold mb-2 text-foreground">
        Ready to file your dormant company returns?
      </h3>
      <p className="mb-6 text-secondary text-[0.9375rem]">
        Set up in minutes. File in seconds. Done for the year.
      </p>
      <Link
        href="/register"
        className="inline-block font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:opacity-90 bg-cta text-white py-3 px-7 no-underline text-[0.9375rem]"
      >
        Get started &rarr;
      </Link>
      <div className="mt-3">
        <MicroTrust icon={Shield} text="Official government APIs · Credentials never stored" />
      </div>
    </div>
  );
}
