"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui-kit/page-header";

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type SourceItem = {
  id: string;
  announcerUid: string;
  platform: "facebook" | "instagram" | "tiktok" | "linkedin" | "x";
  sourceUrl: string;
  sourceType: "profile" | "page" | "group_user";
  status: "active" | "paused" | "revoked";
  lastImportAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type SourcesPayload = {
  sources: SourceItem[];
  count: number;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type JobItem = {
  id: string;
  status: "running" | "completed" | "failed" | "partial" | "needs_review";
  mode: "manual" | "scheduled";
  environment: "dev" | "preprod" | "prod";
  announcerScope: string[];
  counters: {
    rawFetched: number;
    normalizedOk: number;
    needsReview: number;
    published: number;
    rejected: number;
  };
  errorSummary: string | null;
  triggeredBy: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown> | null;
};

type JobsPayload = {
  jobs: JobItem[];
  count: number;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type JobDetailsPayload = {
  job: JobItem;
};

type JobLogsPayload = {
  job: JobItem;
  logs: {
    cloudRun: {
      projectId: string;
      region: string;
      jobName: string;
      executionName: string | null;
      executionsUrl: string;
      logsUrl: string;
    } | null;
    orchestratorUrl: string | null;
    externalRunId: string | null;
    hints: string[];
  };
};

type JobActionModalMode =
  | "details"
  | "logs"
  | "cancel"
  | "retry_dry"
  | "retry_real";

type ReviewItem = {
  id: string;
  announcerUid: string;
  sourceId: string | null;
  rawPostId: string;
  sourcePostUrl: string | null;
  title: string | null;
  typeProperty: string | null;
  price: number | null;
  city: string | null;
  province: string | null;
  imageUrls: string[];
  status: "ready_to_publish" | "needs_review" | "rejected" | "published";
  autoReason: string | null;
  score: number | null;
  createdAt: string | null;
};

type ReviewPayload = {
  candidates: ReviewItem[];
  count: number;
};

type DecisionItem = {
  id: string;
  jobId: string | null;
  announcerUid: string | null;
  rawPostId: string | null;
  decision: "publish" | "reject" | "archive_duplicate" | "retry";
  reason: string | null;
  actorId: string | null;
  createdAt: string | null;
};

type DecisionsPayload = {
  decisions: DecisionItem[];
  count: number;
};

type SocialImportSettings = {
  id: string;
  thresholds: {
    autoPublishMinScore: number;
    autoRejectMaxScore: number;
    defaultRunLimit: number;
    maxRunLimit: number;
  };
  scheduler: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
    environment: "dev" | "preprod" | "prod";
    includeImported: boolean;
    headless: boolean;
    defaultReason: string;
  };
  orchestrator: {
    executionMode: "auto" | "orchestrator" | "local";
    orchestratorUrlConfigured: boolean;
    allowLocalProd: boolean;
  };
  updatedBy: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

type SocialImportSettingsPayload = {
  settings: SocialImportSettings;
};

type AnnouncerLookupItem = {
  uid: string;
  fullName: string;
  email: string | null;
  phoneNumbers: string[];
};

type AnnouncerLookupPayload = {
  announcers: AnnouncerLookupItem[];
  count: number;
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function toDateLabel(value: string | null | undefined) {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toStatusBadgeVariant(
  value: string | null | undefined,
): "neutral" | "success" | "warning" | "danger" {
  if (!value) {
    return "neutral";
  }
  if (
    value === "active" ||
    value === "completed" ||
    value === "ready_to_publish" ||
    value === "published" ||
    value === "publish"
  ) {
    return "success";
  }
  if (value === "needs_review" || value === "partial" || value === "paused" || value === "retry") {
    return "warning";
  }
  if (value === "failed" || value === "revoked" || value === "rejected" || value === "reject") {
    return "danger";
  }
  return "neutral";
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

export default function SocialImportDashboardPage() {
  const [queryDraft, setQueryDraft] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [limit, setLimit] = useState(20);
  const [announcerLookupInput, setAnnouncerLookupInput] = useState("");
  const [announcerLookupDebounced, setAnnouncerLookupDebounced] = useState("");
  const [showAnnouncerLookup, setShowAnnouncerLookup] = useState(false);
  const [runForm, setRunForm] = useState({
    announcerUid: "",
    sourceId: "",
    dateFrom: "",
    dateTo: "",
    limit: "400",
    includeImported: "true",
    headless: "false",
    environment: "dev",
    reason: "",
  });
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SocialImportSettings | null>(null);
  const [jobModalMode, setJobModalMode] = useState<JobActionModalMode | null>(null);
  const [jobModalJob, setJobModalJob] = useState<JobItem | null>(null);
  const [jobModalReason, setJobModalReason] = useState("");
  const [jobModalDetails, setJobModalDetails] = useState<JobDetailsPayload | null>(null);
  const [jobModalLogs, setJobModalLogs] = useState<JobLogsPayload | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me", "social-import"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canReadModule = hasPermission(permissions, "social_import.read");
  const canReadAnnouncers = hasPermission(permissions, "announcers.read");
  const canReadSources = hasPermission(permissions, "social_import.source.read");
  const canReadJobs = hasPermission(permissions, "social_import.job.read");
  const canReadReview = hasPermission(permissions, "social_import.review");
  const canReadDecisions = hasPermission(permissions, "social_import.decision.read");
  const canCreateSource = hasPermission(permissions, "social_import.source.create");
  const canPauseSource = hasPermission(permissions, "social_import.source.pause");
  const canRevokeSource = hasPermission(permissions, "social_import.source.revoke");
  const canRunDry = hasPermission(permissions, "social_import.run.dry");
  const canRunProd = hasPermission(permissions, "social_import.run.prod");
  const canRetryJob = hasPermission(permissions, "social_import.job.retry");
  const canRejectCandidate = hasPermission(permissions, "social_import.reject");
  const canPublishCandidate = hasPermission(permissions, "social_import.publish");
  const canReadSettings = hasPermission(permissions, "social_import.settings.read");
  const canUpdateSettings = hasPermission(permissions, "social_import.settings.update");
  const canManageScheduler = hasPermission(permissions, "social_import.scheduler.manage");
  const canExport = hasPermission(permissions, "social_import.export");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (queryApplied) {
      params.set("query", queryApplied);
    }
    return params.toString();
  }, [limit, queryApplied]);

  const sourcesQuery = useQuery({
    queryKey: ["dashboard", "social-import", "sources", queryParams, canReadSources],
    enabled: canReadModule && canReadSources,
    queryFn: () =>
      fetchJson<SourcesPayload>(
        `/api/admin/v1/social-import/sources?${queryParams}`,
        "Impossible de charger les sources social import.",
      ),
  });

  const jobsQuery = useQuery({
    queryKey: ["dashboard", "social-import", "jobs", queryParams, canReadJobs],
    enabled: canReadModule && canReadJobs,
    queryFn: () =>
      fetchJson<JobsPayload>(
        `/api/admin/v1/social-import/jobs?${queryParams}`,
        "Impossible de charger les jobs social import.",
      ),
  });

  const reviewQuery = useQuery({
    queryKey: ["dashboard", "social-import", "review", queryParams, canReadReview],
    enabled: canReadModule && canReadReview,
    queryFn: () =>
      fetchJson<ReviewPayload>(
        `/api/admin/v1/social-import/review?${queryParams}`,
        "Impossible de charger la file review social import.",
      ),
  });

  const decisionsQuery = useQuery({
    queryKey: ["dashboard", "social-import", "decisions", queryParams, canReadDecisions],
    enabled: canReadModule && canReadDecisions,
    queryFn: () =>
      fetchJson<DecisionsPayload>(
        `/api/admin/v1/social-import/decisions?${queryParams}`,
        "Impossible de charger les décisions social import.",
      ),
  });

  const settingsQuery = useQuery({
    queryKey: ["dashboard", "social-import", "settings", canReadSettings],
    enabled: canReadModule && canReadSettings,
    queryFn: () =>
      fetchJson<SocialImportSettingsPayload>(
        "/api/admin/v1/social-import/settings",
        "Impossible de charger les paramètres social import.",
      ),
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAnnouncerLookupDebounced(announcerLookupInput.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [announcerLookupInput]);

  const announcerLookupQuery = useQuery({
    queryKey: ["dashboard", "social-import", "announcer-lookup", announcerLookupDebounced],
    enabled:
      canReadModule &&
      canReadAnnouncers &&
      announcerLookupDebounced.length >= 2,
    queryFn: () =>
      fetchJson<AnnouncerLookupPayload>(
        `/api/admin/v1/announcers?limit=20&query=${encodeURIComponent(
          announcerLookupDebounced,
        )}`,
        "Impossible de rechercher les annonceurs.",
      ),
  });

  const isLoadingAny =
    permissionsQuery.isLoading ||
    sourcesQuery.isFetching ||
    jobsQuery.isFetching ||
    reviewQuery.isFetching ||
    decisionsQuery.isFetching ||
    settingsQuery.isFetching;

  const globalError =
    permissionsQuery.error?.message ||
    sourcesQuery.error?.message ||
    jobsQuery.error?.message ||
    reviewQuery.error?.message ||
    decisionsQuery.error?.message ||
    settingsQuery.error?.message ||
    null;

  const sources = sourcesQuery.data?.sources ?? [];
  const jobs = jobsQuery.data?.jobs ?? [];
  const candidates = reviewQuery.data?.candidates ?? [];
  const decisions = decisionsQuery.data?.decisions ?? [];
  const currentSettings = settingsDraft ?? settingsQuery.data?.settings ?? null;
  const announcerLookupResults = announcerLookupQuery.data?.announcers ?? [];

  function closeJobActionModal() {
    setJobModalMode(null);
    setJobModalJob(null);
    setJobModalReason("");
    setJobModalDetails(null);
    setJobModalLogs(null);
  }

  function updateSettingsDraft(
    updater: (current: SocialImportSettings) => SocialImportSettings,
  ) {
    setSettingsDraft((previous) => {
      const base = previous ?? settingsQuery.data?.settings;
      if (!base) {
        return previous;
      }
      return updater(base);
    });
  }

  function onApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQueryApplied(queryDraft.trim());
  }

  function onRefreshAll() {
    void permissionsQuery.refetch();
    void sourcesQuery.refetch();
    void jobsQuery.refetch();
    void reviewQuery.refetch();
    void decisionsQuery.refetch();
    void announcerLookupQuery.refetch();
    void settingsQuery.refetch();
  }

  function selectAnnouncer(announcer: AnnouncerLookupItem) {
    setRunForm((previous) => ({
      ...previous,
      announcerUid: announcer.uid,
    }));
    setAnnouncerLookupInput(
      `${announcer.fullName}${announcer.email ? ` — ${announcer.email}` : ""} (${announcer.uid})`,
    );
    setShowAnnouncerLookup(false);
  }

  async function mutateJson<T>({
    url,
    method,
    body,
    headers,
  }: {
    url: string;
    method: "POST" | "PATCH";
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }) {
    const response = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as
      | { success: true; data: T }
      | { success: false; error?: { message?: string; details?: Record<string, unknown> } }
      | null;

    if (!response.ok || !payload?.success) {
      const message =
        payload && "success" in payload && !payload.success
          ? payload.error?.message || "Opération impossible."
          : "Opération impossible.";
      throw new Error(message);
    }

    return payload.data;
  }

  async function withAction<T>(key: string, action: () => Promise<T>, successMessage: string) {
    setPendingActionKey(key);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await action();
      setActionMessage(successMessage);
      onRefreshAll();
      return result;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action impossible.");
      return null;
    } finally {
      setPendingActionKey(null);
    }
  }

  function buildIdempotencyKey(prefix: string) {
    const random =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `fallback_${prefix}`;
    return `${prefix}_${random}`;
  }

  async function handleCreateSource() {
    const announcerUid = window.prompt("UID annonceur ?");
    if (!announcerUid) {
      return;
    }
    const platform = window.prompt(
      "Plateforme (facebook|instagram|tiktok|linkedin|x) ?",
      "facebook",
    );
    if (!platform) {
      return;
    }
    const sourceType = window.prompt("Type (profile|page|group_user) ?", "profile");
    if (!sourceType) {
      return;
    }
    const sourceUrl = window.prompt("URL source ?");
    if (!sourceUrl) {
      return;
    }

    await withAction(
      "source_create",
      () =>
        mutateJson({
          url: "/api/admin/v1/social-import/sources",
          method: "POST",
          body: {
            announcerUid: announcerUid.trim(),
            platform: platform.trim().toLowerCase(),
            sourceType: sourceType.trim().toLowerCase(),
            sourceUrl: sourceUrl.trim(),
            status: "active",
          },
        }),
      "Source créée avec succès.",
    );
  }

  async function handlePauseSource(source: SourceItem) {
    const reason = window.prompt(`Motif de pause pour ${source.id} ?`);
    if (!reason) {
      return;
    }

    await withAction(
      `source_pause_${source.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/sources/${source.id}/pause`,
          method: "POST",
          body: { reason: reason.trim() },
        }),
      "Source mise en pause.",
    );
  }

  async function handleRevokeSource(source: SourceItem) {
    const reason = window.prompt(`Motif de révocation pour ${source.id} ?`);
    if (!reason) {
      return;
    }

    const confirmed = window.confirm(
      `Confirmer la révocation de la source ${source.id} ? Cette action est sensible.`,
    );
    if (!confirmed) {
      return;
    }

    await withAction(
      `source_revoke_${source.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/sources/${source.id}/revoke`,
          method: "POST",
          body: { reason: reason.trim() },
        }),
      "Source révoquée.",
    );
  }

  async function handleDryRun() {
    const announcerUid = runForm.announcerUid.trim();
    const sourceId = runForm.sourceId.trim();
    if (!announcerUid && !sourceId) {
      setActionError("Renseigne un UID annonceur ou un sourceId pour lancer un dry-run.");
      return;
    }

    await withAction(
      "job_dry_run",
      () =>
        mutateJson({
          url: "/api/admin/v1/social-import/jobs/dry-run",
          method: "POST",
          body: {
            sourceIds: sourceId ? [sourceId] : undefined,
            announcerUids: announcerUid ? [announcerUid] : undefined,
            reason: runForm.reason.trim() || undefined,
            environment:
              runForm.environment === "prod"
                ? "dev"
                : (runForm.environment as "dev" | "preprod"),
          },
          headers: {
            "idempotency-key": buildIdempotencyKey("si_dry_run"),
          },
        }),
      "Dry-run déclenché.",
    );
  }

  async function handleRunImport() {
    const announcerUid = runForm.announcerUid.trim();
    const sourceId = runForm.sourceId.trim();
    if (!announcerUid && !sourceId) {
      setActionError("Renseigne un UID annonceur ou un sourceId pour lancer l'import.");
      return;
    }

    const parsedLimit = Number(runForm.limit.trim());
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
      setActionError("La limite doit être un entier supérieur à 0.");
      return;
    }

    await withAction(
      "job_run",
      () =>
        mutateJson({
          url: "/api/admin/v1/social-import/jobs/run",
          method: "POST",
          body: {
            sourceId: sourceId || undefined,
            announcerUid: announcerUid || undefined,
            environment: runForm.environment,
            reason: runForm.reason.trim() || undefined,
            dateFrom: runForm.dateFrom.trim() || undefined,
            dateTo: runForm.dateTo.trim() || undefined,
            limit: Math.floor(parsedLimit),
            includeImported: runForm.includeImported === "true",
            headless: runForm.headless === "true",
          },
          headers: {
            "idempotency-key": buildIdempotencyKey("si_run"),
          },
        }),
      "Run social import déclenché.",
    );
  }

  function resolveJobSourceId(job: JobItem) {
    const value = job.metadata?.sourceId;
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  function resolveJobLimit(job: JobItem) {
    const value = job.metadata?.limit;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    return undefined;
  }

  function resolveJobBooleanMeta(job: JobItem, key: "includeImported" | "headless") {
    const value = job.metadata?.[key];
    return typeof value === "boolean" ? value : undefined;
  }

  function resolveRetryEnvironmentForDryRun(job: JobItem) {
    return job.environment === "prod" ? "preprod" : job.environment;
  }

  async function handleViewJobDetails(job: JobItem) {
    const result = await withAction(
      `job_details_${job.id}`,
      () =>
        fetchJson<JobDetailsPayload>(
          `/api/admin/v1/social-import/jobs/${job.id}`,
          "Impossible de charger les détails du job.",
        ),
      "Détails job chargés.",
    );

    if (!result?.job) {
      return;
    }
    setJobModalJob(result.job);
    setJobModalDetails(result);
    setJobModalMode("details");
  }

  async function handleViewJobLogs(job: JobItem) {
    const result = await withAction(
      `job_logs_${job.id}`,
      () =>
        fetchJson<JobLogsPayload>(
          `/api/admin/v1/social-import/jobs/${job.id}/logs`,
          "Impossible de charger les logs du job.",
        ),
      "Logs job chargés.",
    );
    if (!result) {
      return;
    }
    setJobModalJob(result.job);
    setJobModalLogs(result);
    setJobModalMode("logs");
  }

  async function handleCancelJob(job: JobItem) {
    setJobModalJob(job);
    setJobModalReason("");
    setJobModalMode("cancel");
  }

  async function handleRetryJobDryRun(job: JobItem) {
    if (job.announcerScope.length === 0) {
      setActionError("Impossible de relancer ce job en dry-run: aucun annonceur lié.");
      return;
    }
    setJobModalJob(job);
    setJobModalReason("");
    setJobModalMode("retry_dry");
  }

  async function handleRetryJobReal(job: JobItem) {
    const announcerUid = job.announcerScope[0]?.trim() || "";
    if (!announcerUid) {
      setActionError("Impossible de relancer ce job: aucun annonceur lié.");
      return;
    }
    setJobModalJob(job);
    setJobModalReason("");
    setJobModalMode("retry_real");
  }

  async function handleConfirmJobCancel() {
    if (!jobModalJob) {
      return;
    }
    const result = await withAction(
      `job_cancel_${jobModalJob.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/jobs/${jobModalJob.id}/cancel`,
          method: "POST",
          body: { reason: jobModalReason.trim() || undefined },
        }),
      "Job annulé.",
    );
    if (result) {
      closeJobActionModal();
    }
  }

  async function handleConfirmJobRetryDryRun() {
    if (!jobModalJob) {
      return;
    }
    const result = await withAction(
      `job_retry_dry_${jobModalJob.id}`,
      () =>
        mutateJson({
          url: "/api/admin/v1/social-import/jobs/dry-run",
          method: "POST",
          body: {
            sourceIds: resolveJobSourceId(jobModalJob) ? [resolveJobSourceId(jobModalJob)] : undefined,
            announcerUids: jobModalJob.announcerScope,
            environment: resolveRetryEnvironmentForDryRun(jobModalJob),
            reason: jobModalReason.trim() || undefined,
          },
          headers: {
            "idempotency-key": buildIdempotencyKey(`si_retry_dry_${jobModalJob.id}`),
          },
        }),
      "Dry-run relancé.",
    );
    if (result) {
      closeJobActionModal();
    }
  }

  async function handleConfirmJobRetryReal() {
    if (!jobModalJob) {
      return;
    }
    const announcerUid = jobModalJob.announcerScope[0]?.trim() || "";
    if (!announcerUid) {
      setActionError("Impossible de relancer ce job: aucun annonceur lié.");
      return;
    }

    if (jobModalJob.environment === "prod" && !jobModalReason.trim()) {
      setActionError("Le motif est obligatoire pour une relance réelle en prod.");
      return;
    }

    const limit = resolveJobLimit(jobModalJob);
    const includeImported = resolveJobBooleanMeta(jobModalJob, "includeImported");
    const headless = resolveJobBooleanMeta(jobModalJob, "headless");
    const dateFrom =
      typeof jobModalJob.metadata?.dateFrom === "string" && jobModalJob.metadata.dateFrom.trim().length > 0
        ? jobModalJob.metadata.dateFrom.trim()
        : undefined;
    const dateTo =
      typeof jobModalJob.metadata?.dateTo === "string" && jobModalJob.metadata.dateTo.trim().length > 0
        ? jobModalJob.metadata.dateTo.trim()
        : undefined;

    const result = await withAction(
      `job_retry_real_${jobModalJob.id}`,
      () =>
        mutateJson({
          url: "/api/admin/v1/social-import/jobs/run",
          method: "POST",
          body: {
            sourceId: resolveJobSourceId(jobModalJob),
            announcerUid,
            environment: jobModalJob.environment,
            reason: jobModalReason.trim() || undefined,
            dateFrom,
            dateTo,
            limit,
            includeImported,
            headless,
          },
          headers: {
            "idempotency-key": buildIdempotencyKey(`si_retry_real_${jobModalJob.id}`),
          },
        }),
      "Run réel relancé.",
    );
    if (result) {
      closeJobActionModal();
    }
  }

  async function handleRejectCandidate(candidate: ReviewItem) {
    const reason = window.prompt(`Motif de rejet pour ${candidate.rawPostId} ?`);
    if (!reason) {
      return;
    }

    await withAction(
      `candidate_reject_${candidate.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/review/${candidate.id}/reject`,
          method: "POST",
          body: { reason: reason.trim() },
        }),
      "Candidate rejetée.",
    );
  }

  async function handlePublishCandidate(candidate: ReviewItem) {
    const reason = window.prompt(`Motif de publication pour ${candidate.rawPostId} (optionnel) :`, "");
    if (reason === null) {
      return;
    }

    await withAction(
      `candidate_publish_${candidate.id}`,
      () =>
        mutateJson({
          url: `/api/admin/v1/social-import/review/${candidate.id}/publish`,
          method: "POST",
          body: { reason: reason.trim() || undefined },
          headers: {
            "idempotency-key": buildIdempotencyKey(`si_publish_${candidate.id}`),
          },
        }),
      "Candidate publiée.",
    );
  }

  function buildExportQueryParams() {
    const params = new URLSearchParams();
    if (queryApplied) {
      params.set("query", queryApplied);
    }
    if (runForm.announcerUid.trim()) {
      params.set("announcerUid", runForm.announcerUid.trim());
    }
    if (runForm.dateFrom.trim()) {
      params.set("startedFrom", runForm.dateFrom.trim());
    }
    if (runForm.dateTo.trim()) {
      params.set("startedTo", runForm.dateTo.trim());
    }
    return params.toString();
  }

  function handleExport(kind: "jobs" | "kpi" | "rejections") {
    const params = buildExportQueryParams();
    const url = `/api/admin/v1/social-import/export/${kind}${params ? `?${params}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSaveSettings() {
    if (!currentSettings) {
      return;
    }

    const result = await withAction(
      "settings_update",
      () =>
        mutateJson<SocialImportSettingsPayload>({
          url: "/api/admin/v1/social-import/settings",
          method: "PATCH",
          body: {
            thresholds: currentSettings.thresholds,
            scheduler: {
              cronExpression: currentSettings.scheduler.cronExpression,
              timezone: currentSettings.scheduler.timezone,
              environment: currentSettings.scheduler.environment,
              includeImported: currentSettings.scheduler.includeImported,
              headless: currentSettings.scheduler.headless,
              defaultReason: currentSettings.scheduler.defaultReason,
            },
            orchestrator: {
              executionMode: currentSettings.orchestrator.executionMode,
              allowLocalProd: currentSettings.orchestrator.allowLocalProd,
            },
          },
        }),
      "Paramètres social import mis à jour.",
    );

    if (result?.settings) {
      setSettingsDraft(result.settings);
    }
  }

  async function handleToggleScheduler(enabled: boolean) {
    if (!currentSettings) {
      return;
    }
    const reason = window.prompt(
      enabled
        ? "Motif d'activation du scheduler ?"
        : "Motif de désactivation du scheduler ?",
    );
    if (!reason) {
      return;
    }

    const result = await withAction(
      `scheduler_toggle_${enabled ? "on" : "off"}`,
      () =>
        mutateJson<{ scheduler: { before: boolean; after: boolean } }>({
          url: "/api/admin/v1/social-import/scheduler/toggle",
          method: "POST",
          body: {
            enabled,
            reason: reason.trim(),
          },
        }),
      enabled ? "Scheduler activé." : "Scheduler désactivé.",
    );

    if (result && currentSettings) {
      setSettingsDraft({
        ...currentSettings,
        scheduler: {
          ...currentSettings.scheduler,
          enabled: result.scheduler.after,
        },
      });
    }
  }

  if (permissionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Import social"
          description="Chargement des permissions et des données du module."
        />
        <Card>
          <CardContent className="pt-5 text-sm text-slate-600">Chargement en cours…</CardContent>
        </Card>
      </div>
    );
  }

  if (!canReadModule) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Import social"
          description="Pilotage de l'import d'annonces depuis les réseaux sociaux."
        />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5 text-sm text-amber-800">
            Permission manquante: <code>social_import.read</code>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import social"
        description="Sources annonceurs, exécutions jobs, file review et historique des décisions."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canCreateSource ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateSource}
                disabled={pendingActionKey !== null}
              >
                Ajouter source
              </Button>
            ) : null}
            {canRunDry ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleDryRun}
                disabled={pendingActionKey !== null}
              >
                Dry-run
              </Button>
            ) : null}
            {canExport ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExport("jobs")}
                  disabled={pendingActionKey !== null}
                >
                  Export jobs
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExport("kpi")}
                  disabled={pendingActionKey !== null}
                >
                  Export KPI
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleExport("rejections")}
                  disabled={pendingActionKey !== null}
                >
                  Export rejets
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={onRefreshAll}
              disabled={isLoadingAny || pendingActionKey !== null}
            >
              <RefreshCcw className="mr-2 size-4" />
              Actualiser
            </Button>
          </div>
        }
      />

      {globalError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-5 text-sm text-red-700">{globalError}</CardContent>
        </Card>
      ) : null}
      {actionError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-5 text-sm text-red-700">{actionError}</CardContent>
        </Card>
      ) : null}
      {actionMessage ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-5 text-sm text-emerald-700">{actionMessage}</CardContent>
        </Card>
      ) : null}

      <Sheet
        open={jobModalMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeJobActionModal();
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {jobModalMode === "details"
                ? "Détails du job"
                : jobModalMode === "logs"
                  ? "Logs du job"
                  : jobModalMode === "cancel"
                    ? "Annuler le job"
                    : jobModalMode === "retry_dry"
                      ? "Relancer en dry-run"
                      : jobModalMode === "retry_real"
                        ? "Relancer en réel"
                        : "Action job"}
            </SheetTitle>
            <SheetDescription>
              {jobModalJob
                ? `Job ${jobModalJob.id} · ${jobModalJob.environment} · ${jobModalJob.status}`
                : "Aucun job sélectionné."}
            </SheetDescription>
          </SheetHeader>

          {jobModalMode === "details" && jobModalDetails ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Début:</span>{" "}
                  {toDateLabel(jobModalDetails.job.startedAt ?? jobModalDetails.job.createdAt)}
                </p>
                <p>
                  <span className="font-medium">Fin:</span> {toDateLabel(jobModalDetails.job.endedAt)}
                </p>
                <p>
                  <span className="font-medium">Annonceurs:</span>{" "}
                  {jobModalDetails.job.announcerScope.length
                    ? jobModalDetails.job.announcerScope.join(", ")
                    : "all"}
                </p>
                <p>
                  <span className="font-medium">Erreur:</span>{" "}
                  {jobModalDetails.job.errorSummary || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Compteurs:</span> fetch{" "}
                  {formatNumber(jobModalDetails.job.counters.rawFetched)} | ok{" "}
                  {formatNumber(jobModalDetails.job.counters.normalizedOk)} | review{" "}
                  {formatNumber(jobModalDetails.job.counters.needsReview)} | pub{" "}
                  {formatNumber(jobModalDetails.job.counters.published)}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Metadata brute</p>
                <pre className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                  {JSON.stringify(jobModalDetails.job.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}

          {jobModalMode === "logs" && jobModalLogs ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Run externe:</span>{" "}
                  {jobModalLogs.logs.externalRunId || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Orchestrateur:</span>{" "}
                  {jobModalLogs.logs.orchestratorUrl || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Résumé erreur:</span>{" "}
                  {jobModalLogs.job.errorSummary || "N/A"}
                </p>
              </div>

              {jobModalLogs.logs.hints.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-800">Indices de diagnostic</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-900">
                    {jobModalLogs.logs.hints.map((hint, index) => (
                      <li key={`${jobModalLogs.job.id}_hint_${index + 1}`}>{hint}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {jobModalLogs.logs.cloudRun ? (
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs text-slate-600">
                    Cloud Run: {jobModalLogs.logs.cloudRun.jobName} · {jobModalLogs.logs.cloudRun.region}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          jobModalLogs.logs.cloudRun?.logsUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Ouvrir logs Cloud Run
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          jobModalLogs.logs.cloudRun?.executionsUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Ouvrir exécutions
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Liens Cloud Run indisponibles (projet GCP non résolu côté env).
                </p>
              )}
            </div>
          ) : null}

          {jobModalMode === "cancel" || jobModalMode === "retry_dry" || jobModalMode === "retry_real" ? (
            <div className="space-y-3 px-4 text-sm">
              <div className="rounded-md border border-slate-200 p-3">
                <p>
                  <span className="font-medium">Annonceurs:</span>{" "}
                  {jobModalJob?.announcerScope.length ? jobModalJob.announcerScope.join(", ") : "all"}
                </p>
                <p>
                  <span className="font-medium">Période:</span>{" "}
                  {typeof jobModalJob?.metadata?.dateFrom === "string" && jobModalJob.metadata.dateFrom
                    ? jobModalJob.metadata.dateFrom
                    : "N/A"}{" "}
                  →{" "}
                  {typeof jobModalJob?.metadata?.dateTo === "string" && jobModalJob.metadata.dateTo
                    ? jobModalJob.metadata.dateTo
                    : "N/A"}
                </p>
                <p>
                  <span className="font-medium">Limite:</span>{" "}
                  {typeof jobModalJob?.metadata?.limit === "number" ? Math.floor(jobModalJob.metadata.limit) : "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">
                  Motif {jobModalMode === "retry_real" && jobModalJob?.environment === "prod" ? "(obligatoire)" : "(optionnel)"}
                </p>
                <Input
                  value={jobModalReason}
                  onChange={(event) => setJobModalReason(event.target.value)}
                  placeholder="Décris brièvement l'action à exécuter"
                />
              </div>
            </div>
          ) : null}

          <SheetFooter>
            <Button type="button" variant="outline" onClick={closeJobActionModal}>
              Fermer
            </Button>
            {jobModalMode === "cancel" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pendingActionKey !== null}
                onClick={() => void handleConfirmJobCancel()}
              >
                Confirmer annulation
              </Button>
            ) : null}
            {jobModalMode === "retry_dry" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pendingActionKey !== null}
                onClick={() => void handleConfirmJobRetryDryRun()}
              >
                Confirmer dry-run
              </Button>
            ) : null}
            {jobModalMode === "retry_real" ? (
              <Button
                type="button"
                disabled={pendingActionKey !== null}
                onClick={() => void handleConfirmJobRetryReal()}
              >
                Confirmer relance réelle
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filtres lecture</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onApplyFilters}>
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Recherche (uid, job, post, url...)"
            />
            <select
              value={String(limit)}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="20">20 lignes</option>
              <option value="50">50 lignes</option>
              <option value="100">100 lignes</option>
            </select>
            <Button type="submit">Appliquer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Lancement import annonceur</h2>
          <Badge variant={canRunDry || canRunProd ? "success" : "warning"}>
            {canRunDry || canRunProd ? "Pilotage autorisé" : "Permission manquante"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {canReadAnnouncers ? (
              <>
                <div className="relative space-y-1 xl:col-span-2">
                  <p className="text-xs font-medium text-slate-600">Annonceur (recherche)</p>
                  <Input
                    value={announcerLookupInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAnnouncerLookupInput(value);
                      setShowAnnouncerLookup(true);
                      if (!value.trim()) {
                        setRunForm((previous) => ({ ...previous, announcerUid: "" }));
                      }
                    }}
                    onFocus={() => setShowAnnouncerLookup(true)}
                    onBlur={() => {
                      setTimeout(() => setShowAnnouncerLookup(false), 120);
                    }}
                    placeholder="Recherche par nom, email, téléphone ou UID"
                  />
                  {showAnnouncerLookup && announcerLookupInput.trim().length >= 2 ? (
                    <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {announcerLookupQuery.isFetching ? (
                        <p className="px-3 py-2 text-xs text-slate-500">Recherche en cours…</p>
                      ) : announcerLookupQuery.error ? (
                        <p className="px-3 py-2 text-xs text-red-600">
                          {announcerLookupQuery.error.message}
                        </p>
                      ) : announcerLookupResults.length ? (
                        announcerLookupResults.map((announcer) => (
                          <button
                            key={announcer.uid}
                            type="button"
                            className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onMouseDown={() => selectAnnouncer(announcer)}
                          >
                            <p className="font-medium text-slate-900">{announcer.fullName}</p>
                            <p className="text-xs text-slate-500">
                              {announcer.email || "email non renseigné"} · {announcer.uid}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-slate-500">Aucun annonceur trouvé.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">UID annonceur sélectionné</p>
                  <Input value={runForm.announcerUid} readOnly placeholder="Sélectionne un annonceur" />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">UID annonceur</p>
                <Input
                  value={runForm.announcerUid}
                  onChange={(event) =>
                    setRunForm((previous) => ({
                      ...previous,
                      announcerUid: event.target.value,
                    }))
                  }
                  placeholder="Ex: cd2POQU74IV7F6Rlhm6Nlmz0qUs1"
                />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Source ID (optionnel)</p>
              <Input
                value={runForm.sourceId}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    sourceId: event.target.value,
                  }))
                }
                placeholder="ID de la source import"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Date début (optionnel)</p>
              <Input
                type="date"
                value={runForm.dateFrom}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    dateFrom: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Date fin (optionnel)</p>
              <Input
                type="date"
                value={runForm.dateTo}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    dateTo: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Limite posts</p>
              <Input
                type="number"
                min={1}
                value={runForm.limit}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    limit: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Inclure déjà importées</p>
              <select
                value={runForm.includeImported}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    includeImported: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Mode headless</p>
              <select
                value={runForm.headless}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    headless: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="false">Non (visible)</option>
                <option value="true">Oui (headless)</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Environnement</p>
              <select
                value={runForm.environment}
                onChange={(event) =>
                  setRunForm((previous) => ({
                    ...previous,
                    environment: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              >
                <option value="dev">dev</option>
                <option value="preprod">preprod</option>
                <option value="prod">prod</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Motif (optionnel)</p>
            <Input
              value={runForm.reason}
              onChange={(event) =>
                setRunForm((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
              placeholder="Ex: import mensuel mars-avril pour annonceur cible"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {canRunDry ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleDryRun()}
                disabled={pendingActionKey !== null}
              >
                Lancer dry-run
              </Button>
            ) : null}
            {canRunProd ? (
              <Button
                type="button"
                onClick={() => void handleRunImport()}
                disabled={pendingActionKey !== null}
              >
                Lancer import
              </Button>
            ) : null}
            {!canRunDry && !canRunProd ? (
              <p className="text-sm text-amber-700">
                Permissions manquantes: <code>social_import.run.dry</code> ou{" "}
                <code>social_import.run.prod</code>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Paramètres et scheduler</h2>
          <Badge variant={canReadSettings ? "success" : "warning"}>
            {canReadSettings ? "Lecture autorisée" : "Permission manquante"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canReadSettings ? (
            <p className="text-sm text-amber-700">
              Permission manquante: <code>social_import.settings.read</code>
            </p>
          ) : !currentSettings ? (
            <p className="text-sm text-slate-500">Chargement des paramètres...</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Run limit par défaut</p>
                  <Input
                    type="number"
                    min={1}
                    value={String(currentSettings.thresholds.defaultRunLimit)}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        thresholds: {
                          ...previous.thresholds,
                          defaultRunLimit: Number(event.target.value || 1),
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Run limit max</p>
                  <Input
                    type="number"
                    min={1}
                    value={String(currentSettings.thresholds.maxRunLimit)}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        thresholds: {
                          ...previous.thresholds,
                          maxRunLimit: Number(event.target.value || 1),
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Seuil auto publish</p>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step="0.01"
                    value={String(currentSettings.thresholds.autoPublishMinScore)}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        thresholds: {
                          ...previous.thresholds,
                          autoPublishMinScore: Number(event.target.value || 0),
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Seuil auto reject</p>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step="0.01"
                    value={String(currentSettings.thresholds.autoRejectMaxScore)}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        thresholds: {
                          ...previous.thresholds,
                          autoRejectMaxScore: Number(event.target.value || 0),
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Mode exécution</p>
                  <select
                    value={currentSettings.orchestrator.executionMode}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        orchestrator: {
                          ...previous.orchestrator,
                          executionMode: event.target.value as
                            | "auto"
                            | "orchestrator"
                            | "local",
                        },
                      }))
                    }
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  >
                    <option value="auto">auto</option>
                    <option value="orchestrator">orchestrator</option>
                    <option value="local">local</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">URL orchestrateur</p>
                  <div className="h-10 rounded-md border border-slate-200 px-3 text-sm leading-10">
                    {currentSettings.orchestrator.orchestratorUrlConfigured
                      ? "Configurée"
                      : "Non configurée"}
                  </div>
                </div>
                <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={currentSettings.orchestrator.allowLocalProd}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        orchestrator: {
                          ...previous.orchestrator,
                          allowLocalProd: event.target.checked,
                        },
                      }))
                    }
                  />
                  Autoriser local en prod
                </label>
                <div className="flex items-center gap-2">
                  <Badge variant={currentSettings.scheduler.enabled ? "success" : "warning"}>
                    Scheduler {currentSettings.scheduler.enabled ? "actif" : "inactif"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Scheduler environnement</p>
                  <select
                    value={currentSettings.scheduler.environment}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        scheduler: {
                          ...previous.scheduler,
                          environment: event.target.value as
                            | "dev"
                            | "preprod"
                            | "prod",
                        },
                      }))
                    }
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  >
                    <option value="dev">dev</option>
                    <option value="preprod">preprod</option>
                    <option value="prod">prod</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Cron expression</p>
                  <Input
                    value={currentSettings.scheduler.cronExpression}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        scheduler: {
                          ...previous.scheduler,
                          cronExpression: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Timezone</p>
                  <Input
                    value={currentSettings.scheduler.timezone}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        scheduler: {
                          ...previous.scheduler,
                          timezone: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Reason scheduler par défaut</p>
                  <Input
                    value={currentSettings.scheduler.defaultReason}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        scheduler: {
                          ...previous.scheduler,
                          defaultReason: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentSettings.scheduler.includeImported}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        scheduler: {
                          ...previous.scheduler,
                          includeImported: event.target.checked,
                        },
                      }))
                    }
                  />
                  Inclure annonces déjà importées
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentSettings.scheduler.headless}
                    onChange={(event) =>
                      updateSettingsDraft((previous) => ({
                        ...previous,
                        scheduler: {
                          ...previous.scheduler,
                          headless: event.target.checked,
                        },
                      }))
                    }
                  />
                  Exécution headless
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUpdateSettings ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleSaveSettings()}
                    disabled={pendingActionKey !== null}
                  >
                    Enregistrer paramètres
                  </Button>
                ) : (
                  <p className="text-sm text-amber-700">
                    Permission manquante: <code>social_import.settings.update</code>
                  </p>
                )}
                {canManageScheduler ? (
                  <Button
                    type="button"
                    variant={currentSettings.scheduler.enabled ? "destructive" : "outline"}
                    onClick={() =>
                      void handleToggleScheduler(!currentSettings.scheduler.enabled)
                    }
                    disabled={pendingActionKey !== null}
                  >
                    {currentSettings.scheduler.enabled
                      ? "Désactiver scheduler"
                      : "Activer scheduler"}
                  </Button>
                ) : (
                  <p className="text-sm text-amber-700">
                    Permission manquante: <code>social_import.scheduler.manage</code>
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Sources</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(sourcesQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Jobs</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(jobsQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Review</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(reviewQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm text-slate-600">Décisions</CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(decisionsQuery.data?.count ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Sources</h2>
          <Badge variant={canReadSources ? "success" : "warning"}>
            {canReadSources ? "Lecture autorisée" : "Permission manquante"}
          </Badge>
        </CardHeader>
        <CardContent>
          {canReadSources ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">Annonceur</th>
                    <th className="py-2 pr-4 font-medium">Plateforme</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 pr-4 font-medium">Dernier import</th>
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {sources.length ? (
                    sources.map((source) => (
                      <tr key={source.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">{source.announcerUid || "N/A"}</td>
                        <td className="py-3 pr-4">{source.platform}</td>
                        <td className="py-3 pr-4">{source.sourceType}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={toStatusBadgeVariant(source.status)}>{source.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">{toDateLabel(source.lastImportAt)}</td>
                        <td className="py-3 pr-4">
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-700 hover:underline"
                          >
                            Ouvrir
                          </a>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {canPauseSource && source.status !== "paused" && source.status !== "revoked" ? (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handlePauseSource(source)}
                              >
                                Pause
                              </Button>
                            ) : null}
                            {canRevokeSource && source.status !== "revoked" ? (
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handleRevokeSource(source)}
                              >
                                Révoquer
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-slate-500" colSpan={7}>
                        Aucune source trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-amber-700">Permission manquante: social_import.source.read</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Jobs</h2>
          <Badge variant={canReadJobs ? "success" : "warning"}>
            {canReadJobs ? "Lecture autorisée" : "Permission manquante"}
          </Badge>
        </CardHeader>
        <CardContent>
          {canReadJobs ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">Job</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 pr-4 font-medium">Mode</th>
                    <th className="py-2 pr-4 font-medium">Environnement</th>
                    <th className="py-2 pr-4 font-medium">Annonceurs</th>
                    <th className="py-2 pr-4 font-medium">Compteurs</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {jobs.length ? (
                    jobs.map((job) => (
                      <tr key={job.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-900">{job.id}</p>
                          <p className="text-xs text-slate-500">{toDateLabel(job.startedAt ?? job.createdAt)}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={toStatusBadgeVariant(job.status)}>{job.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">{job.mode}</td>
                        <td className="py-3 pr-4">{job.environment}</td>
                        <td className="py-3 pr-4">{job.announcerScope.length ? job.announcerScope.join(", ") : "all"}</td>
                        <td className="py-3 pr-4 text-xs">
                          fetch {formatNumber(job.counters.rawFetched)} | ok {formatNumber(job.counters.normalizedOk)} |
                          review {formatNumber(job.counters.needsReview)} | pub {formatNumber(job.counters.published)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={pendingActionKey !== null}
                              onClick={() => void handleViewJobDetails(job)}
                            >
                              Détails
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={pendingActionKey !== null}
                              onClick={() => void handleViewJobLogs(job)}
                            >
                              Logs
                            </Button>
                            {canRetryJob && job.status === "running" ? (
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handleCancelJob(job)}
                              >
                                Annuler
                              </Button>
                            ) : null}
                            {canRunDry && job.status !== "running" ? (
                              <Button
                                size="xs"
                                variant="secondary"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handleRetryJobDryRun(job)}
                              >
                                Relancer dry-run
                              </Button>
                            ) : null}
                            {canRunProd && job.status !== "running" ? (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={pendingActionKey !== null}
                                onClick={() => void handleRetryJobReal(job)}
                              >
                                Relancer réel
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-slate-500" colSpan={7}>
                        Aucun job trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-amber-700">Permission manquante: social_import.job.read</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">File review</h2>
            <Badge variant={canReadReview ? "success" : "warning"}>
              {canReadReview ? "Lecture autorisée" : "Permission manquante"}
            </Badge>
          </CardHeader>
          <CardContent>
            {canReadReview ? (
              <div className="space-y-3">
                {candidates.length ? (
                  candidates.map((candidate) => (
                    <article key={candidate.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{candidate.rawPostId}</p>
                        <Badge variant={toStatusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
                      </div>
                      {candidate.title ? (
                        <p className="mt-1 text-sm font-medium text-slate-800">{candidate.title}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        {candidate.typeProperty || "Type N/A"}
                        {candidate.price != null ? ` · ${formatNumber(candidate.price)} FCFA` : ""}
                        {candidate.city || candidate.province
                          ? ` · ${[candidate.city, candidate.province].filter(Boolean).join(", ")}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Annonceur: {candidate.announcerUid}</p>
                      <p className="mt-1 text-xs text-slate-500">Score: {formatNumber(candidate.score)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Raison auto: {candidate.autoReason || "non renseignée"}
                      </p>
                      {candidate.imageUrls.length ? (
                        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                          {candidate.imageUrls.slice(0, 8).map((imageUrl, index) => (
                            <a
                              key={`${candidate.id}_image_${index + 1}`}
                              href={imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded border border-slate-200"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageUrl}
                                alt={`Image ${index + 1} - ${candidate.rawPostId}`}
                                className="h-24 w-full object-cover"
                                loading="lazy"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {candidate.sourcePostUrl ? (
                        <a
                          href={candidate.sourcePostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-brand-700 hover:underline"
                        >
                          Ouvrir le post source
                        </a>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canRejectCandidate && candidate.status !== "rejected" && candidate.status !== "published" ? (
                          <Button
                            size="xs"
                            variant="destructive"
                            disabled={pendingActionKey !== null}
                            onClick={() => void handleRejectCandidate(candidate)}
                          >
                            Rejeter
                          </Button>
                        ) : null}
                        {canPublishCandidate && candidate.status === "ready_to_publish" ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={pendingActionKey !== null}
                            onClick={() => void handlePublishCandidate(candidate)}
                          >
                            Publier
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Aucune candidate review.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-700">Permission manquante: social_import.review</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Historique décisions</h2>
            <Badge variant={canReadDecisions ? "success" : "warning"}>
              {canReadDecisions ? "Lecture autorisée" : "Permission manquante"}
            </Badge>
          </CardHeader>
          <CardContent>
            {canReadDecisions ? (
              <div className="space-y-3">
                {decisions.length ? (
                  decisions.map((decision) => (
                    <article key={decision.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{decision.rawPostId || decision.id}</p>
                        <Badge variant={toStatusBadgeVariant(decision.decision)}>{decision.decision}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Acteur: {decision.actorId || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-500">Annonceur: {decision.announcerUid || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-500">Job: {decision.jobId || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-500">Date: {toDateLabel(decision.createdAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Motif: {decision.reason || "non renseigné"}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Aucune décision enregistrée.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-700">Permission manquante: social_import.decision.read</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
