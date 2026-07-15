import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult } from "../supabase";

export default defineTool({
  name: "list_checklist",
  title: "List trip checklist",
  description: "List checklist items for a trip.",
  inputSchema: {
    trip_id: z.string().uuid(),
    only_open: z.boolean().optional().describe("If true, return only incomplete items."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ trip_id, only_open }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("checklist_items")
      .select("id,text,category,priority,is_completed,due_date,assignee,sort_order")
      .eq("trip_id", trip_id)
      .order("sort_order", { ascending: true });
    if (only_open) q = q.eq("is_completed", false);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});