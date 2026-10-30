// Builds the static site into dist/. `node build.mjs` for Netlify, `node build.mjs --preview` for a
// copy with relative links that works anywhere (used for the shareable preview).
import { mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { brand, stateInfo, yieldPerKw } from "./config/site.mjs";
import "./src/assets/rebates.js";
import { guides } from "./src/guides.mjs";

const R = globalThis.Rebates;
const PREVIEW = process.argv.includes("--preview");
const OUT = PREVIEW ? "dist-preview" : "dist";
const money = R.money;
const CODES = Object.keys(stateInfo);
const pages = [];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync("src/assets", join(OUT, "assets"), { recursive: true });

function page(path, render) { pages.push({ path, render }); }

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function makeLink(fromPath) {
  const depth = fromPath ? fromPath.split("/").filter(Boolean).length : 0;
  const root = PREVIEW ? "../".repeat(depth) || "./" : "/";
  const L = (p = "") => {
    if (/^https?:|^#|^tel:|^mailto:/.test(p)) return p;
    if (!PREVIEW) return "/" + p;
    return root + p + (p === "" || p.endsWith("/") ? "index.html" : "");
  };
  L.root = root;
  return L;
}
const logo = `<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="8" fill="var(--teal)"/><circle cx="17" cy="15.5" r="6.5" fill="var(--sun)"/><path d="M6 22.5h22" stroke="var(--teal-ink)" stroke-width="2.4" stroke-linecap="round"/><path d="M9 22.5v3.5M13 22.5v2M17 22.5v3.5M21 22.5v2M25 22.5v3.5" stroke="var(--teal-ink)" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const wordmark = `<span class="wordmark"><span class="wm-the">The</span> Solar Standard</span>`;

function layout({ path, title, description, body, landing = false, noindex = false, jsonld = "" }, L) {
  const canonical = brand.domain + "/" + path;
  const pixel = brand.metaPixelId && !PREVIEW ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${brand.metaPixelId}');fbq('track','PageView');</script>` : "";
  const gtag = brand.googleTagId && !PREVIEW ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${brand.googleTagId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${brand.googleTagId}');</script>` : "";
  const site = { brand: brand.name, phone: brand.phone, root: L.root, pretty: !PREVIEW, preview: PREVIEW, yields: yieldPerKw };
  const head = landing
    ? `<header class="site-head lp-head"><div class="wrap"><span class="logo">${logo}${wordmark}</span><span class="small muted">Questions? <b>${esc(brand.phone)}</b></span></div></header>`
    : `<header class="site-head"><div class="wrap"><a class="logo" href="${L("")}">${logo}${wordmark}</a>
      <nav class="nav" aria-label="Main"><a href="${L("rebates/")}">Rebates</a><a href="${L("tools/")}">Calculators</a><a href="${L("guides/")}">Guides</a><a href="${L("the-standard/")}">The Standard</a><a href="${L("how-it-works/")}">How it works</a><a class="btn btn-small" href="${L("rebate-quiz/")}" data-keep-tags>See my rebate</a></nav></div></header>`;
  const foot = `<footer class="site-foot"><div class="wrap">
    ${landing ? "" : `<div><h3>Rebates</h3><ul>${CODES.map((c) => `<li><a href="${L("rebates/" + stateInfo[c].slug + "/")}">${R.states[c]}</a></li>`).join("")}</ul></div>
    <div><h3>Calculators</h3><ul><li><a href="${L("tools/stc-calculator/")}">STC rebate calculator</a></li><li><a href="${L("tools/battery-rebate-calculator/")}">Battery rebate calculator</a></li><li><a href="${L("tools/solar-savings-calculator/")}">Solar savings calculator</a></li></ul></div>
    <div><h3>Guides</h3><ul>${guides.map((g) => `<li><a href="${L("guides/" + g.slug + "/")}">${esc(g.short)}</a></li>`).join("")}</ul></div>`}
    <div><h3>${esc(brand.name)}</h3><ul><li><a href="${L("the-standard/")}">The Solar Standard checklist</a></li><li><a href="${L("how-it-works/")}">How it works and how we're paid</a></li><li><a href="${L("privacy/")}">Privacy policy</a></li><li><a href="${L("collection-statement/")}">Collection statement</a></li><li><a href="${L("terms/")}">Terms of use</a></li><li>${esc(brand.email)}</li></ul></div>
    <div class="foot-legal"><span>${esc(brand.name)} is operated by ${esc(brand.legalName)}, ABN ${esc(brand.abn)}. We are a marketing service, not a solar retailer or installer. Partner installers pay us for each introduction.</span><span>The Solar Standard is a private business. It is not a government body and is not affiliated with or endorsed by Standards Australia. References to AS/NZS standards describe the requirements we ask partner installers to meet.</span><span>Rebate figures are estimates as at ${R.asAt}. Your installer confirms the exact amount after assessing your home.</span></div>
  </div></footer>`;
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="en_AU">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@500;600;700&display=swap">
<link rel="stylesheet" href="${L.root}assets/site.css">
${jsonld}${pixel}${gtag}
</head><body${landing ? ' class="lp"' : ""}>
${head}
<main id="main">${body}</main>
${foot}
<script>window.SITE=${JSON.stringify(site)};</script>
<script src="${L.root}assets/rebates.js"></script><script src="${L.root}assets/site.js"></script>
</body></html>`;
}

const countdown = `<span class="countdown"><span>Battery rebate steps down 1 January 2027</span><span><span class="num" data-countdown>soon</span> to go</span></span>`;
const quizCard = (attrs = "") => `<div class="quiz" data-quiz ${attrs} aria-live="polite"><noscript>Turn on JavaScript to use the rebate quiz, or call ${esc(brand.phone)}.</noscript></div>`;
const trust = `<ul class="trust"><li>Takes about 60 seconds</li><li>One installer contacts you, not five</li><li>Installers held to The Solar Standard</li></ul>`;

function examples(code) {
  const zone = code === "VIC" || code === "TAS" ? 4 : code === "NT" ? 2 : 3;
  const s66 = R.solarStcs(6.6, zone, 2026), s10 = R.solarStcs(10, zone, 2026), s133 = R.solarStcs(13.3, zone, 2026);
  const f = R.batteryWindows[0].factor, f2 = R.batteryWindows[1].factor;
  const b10 = R.batteryStcs(10, f), b135 = R.batteryStcs(13.5, f), b20 = R.batteryStcs(20, f);
  return { zone, rows: [
    ["6.6 kW solar", s66, s66 * R.stcPrice],
    ["10 kW solar", s10, s10 * R.stcPrice],
    ["13.3 kW solar", s133, s133 * R.stcPrice],
    ["10 kWh battery", b10, b10 * R.stcPrice, R.batteryStcs(10, f2) * R.stcPrice],
    ["13.5 kWh battery", b135, b135 * R.stcPrice, R.batteryStcs(13.5, f2) * R.stcPrice],
    ["20 kWh battery", b20, b20 * R.stcPrice, R.batteryStcs(20, f2) * R.stcPrice]
  ] };
}
function exampleTable(code) {
  const ex = examples(code);
  return `<div class="table-wrap"><table><caption class="hp">Federal rebate by system size</caption><thead><tr><th>System</th><th class="num">Certificates</th><th class="num">Rebate if installed in 2026</th><th class="num">Battery, Jan to Jun 2027</th></tr></thead><tbody>
  ${ex.rows.map((r) => `<tr><td>${r[0]}</td><td class="num mono">${r[1]}</td><td class="num mono">${money(r[2])}</td><td class="num mono">${r[3] != null ? money(r[3]) : "<span class='muted'>steps down 1 Jan</span>"}</td></tr>`).join("")}
  </tbody></table></div><p class="small muted">STC zone ${ex.zone}, $${R.stcPrice} per certificate. Solar uses a ${R.deeming[2026]}-year deeming period for 2026 installs (${R.deeming[2027]} years in 2027).</p>`;
}

// ---------- pages ----------
page("", (L) => layout({
  path: "", title: `${brand.name} | Solar and Battery Rebate Check`, description: brand.tagline,
  body: `<section class="hero"><div class="wrap"><div class="hero-copy">
    ${countdown}
    <h1>Hold your solar quote to a higher standard</h1>
    <p class="lead">See your federal and state rebates worked out for your postcode in about 60 seconds. Then one installer who meets The Solar Standard gives you a free, itemised written quote.</p>
    ${trust}</div>${quizCard()}</div></section>
  <section class="section band"><div class="wrap"><div class="section-head"><p class="eyebrow">How it works</p><h2>Three steps, one phone call</h2></div>
    <ol class="steps"><li><h3>Check your rebate</h3><p class="muted">We work out your STC zone from your postcode and estimate the federal and state rebates on a system sized for your bill.</p></li>
    <li><h3>We introduce one installer</h3><p class="muted">Your details go to one accredited installer that covers your area. Not three, not five.</p></li>
    <li><h3>Get a written quote</h3><p class="muted">They call to confirm your roof and switchboard, then send a written quote with the rebates shown as line items. You decide in your own time.</p></li></ol></div></section>
  <section class="section"><div class="wrap stack-lg">
    <div class="stack"><div class="section-head"><p class="eyebrow">The Solar Standard</p><h2>Six things every solar quote should meet</h2><p class="muted">Use it on any quote, from us or anyone else.</p></div>
      <ul class="std-list">${STANDARD.map((x) => `<li><h3>${esc(x.title)}</h3><p class="muted small">${esc(x.short)}</p></li>`).join("")}</ul>
      <p><a href="${L("the-standard/")}">Read the full checklist</a></p></div>
    <div class="stack"><div class="section-head"><p class="eyebrow">Rebates by state</p><h2>What's on offer where you live</h2><p class="muted">The federal rebates apply everywhere. Victoria and WA add their own on top.</p></div>
      <div class="statebar">${CODES.map((c) => `<a href="${L("rebates/" + stateInfo[c].slug + "/")}">${c}</a>`).join("")}</div></div>
    <div class="stack"><div class="section-head"><p class="eyebrow">Calculators</p><h2>Run the numbers yourself</h2></div>
      <div class="tiles">
        <a class="tile" href="${L("tools/stc-calculator/")}"><h3>STC rebate calculator</h3><p class="muted small">Certificates and dollars for your postcode and system size.</p></a>
        <a class="tile" href="${L("tools/battery-rebate-calculator/")}"><h3>Battery rebate calculator</h3><p class="muted small">The federal tiers, the 1 January step-down and WA's top-up.</p></a>
        <a class="tile" href="${L("tools/solar-savings-calculator/")}"><h3>Solar savings calculator</h3><p class="muted small">Yearly savings and payback from your power bill.</p></a></div></div>
    <div class="stack"><div class="section-head"><p class="eyebrow">Guides</p><h2>Know what you're signing</h2></div>
      <div class="tiles">${guides.map((g) => `<a class="tile" href="${L("guides/" + g.slug + "/")}"><h3>${esc(g.title)}</h3><p class="muted small">${esc(g.description)}</p></a>`).join("")}</div></div>
  </div></section>`
}, L));

page("rebate-quiz/", (L) => layout({
  path: "rebate-quiz/", title: `Rebate Quiz | ${brand.name}`, description: "Check your solar and battery rebates in about 60 seconds, then get one free quote from an accredited local installer.",
  body: `<section class="hero"><div class="wrap"><div class="hero-copy">${countdown}<h1>Your rebate, worked out for your postcode</h1><p class="lead">Six questions. No account. One installer contacts you with a free written quote.</p>${trust}</div>${quizCard()}</div></section>`
}, L));

// Ad landing pages: no menu, quiz first, noindex so they don't compete with the rebate pages
for (const code of CODES) {
  const s = stateInfo[code];
  const ex = examples(code);
  const extra = s.extras[0];
  page(`quote/${s.slug}/`, (L) => layout({
    path: `quote/${s.slug}/`, landing: true, noindex: true,
    title: `${R.states[code]} Solar & Battery Rebates | ${brand.name}`,
    description: `Check your ${R.states[code]} solar and battery rebates and get one free quote from an accredited local installer.`,
    body: `<section class="hero"><div class="wrap"><div class="hero-copy">${countdown}
      <h1>${R.states[code]} homeowners: see your solar and battery rebate</h1>
      <p class="lead">A typical 10 kWh battery attracts about <b class="mono">${money(R.batteryStcs(10, R.batteryWindows[0].factor) * R.stcPrice)}</b> in federal rebate if it's installed before 1 January 2027.${code === "VIC" ? " Victoria adds up to $1,400 on solar panels." : code === "WA" ? " WA adds up to $1,300, or $3,800 with Horizon Power." : ""}</p>
      ${trust}</div>${quizCard(`data-state="${code}"`)}</div></section>
    <section class="section band"><div class="wrap stack-lg">
      <div class="section-head"><h2>What happens after you finish</h2></div>
      <ol class="steps"><li><h3>You see your estimate</h3><p class="muted">Worked out for your postcode, STC zone ${ex.zone}${code === "NT" || code === "WA" ? " in most areas" : ""}.</p></li><li><h3>One installer calls</h3><p class="muted">An accredited installer that covers your suburb, usually within one business day.</p></li><li><h3>You get a written quote</h3><p class="muted">With every rebate shown as its own line. No obligation.</p></li></ol>
      <div class="callout"><b>${esc(extra.title)}.</b> ${esc(extra.body)}</div>
      <div class="faq">${landingFaq(code).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
      <p class="notice">${esc(brand.name)} is a marketing service operated by ${esc(brand.legalName)}. We introduce you to one installer in your area, who pays us for the introduction. Rebate figures are estimates as at ${R.asAt}.</p>
    </div></section>`
  }, L));
}
function landingFaq(code) {
  return [
    ["Is this a government website?", `No. ${brand.name} is a private marketing service. The rebates are real government programs, and your installer applies them to your quote as a discount.`],
    ["Do I have to apply for the rebate myself?", "No. The federal solar and battery rebates come off the installer's price as a point-of-sale discount. State rebates such as Solar Homes in Victoria have their own application, which the installer helps with."],
    ["How many companies will call me?", "One. Your details go to a single accredited installer that covers your area."],
    ["Does the battery rebate end on 1 January?", "No. It steps down on 1 January 2027 and keeps stepping down every six months until it ends in 2030. What counts is when the battery is installed, not when you sign."],
    ["How do you make money?", "The installer pays us a fee for each introduction. You don't pay us anything."]
  ];
}

page("rebates/", (L) => layout({
  path: "rebates/", title: `Solar & Battery Rebates by State | ${brand.name}`, description: "Federal STC and battery rebates plus each state's top-ups, with worked examples by system size.",
  body: `<div class="wrap"><div class="article"><div class="article-body">
    <p class="crumbs"><a href="${L("")}">Home</a> / Rebates</p>
    <h1>Solar and battery rebates in ${new Date().getFullYear()}</h1>
    <p>Two federal programs apply everywhere in Australia. The solar rebate is paid as small-scale technology certificates (STCs) that your system creates. The Cheaper Home Batteries Program uses the same certificates for batteries. Both come off your installer's price as a discount.</p>
    <h2>Federal rebate by system size</h2><p class="muted">Shown for STC zone 3, which covers Sydney, Brisbane, Perth, Adelaide and Canberra.</p>${exampleTable("NSW")}
    <h2>Pick your state</h2><div class="tiles">${CODES.map((c) => `<a class="tile" href="${L("rebates/" + stateInfo[c].slug + "/")}"><h3>${R.states[c]}</h3><p class="muted small">${esc(stateInfo[c].extras[0].title)}</p></a>`).join("")}</div>
  </div><aside class="article-aside">${quizCard()}</aside></div></div>`
}, L));

for (const code of CODES) {
  const s = stateInfo[code];
  const faq = [
    [`What rebates can I get in ${R.states[code]}?`, `The federal solar rebate (STCs) and the federal Cheaper Home Batteries rebate apply everywhere. ${s.extras.map((e) => e.title + ": " + e.body).join(" ")}`],
    ["When does the battery rebate drop?", `The battery rebate steps down on ${R.batteryNextStep}, from ${R.batteryWindows[0].factor} to ${R.batteryWindows[1].factor} certificates per kWh, and keeps stepping down every six months until the end of 2030.`],
    ["Who claims the rebate?", "Your installer. You assign the certificates to them and they take the value off your price. State rebates have their own application, which the installer guides you through."]
  ];
  const jsonld = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
  page(`rebates/${s.slug}/`, (L) => layout({
    path: `rebates/${s.slug}/`, jsonld,
    title: `${R.states[code]} Solar & Battery Rebates | ${brand.name}`,
    description: `Solar and battery rebates available in ${R.states[code]}, with worked examples for common system sizes and the 1 January 2027 battery step-down.`,
    body: `<div class="wrap"><div class="article"><div class="article-body">
      <p class="crumbs"><a href="${L("")}">Home</a> / <a href="${L("rebates/")}">Rebates</a> / ${code}</p>
      <h1>Solar and battery rebates in ${R.states[code]}</h1>
      <p>${esc(s.note)}</p>
      <h2>Federal rebates on common systems</h2>${exampleTable(code)}
      ${s.extras.map((e) => `<h2>${esc(e.title)}</h2><p>${esc(e.body)}</p>`).join("")}
      <h2>How the battery rebate is tiered</h2>
      <p>Since 1 May 2026 the first 14 kWh of usable capacity gets the full rate, each kWh from 14 to 28 gets 60%, and each kWh from 28 to 50 gets 15%. Batteries under 5 kWh aren't eligible. A battery sized to your evening use usually gets the best rebate per dollar.</p>
      <div class="callout">The rebate is set by the <b>install date</b>, not the date you sign. A battery signed in December but installed in January gets the lower 2027 rate.</div>
      <h2>Common questions</h2><div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
      <p class="small muted">Figures as at ${R.asAt}. Certificate values move with the market. Check current program rules before you sign.</p>
    </div><aside class="article-aside"><p class="eyebrow">Your rebate</p>${quizCard(`data-state="${code}"`)}</aside></div></div>`
  }, L));
}

page("tools/", (L) => layout({
  path: "tools/", title: `Solar Rebate Calculators | ${brand.name}`, description: "Free calculators for the STC solar rebate, the battery rebate and solar savings.",
  body: `<div class="wrap section"><div class="section-head"><p class="crumbs"><a href="${L("")}">Home</a> / Calculators</p><h1>Calculators</h1><p class="muted">Each one shows its working, so you can check it against a quote.</p></div>
  <div class="tiles"><a class="tile" href="${L("tools/stc-calculator/")}"><h3>STC rebate calculator</h3><p class="muted small">Postcode, system size, install year.</p></a><a class="tile" href="${L("tools/battery-rebate-calculator/")}"><h3>Battery rebate calculator</h3><p class="muted small">Federal tiers plus WA's scheme.</p></a><a class="tile" href="${L("tools/solar-savings-calculator/")}"><h3>Solar savings calculator</h3><p class="muted small">Savings and payback from your bill.</p></a></div></div>`
}, L));

const calcCta = (L) => `<div class="callout">Want this checked against your actual roof? <a href="${L("rebate-quiz/")}">Get one free quote</a> from an accredited installer.</div>`;

page("tools/stc-calculator/", (L) => layout({
  path: "tools/stc-calculator/", title: `STC Rebate Calculator | ${brand.name}`, description: "Work out how many STCs your solar system creates and what they're worth, by postcode and system size.",
  body: `<div class="wrap"><p class="crumbs" style="padding-top:1.5rem"><a href="${L("")}">Home</a> / <a href="${L("tools/")}">Calculators</a> / STC</p>
  <div class="calc" id="calc-stc"><div class="calc-inputs"><h1 style="font-size:var(--step-2)">STC rebate calculator</h1>
    <div class="field"><label for="stc-postcode">Postcode</label><input id="stc-postcode" inputmode="numeric" maxlength="4" value="4152"></div>
    <div class="range-row"><label for="stc-kw"><b>System size</b> <output data-out="kw"></output></label><input id="stc-kw" type="range" min="3" max="20" step="0.1" value="6.6"></div>
    <div class="field"><label for="stc-year">Install year</label><select id="stc-year"><option value="2026">2026</option><option value="2027">2027</option><option value="2028">2028</option></select></div>
    <p class="small muted">Sample values loaded: a 6.6 kW system in Brisbane.</p></div>
  <div class="stack"><div class="bigfigs"><div class="fig"><div class="k">Rebate</div><div class="v" data-out="value"></div></div><div class="fig"><div class="k">Certificates</div><div class="v" data-out="stcs" style="font-size:1.1rem"></div></div><div class="fig"><div class="k"><span data-out="where"></span></div><div class="v" data-out="zone" style="font-size:1.1rem"></div></div></div>
    <p class="mono small muted" data-out="working"></p>
    <p class="small">The zone is estimated from your postcode. The Clean Energy Regulator sets the exact zone, and your installer's quote uses it. Certificate prices move; this uses $${R.stcPrice}.</p>${calcCta(L)}</div></div></div>`
}, L));

page("tools/battery-rebate-calculator/", (L) => layout({
  path: "tools/battery-rebate-calculator/", title: `Battery Rebate Calculator | ${brand.name}`, description: "Federal Cheaper Home Batteries rebate by battery size, before and after the 1 January 2027 step-down, plus WA's battery scheme.",
  body: `<div class="wrap"><p class="crumbs" style="padding-top:1.5rem"><a href="${L("")}">Home</a> / <a href="${L("tools/")}">Calculators</a> / Battery</p>
  <div class="calc" id="calc-battery"><div class="calc-inputs"><h1 style="font-size:var(--step-2)">Battery rebate calculator</h1>
    <div class="range-row"><label for="bat-kwh"><b>Usable capacity</b> <output data-out="kwh"></output></label><input id="bat-kwh" type="range" min="5" max="50" step="0.5" value="13.5"></div>
    <div class="field"><label for="bat-window">When it's installed</label><select id="bat-window">${R.batteryWindows.map((w) => `<option value="${w.id}">${w.label}</option>`).join("")}</select></div>
    <div class="field"><label for="bat-wa">WA battery scheme</label><select id="bat-wa"><option value="">Not in WA</option><option value="synergy">WA, Synergy customer</option><option value="horizon">WA, Horizon Power customer</option></select></div>
    <p class="small muted">Sample values loaded: a 13.5 kWh battery outside WA.</p></div>
  <div class="stack"><div class="bigfigs"><div class="fig"><div class="k">Total rebate</div><div class="v" data-out="total"></div></div><div class="fig"><div class="k">Federal</div><div class="v" data-out="fed"></div></div><div class="fig"><div class="k">WA scheme</div><div class="v" data-out="state"></div></div></div>
    <p class="small"><b data-out="perkwh"></b> of capacity.</p><p class="mono small muted" data-out="working"></p>
    <p class="small">The WA scheme needs the battery to join a virtual power plant. Rates after June 2027 aren't set in these figures; they step down every six months until 2030.</p>${calcCta(L)}</div></div></div>`
}, L));

page("tools/solar-savings-calculator/", (L) => layout({
  path: "tools/solar-savings-calculator/", title: `Solar Savings Calculator | ${brand.name}`, description: "Estimate yearly savings and payback for solar, with or without a battery, from your quarterly power bill.",
  body: `<div class="wrap"><p class="crumbs" style="padding-top:1.5rem"><a href="${L("")}">Home</a> / <a href="${L("tools/")}">Calculators</a> / Savings</p>
  <div class="calc" id="calc-savings"><div class="calc-inputs"><h1 style="font-size:var(--step-2)">Solar savings calculator</h1>
    <div class="grid-2"><div class="field"><label for="sav-state">State</label><select id="sav-state">${CODES.map((c) => `<option value="${c}"${c === "QLD" ? " selected" : ""}>${R.states[c]}</option>`).join("")}</select></div>
    <div class="field"><label for="sav-bill">Quarterly bill ($)</label><input id="sav-bill" inputmode="decimal" value="650"></div></div>
    <div class="range-row"><label for="sav-kw"><b>Solar size</b> <output data-out="kw"></output></label><input id="sav-kw" type="range" min="3" max="20" step="0.1" value="10"></div>
    <label class="check"><input type="checkbox" id="sav-battery"><span>Add a 13.5 kWh battery</span></label>
    <div class="grid-2"><div class="field"><label for="sav-tariff">Your usage rate (c/kWh)</label><input id="sav-tariff" inputmode="decimal" value="32"></div><div class="field"><label for="sav-fit">Feed-in tariff (c/kWh)</label><input id="sav-fit" inputmode="decimal" value="5"></div></div>
    <p class="small muted">Sample values loaded: a $650 quarterly bill in Queensland.</p></div>
  <div class="stack"><div class="bigfigs"><div class="fig"><div class="k">Yearly saving</div><div class="v" data-out="saving"></div></div><div class="fig"><div class="k">Payback</div><div class="v" data-out="payback"></div></div><div class="fig"><div class="k">Yearly output</div><div class="v" data-out="gen" style="font-size:1.1rem"></div></div><div class="fig"><div class="k">Cost after rebates</div><div class="v" data-out="cost" style="font-size:1.1rem"></div></div></div>
    <p class="small">Assumptions: about $1,000 per kW for solar and $1,050 per kWh for a battery before rebates, a $1.10 daily supply charge, and you use 30% of your solar during the day (70% with a battery). Change the rates above to match your bill.</p>${calcCta(L)}</div></div></div>`
}, L));

page("guides/", (L) => layout({
  path: "guides/", title: `Solar & Battery Guides | ${brand.name}`, description: "Plain-English guides to solar rebates, battery rebates and reading a solar quote.",
  body: `<div class="wrap section"><div class="section-head"><p class="crumbs"><a href="${L("")}">Home</a> / Guides</p><h1>Guides</h1></div>
  <div class="tiles">${guides.map((g) => `<a class="tile" href="${L("guides/" + g.slug + "/")}"><h3>${esc(g.title)}</h3><p class="muted small">${esc(g.description)}</p></a>`).join("")}</div></div>`
}, L));

for (const g of guides) {
  page(`guides/${g.slug}/`, (L) => layout({
    path: `guides/${g.slug}/`, title: `${g.title} | ${brand.name}`, description: g.description,
    body: `<div class="wrap"><div class="article"><article class="article-body">
      <p class="crumbs"><a href="${L("")}">Home</a> / <a href="${L("guides/")}">Guides</a></p>
      <h1>${esc(g.title)}</h1><p class="small muted">Updated ${R.asAt}</p>${g.html({ R, money, L })}
    </article><aside class="article-aside"><p class="eyebrow">Your rebate</p>${quizCard()}</aside></div></div>`
  }, L));
}

const STANDARD = [
  { title: "Accredited installer", short: "The person designing and signing off your system holds current Solar Accreditation Australia (SAA) accreditation.", body: "Ask for the installer's SAA accreditation number and check it on the SAA website. Without it, your system can't claim the federal STC or battery rebates." },
  { title: "Approved products", short: "Panels, inverter and battery are on the Clean Energy Council approved lists.", body: "Only listed products are eligible for the federal rebates. The quote should name the exact model of each, not just a brand." },
  { title: "Installed to the Australian standards", short: "AS/NZS 5033 for solar, AS/NZS 4777 for grid connection and AS/NZS 5139 for batteries.", body: "These are the installation standards electricians work to. Your installer should confirm the system will be installed and certified to them, and you should receive an electrical safety certificate when it's done." },
  { title: "Itemised written quote", short: "System price, STC discount, state rebate and what you pay, each on its own line.", body: "One total hides what's included. A quote that meets the standard lists every component by model and shows each rebate separately, so you can compare it with any other quote." },
  { title: "A warranty you can use", short: "A written workmanship warranty from a business with a real trading history.", body: "Product warranties come from the manufacturer. The workmanship warranty comes from the installer and only lasts as long as they do, so check their ABN and how long they've traded." },
  { title: "No pressure", short: "No deadline that isn't real, and your full cooling-off rights explained.", body: "Federal rebates step down on set dates, which is real and worth knowing. A salesperson inventing a deadline isn't. Agreements signed at home usually carry a 10 business day cooling-off period under the Australian Consumer Law." }
];

page("the-standard/", (L) => layout({
  path: "the-standard/", title: `The Solar Standard Checklist`, description: "Six things every solar and battery quote should meet, and the bar we hold our partner installers to.",
  body: `<div class="wrap"><div class="article"><div class="article-body">
    <p class="crumbs"><a href="${L("")}">Home</a> / The Standard</p>
    <h1>The Solar Standard</h1>
    <p class="lead-sm">Six things every solar and battery quote should meet. It's the bar we hold our partner installers to, and you can use it on any quote you get.</p>
    <ol class="std-full">${STANDARD.map((x) => `<li><h2>${esc(x.title)}</h2><p><b>${esc(x.short)}</b></p><p class="muted">${esc(x.body)}</p></li>`).join("")}</ol>
    <h2>How we use it</h2>
    <p>Before we introduce an installer, we check their SAA accreditation, ABN and trading history, and their Google reviews. Partners agree in writing to quote and install to this standard. If a homeowner tells us a partner didn't, we look into it, and partners who stop meeting the standard stop receiving enquiries.</p>
    <div class="callout">The Solar Standard is our own checklist. It isn't an Australian Standard, a government scheme or a certification. The AS/NZS standards named above are published by Standards Australia; we refer to them so you know what to ask for.</div>
  </div><aside class="article-aside"><p class="eyebrow">Your rebate</p>${quizCard()}</aside></div></div>`
}, L));

page("how-it-works/", (L) => layout({
  path: "how-it-works/", title: `How ${brand.name} Works`, description: `How ${brand.name} matches you with one installer, and how we're paid.`,
  body: `<div class="wrap"><div class="article"><div class="article-body">
    <h1>How it works and how we're paid</h1>
    <p>${esc(brand.name)} is a solar marketing service. We publish rebate guides and calculators, and when a homeowner asks for a quote we introduce them to one accredited installer that covers their area.</p>
    <h2>What happens to your details</h2>
    <ol><li>You answer the quiz and see your rebate estimate.</li><li>Your name, contact details, address and quiz answers go to one installer partner for your area.</li><li>That installer calls you, usually within one business day, and gives you a free written quote.</li><li>We may call or email you afterwards to check how it went.</li></ol>
    <h2>How we're paid</h2>
    <p>Installer partners pay us for each introduction. You never pay us. Because each area has one partner, your details are not sold to several companies at once.</p>
    <h2>Who we work with</h2>
    <p>We only introduce installers who agree to meet <a href="${L("the-standard/")}">The Solar Standard</a>: SAA-accredited installers, products on the Clean Energy Council approved lists, installation to the relevant AS/NZS standards, and itemised written quotes. If a partner stops meeting it, we stop sending them enquiries.</p>
    <h2>Your choice</h2><p>A quote is free and doesn't commit you to anything. You're welcome to get other quotes too.</p>
  </div><aside class="article-aside">${quizCard()}</aside></div></div>`
}, L));

page("thank-you/", (L) => layout({
  path: "thank-you/", noindex: true, title: `Thanks | ${brand.name}`, description: "Your enquiry has been received.",
  body: `<div class="wrap"><div class="article"><div class="article-body">
    <h1>Thanks<span id="ty-name"></span>. Your enquiry is in.</h1>
    <p hidden>Estimated rebates: <b class="mono" id="ty-total"></b></p>
    <p>One accredited installer that covers your area will call you, usually within one business day. We've emailed you a copy of your estimate.</p>
    <h2>Save time on the call</h2><p class="muted">These help the installer quote accurately. All optional.</p>
    <form id="followup" class="stack" novalidate>
      <div class="grid-2"><div class="field"><label for="t-roof">Roof</label><select id="t-roof" name="roof"><option value="">Choose</option><option value="tin">Tin / Colorbond</option><option value="tile">Tile</option><option value="flat">Flat or low pitch</option><option value="other">Something else / not sure</option></select></div>
      <div class="field"><label for="t-storeys">Storeys</label><select id="t-storeys" name="storeys"><option value="">Choose</option><option value="1">Single storey</option><option value="2">Two storeys</option><option value="3">Three or more</option></select></div></div>
      <div class="grid-2"><div class="field"><label for="t-phase">Power supply</label><select id="t-phase" name="phase"><option value="">Choose</option><option value="single">Single phase</option><option value="three">Three phase</option><option value="unknown">Not sure</option></select></div>
      <div class="field"><label for="t-call">Best time to call</label><select id="t-call" name="callTime"><option value="">Any time</option><option value="morning">Morning (9 to 12)</option><option value="afternoon">Afternoon (12 to 5)</option><option value="evening">Early evening (5 to 7)</option></select></div></div>
      <div class="field"><label for="t-notes">Anything else the installer should know?</label><textarea id="t-notes" name="notes" rows="3" maxlength="500"></textarea></div>
      <div class="formerror" id="ty-err" hidden></div>
      <button class="btn" type="submit">Send these details</button></form>
    <div class="callout" id="ty-msg" hidden>Thanks. We've added these to your enquiry.</div>
  </div><aside class="article-aside"><div class="tile"><h3>While you wait</h3><p class="small muted">Read what a good quote should include, so you know what to ask.</p><a href="${L("guides/how-to-read-a-solar-quote/")}">How to read a solar quote</a></div></aside></div></div>`
}, L));

const legal = (path, title, html) => page(path, (L) => layout({ path, title: `${title} | ${brand.name}`, description: `${brand.name} ${title.toLowerCase()}.`, body: `<div class="wrap"><div class="article"><div class="article-body"><h1>${title}</h1>${html(L)}</div></div></div>` }, L));

legal("collection-statement/", "Collection statement", (L) => `
<p>${esc(brand.legalName)} (ABN ${esc(brand.abn)}), trading as ${esc(brand.name)}, collects your name, phone number, email, address and quiz answers when you ask for a quote.</p>
<p>We collect them so we can estimate your rebates and introduce you to <b>one</b> installer partner that services your area. We disclose them to that installer, who will contact you about a quote, and to the service providers that run our website, email and customer records. Some of these providers store data outside Australia, including in the United States.</p>
<p>We also share a scrambled (hashed) copy of your email and phone with advertising platforms such as Meta and Google so we can measure our ads. They can't read your details from it.</p>
<p>If you don't give us these details we can't arrange a quote. You can ask to see or correct your information, or make a complaint, by emailing ${esc(brand.email)}. Our <a href="${L("privacy/")}">privacy policy</a> has the detail.</p>`);

legal("privacy/", "Privacy policy", (L) => `
<p class="callout">Template policy. Have it reviewed against the Australian Privacy Principles before launch.</p>
<p>${esc(brand.legalName)} (ABN ${esc(brand.abn)}) runs ${esc(brand.name)}. This policy explains how we handle personal information under the Privacy Act 1988 (Cth).</p>
<h2>What we collect</h2><ul><li>Contact details you give us: name, mobile, email and address.</li><li>Your quiz answers: what you want installed, whether you own the home, your bill range and timeframe, and anything you add after submitting.</li><li>How you found us: campaign tags, the page you landed on, and advertising cookies if you allow them.</li></ul>
<h2>Why we collect it</h2><ul><li>To estimate your rebates.</li><li>To introduce you to one installer partner for your area, who contacts you about a quote.</li><li>To check the service worked, improve our website, and measure our advertising.</li></ul>
<h2>Who we share it with</h2><ul><li>One installer partner that services your postcode.</li><li>Service providers that host our website and run our email and customer records.</li><li>Advertising platforms (Meta, Google), which receive a hashed version of your email and phone for ad measurement.</li></ul>
<p>Some providers store data overseas, including in the United States. We take reasonable steps to make sure they protect it.</p>
<h2>Marketing</h2><p>We'll only contact you about your enquiry unless you agree to more. You can opt out of any message by replying STOP or using the unsubscribe link.</p>
<h2>Access, correction and complaints</h2><p>Email ${esc(brand.email)} to see or correct your information, or to complain. If you're not satisfied with our response, you can contact the Office of the Australian Information Commissioner at oaic.gov.au.</p>`);

legal("terms/", "Terms of use", () => `
<p class="callout">Template terms. Have them reviewed before launch.</p>
<p>${esc(brand.name)} gives general information about solar and battery rebates. It isn't financial advice, and it isn't a quote.</p>
<p>Rebate estimates use typical system sizes and published program rules as at ${R.asAt}. Certificate prices, program rules and eligibility change. Your installer confirms the exact rebate and price in writing after assessing your home.</p>
<p>Quotes and installations are provided by the installer, not by us. Your contract is with the installer, and the Australian Consumer Law, including your cooling-off rights, applies to that contract.</p>`);

page("404.html", (L) => layout({ path: "404.html", noindex: true, title: `Page Not Found | ${brand.name}`, description: "Page not found.",
  body: `<div class="wrap section stack"><h1>We can't find that page</h1><p><a href="${L("")}">Go to the home page</a> or <a href="${L("rebate-quiz/")}">check your rebate</a>.</p></div>` }, L));

// ---------- write ----------
for (const p of pages) {
  const L = makeLink(p.path.endsWith(".html") ? "" : p.path);
  const file = p.path.endsWith(".html") ? join(OUT, p.path) : join(OUT, p.path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, p.render(L));
}
if (!PREVIEW) {
  const urls = pages.filter((p) => !p.path.startsWith("quote/") && !["thank-you/", "404.html"].includes(p.path)).map((p) => `<url><loc>${brand.domain}/${p.path}</loc></url>`).join("");
  writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nDisallow: /thank-you/\nDisallow: /quote/\nSitemap: ${brand.domain}/sitemap.xml\n`);
}
console.log(`Built ${pages.length} pages into ${OUT}/`);
