import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTripsTool from "./tools/list-trips";
import getTripTool from "./tools/get-trip";
import createTripTool from "./tools/create-trip";
import addEventTool from "./tools/add-event";
import listChecklistTool from "./tools/list-checklist";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "wonderjourney-mcp",
  title: "WonderJourney",
  version: "0.1.0",
  instructions:
    "Tools for WonderJourney — a trip planner. Use `list_trips` to see the user's trips, `get_trip` for a trip's full itinerary and events, `create_trip` to start a new trip, `add_event` to add itinerary items, and `list_checklist` for packing/todo items. All tools act as the signed-in user; trips and events respect row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTripsTool, getTripTool, createTripTool, addEventTool, listChecklistTool],
});