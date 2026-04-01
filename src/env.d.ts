declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    readonly POSTGRES_URL: string;

    // Auth
    readonly NEXTAUTH_SECRET: string;
    readonly NEXTAUTH_URL: string;

    // Stripe
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly STRIPE_PRICE_ID_BASIC: string;
    readonly STRIPE_PRICE_ID_MULTI: string;
    readonly STRIPE_PRICE_ID_AGENT: string;

    // Email
    readonly RESEND_API_KEY: string;

    // HMRC
    readonly HMRC_VENDOR_ID: string;
    readonly HMRC_SENDER_ID: string;
    readonly HMRC_SENDER_PASSWORD: string;
    readonly HMRC_ENDPOINT: string;

    // Companies House
    readonly COMPANIES_HOUSE_API_KEY: string;
    readonly COMPANIES_HOUSE_PRESENTER_ID: string;
    readonly COMPANIES_HOUSE_PRESENTER_AUTH: string;
    readonly COMPANIES_HOUSE_FILING_ENDPOINT: string;
    readonly COMPANY_INFORMATION_API_ENDPOINT: string;
    readonly CH_PACKAGE_REFERENCE: string;
    readonly CH_GATEWAY_TEST: string;

    // Cron
    readonly CRON_SECRET: string;

    // Public
    readonly NEXT_PUBLIC_APP_URL: string;
    readonly NEXT_PUBLIC_GA_ID?: string;
    readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    readonly NEXT_PUBLIC_FILING_COUNT?: string;

    // Node
    readonly NODE_ENV: "development" | "production" | "test";

    // Filing
    readonly NEXT_PUBLIC_FILING_LIVE?: "true" | "false";
  }
}
