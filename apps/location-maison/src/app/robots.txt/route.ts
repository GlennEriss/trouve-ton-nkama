export async function GET() {
    return new Response(
        `User-agent: *
Allow: /

Sitemap: ${process.env.NEXT_PUBLIC_HOST}/sitemap.xml
`,
        {
            headers: {
                'Content-Type': 'text/plain',
            },
        }
    )
}
