import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Compass } from "lucide-react";

type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? "");
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="card-surface p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold font-display mb-2">Authorization error</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";
  const redirectUri = details.client?.redirect_uris?.[0] ?? details.redirect_uri;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card-surface p-8 max-w-md w-full">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Compass className="h-8 w-8 text-accent" />
          <h1 className="text-2xl font-bold font-display">Connect to WonderJourney</h1>
        </div>
        <p className="text-foreground mb-2">
          <span className="font-semibold">{clientName}</span> wants to access your WonderJourney account.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Signed in as <span className="font-medium text-foreground">{userEmail}</span>
        </p>
        <div className="bg-secondary rounded-xl p-4 mb-6 text-sm space-y-2">
          <p className="font-medium">This will let {clientName}:</p>
          <ul className="list-disc ps-5 space-y-1 text-muted-foreground">
            <li>Read your trips, itinerary events, and checklists</li>
            <li>Create trips and add itinerary events on your behalf</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2">
            App permissions still apply — this doesn't bypass your account's data policies.
          </p>
          {redirectUri && (
            <p className="text-xs text-muted-foreground break-all pt-1">
              Redirect: <span className="font-mono">{redirectUri}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="btn-primary flex-1"
          >
            {busy ? "…" : "Approve"}
          </button>
        </div>
      </div>
    </main>
  );
}