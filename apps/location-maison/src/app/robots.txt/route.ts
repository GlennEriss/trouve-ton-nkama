export async function GET() {
    return new Response(
        `User-agent: *
Allow: /

Host: https://www.tonnkama.com

Sitemap: ${process.env.NEXT_PUBLIC_HOST}/sitemap.xml
`,
        {
            headers: {
                'Content-Type': 'text/plain',
            },
        }
    )
}
