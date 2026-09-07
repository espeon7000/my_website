import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const redis = Redis.fromEnv();
  await redis.set("keepalive", new Date().toISOString());

  return NextResponse.json({ ok: true });
}
