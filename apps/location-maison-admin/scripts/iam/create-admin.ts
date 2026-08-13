/**
 * Crée (ou réactive) un compte admin : utilisateur Firebase Auth email/mot de
 * passe + document `admin_users` actif. Écrit le même schéma que
 * `upsertAdminUser` (modules/iam/infrastructure/admin-user.repository.ts).
 *
 * Usage:
 *   tsx scripts/iam/create-admin.ts --email=x@y.com --password=... --role=super_admin [--env-file=.env.local]
 */
function parseArg(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : undefined;
}

const ADMIN_ROLES = [
  "super_admin",
  "operations_admin",
  "moderation_admin",
  "finance_admin",
  "support_admin",
  "analyst_admin",
] as const;

async function main() {
  const argv = process.argv.slice(2);
  process.loadEnvFile(parseArg(argv, "env-file") ?? ".env.local");

  const email = parseArg(argv, "email")?.toLowerCase();
  const password = parseArg(argv, "password");
  const role = parseArg(argv, "role");
  const displayName = parseArg(argv, "displayName") ?? null;

  if (!email || !password || !role) {
    throw new Error("--email, --password et --role sont requis");
  }
  if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    throw new Error(`Rôle invalide: ${role}. Attendu: ${ADMIN_ROLES.join(", ")}`);
  }

  const { getFirebaseAdminAuth, getFirebaseAdminDb } = await import(
    "@/lib/firebase/firebase-admin"
  );
  const { FieldValue } = await import("firebase-admin/firestore");

  const auth = getFirebaseAdminAuth();
  const db = getFirebaseAdminDb();

  console.log(`Projet Firebase : ${process.env.FIREBASE_PROJECT_ID}`);

  // Compte Auth : réutilisé s'il existe déjà (on met alors le mot de passe à jour).
  const authUser = await auth.getUserByEmail(email).catch(async (error: unknown) => {
    const code =
      typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : "";
    if (code.includes("user-not-found")) {
      return null;
    }
    throw error;
  });

  const user = authUser
    ? await auth.updateUser(authUser.uid, { password, emailVerified: true })
    : await auth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: displayName ?? undefined,
      });

  console.log(`${authUser ? "Compte Auth existant mis à jour" : "Compte Auth créé"} : ${user.uid}`);

  const ref = db.collection("admin_users").doc(user.uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    transaction.set(
      ref,
      {
        email,
        displayName: displayName ?? user.displayName ?? null,
        status: "active",
        roles: [role],
        invitedBy: null,
        updatedAt: FieldValue.serverTimestamp(),
        invitedAt: null,
        ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
  });

  const saved = (await ref.get()).data();
  console.log(
    `admin_users écrit : ${JSON.stringify({
      uid: user.uid,
      email: saved?.email,
      status: saved?.status,
      roles: saved?.roles,
    })}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
