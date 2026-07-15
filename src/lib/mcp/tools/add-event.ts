import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult } from "../supabase";

export default defineTool({
  name: "add_event",
  title: "Add event to trip",
  description: "Add an itinerary event (flight, hotel, activity, food, etc.) to a trip.",
  inputSchema: {
    trip_id: z.string().uuid(),
    date: z.string().describe("ISO date."),
    time: z.string().optional().describe("HH:MM"),
    end_time: z.string().optional(),
    category: z.string().describe("e.g. 'Activity 🎭', 'Food 🍽️', 'Flights ✈️'"),
    title: z.string().min(1),
    amount: z.number().optional(),
    currency: z.string().optional(),
    payment_method: z.string().optional().describe("Credit | Debit | Cash | Other"),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("events")
      .insert({
        trip_id: input.trip_id,
        user_id: ctx.getUserId()!,
        date: input.date,
        time: input.time ?? "09:00",
        end_time: input.end_time,
        category: input.category,
        title: input.title,
        amount: input.amount ?? 0,
        currency: input.currency ?? "USD",
        payment_method: input.payment_method ?? "Credit",
        details: {},
        notes: input.notes,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: `Added event ${data.id}` }],
      structuredContent: { event: data },
    };
  },
});