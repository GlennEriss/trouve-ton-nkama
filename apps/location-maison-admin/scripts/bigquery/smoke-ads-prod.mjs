#!/usr/bin/env node

import { GoogleAuth } from 'google-auth-library';
import fs from 'node:fs';

const PROJECT_ID = 'location-maison-prod-167da';
const DATASET = 'admin_analytics_prod';
const LOCATION = 'EU';
const SERVICE_ACCOUNT_FILE = '/Users/glenneriss/Documents/projets/location-maison/services-account-firebase/location-maison-prod-167da-firebase-adminsdk-fbsvc-ebdb85e144.json';

const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8'));

const auth = new GoogleAuth({
  credentials: {
    client_email: sa.client_email,
    private_key: sa.private_key,
  },
  scopes: ['https://www.googleapis.com/auth/bigquery', 'https://www.googleapis.com/auth/cloud-platform'],
});

async function getToken() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token?.token) throw new Error('Unable to obtain Google access token');
  return token.token;
}

async function bqQuery(query) {
  const token = await getToken();
  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      location: LOCATION,
      timeoutMs: 180000,
    }),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `BigQuery query failed (${response.status})`;
    throw new Error(message);
  }
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(payload.errors.map((e) => e.message || e.reason).join(' | '));
  }
  return payload;
}

function rowToObject(row, fields) {
  const o = {};
  for (let i = 0; i < fields.length; i += 1) {
    o[fields[i].name] = row?.f?.[i]?.v ?? null;
  }
  return o;
}

function parseRows(result) {
  const fields = result?.schema?.fields || [];
  const rows = result?.rows || [];
  return rows.map((row) => rowToObject(row, fields));
}

const nowIso = new Date().toISOString();
const dateKey = nowIso.slice(0, 10);
const unique = `smoke_${Date.now()}`;

const insertSlotEvents = `
INSERT INTO \`${PROJECT_ID}.${DATASET}.ads_slot_events\`
(event_id, occurred_at, date_key, session_id, page_path, page_template, slot_id, slot_position, event_name, latency_ms, is_authenticated, country, device_category)
VALUES
('${unique}_rendered', TIMESTAMP('${nowIso}'), DATE('${dateKey}'), '${unique}_session', '/search', 'catalog_search', 'search_inline', 'inline_1', 'ad_slot_rendered', NULL, FALSE, 'GA', 'mobile'),
('${unique}_request', TIMESTAMP('${nowIso}'), DATE('${dateKey}'), '${unique}_session', '/search', 'catalog_search', 'search_inline', 'inline_1', 'ad_request_sent', 98, FALSE, 'GA', 'mobile'),
('${unique}_filled', TIMESTAMP('${nowIso}'), DATE('${dateKey}'), '${unique}_session', '/search', 'catalog_search', 'search_inline', 'inline_1', 'ad_filled', NULL, FALSE, 'GA', 'mobile'),
('${unique}_impression', TIMESTAMP('${nowIso}'), DATE('${dateKey}'), '${unique}_session', '/search', 'catalog_search', 'search_inline', 'inline_1', 'ad_impression', NULL, FALSE, 'GA', 'mobile')
`;

const insertAdSense = `
INSERT INTO \`${PROJECT_ID}.${DATASET}.adsense_reporting_raw\`
(report_date, account_id, dimension_page_url, dimension_ad_unit, dimension_country, dimension_device, estimated_earnings, page_views, ad_requests, matched_ad_requests, total_impressions, clicks, page_views_rpm, impressions_rpm, active_view_viewability, active_view_measurability, loaded_at)
VALUES
(DATE('${dateKey}'), 'pub-2799688336707362', 'https://www.tonnkama.com/search', 'search_inline', 'GA', 'mobile', 0.27, 110, 170, 130, 120, 4, 2.45, 2.25, 58.1, 72.0, TIMESTAMP('${nowIso}'))
`;

