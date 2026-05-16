import { NextResponse } from "next/server";

import { getDynamicTagNamesServer } from "@/lib/tags/dynamic-tags.server";

export async function GET() {
  const tagNames = await getDynamicTagNamesServer();
  return NextResponse.json({
    success: true,
    tags: tagNames,
  });
}
