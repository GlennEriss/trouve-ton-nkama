import fs from "node:fs";
import path from "node:path";

type CliOptions = {
  envFile?: string;
};

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) {
      options.envFile = arg.slice("--env-file=".length).trim();
    }
  }

  return options;
}

function unquote(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(envFilePath: string): void {
  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const content = fs.readFileSync(envFilePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || key.startsWith("#")) {
      continue;
    }

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unquote(rawValue);
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const envFile = options.envFile ?? ".env.local";
  const envFilePath = path.resolve(process.cwd(), envFile);

  loadEnvFile(envFilePath);

  const { syncGabonOsmProjectionFromRoot } = await import(
    "@/modules/location-osm/application/gabon-osm-projection.service"
  );
  const result = await syncGabonOsmProjectionFromRoot();

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceMode: result.sourceMode,
        sourceUpdatedAt: result.sourceUpdatedAt,
        counts: result.counts,
        syncedAt: result.syncedAt,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[osm:sync:projection] failed");
  console.error(error);
  process.exit(1);
});
