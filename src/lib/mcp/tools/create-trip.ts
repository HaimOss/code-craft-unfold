import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult } from "../supabase";

export default defineTool({
  name: "create_trip",
  title: "Create trip",
  description: "Create a new trip for the signed-in user.",
  inputSchema: {
    name: z.string().min(1).describe("Trip name."),
    destination: z.string().optional(),
    start_date: z.string().describe("ISO date, e.g. 2026-05-10"),
    end_date: z.string().describe("ISO date, e.g. 2026-05-14"),
    base_currency: z.string().optional().describe("ISO currency, default USD"),
    status: z.string().optional().describe("Trip status, e.g. 'Planning 📝'"),
    budget: z.number().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("trips")
      .insert({
        user_id: ctx.getUserId()!,
        name: input.name,
        destination: input.destination,
        start_date: input.start_date,
        end_date: input.end_date,
        base_currency: input.base_currency ?? "USD",
        status: input.status ?? "Planning 📝",
        budget: input.budget,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: `Created trip ${data.id}` }],
      structuredContent: { trip: data },
    };
  },
});