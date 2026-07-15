import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult } from "../supabase";

export default defineTool({
  name: "get_trip",
  title: "Get trip",
  description: "Fetch a single trip with all its events (itinerary).",
  inputSchema: {
    trip_id: z.string().uuid().describe("The trip's UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ trip_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const { data: trip, error: tErr } = await sb.from("trips").select("*").eq("id", trip_id).maybeSingle();
    if (tErr) return errorResult(tErr.message);
    if (!trip) return errorResult("Trip not found or access denied.");
    const { data: events, error: eErr } = await sb
      .from("events")
      .select("*")
      .eq("trip_id", trip_id)
      .order("sort_order", { ascending: true });
    if (eErr) return errorResult(eErr.message);
    const payload = { trip, events: events ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});