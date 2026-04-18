import type { Metadata } from "next";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { resolveTenant, DEFAULT_LMI_BRANDING } from "@/lib/tenant";
import { TenantProvider } from "@/contexts/TenantContext";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Legal Marketing Intelligence",
  description: "Competitive ad intelligence for plaintiff law firms",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

/** Fonts that are already loaded via next/font and don't need a Google Fonts link */
const BUILT_IN_FONTS = new Set(["inter", "dm sans", "jetbrains mono"]);

/** Build a Google Fonts URL for non-built-in fonts */
function getGoogleFontUrl(fontName: string): string {
  const family = fontName.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700;800&display=swap`;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve tenant branding from the request hostname
  let branding = DEFAULT_LMI_BRANDING;
  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    if (host) {
      branding = await resolveTenant(host);
    }
  } catch {
    // Fall back to LMI defaults on any error
  }

  // Determine which extra fonts need Google Fonts links
  const extraFonts = new Set<string>();
  if (
    branding.fontHeading &&
    !BUILT_IN_FONTS.has(branding.fontHeading.toLowerCase())
  ) {
    extraFonts.add(branding.fontHeading);
  }
  if (
    branding.fontBody &&
    !BUILT_IN_FONTS.has(branding.fontBody.toLowerCase())
  ) {
    extraFonts.add(branding.fontBody);
  }

  // CSS custom properties for tenant branding
  const cssVars = {
    "--color-primary": branding.primaryColor,
    "--color-accent": branding.accentColor,
    "--color-bg": branding.backgroundColor,
    "--color-surface": branding.surfaceColor,
    "--color-text": branding.textColor,
    "--tenant-font-heading": `'${branding.fontHeading}', system-ui, sans-serif`,
    "--tenant-font-body": `'${branding.fontBody}', system-ui, sans-serif`,
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={cssVars}
    >
      <head>
        {/* Dynamic Google Fonts for non-default tenant fonts */}
        {Array.from(extraFonts).map((font) => (
          <link
            key={font}
            rel="stylesheet"
            href={getGoogleFontUrl(font)}
          />
        ))}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-W8QBJN3R');`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W8QBJN3R"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <TenantProvider branding={branding}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
