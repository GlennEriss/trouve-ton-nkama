import { getSiteOrigin } from '@/lib/seo/site-url';

export async function GET() {
    const siteOrigin = getSiteOrigin();

    return new Response(
        `User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

Host: ${siteOrigin}

Sitemap: ${siteOrigin}/sitemap.xml
`,
        {
            headers: {
                'Content-Type': 'text/plain',
            },
        }
    )
}
