import { validate, grade, routeFor, channelOf, dealTitle, noteHtml, sign } from "../lib/lead-core.mjs";
import { pushToPipedrive, postToCrm, sendConfirmation, sendMetaLead } from "../lib/integrations.mjs";

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function handleLead(req) {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Send the form as JSON." }); }

  // Bots fill the hidden field or submit faster than a person can read the quiz
  if (body.hp || (Number(body.elapsedMs) > 0 && Number(body.elapsedMs) < 4000)) return json(200, { ok: true });

  const { lead, errors, ok } = validate(body);
  if (!ok) return json(422, { error: "Some details need fixing.", fields: errors });

  const meta = {
    grade: grade(lead),
    channel: channelOf(lead.attribution),
    region: routeFor(lead.postcode),
    state: body.state || "",
    title: dealTitle(lead)
  };
  meta.note = noteHtml(lead, meta);

  const sendRenters = process.env.INCLUDE_RENTERS === "true";
  const toRetailer = meta.grade !== "R" || sendRenters;
  const results = {};
  const run = async (name, fn) => {
    try { results[name] = await fn(); } catch (e) { results[name] = { error: e.message }; console.error(name, e.message); }
  };

  await run("pipedrive", () => (toRetailer ? pushToPipedrive(lead, meta) : { skipped: "renter" }));
  const leadId = results.pipedrive?.leadId || null;

  await Promise.all([
    run("crm", () => postToCrm("lead.created", { lead, grade: meta.grade, channel: meta.channel, region: meta.region, title: meta.title, pipedriveLeadId: leadId })),
    run("email", () => (toRetailer ? sendConfirmation(lead, meta) : { skipped: "renter" })),
    // Only send real prospects to Meta so the ad algorithm learns from them
    run("meta", () => (meta.grade !== "R" ? sendMetaLead(lead, meta, req) : { skipped: "renter" }))
  ]);

  // If nothing at all stored the lead, tell the browser so the person can call instead
  // Renters are deliberately not stored in Pipedrive; every other lead must land somewhere
  const stored = leadId || results.crm?.ok || (meta.grade === "R" && !sendRenters);
  if (!stored) {
    console.error("lead not stored", JSON.stringify({ pipedrive: results.pipedrive, crm: results.crm }));
    return json(502, { error: "We couldn't save your details just now. Please try again in a minute, or call us.", results });
  }

  const ref = leadId || lead.eventId;
  return json(200, {
    ok: true,
    grade: meta.grade,
    ref,
    token: sign(ref, process.env.LEAD_TOKEN_SECRET),
    renter: meta.grade === "R",
    ...(process.env.DEBUG_LEADS === "true" ? { results } : {})
  });
}

export default handleLead;
export const config = { path: "/api/lead" };
