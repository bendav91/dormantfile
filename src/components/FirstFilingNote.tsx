import { ShieldCheck } from "lucide-react";

export default function FirstFilingNote() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3.5 bg-primary-bg border border-primary-border rounded-lg mb-6">
      <span className="text-primary shrink-0 mt-px flex" aria-hidden="true">
        <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
      </span>
      <p className="text-sm text-primary-text m-0 leading-normal">
        Your first filing takes about 10 minutes. It&apos;s a nil return — nothing is
        owed. We build it, you confirm, and we submit it directly to HMRC / Companies
        House. You&apos;ll get an email the moment it&apos;s accepted.
      </p>
    </div>
  );
}
