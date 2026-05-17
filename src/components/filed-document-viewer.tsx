"use client";

import { Download } from "lucide-react";

type Context = "pre-filing" | "post-ct600" | "post-accounts-interim" | "official";

const LABEL: Record<Context, string> = {
  "pre-filing": "This is exactly what will be submitted.",
  "post-ct600": "This is the return filed with HMRC.",
  "post-accounts-interim":
    "Our copy — the official copy from Companies House will be available shortly.",
  "official": "The official copy filed at Companies House.",
};

export default function FiledDocumentViewer({
  src, downloadHref, context, title,
}: {
  src: string;
  downloadHref: string;
  context: Context;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-secondary m-0">{LABEL[context]}</p>
        <a
          href={downloadHref}
          download
          className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary no-underline"
        >
          <Download size={14} strokeWidth={2} />
          Download
        </a>
      </div>
      <iframe
        title={title}
        src={src}
        sandbox=""
        className="w-full h-[600px] bg-card border border-border rounded-lg"
      />
    </div>
  );
}
