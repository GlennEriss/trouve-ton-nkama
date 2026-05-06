#!/usr/bin/env node

const baseUrl = (process.env.SEO_AUDIT_BASE_URL || 'https://www.tonnkama.com').replace(/\/$/, '');

const targetPaths = [
  '/',
  '/search',
  '/blog',
  '/guide-immobilier-gabon',
  '/immobilier',
  '/immobilier/location/maison',
  '/immobilier/vente/maison',
  '/immobilier/location/appartement/libreville',
];

function extractTagValue(html, regex) {
  const match = html.match(regex);
  return match?.[1] ?? '';
}

async function inspect(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { redirect: 'follow' });
  const html = await response.text();

  return {
    path,
    status: response.status,
    title: extractTagValue(html, /<title>([\s\S]*?)<\/title>/i).trim(),
    canonical: extractTagValue(
      html,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i
    ).trim(),
    robots: extractTagValue(
      html,
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i
    ).trim(),
  };
}

async function run() {
  console.log(`SEO audit base URL: ${baseUrl}`);

  const checks = await Promise.all(targetPaths.map((path) => inspect(path)));
  const rows = checks.map((row) => ({
    path: row.path,
    status: row.status,
    canonical: row.canonical || '(missing)',
    robots: row.robots || '(missing)',
    title: row.title || '(missing)',
  }));

  console.table(rows);

  const issues = [];

  for (const row of checks) {
    if (row.status !== 200) {
      issues.push(`${row.path}: status ${row.status}`);
    }

    if (!row.canonical) {
      issues.push(`${row.path}: canonical manquant`);
    }
  }

  if (issues.length) {
    console.error('\nIssues détectés:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nAudit SEO terminé sans anomalie bloquante.');
}

run().catch((error) => {
  console.error('Erreur audit SEO:', error);
  process.exitCode = 1;
});
