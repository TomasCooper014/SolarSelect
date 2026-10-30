import crypto from "node:crypto";
import routing from "../../config/routing.mjs";

export const PRODUCTS = { solar: "Solar Panels", battery: "Add a Battery", both: "Solar & Battery" };
export const OWNERSHIP = { "owner-occupier": "Owns and lives in it", landlord: "Owns it, rented out", renter: "Renting", business: "Business premises" };
// Same values as the Electricity Bill Size field already holds in Pipedrive
export const BILLS = { lt300: "Under $300", "300-500": "$300 to $500", "500-750": "$500 to $750", gt750: "Over $750" };
export const TIMEFRAMES = { asap: "As soon as possible", "1-3m": "In 1 to 3 months", "3-6m": "In 3 to 6 months", researching: "Just researching" };
export const EXISTING = { none: "No solar yet", "has-solar": "Has solar already" };

const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com"]);

export function cleanMobile(raw) {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  let m = d;
  if (m.startsWith("+61")) m = "0" + m.slice(3);
  else if (m.startsWith("61") && m.length === 11) m = "0" + m.slice(2);
  return /^04\d{8}$/.test(m) ? m : null;
}

export function e164(mobile) {
  return "+61" + mobile.slice(1);
}

export function validate(body) {
  const errors = {};
  const b = body || {};
  const str = (v, max = 120) => String(v ?? "").trim().slice(0, max);
  const lead = {
    firstName: str(b.firstName, 60),
    lastName: str(b.lastName, 60),
    email: str(b.email, 160).toLowerCase(),
    mobile: cleanMobile(b.mobile),
    street: str(b.street, 160),
    suburb: str(b.suburb, 80),
    postcode: str(b.postcode, 4),
    product: str(b.product, 20),
    ownership: str(b.ownership, 20),
    bill: str(b.bill, 20),
    timeframe: str(b.timeframe, 20),
    existing: str(b.existing, 20),
    waRetailer: str(b.waRetailer, 20),
    consent: b.consent === true || b.consent === "true" || b.consent === "on",
    estimateTotal: Number(b.estimateTotal) || 0,
    estimateLines: Array.isArray(b.estimateLines) ? b.estimateLines.slice(0, 6).map((l) => ({ label: str(l.label, 80), amount: Number(l.amount) || 0 })) : [],
    attribution: sanitiseAttribution(b.attribution),
    eventId: str(b.eventId, 64) || crypto.randomUUID(),
    pageUrl: str(b.pageUrl, 300)
  };

  if (!lead.firstName) errors.firstName = "Enter your first name.";
  if (!lead.lastName) errors.lastName = "Enter your last name.";
  if (!lead.mobile) errors.mobile = "Enter an Australian mobile number, like 0412 345 678.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) errors.email = "Enter a valid email address.";
  else if (DISPOSABLE.has(lead.email.split("@")[1])) errors.email = "Use an email address you check, so your quote reaches you.";
  if (!/^\d{4}$/.test(lead.postcode)) errors.postcode = "Enter a 4-digit postcode.";
  if (!lead.suburb) errors.suburb = "Enter your suburb.";
  if (!lead.street) errors.street = "Enter your street address.";
  if (!PRODUCTS[lead.product]) errors.product = "Choose what you want to install.";
  if (!OWNERSHIP[lead.ownership]) errors.ownership = "Tell us whether you own the home.";
  if (!BILLS[lead.bill]) errors.bill = "Choose your quarterly bill.";
  if (!TIMEFRAMES[lead.timeframe]) errors.timeframe = "Choose when you want to install.";
  if (!lead.consent) errors.consent = "Tick the box so we can pass your details to our installation partner.";

  return { lead, errors, ok: Object.keys(errors).length === 0 };
}

function sanitiseAttribution(a) {
  const src = a && typeof a === "object" ? a : {};
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "aff", "referrer", "landing", "fbp", "fbc", "firstSeen"];
  const out = {};
  for (const k of keys) if (src[k]) out[k] = String(src[k]).slice(0, 300);
  return out;
}

