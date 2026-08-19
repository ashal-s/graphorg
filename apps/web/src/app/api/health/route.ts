import { NextResponse } from "next/server";

import type { ApiResult } from "@graphorg/types";

export async function GET(): Promise<
  NextResponse<ApiResult<{ status: "ok" }>>
> {
  return NextResponse.json({ ok: true, data: { status: "ok" } });
}
