// Everything brand-specific lives here. Change the name, domain and contact
// details once and rebuild; every page picks them up.
export const brand = {
  name: "SolarSelect",
  short: "SolarSelect",
  domain: "https://solarselect.au", // used for canonical links and the sitemap; change if you register a different domain
  email: "hello@solarselect.au",
  phone: "1300 000 000",
  abn: "00 000 000 000",              // the ABN of the entity that operates the site
  legalName: "Ghost Sales Agency Pty Ltd", // shown in the privacy policy and footer; confirm this is the operating entity
  tagline: "See your solar and battery rebate, then get one quote from an accredited local installer.",
  metaPixelId: "",                    // e.g. "1234567890"; leave empty to turn the pixel off
  googleTagId: ""                     // e.g. "G-XXXXXXX" or "AW-XXXXXXX"
};

// State pages. Only figures that were checked against official or
// industry sources go here; anything uncertain is described, not quantified.
export const stateInfo = {
  NSW: {
    slug: "nsw", city: "Sydney", note: "Most of NSW is STC zone 3. Far western NSW can sit in a higher zone.",
    extras: [
      { title: "VPP incentive for batteries", body: "NSW pays an incentive under its Peak Demand Reduction Scheme when a battery is connected to a virtual power plant. The amount depends on the battery and the VPP provider, so your installer confirms it on the quote." }
    ]
  },
  VIC: {
    slug: "vic", city: "Melbourne", note: "Victoria is STC zone 4, so solar earns slightly fewer certificates per kW than in the northern states.",
    extras: [
      { title: "Solar Homes panel rebate: up to $1,400", body: "Solar Victoria pays up to $1,400 towards solar panels, with an optional interest-free loan of the same amount repaid over four years. From 1 July 2026 the combined household income cap is $150,000. The address must not have had an earlier Solar Homes panel or battery rebate." }
    ]
  },
  QLD: {
    slug: "qld", city: "Brisbane", note: "South-east Queensland is STC zone 3. Parts of central and northern Queensland can sit in zone 2.",
    extras: [
      { title: "Federal rebates apply", body: "Queensland has no state-wide solar or battery rebate at present. Homeowners use the federal STC rebate and the Cheaper Home Batteries rebate." }
    ]
  },
  WA: {
    slug: "wa", city: "Perth", note: "Perth and the south-west are STC zone 3. The Pilbara and Kimberley are zone 1.",
    extras: [
      { title: "WA Residential Battery Scheme", body: "Synergy customers get $130 per kWh up to $1,300. Horizon Power customers in regional WA get $380 per kWh up to $3,800. The battery must be 5 kWh or more and join a virtual power plant. No-interest loans are also available, subject to a credit check." }
    ]
  },
  SA: {
    slug: "sa", city: "Adelaide", note: "Adelaide and most of settled South Australia are STC zone 3.",
    extras: [
      { title: "Federal rebates and VPP offers", body: "South Australia has no state-wide upfront rebate at present. The federal rebates apply, and several retailers run virtual power plant offers that pay battery owners." }
    ]
  },
  TAS: {
    slug: "tas", city: "Hobart", note: "Tasmania is STC zone 4.",
    extras: [
      { title: "Federal rebates apply", body: "Tasmania has no state-wide solar or battery rebate at present. Homeowners use the federal STC and battery rebates." }
    ]
  },
  ACT: {
    slug: "act", city: "Canberra", note: "Canberra is STC zone 3.",
    extras: [
      { title: "ACT support programs", body: "The ACT runs energy support programs for eligible concession holders. Eligibility and amounts change, so your installer checks what applies before quoting." }
    ]
  },
  NT: {
    slug: "nt", city: "Darwin", note: "Darwin is STC zone 2. Alice Springs is zone 1, which earns the most certificates per kW in Australia.",
    extras: [
      { title: "Federal rebates apply", body: "The federal STC and battery rebates apply across the Territory." }
    ]
  }
};

// Average daily output per kW of panels (kWh), used by the savings calculator.
export const yieldPerKw = { NSW: 3.9, VIC: 3.6, QLD: 4.2, WA: 4.4, SA: 4.2, TAS: 3.5, ACT: 4.3, NT: 4.4 };
