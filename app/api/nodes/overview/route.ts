import { NextResponse } from "next/server";
import { configuredNodes } from "@/lib/nodes";
import { fetchNodeSummary } from "@/lib/nodeSummary";
import { sessionToken } from "@/lib/session";

// The "All nodes" overview: every node in ARGUS_NODES asked in parallel,
// server-side, with the session token attached the same way the
// /api/argus proxy does it. A dead node costs at most NODE_TIMEOUT_MS
// and comes back as an offline entry, so one bad node never blanks the
// page.

export const dynamic = "force-dynamic";

export async function GET() {
  const token = await sessionToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const nodes = await Promise.all(
    configuredNodes().map((node) => fetchNodeSummary(node, token)),
  );
  return NextResponse.json({ nodes });
}
