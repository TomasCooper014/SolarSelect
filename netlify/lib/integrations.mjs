import { e164, esc, sha256, PRODUCTS } from "./lead-core.mjs";
import pdConfig from "../../config/pipedrive.mjs";

const env = (k) => (typeof process !== "undefined" ? process.env[k] : undefined) || "";

async function pd(path, { method = "GET", body } = {}) {
  const token = env("PIPEDRIVE_API_TOKEN");
  const base = env("PIPEDRIVE_BASE_URL") || "https://api.pipedrive.com/v1";
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${base}${path}${sep}api_token=${encodeURIComponent(token)}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(`Pipedrive ${method} ${path.split("?")[0]} failed: ${res.status} ${json.error || ""}`);
  return json.data;
}


// Custom field values for the account's existing fields (config/pipedrive.mjs)
export function leadFields(lead, meta) {
  const f = pdConfig.fields, o = pdConfig.options, a = lead.attribution;
  const out = {};
  const set = (key, v) => { if (key && v !== undefined && v !== null && v !== "") out[key] = v; };
  set(f.siteAddress, `${lead.street}, ${lead.suburb} ${meta.state || ""} ${lead.postcode}, Australia`.replace(/\s+/g, " "));
  set(f.postCode, lead.postcode);
  if (lead.ownership !== "renter") set(f.homeOwner, o.homeOwnerOwn);
  set(f.billSize, lead.bill); // lt300 / 300-500 / 500-750 / gt750, matching existing leads
  set(f.campaign, a.utm_campaign);
  set(f.adSource, meta.channel);
  set(f.landingPage, a.landing || "/");
  set(f.adSetName, a.utm_term);
  set(f.adName, a.utm_content);
  set(f.leadSource, meta.channel === "Meta Ads" ? o.leadSourceFacebook : o.leadSourceWebsite);
  return out;
}

export async function pushToPipedrive(lead, meta) {
  if (!env("PIPEDRIVE_API_TOKEN")) return { skipped: "PIPEDRIVE_API_TOKEN not set" };
  const phone = lead.mobile;

  // Repeat enquiries attach to the existing person instead of creating a duplicate
  let personId = null;
  let repeat = false;
  const found = await pd(`/persons/search?term=${encodeURIComponent(phone)}&fields=phone&exact_match=true&limit=1`);
  if (found?.items?.length) { personId = found.items[0].item.id; repeat = true; }
  if (!personId) {
    const byEmail = await pd(`/persons/search?term=${encodeURIComponent(lead.email)}&fields=email&exact_match=true&limit=1`);
    if (byEmail?.items?.length) { personId = byEmail.items[0].item.id; repeat = true; }
  }
  const owner = meta.region.pipedrive?.ownerId || (env("PIPEDRIVE_OWNER_ID") ? Number(env("PIPEDRIVE_OWNER_ID")) : pdConfig.defaultOwnerId);
  if (!personId) {
    const person = await pd("/persons", {
      method: "POST",
      body: {
        name: `${lead.firstName} ${lead.lastName}`,
        email: [{ value: lead.email, primary: true, label: "home" }],
        phone: [{ value: phone, primary: true, label: "mobile" }],
        ...(owner ? { owner_id: owner } : {})
      }
    });
    personId = person.id;
  }

  // A lead in the Leads Inbox, same as WHY Solar's; the setter converts it to a deal once booked
  const created = await pd("/leads", {
    method: "POST",
    body: {
      title: meta.title,
      person_id: personId,
      owner_id: owner,
      visible_to: "3",
      ...leadFields(lead, meta)
    }
  });

  await pd("/notes", { method: "POST", body: { lead_id: created.id, content: (repeat ? "<b>Repeat enquiry from an existing contact.</b><br>" : "") + meta.note } });
  return { leadId: created.id, personId, repeat };
}

export async function addPipedriveNote(leadId, html) {
  if (!env("PIPEDRIVE_API_TOKEN") || !leadId) return { skipped: true };
  await pd("/notes", { method: "POST", body: { lead_id: leadId, content: html } });
  return { ok: true };
}

