#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('../shared/utils/cli');

function printUsage() {
  console.log('Usage: node scripts/apify-facebook-cursor-v2/src/cli/replay-job.js --report <report-file.json>');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.report) {
    printUsage();
    process.exit(1);
  }

  const reportPath = path.resolve(process.cwd(), String(args.report));
  if (!fs.existsSync(reportPath)) {
    console.error(`Report not found: ${reportPath}`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  console.log('Replay summary');
  console.log('--------------');
  console.log(`Job ID: ${report?.metadata?.jobId || 'n/a'}`);
  console.log(`Agency: ${report?.metadata?.agencyKey || 'n/a'}`);
  console.log(`Mode: ${report?.metadata?.mode || 'n/a'}`);
  console.log(`Total raw: ${report?.metrics?.totalRaw || 0}`);
  console.log(`Total mapped: ${report?.metrics?.totalMapped || 0}`);
  console.log(`Errors: ${Array.isArray(report?.errors) ? report.errors.length : 0}`);
}

main();
