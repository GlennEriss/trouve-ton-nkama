import { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { createProvisionedAccount } from "@/modules/account-provisioning/application/account-provisioning.service";
import { logAudit } from "@/modules/audit-compliance/application/audit-log.service";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { listPlatformUsers } from "@/modules/user-management/application/user-management.service";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().trim().min(1).optional(),
  query: z.string().trim().optional(),
  role: z.enum(["all", "user", "announcer", "admin"]).optional(),
  status: z.enum(["all", "active", "suspended", "archived"]).optional(),
  presence: z.enum(["all", "online", "offline"]).optional(),
});

const createAccountSchema = z
  .object({
    accountType: z
      .enum(["user", "announcer", "User", "Announcer"])
      .transform((value) => value.toLowerCase() as "user" | "announcer"),
    firstname: z.string().trim().min(1).max(80),
    lastname: z.string().trim().min(1).max(80),
    email: z.string().trim().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.")
      .regex(/\d/, "Le mot de passe doit contenir un chiffre."),
    passwordConfirm: z.string().optional(),
    phoneNumber: z.string().trim().min(6).max(32),
    country: z.object({
      name: z.string().trim().min(1).max(80),
      code: z.string().trim().min(2).max(4),
    }),
    birthDate: z.string().trim().min(4).max(40).optional(),
    birthdate: z
      .object({
        day: z.string().trim().min(1).max(2),
        month: z.string().trim().min(1).max(2),
        year: z.string().trim().min(4).max(4),
      })
      .optional(),
    credits: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.passwordConfirm && value.passwordConfirm !== value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les mots de passe ne correspondent pas.",
        path: ["passwordConfirm"],
      });
    }
  });

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, "users.read");

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = querySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit"),
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    role: request.nextUrl.searchParams.get("role") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    presence: request.nextUrl.searchParams.get("presence") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Paramètres de requête invalides.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const result = await listPlatformUsers({
    limit: parsed.data.limit ?? 100,
    cursor: parsed.data.cursor,
    query: parsed.data.query,
    role: parsed.data.role,
    status: parsed.data.status,
    presence: parsed.data.presence,
  });

  return jsonSuccess(result, auth.correlationId);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createAccountSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      {
        code: "VALIDATION_ERROR",
        message: "Corps de requête invalide.",
        details: {
          issues: parsed.error.issues,
        },
      },
      400,
      auth.correlationId,
    );
  }

  const requiredPermission =
    parsed.data.accountType === "announcer" ? "announcers.create" : "users.create";

  if (!hasPermission(auth.admin.permissions, requiredPermission)) {
    return jsonError(
      {
        code: "FORBIDDEN",
        message: `Permission manquante : ${requiredPermission}`,
      },
      403,
      auth.correlationId,
    );
  }

  try {
    const result = await createProvisionedAccount({
      accountType: parsed.data.accountType,
      email: parsed.data.email,
      password: parsed.data.password,
      firstname: parsed.data.firstname,
      lastname: parsed.data.lastname,
      phoneNumber: parsed.data.phoneNumber,
      countryName: parsed.data.country.name,
      countryCode: parsed.data.country.code,
      birthDate: parsed.data.birthDate,
      birthdate: parsed.data.birthdate,
      credits: parsed.data.credits,
    });

    await logAudit({
      actorId: auth.admin.uid,
      actorRoles: auth.admin.roles,
      action: requiredPermission,
      resource: "platform_user",
      resourceId: result.uid,
      status: "success",
      correlationId: auth.correlationId,
      details: {
        accountType: result.accountType,
        email: result.email,
        roles: result.roles,
      },
    });

    return jsonSuccess(result, auth.correlationId, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";

    if (code === "ACCOUNT_EMAIL_ALREADY_EXISTS") {
      return jsonError(
        {
          code: "CONFLICT",
          message: "Un compte existe déjà avec cet email.",
        },
        409,
        auth.correlationId,
      );
    }

    if (code === "ACCOUNT_PHONE_ALREADY_EXISTS") {
      return jsonError(
        {
          code: "CONFLICT",
          message: "Ce numéro de téléphone est déjà utilisé.",
        },
        409,
        auth.correlationId,
      );
    }

    if (code === "ACCOUNT_PHONE_INVALID") {
      return jsonError(
        {
          code: "VALIDATION_ERROR",
          message: "Numéro de téléphone invalide. Utilisez un numéro gabonais valide.",
        },
        400,
        auth.correlationId,
      );
    }

    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: "Impossible de créer ce compte.",
      },
      500,
      auth.correlationId,
    );
  }
}