// Your own CRM: a signed JSON POST it can verify with the shared secret
export async function postToCrm(type, payload) {
  const url = env("CRM_WEBHOOK_URL");
  if (!url) return { skipped: "CRM_WEBHOOK_URL not set" };
  const body = JSON.stringify({ type, sentAt: new Date().toISOString(), ...payload });
  const { createHmac } = await import("node:crypto");
  const sig = createHmac("sha256", env("CRM_WEBHOOK_SECRET") || "").update(body).digest("hex");
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-signature-sha256": sig }, body });
  if (!res.ok) throw new Error(`CRM webhook failed: ${res.status}`);
  return { ok: true };
}

// The "expect our call" email the homeowner gets the moment they submit
export async function sendConfirmation(lead, meta) {
  const key = env("RESEND_API_KEY");
  if (!key) return { skipped: "RESEND_API_KEY not set" };
  const brand = env("BRAND_NAME") || "SolarSelect";
  const from = env("EMAIL_FROM") || `${brand} <hello@example.com>`;
  const lines = lead.estimateLines.map((l) => `<tr><td style="padding:6px 0">${esc(l.label)}</td><td style="padding:6px 0;text-align:right;font-family:monospace">$${Math.round(l.amount).toLocaleString("en-AU")}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#14262c;line-height:1.5">
  <h2 style="margin:0 0 12px">Thanks ${esc(lead.firstName)}, your rebate estimate is in</h2>
  <p>We've matched your enquiry to one accredited installer that covers ${esc(lead.suburb)}. They'll call you from an Australian number, usually within one business day, to confirm a few details and book a free, no-obligation quote.</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #cfd8d6;border-bottom:1px solid #cfd8d6;margin:16px 0">${lines}
  <tr><td style="padding:8px 0;font-weight:bold">Estimated rebates</td><td style="padding:8px 0;text-align:right;font-weight:bold;font-family:monospace">$${Math.round(lead.estimateTotal).toLocaleString("en-AU")}</td></tr></table>
  <p style="font-size:13px;color:#4d6166">This is an estimate for a typical ${lead.product === "battery" ? "battery" : lead.product === "solar" ? "solar" : "solar and battery"} system on your bill. Your installer confirms the exact rebate after looking at your roof and switchboard.</p>
  <p>On the call they'll go through:</p>
  <ul><li>The right system size for your bill</li><li>Your rebates and what they come off</li><li>Whether a battery makes sense for you now</li></ul>
  <p>Questions before then? Reply to this email.</p>
  <p>${esc(brand)}</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [lead.email], subject: "Your rebate estimate and what happens next", html, reply_to: env("EMAIL_REPLY_TO") || undefined })
  });
  if (!res.ok) throw new Error(`Email failed: ${res.status}`);
  return { ok: true };
}

// Meta Conversions API, deduplicated against the browser pixel by event_id
export async function sendMetaLead(lead, meta, req) {
  const pixel = env("META_PIXEL_ID");
  const token = env("META_CAPI_TOKEN");
  if (!pixel || !token) return { skipped: "META_PIXEL_ID or META_CAPI_TOKEN not set" };
  const a = lead.attribution;
  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: lead.eventId,
    action_source: "website",
    event_source_url: lead.pageUrl || undefined,
    user_data: {
      em: [sha256(lead.email)],
      ph: [sha256(e164(lead.mobile).replace("+", ""))],
      fn: [sha256(lead.firstName)],
      ln: [sha256(lead.lastName)],
      ct: [sha256(lead.suburb.replace(/\s+/g, ""))],
      zp: [sha256(lead.postcode)],
      st: [sha256((meta.state || "").toLowerCase())],
      country: [sha256("au")],
      client_ip_address: req?.headers?.get?.("x-nf-client-connection-ip") || req?.headers?.get?.("x-forwarded-for")?.split(",")[0] || undefined,
      client_user_agent: req?.headers?.get?.("user-agent") || undefined,
      fbp: a.fbp || undefined,
      fbc: a.fbc || undefined
    },
    custom_data: { lead_grade: meta.grade, product: lead.product, region: meta.region.id, value: 0, currency: "AUD" }
  };
  const body = { data: [event], ...(env("META_TEST_EVENT_CODE") ? { test_event_code: env("META_TEST_EVENT_CODE") } : {}) };
  const res = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Meta CAPI failed: ${res.status}`);
  return { ok: true };
}
