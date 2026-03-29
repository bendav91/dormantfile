declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    POSTGRES_URL: string;

    // Auth
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;

    // Stripe
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_ID_BASIC: string;
    STRIPE_PRICE_ID_MULTI: string;
    STRIPE_PRICE_ID_AGENT: string;

    // Email
    RESEND_API_KEY: string;

    // HMRC
    HMRC_VENDOR_ID: string;
    HMRC_SENDER_ID: string;
    HMRC_SENDER_PASSWORD: string;
    HMRC_ENDPOINT: string;

    // Companies House
    COMPANIES_HOUSE_API_KEY: string;
    COMPANIES_HOUSE_PRESENTER_ID: string;
    COMPANIES_HOUSE_PRESENTER_AUTH: string;
    COMPANIES_HOUSE_FILING_ENDPOINT: string;
    COMPANY_INFORMATION_API_ENDPOINT: string;

    // Cron
    CRON_SECRET: string;

    // Public
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_GA_ID?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    NEXT_PUBLIC_FILING_LIVE?: string;
    NEXT_PUBLIC_FILING_COUNT?: string;

    // Node
    NODE_ENV: "development" | "production" | "test";
  }
}
