import { NextRequest, NextResponse } from "next/server";

// Stub name availability checker. In production this would call a Secretary of State API.
// For now, returns "available" for any name not in a small known-taken list, with debounced UX support.
const KNOWN_TAKEN = new Set([
  "amazon llc", "google llc", "apple inc", "microsoft corporation",
  "divine financial group llc", "divine financial group inc",
  "facebook inc", "meta platforms inc",
]);

export async function POST(req: NextRequest) {
  try {
    const { name, state } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json({ valid: false, available: false, error: "Name must be at least 3 characters" });
    }

    const lower = name.trim().toLowerCase();
    const hasSuffix = /\b(llc|corp|corporation|inc|incorporated|ltd|limited|lp|llp|pllc)\b/.test(lower);
    if (!hasSuffix) {
      return NextResponse.json({ valid: false, available: false, error: "Name must end with LLC, Corp, Inc, or similar entity suffix" });
    }

    const available = !KNOWN_TAKEN.has(lower);
    const suggestion = available ? null : `${name.replace(/\b(llc|corp|inc)\b/i, "Group $&")}`;

    return NextResponse.json({
      valid: true,
      available,
      state: state || "DE",
      message: available ? `${name} is available in ${state || "Delaware"}` : `${name} is taken`,
      suggestion,
    });
  } catch (e: any) {
    return NextResponse.json({ valid: false, available: false, error: "Check failed" }, { status: 500 });
  }
}
