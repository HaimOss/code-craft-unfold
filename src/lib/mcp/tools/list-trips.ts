import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult } from "../supabase";

export default defineTool({
  name: "list_trips",
  title: "List trips",
  description: "List the signed-in user's trips (id, name, destination, dates, status, budget).",
  inputSchema: {
    status: z.string().optional().describe("Optional trip status filter, e.g. 'Planning 📝'"),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 50)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("trips")
      .select("id,name,destination,start_date,end_date,base_currency,status,budget")
      .order("start_date", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { trips: data ?? [] },
    };
  },
});