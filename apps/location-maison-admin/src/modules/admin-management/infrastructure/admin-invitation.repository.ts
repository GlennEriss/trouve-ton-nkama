import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type { AdminInvitation } from "@/modules/admin-management/domain/types";

const COLLECTION = "admin_invitations";

export async function createAdminInvitation(input: AdminInvitation) {
  const db = getFirebaseAdminDb();

  const ref = await db.collection(COLLECTION).add({
    email: input.email.toLowerCase(),
    role: input.role,
    invitedBy: input.invitedBy,
    targetUid: input.targetUid,
    status: input.status,
    sentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}
