export type AuditStatus = "success" | "denied" | "failed";

export type AuditLogInput = {
  actorId: string;
  actorRoles: string[];
  action: string;
  resource: string;
  resourceId?: string;
  status: AuditStatus;
  correlationId: string;
  diff?: Record<string, unknown>;
  details?: Record<string, unknown>;
};
