import Link from "next/link";
import { PricingCards } from "@/components/marketing/mdx/PricingCards";
import { ComparisonTable } from "@/components/marketing/mdx/ComparisonTable";
import { Steps, Step } from "@/components/marketing/mdx/Steps";
import { SecurityCards } from "@/components/marketing/mdx/SecurityCards";
import { Callout } from "@/components/marketing/mdx/Callout";
import { EmailLink } from "@/components/marketing/mdx/EmailLink";
import { ContactForm } from "@/components/marketing/ContactForm";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { ProductPreview } from "@/components/marketing/ProductPreview";

export const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="text-[2rem] font-bold text-foreground mt-8 mb-4 leading-[1.2]"
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="text-2xl font-semibold text-foreground mt-8 mb-3 leading-[1.3]"
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className="text-xl font-semibold text-foreground mt-6 mb-2 leading-[1.4]"
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className="text-base leading-[1.7] text-body mb-4"
      {...props}
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="pl-6 mb-4 list-disc" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="pl-6 mb-4 list-decimal"
      {...props}
    />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      className="text-base leading-[1.7] text-body mb-1"
      {...props}
    />
  ),
  a: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith("/")) {
      return (
        <Link
          href={href}
          className="text-primary underline"
          {...props}
        />
      );
    }
    return (
      <a
        href={href}
        className="text-primary underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    );
  },
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-[3px] border-l-primary pl-4 my-6 italic text-secondary"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse" {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="text-left p-3 border-b-2 border-b-border font-semibold text-foreground"
      {...props}
    />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className="p-3 border-b border-b-border text-body"
      {...props}
    />
  ),
  PricingCards,
  ComparisonTable,
  Steps,
  Step,
  SecurityCards,
  Callout,
  EmailLink,
  ContactForm,
  ContentCTA,
  ProductPreview,
};
