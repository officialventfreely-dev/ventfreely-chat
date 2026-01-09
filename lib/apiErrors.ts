
import { NextResponse } from "next/server";

export function json401() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export function json402() {
  return NextResponse.json({ error: "PAYWALL" }, { status: 402 });
}