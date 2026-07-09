import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { AuditLogInput } from "@/modules/audit-compliance/domain/types";

const COLLECTION = "audit_logs";

export async function writeAuditLog(entry: AuditLogInput) {
  const db = getFirebaseAdminDb();

  await db.collection(COLLECTION).add({
    actorId: entry.actorId,
    actorRoles: entry.actorRoles,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId ?? null,
    status: entry.status,
    correlationId: entry.correlationId,
    diff: entry.diff ?? null,
    details: entry.details ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}
