# The Solar Standard

A rebate-quiz lead funnel in the style of WHY Solar: state rebate pages, calculators and guides for
Google, state landing pages for Meta and Google ads, and a quiz that sends each lead to Pipedrive
and your own CRM within seconds.

Brand, domain and contact details live in `config/site.mjs`. Change them there and rebuild.

## What's in it

| Part | Where |
|---|---|
| Rebate quiz (product, postcode, ownership, bill, existing solar, WA retailer, timeframe) | `src/assets/site.js` |
| Rebate maths (STCs, zones, battery tiers, VIC and WA top-ups) | `src/assets/rebates.js` |
| Pages: home, quiz, 8 ad landing pages, 8 state rebate pages, 3 calculators, 4 guides, legal | `build.mjs`, `src/guides.mjs` |
| Brand, contact details, state copy | `config/site.mjs` |
| Which retailer gets which postcodes | `config/routing.mjs` |
| Pipedrive lead owner, field keys and option IDs | `config/pipedrive.mjs` |
| Lead intake: checks, grading, Pipedrive, CRM webhook, email, Meta CAPI | `netlify/functions/lead.mjs`, `netlify/lib/` |
| Thank-you page follow-up (roof, storeys, phase, call time) | `netlify/functions/lead-update.mjs` |

## Deploy on Netlify

1. Create a new GitHub repo and push this folder to it.
2. In Netlify: **Add new site → Import from Git**, pick the repo. The build settings come from
   `netlify.toml` (it runs the tests, then builds into `dist/`).
3. Add the environment variables from `.env.example` under **Site configuration → Environment
   variables**. Start with `PIPEDRIVE_API_TOKEN` and `LEAD_TOKEN_SECRET`; everything else can follow. Use **Tomas Cooper's** API token (Pipedrive > Settings > Personal preferences > API), so website leads show Tomas as the creator.
4. Point your domain at the site and update `brand.domain` in `config/site.mjs`.

## What happens to a lead

1. The browser checks the form, then posts to `/api/lead`.
2. The server checks it again, drops bots (hidden field, submitted too fast) and fake mobiles and
   emails, and grades it:
   - **A**: owner occupier, bill $600+ a quarter, installing within 3 months
   - **B**: worth calling (mid bill or within 6 months; landlords and businesses who are ready)
   - **C**: researching or small bill
   - **R**: renter. Renters are stopped in the quiz with an explanation, so this only catches direct posts.
3. It picks the region from `config/routing.mjs` by postcode.
4. **Pipedrive**: finds the person by mobile or email (repeat enquiries attach to the same person),
   creates a **lead in the Leads Inbox** owned by Sarina, titled `First Last — Add a Battery — Suburb 4152`
   like WHY Solar's, fills Site Address, Post Code, Home Owner, Electricity Bill Size, Campaign,
   Ad source, Landing page, Ad set name, Ad name and Lead Source, and adds a note with the grade,
   every answer and the region. The setter converts it to a deal once it's booked, as now.
5. **Your CRM**: gets a `lead.created` POST signed with `x-signature-sha256` (HMAC of the body with
   `CRM_WEBHOOK_SECRET`). The thank-you page answers arrive later as `lead.updated`.
6. **Email**: the homeowner gets an instant "expect a call from one installer" email with their estimate.
7. **Meta**: a `Lead` event goes to the Conversions API with hashed details, deduplicated against the
   browser pixel by event ID. Renters are never sent, so Meta optimises towards real buyers.

## Tracking cost per lead by channel

Every lead carries a channel: `Meta Ads`, `Google Ads`, `Organic search`, `Organic social`,
`Affiliate: <name>`, `Referral: <site>` or `Direct`. Tag your ads so it's exact:

- Meta ad URL parameters: `utm_source=facebook&utm_medium=paid-social&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}`
- Google Ads: auto-tagging on (gclid), plus `utm_campaign` if you want campaign names in the note.
- Affiliates and referrers: give them a link ending `?ref=theirname`.

The channel lands in Pipedrive's existing **Ad source** field and the ad names in **Campaign**,
**Ad set name** and **Ad name**, the same fields your Meta leads already use, so one Pipedrive filter
on Ad source compares channels. The field keys are in `config/pipedrive.mjs`. Grade and region are in
the lead's note.

## Running ads to it

Send paid traffic to the state landing pages, `/quote/qld/`, `/quote/nsw/` and so on. They have no menu,
the quiz is the first thing on the page, and they're hidden from Google so they don't compete with the
rebate pages. Use "Website" leads campaigns with the pixel's `Lead` event as the conversion, not
Instant Forms. Put the pixel ID in `config/site.mjs` (browser) and `META_PIXEL_ID` (server).

## Keeping figures current

All rebate numbers live in `src/assets/rebates.js` and `config/site.mjs`, checked 29 October 2026.

- **Before 1 January 2027**: the battery factor drops from 6.8 to 5.7, and solar deeming from 5 to 4 years.
  Update `batteryWindows` (add Jul to Dec 2027 when the rate is published) and `asAt`. The countdown
  pill on the pages hides itself after the date.
- **STC price** (`stcPrice`, currently $37) moves with the market.
- **STC zones** are estimated from the postcode by state. The installer's quote is the final word.
- **State programs**: VIC (Solar Homes $1,400, $150k income cap) and WA (Synergy $1,300, Horizon $3,800)
  are quantified. NSW, SA and ACT programs are described without amounts on purpose.

## Before launch

- Fill in the ABN and phone number in `config/site.mjs`, and confirm the legal name and domain.
- Have the privacy policy, collection statement and terms reviewed. They're templates.
- Fill in real regions in `config/routing.mjs`. Leads go to Sarina unless a region names another owner.
- Verify your sending domain in Resend before turning on the email.
- Submit a test lead with `META_TEST_EVENT_CODE` set and `DEBUG_LEADS=true`, check it in the Pipedrive
  Leads Inbox and Meta's Test Events, then delete the test lead and clear both settings.

## Commands

```
npm test            # lead pipeline tests against fake Pipedrive, CRM, email and Meta
npm run build       # site into dist/
npm run preview     # site with relative links into dist-preview/, quiz submits are simulated
npx netlify dev     # run site and functions locally
```
