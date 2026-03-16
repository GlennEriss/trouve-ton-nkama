#!/usr/bin/env node
const path = require('path');

const { parseArgs } = require('../shared/utils/cli');
const { generateJobId } = require('../shared/utils/id');
const { JsonLogger } = require('../infrastructure/logging/json-logger');
const { readJson } = require('../infrastructure/fs/config-loader');
const { FileArtifactRepository } = require('../infrastructure/fs/file-artifact-repository');
const { FileRawSourceAdapter } = require('../infrastructure/sources/file-raw-source.adapter');
const { JsonPropertyStoreAdapter } = require('../infrastructure/repositories/json-property-store.adapter');
const { NoopImageStorageAdapter } = require('../infrastructure/repositories/noop-image-storage.adapter');
const { LmStudioTextNormalizerAdapter } = require('../infrastructure/llm/lm-studio-text-normalizer.adapter');
const { runAgencyImportJob } = require('../application/use-cases/run-agency-import-job');
const { AppError } = require('../shared/errors/app-error');

function printUsage() {
  console.log('Usage: node scripts/apify-facebook-cursor-v2/src/cli/run-job.js --agency <key> --input <file.json> [--mode dry-run|apply] [--job-id <id>] [--ai-model <model>] [--ai-base-url <url>] [--ai-chat-endpoint <path>] [--ai-strict true|false] [--ai-token <token>]');
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function parseNumber(value, defaultValue) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultValue;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.agency || !args.input) {
    printUsage();
    process.exit(1);
  }

  const mode = String(args.mode || 'dry-run').toLowerCase();
  if (!['dry-run', 'apply'].includes(mode)) {
    throw new AppError(`Invalid mode: ${mode}`, { code: 'MODE_INVALID', status: 400 });
  }

  const rootDir = path.resolve(__dirname, '../..');
  const configDir = path.join(rootDir, 'config');
  const dataDir = path.join(rootDir, 'data');

  const agenciesConfig = readJson(path.join(configDir, 'agencies.json'));
  const defaultsConfig = readJson(path.join(configDir, 'pipeline.defaults.json'));

  const defaultsAi = defaultsConfig?.ai || {};
  const aiConfig = {
    // LM mode is enforced by default for this pipeline.
    enabled: true,
    baseUrl: String(args['ai-base-url'] || process.env.LM_STUDIO_BASE_URL || defaultsAi.baseUrl || 'http://127.0.0.1:1234'),
    model: String(args['ai-model'] || process.env.LM_STUDIO_MODEL || defaultsAi.model || 'qwen2.5-1.5b-instruct'),
    chatEndpoint: String(args['ai-chat-endpoint'] || process.env.LM_STUDIO_CHAT_ENDPOINT || defaultsAi.chatEndpoint || '/api/v1/chat'),
    modelsEndpoint: String(args['ai-models-endpoint'] || process.env.LM_STUDIO_MODELS_ENDPOINT || defaultsAi.modelsEndpoint || '/api/v1/models'),
    loadModelEndpoint: String(
      args['ai-load-model-endpoint'] || process.env.LM_STUDIO_LOAD_MODEL_ENDPOINT || defaultsAi.loadModelEndpoint || '/api/v1/models/load'
    ),
    token: String(args['ai-token'] || process.env.LM_STUDIO_TOKEN || defaultsAi.token || ''),
    tokenHeader: String(args['ai-token-header'] || process.env.LM_STUDIO_TOKEN_HEADER || defaultsAi.tokenHeader || 'Authorization'),
    tokenPrefix: String(args['ai-token-prefix'] || process.env.LM_STUDIO_TOKEN_PREFIX || defaultsAi.tokenPrefix || 'Bearer'),
    autoLoadModel: parseBoolean(args['ai-auto-load-model'] || process.env.LM_STUDIO_AUTO_LOAD_MODEL, parseBoolean(defaultsAi.autoLoadModel, false)),
    useResponseFormat: parseBoolean(
      args['ai-use-response-format'] || process.env.LM_STUDIO_USE_RESPONSE_FORMAT,
      parseBoolean(defaultsAi.useResponseFormat, false)
    ),
    strict: parseBoolean(args['ai-strict'] || process.env.LM_STUDIO_STRICT, parseBoolean(defaultsAi.strict, true)),
    temperature: parseNumber(args['ai-temperature'] || process.env.LM_STUDIO_TEMPERATURE || defaultsAi.temperature, 0.2),
    maxTokens: parseNumber(args['ai-max-tokens'] || process.env.LM_STUDIO_MAX_TOKENS || defaultsAi.maxTokens, 700),
    timeoutMs: parseNumber(args['ai-timeout-ms'] || process.env.LM_STUDIO_TIMEOUT_MS || defaultsAi.timeoutMs, 45000),
    maxRetries: parseNumber(args['ai-max-retries'] || process.env.LM_STUDIO_MAX_RETRIES || defaultsAi.maxRetries, 2),
    delayMsBetweenRequests: parseNumber(
      args['ai-delay-ms'] || process.env.LM_STUDIO_DELAY_MS || defaultsAi.delayMsBetweenRequests,
      120
    ),
  };

  const logger = new JsonLogger({ scope: 'apify-facebook-cursor-v2' });
  const artifacts = new FileArtifactRepository(dataDir);

  const adapters = {
    artifacts,
    rawSource: new FileRawSourceAdapter(),
    imageStorage: new NoopImageStorageAdapter(),
    propertyStore: new JsonPropertyStoreAdapter(artifacts),
    textNormalizer: new LmStudioTextNormalizerAdapter(aiConfig),
  };

  const job = {
    id: args['job-id'] || generateJobId('agency-import'),
    mode,
    inputFile: path.resolve(process.cwd(), String(args.input)),
  };

  const context = await runAgencyImportJob({
    job,
    agencyKey: String(args.agency),
    agenciesConfig,
    defaultsConfig,
    aiConfig,
    adapters,
    logger,
    rootDir,
  });

  console.log('✅ Job done');
  console.log(`Job ID: ${context.job.id}`);
  console.log(`Report: ${context.job.reportFile}`);
  console.log(`Mapped: ${context.job.mappedFile}`);
}

main().catch((error) => {
  console.error('❌ Job failed');
  console.error(error?.message || error);
  process.exit(1);
});
