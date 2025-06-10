import '@/styles/globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Knowledge Graph',
  description: 'Interactive knowledge graph application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cloudflareToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

  return (
    <html lang="en">
      <body>
        {children}
        {cloudflareToken && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareToken })}
          />
        )}
      </body>
    </html>
  );
}
