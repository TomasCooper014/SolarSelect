// Runs the lead functions against fake Pipedrive, CRM, email and Meta endpoints.
// node --test test/
import test from "node:test";
import assert from "node:assert/strict";

process.env.PIPEDRIVE_API_TOKEN = "pd-test";
process.env.CRM_WEBHOOK_URL = "https://crm.example/hook";
process.env.CRM_WEBHOOK_SECRET = "s3cret";
process.env.RESEND_API_KEY = "re-test";
process.env.META_PIXEL_ID = "123";
process.env.META_CAPI_TOKEN = "meta-test";
process.env.LEAD_TOKEN_SECRET = "tok";

const calls = [];
let existingPhone = false;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const body = opts.body ? JSON.parse(opts.body) : null;
  calls.push({ url: u, method: opts.method || "GET", body, headers: opts.headers });
  const ok = (data) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
  if (u.includes("/persons/search")) return ok({ items: existingPhone && u.includes("fields=phone") ? [{ item: { id: 77 } }] : [] });
  if (u.includes("/persons")) return ok({ id: 11 });
  if (u.includes("/leads")) return ok({ id: "8fcf3220-d36e-11f1-9815-973d86a92746" });
  if (u.includes("/notes")) return ok({ id: 9 });
  return new Response("{}", { status: 200 });
};

const { handleLead } = await import("../netlify/functions/lead.mjs");
const { handleLeadUpdate } = await import("../netlify/functions/lead-update.mjs");
const { channelOf, grade, routeFor, cleanMobile } = await import("../netlify/lib/lead-core.mjs");

