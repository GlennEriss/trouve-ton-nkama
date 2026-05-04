import { jsonSuccess } from "@/lib/api/response";

export async function GET() {
  return jsonSuccess({
    status: "ok",
    service: "location-maison-admin",
    scope: "admin-api-v1",
    timestamp: new Date().toISOString(),
  });
}
