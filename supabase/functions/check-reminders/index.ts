import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let notificationsCreated = 0;

    // 1. Trips starting tomorrow
    const { data: tripsTomorrow } = await supabase
      .from("trips")
      .select("id, name, user_id, destination")
      .eq("start_date", tomorrow);

    for (const trip of tripsTomorrow || []) {
      // Check if we already sent this notification
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", trip.user_id)
        .eq("trip_id", trip.id)
        .eq("type", "trip_tomorrow")
        .gte("created_at", today + "T00:00:00Z")
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("notifications").insert({
          user_id: trip.user_id,
          type: "trip_tomorrow",
          title: `הטיול "${trip.name}" מתחיל מחר! ✈️`,
          message: trip.destination
            ? `אל תשכח לארוז - יעד: ${trip.destination}`
            : "אל תשכח לארוז! בדוק שהכל מוכן.",
          trip_id: trip.id,
        });
        notificationsCreated++;
      }
    }

    // 2. Trips starting in a week
    const { data: tripsNextWeek } = await supabase
      .from("trips")
      .select("id, name, user_id, destination")
      .eq("start_date", nextWeek);

    for (const trip of tripsNextWeek || []) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", trip.user_id)
        .eq("trip_id", trip.id)
        .eq("type", "trip_week")
        .gte("created_at", today + "T00:00:00Z")
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("notifications").insert({
          user_id: trip.user_id,
          type: "trip_week",
          title: `עוד שבוע לטיול "${trip.name}" 📅`,
          message: trip.destination
            ? `הטיול ל${trip.destination} מתחיל בעוד שבוע. הגיע הזמן לסגור פרטים אחרונים!`
            : "הגיע הזמן לסגור פרטים אחרונים!",
          trip_id: trip.id,
        });
        notificationsCreated++;
      }
    }

    // 3. Checklist items due today
    const { data: dueItems } = await supabase
      .from("checklist_items")
      .select("id, text, user_id, trip_id, is_completed")
      .eq("due_date", today)
      .eq("is_completed", false);

    for (const item of dueItems || []) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", item.user_id)
        .eq("type", "checklist_reminder")
        .ilike("message", `%${item.text.substring(0, 30)}%`)
        .gte("created_at", today + "T00:00:00Z")
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("notifications").insert({
          user_id: item.user_id,
          type: "checklist_reminder",
          title: "משימה לביצוע היום ✅",
          message: item.text,
          trip_id: item.trip_id,
        });
        notificationsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notificationsCreated,
        checked_at: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