const mergeAdsMetrics = `
MERGE \`${PROJECT_ID}.${DATASET}.ads_metrics_daily\` AS target
USING (
  WITH base AS (
    SELECT
      report_date AS date_key,
      COALESCE(
        NULLIF(REGEXP_EXTRACT(dimension_page_url, r'https?://[^/]+(/[^?#]*)'), ''),
        NULLIF(REGEXP_EXTRACT(dimension_page_url, r'^(/[^?#]*)'), ''),
        '/'
      ) AS page_path,
      COALESCE(NULLIF(dimension_ad_unit, ''), 'slot_unknown') AS slot_id,
      COALESCE(NULLIF(UPPER(TRIM(dimension_country)), ''), 'NA') AS country,
      CASE
        WHEN LOWER(COALESCE(dimension_device, '')) LIKE '%mobile%' THEN 'mobile'
        WHEN LOWER(COALESCE(dimension_device, '')) LIKE '%tablet%' THEN 'tablet'
        WHEN LOWER(COALESCE(dimension_device, '')) LIKE '%desktop%' THEN 'desktop'
        ELSE 'unknown'
      END AS device_category,
      CAST(estimated_earnings AS FLOAT64) AS estimated_earnings,
      page_views,
      ad_requests,
      matched_ad_requests,
      total_impressions,
      clicks,
      CAST(active_view_viewability AS FLOAT64) AS active_view_viewability,
      loaded_at
    FROM \`${PROJECT_ID}.${DATASET}.adsense_reporting_raw\`
    WHERE report_date = DATE('${dateKey}')
  )
  SELECT
    date_key,
    CASE
      WHEN page_path = '/' THEN 'home'
      WHEN STARTS_WITH(page_path, '/search-with-ia') THEN 'search_with_ia'
      WHEN STARTS_WITH(page_path, '/search') THEN 'catalog_search'
      WHEN STARTS_WITH(page_path, '/property') THEN 'property_detail'
      WHEN STARTS_WITH(page_path, '/announcer') THEN 'announcer_space'
      ELSE 'other'
    END AS page_template,
    slot_id,
    device_category,
    country,
    CAST(SUM(estimated_earnings) AS NUMERIC) AS estimated_earnings,
    SUM(page_views) AS page_views,
    0 AS sessions,
    SUM(ad_requests) AS ad_requests,
    SUM(matched_ad_requests) AS matched_ad_requests,
    SUM(total_impressions) AS total_impressions,
    SUM(clicks) AS clicks,
    CAST(SAFE_DIVIDE(SUM(matched_ad_requests), NULLIF(SUM(ad_requests), 0)) AS NUMERIC) AS fill_rate,
    CAST(SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(total_impressions), 0)) AS NUMERIC) AS ctr,
    CAST(SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(page_views), 0)) AS NUMERIC) AS page_views_rpm,
    CAST(SAFE_DIVIDE(SUM(estimated_earnings) * 1000, NULLIF(SUM(total_impressions), 0)) AS NUMERIC) AS impressions_rpm,
    CAST(
      SAFE_DIVIDE(
        SUM(COALESCE(active_view_viewability, 0) * COALESCE(total_impressions, 0)),
        NULLIF(SUM(total_impressions), 0)
      ) AS NUMERIC
    ) AS active_view_viewability,
    MAX(loaded_at) AS updated_at
  FROM base
  GROUP BY date_key, page_template, slot_id, device_category, country
) AS source
ON target.date_key = source.date_key
  AND target.page_template = source.page_template
  AND target.slot_id = source.slot_id
  AND target.device_category = source.device_category
  AND target.country = source.country
WHEN MATCHED THEN
  UPDATE SET
    estimated_earnings = source.estimated_earnings,
    page_views = source.page_views,
    sessions = source.sessions,
    ad_requests = source.ad_requests,
    matched_ad_requests = source.matched_ad_requests,
    total_impressions = source.total_impressions,
    clicks = source.clicks,
    fill_rate = source.fill_rate,
    ctr = source.ctr,
    page_views_rpm = source.page_views_rpm,
    impressions_rpm = source.impressions_rpm,
    active_view_viewability = source.active_view_viewability,
    updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (
    date_key, page_template, slot_id, device_category, country,
    estimated_earnings, page_views, sessions, ad_requests, matched_ad_requests,
    total_impressions, clicks, fill_rate, ctr, page_views_rpm, impressions_rpm,
    active_view_viewability, updated_at
  )
  VALUES (
    source.date_key, source.page_template, source.slot_id, source.device_category, source.country,
    source.estimated_earnings, source.page_views, source.sessions, source.ad_requests, source.matched_ad_requests,
    source.total_impressions, source.clicks, source.fill_rate, source.ctr, source.page_views_rpm, source.impressions_rpm,
    source.active_view_viewability, source.updated_at
  )
`;

const verifyQuery = `
SELECT
  DATE('${dateKey}') AS date_key,
  (SELECT COUNT(1) FROM \`${PROJECT_ID}.${DATASET}.ads_slot_events\` WHERE date_key = DATE('${dateKey}') AND event_id LIKE '${unique}_%') AS inserted_slot_events,
  (SELECT COUNT(1) FROM \`${PROJECT_ID}.${DATASET}.adsense_reporting_raw\` WHERE report_date = DATE('${dateKey}') AND dimension_ad_unit='search_inline' AND dimension_page_url='https://www.tonnkama.com/search') AS adsense_rows_for_search_inline,
  (SELECT SUM(estimated_earnings) FROM \`${PROJECT_ID}.${DATASET}.ads_metrics_daily\` WHERE date_key = DATE('${dateKey}') AND slot_id='search_inline') AS metrics_slot_revenue,
  (SELECT SUM(page_views) FROM \`${PROJECT_ID}.${DATASET}.ads_metrics_daily\` WHERE date_key = DATE('${dateKey}') AND slot_id='search_inline') AS metrics_slot_page_views
`;

(async () => {
  console.log(`Smoke test start | project=${PROJECT_ID} dataset=${DATASET} date=${dateKey} tag=${unique}`);
  await bqQuery(insertSlotEvents);
  await bqQuery(insertAdSense);
  await bqQuery(mergeAdsMetrics);
  const verify = await bqQuery(verifyQuery);
  const rows = parseRows(verify);
  console.log(JSON.stringify({ ok: true, unique, dateKey, verify: rows[0] ?? null }, null, 2));
})().catch((error) => {
  console.error('Smoke test failed:', error?.message ?? error);
  process.exit(1);
});
