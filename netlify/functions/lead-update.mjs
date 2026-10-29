import { sign, esc } from "../lib/lead-core.mjs";
import { addPipedriveNote, postToCrm } from "../lib/integrations.mjs";

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const ROOF = { tin: "Tin / Colorbond", tile: "Tile", flat: "Flat or low pitch", other: "Something else / not sure" };
const STOREYS = { "1": "Single storey", "2": "Two storeys", "3": "Three or more" };
const CALL = { morning: "Morning (9 to 12)", afternoon: "Afternoon (12 to 5)", evening: "Early evening (5 to 7)" };
const PHASE = { single: "Single phase", three: "Three phase", unknown: "Not sure" };

// Answers asked on the thank-you page, added to the same deal
export async function handleLeadUpdate(req) {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let b;
  try { b = await req.json(); } catch { return json(400, { error: "Send the form as JSON." }); }
  const ref = String(b.ref || "");
  if (!ref || b.token !== sign(ref, process.env.LEAD_TOKEN_SECRET)) return json(403, { error: "This link has expired. Your enquiry is still with us." });

  const rows = [
    ROOF[b.roof] && ["Roof", ROOF[b.roof]],
    STOREYS[b.storeys] && ["Storeys", STOREYS[b.storeys]],
    PHASE[b.phase] && ["Power supply", PHASE[b.phase]],
    CALL[b.callTime] && ["Best time to call", CALL[b.callTime]],
    b.notes && ["Notes", String(b.notes).slice(0, 500)]
  ].filter(Boolean);
  if (!rows.length) return json(422, { error: "Answer at least one question." });

  const html = "<b>Extra details from the homeowner</b><br>" + rows.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join("<br>");
  const results = {};
  try { results.pipedrive = /^[0-9a-f-]{36}$/i.test(ref) ? await addPipedriveNote(ref, html) : { skipped: "no Pipedrive lead" }; } catch (e) { results.pipedrive = { error: e.message }; }
  try { results.crm = await postToCrm("lead.updated", { ref, details: Object.fromEntries(rows) }); } catch (e) { results.crm = { error: e.message }; }
  return json(200, { ok: true });
}

export default handleLeadUpdate;
export const config = { path: "/api/lead-update" };
