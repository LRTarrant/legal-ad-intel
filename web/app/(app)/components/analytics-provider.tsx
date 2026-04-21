"use client";

// Analytics provider — loads the GA4 gtag.js script.
// Render this inside <body> before <AnalyticsIdentityBinder />.

import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function AnalyticsProvider() {
  if (!GA_MEASUREMENT_ID) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] NEXT_PUBLIC_GA_MEASUREMENT_ID is not set");
    }
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}