// One plain label per lead so cost per lead can be split by channel in the CRM
export function channelOf(a = {}) {
  const src = (a.utm_source || "").toLowerCase();
  const med = (a.utm_medium || "").toLowerCase();
  const paid = /cpc|ppc|paid|ads?$|display|social-paid|paid-social/.test(med);
  // Affiliates get links ending ?aff=theirname. Other sites add their own ?ref=, which is ignored.
  if (a.aff && /^[a-z0-9_-]{2,40}$/i.test(a.aff)) return "Affiliate: " + a.aff;
  if (a.gclid || (/google/.test(src) && paid)) return "Google Ads";
  if (a.fbclid && !src) return "Meta Ads";
  if (/facebook|instagram|meta|fb|ig/.test(src)) return paid || a.fbclid ? "Meta Ads" : "Organic social";
  if (src) return (paid ? "Paid: " : "Campaign: ") + src;
  const ref = (a.referrer || "").toLowerCase();
  if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(ref)) return "Organic search";
  if (/facebook\.|instagram\.|t\.co|linkedin\./.test(ref)) return "Organic social";
  if (ref) return "Referral: " + safeHost(ref);
  return "Direct";
}

function safeHost(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u.slice(0, 60); }
}

// A = ready to buy, B = worth calling, C = early or small, R = renter (not sent to retailers)
export function grade(lead) {
  if (lead.ownership === "renter") return "R";
  const bigBill = lead.bill === "500-750" || lead.bill === "gt750";
  const midBill = lead.bill === "300-500" || bigBill;
  const soon = lead.timeframe === "asap" || lead.timeframe === "1-3m";
  if (lead.ownership === "landlord" || lead.ownership === "business") return soon ? "B" : "C";
  if (bigBill && soon) return "A";
  if ((midBill && lead.timeframe !== "researching") || soon) return "B";
  return "C";
}

export function routeFor(postcode) {
  const n = parseInt(postcode, 10);
  for (const r of routing.regions) {
    for (const range of r.postcodes) {
      const [lo, hi] = range.split("-").map((x) => parseInt(x, 10));
      if (n >= lo && n <= (hi ?? lo)) return r;
    }
  }
  return routing.fallback;
}

export function dealTitle(lead) {
  // Same shape as the WHY Solar deals already in Pipedrive
  return `${lead.firstName} ${lead.lastName} — ${PRODUCTS[lead.product]} — ${lead.suburb} ${lead.postcode}`;
}

export function noteHtml(lead, extra) {
  const rows = [
    ["Grade", extra.grade],
    ["Channel", extra.channel],
    ["Region", `${extra.region.name}${extra.region.retailer ? " (" + extra.region.retailer + ")" : ""}`],
    ["Product", PRODUCTS[lead.product]],
    ["Ownership", OWNERSHIP[lead.ownership]],
    ["Quarterly bill", BILLS[lead.bill]],
    ["Timeframe", TIMEFRAMES[lead.timeframe]],
    ["Existing solar", EXISTING[lead.existing] || "Not asked"],
    lead.waRetailer ? ["WA retailer", lead.waRetailer] : null,
    ["Address", `${lead.street}, ${lead.suburb} ${lead.postcode}`],
    ["Rebate estimate shown", "$" + Math.round(lead.estimateTotal).toLocaleString("en-AU")],
    ["Landing page", lead.attribution.landing || lead.pageUrl],
    ["Campaign", [lead.attribution.utm_source, lead.attribution.utm_medium, lead.attribution.utm_campaign, lead.attribution.utm_content].filter(Boolean).join(" / ") || "None"]
  ].filter(Boolean);
  return "<b>Website enquiry</b><br>" + rows.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join("<br>");
}

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function sign(value, secret) {
  return crypto.createHmac("sha256", secret || "dev-secret").update(String(value)).digest("hex").slice(0, 32);
}

export function sha256(v) {
  return crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");
}
