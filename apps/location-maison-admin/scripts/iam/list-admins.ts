/**
 * Read-only: list admin_users (email, status, roles) for the given env file.
 * Usage: tsx scripts/iam/list-admins.ts [--env-file=.env.local]
 */
function parseEnvFile(argv: string[]): string {
  const arg = argv.find((value) => value.startsWith("--env-file="));
  return arg ? arg.slice("--env-file=".length).trim() : ".env.local";
}

async function main() {
  process.loadEnvFile(parseEnvFile(process.argv.slice(2)));
  const { getFirebaseAdminDb } = await import("@/lib/firebase/firebase-admin");
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection("admin_users").get();

  if (snapshot.empty) {
    console.log("Aucun document dans admin_users.");
    return;
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(
      JSON.stringify({
        uid: doc.id,
        email: data.email ?? null,
        status: data.status ?? null,
        roles: data.roles ?? [],
      }),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
