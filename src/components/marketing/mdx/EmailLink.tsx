import { Mail } from "lucide-react";

export function EmailLink({ email }: { email: string }) {
  return (
    <span className="flex items-center gap-3 p-4 bg-primary-bg rounded-lg border border-primary-border mb-8">
      <Mail size={20} className="text-primary shrink-0" />
      <a
        href={`mailto:${email}`}
        className="text-primary font-medium text-[15px]"
      >
        {email}
      </a>
    </span>
  );
}