const base = {
  state: "QLD",
  firstName: "Thi", lastName: "Nguyen", email: "thi@example.com.au", mobile: "0412 345 678",
  street: "12 Banksia St", suburb: "Carindale", postcode: "4152", product: "both", ownership: "owner-occupier",
  bill: "500-750", timeframe: "1-3m", existing: "none", consent: true, elapsedMs: 40000,
  estimateTotal: 6539, estimateLines: [{ label: "Federal solar rebate (STCs)", amount: 2405 }],
  attribution: { utm_source: "facebook", utm_medium: "paid-social", utm_campaign: "qld-rebate", fbclid: "abc" },
  eventId: "evt-1", pageUrl: "https://x/quote/qld/"
};
const post = (path, body) => new Request("https://site.test" + path, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

const LEAD = "8fcf3220-d36e-11f1-9815-973d86a92746";
test("a good lead lands in the Leads Inbox like WHY Solar's", async () => {
  calls.length = 0;
  const res = await handleLead(post("/api/lead", base));
  const out = await res.json();
  assert.equal(res.status, 200);
  assert.equal(out.grade, "A");
  assert.equal(out.ref, LEAD);
  assert.ok(!calls.some((c) => c.url.includes("/deals")));
  const l = calls.find((c) => c.url.includes("/leads")).body;
  assert.equal(l.title, "Thi Nguyen — Solar & Battery — Carindale 4152");
  assert.equal(l.owner_id, 24411857); // Sarina
  assert.equal(l.ce86ffc1ca697b9d523f38f0f5f8e48af5d013b4, "4152");
  assert.equal(l.c3c8000e0c884d67b7ec64102cd1c107203d2c64, "12 Banksia St, Carindale QLD 4152, Australia");
  assert.equal(l["476331081e7189578c6f45eaa2381786d93d3b54"], 163);
  assert.equal(l.dc92cddacb32148e1a4cb8d155e3e47d2aa77365, "500-750");
  assert.equal(l["31fbb0788838940c7b0781ddd8d772102ba433b2"], "Meta Ads");
  assert.equal(l["40acdaf1f71366186f6b66df438b049224afd745"], 47);
  assert.equal(l["090a33b5ed168933692e2e22d4fd943061b5cd8d"], "qld-rebate");
  const note = calls.find((c) => c.url.includes("/notes")).body;
  assert.equal(note.lead_id, LEAD);
  assert.ok(note.content.includes("Region:</b> South-east Queensland (Retailer A)"));
  const crm = calls.find((c) => c.url.startsWith("https://crm.example"));
  assert.ok(crm.headers["x-signature-sha256"].length === 64);
  assert.ok(calls.some((c) => c.url.includes("api.resend.com")));
  const meta = calls.find((c) => c.url.includes("graph.facebook.com"));
  assert.equal(meta.body.data[0].event_id, "evt-1");
  assert.match(meta.body.data[0].user_data.em[0], /^[a-f0-9]{64}$/);
});

test("repeat enquiries reuse the existing person", async () => {
  calls.length = 0; existingPhone = true;
  await handleLead(post("/api/lead", base));
  existingPhone = false;
  assert.ok(!calls.some((c) => c.url.endsWith("/persons?api_token=pd-test") && c.method === "POST"));
  assert.equal(calls.find((c) => c.url.includes("/leads")).body.person_id, 77);
});

test("renters are not sent to Pipedrive, email or Meta", async () => {
  calls.length = 0;
  const res = await handleLead(post("/api/lead", { ...base, ownership: "renter" }));
  const out = await res.json();
  assert.equal(out.renter, true);
  assert.ok(!calls.some((c) => c.url.includes("pipedrive") || c.url.includes("resend") || c.url.includes("facebook")));
  assert.ok(calls.some((c) => c.url.startsWith("https://crm.example")));
});

test("bad details come back with a message per field", async () => {
  const res = await handleLead(post("/api/lead", { ...base, mobile: "12345", email: "nope", consent: false }));
  const out = await res.json();
  assert.equal(res.status, 422);
  assert.ok(out.fields.mobile && out.fields.email && out.fields.consent);
});

test("non-Meta leads get Lead Source = Website", async () => {
  calls.length = 0;
  await handleLead(post("/api/lead", { ...base, attribution: { gclid: "g1", utm_campaign: "qld-search" } }));
  const l = calls.find((c) => c.url.includes("/leads")).body;
  assert.equal(l["40acdaf1f71366186f6b66df438b049224afd745"], 60);
  assert.equal(l["31fbb0788838940c7b0781ddd8d772102ba433b2"], "Google Ads");
});

test("a Pipedrive failure shows an error instead of a thank-you", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => String(url).includes("/leads") ? new Response(JSON.stringify({ success: false, error: "bad field" }), { status: 400 }) : realFetch(url, opts);
  const crmUrl = process.env.CRM_WEBHOOK_URL; delete process.env.CRM_WEBHOOK_URL;
  const res = await handleLead(post("/api/lead", base));
  process.env.CRM_WEBHOOK_URL = crmUrl; globalThis.fetch = realFetch;
  assert.equal(res.status, 502);
});

test("bots are dropped quietly", async () => {
  calls.length = 0;
  const res = await handleLead(post("/api/lead", { ...base, hp: "http://spam" }));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test("follow-up answers need the signed token", async () => {
  const first = await (await handleLead(post("/api/lead", base))).json();
  const bad = await handleLeadUpdate(post("/api/lead-update", { ref: first.ref, token: "wrong", roof: "tin" }));
  assert.equal(bad.status, 403);
  calls.length = 0;
  const good = await handleLeadUpdate(post("/api/lead-update", { ref: first.ref, token: first.token, roof: "tin", storeys: "2", callTime: "evening" }));
  assert.equal(good.status, 200);
  assert.equal(calls.find((c) => c.url.includes("/notes")).body.lead_id, LEAD);
});

test("helpers", () => {
  assert.equal(cleanMobile("+61 412 345 678"), "0412345678");
  assert.equal(cleanMobile("02 9999 9999"), null);
  assert.equal(channelOf({ gclid: "x" }), "Google Ads");
  assert.equal(channelOf({ referrer: "https://www.google.com/" }), "Organic search");
  assert.equal(channelOf({ aff: "sunnysideblog" }), "Affiliate: sunnysideblog");
  assert.equal(channelOf({ ref: "d64a0095-5517-4738-ac69-2fc955faf899" }), "Direct");
  assert.equal(channelOf({}), "Direct");
  assert.equal(grade({ ownership: "owner-occupier", bill: "lt300", timeframe: "researching" }), "C");
  assert.equal(routeFor("3000").id, "unassigned");
});
