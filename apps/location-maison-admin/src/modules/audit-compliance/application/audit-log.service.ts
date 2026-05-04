import { writeAuditLog } from "@/modules/audit-compliance/infrastructure/audit-log.repository";
import type { AuditLogInput } from "@/modules/audit-compliance/domain/types";

export async function logAudit(entry: AuditLogInput) {
  try {
    await writeAuditLog(entry);
  } catch {
    // Avoid blocking user paths if audit logging fails at this stage.
  }
}
