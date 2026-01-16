import { NextResponse } from "next/server";

/**
 * FREE-FIRST MODE
 * - We never return 402 / PAYWALL.
 * - Access control is handled by FREE_MODE in lib/access.ts (always allow).
 * - Frontend should never see a "you must pay" signal.
 */

export function json401() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/**
 * Formerly: returned 402 PAYWALL.
 * Now: return 200 with a neutral payload, so nothing gets blocked.
 *
 * NOTE:
 * - We intentionally do NOT signal any paywall state.
 * - This keeps UI/UX identical while removing monetization friction.
 */
export function json402() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
