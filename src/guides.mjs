// Guide articles. Each html() gets the rebate maths so figures stay in step with rebates.js.
export const guides = [
  {
    slug: "how-solar-rebates-work",
    short: "How solar rebates work",
    title: "How solar and battery rebates work in Australia",
    description: "STCs, zones, deeming years and the battery program, explained in plain English.",
    html: ({ R, money, L }) => {
      const s = R.solarStcs(6.6, 3, 2026);
      return `
<p>Most of the money off a solar or battery system comes from one federal scheme, the Small-scale Renewable Energy Scheme. It doesn't pay you cash. Your system creates certificates, called STCs, and your installer buys them from you by taking their value off the price.</p>
<h2>How many certificates a solar system creates</h2>
<p>Three things set the number: the size of the system, how sunny your area is, and how many years are left in the scheme.</p>
<ul><li><b>Size.</b> More kilowatts, more certificates.</li><li><b>Zone.</b> Australia is split into four STC zones. Zone 1 (Alice Springs, the Pilbara) earns the most per kW. Zone 4 (Victoria, Tasmania) earns the least.</li><li><b>Deeming years.</b> A system installed in 2026 is credited with ${R.deeming[2026]} years of output. That drops by one year every 1 January until the scheme ends in 2030.</li></ul>
<p>A 6.6 kW system in zone 3, installed in 2026, works out at 6.6 × ${R.zoneRating[3]} × ${R.deeming[2026]} = <b class="mono">${s} certificates</b>, worth about <b class="mono">${money(s * R.stcPrice)}</b> at $${R.stcPrice} each.</p>
<h2>The battery rebate</h2>
<p>The Cheaper Home Batteries Program uses the same certificates. Until 31 December 2026 a battery earns ${R.batteryWindows[0].factor} certificates per kWh of usable capacity on the first 14 kWh, 60% of that from 14 to 28 kWh, and 15% from 28 to 50 kWh. It needs to be at least 5 kWh. The rate steps down every six months until 2030. Our <a href="${L("guides/battery-rebate-2027/")}">guide to the January change</a> has the numbers.</p>
<h2>State rebates on top</h2>
<p>Victoria's Solar Homes program pays up to $1,400 towards panels for eligible households. WA pays up to $1,300 on a battery for Synergy customers and up to $3,800 for Horizon Power customers, if the battery joins a virtual power plant. Other states currently rely on the federal programs, with some VPP incentives. See <a href="${L("rebates/")}">rebates by state</a>.</p>
<h2>What to look for on the quote</h2>
<p>The quote should show the system price, the STC discount and any state rebate as separate lines, plus the number of certificates. If it only shows one total, ask for the breakdown.</p>`;
    }
  },
  {
    slug: "battery-rebate-2027",
    short: "Battery rebate 2027",
    title: "What changes to the battery rebate on 1 January 2027",
    description: "The rate drops from 6.8 to 5.7 certificates per kWh. Here's what that's worth and what to ignore.",
    html: ({ R, money }) => {
      const a = R.batteryWindows[0].factor, b = R.batteryWindows[1].factor;
      const rows = [10, 13.5, 20].map((k) => [k, R.batteryStcs(k, a) * R.stcPrice, R.batteryStcs(k, b) * R.stcPrice]);
      return `
<p>The Cheaper Home Batteries rebate gets smaller on 1 January 2027. It doesn't end. The certificate rate falls from <b>${a}</b> to <b>${b}</b> per kWh, and then keeps falling every six months until the program finishes at the end of 2030.</p>
<h2>What it's worth</h2>
<div class="table-wrap"><table><thead><tr><th>Battery</th><th class="num">Installed in 2026</th><th class="num">Installed Jan to Jun 2027</th><th class="num">Difference</th></tr></thead><tbody>
${rows.map(([k, x, y]) => `<tr><td>${k} kWh</td><td class="num mono">${money(x)}</td><td class="num mono">${money(y)}</td><td class="num mono">${money(x - y)}</td></tr>`).join("")}
</tbody></table></div>
<p class="small muted">At $${R.stcPrice} per certificate, using the size tiers that apply from 1 May 2026.</p>
<h2>The install date is what counts</h2>
<p>The rate is set by when the battery is installed and commissioned, not when you sign. Installers are busy before every step-down, so if you sign in December, ask for an install date in writing.</p>
<h2>Real deadlines and made-up ones</h2>
<p>The program steps down on 1 January and 1 July. A salesperson who says "the rebate drops on 1 January" is telling you something true. One who says the rebate <i>ends</i>, or names any other date, isn't. The Clean Energy Regulator has warned retailers that misleading claims get reported to fair trading regulators.</p>
<h2>Should you rush?</h2>
<p>For a typical battery the January drop is a few hundred dollars, a small share of the job. It's worth acting on if you were going to buy anyway. It isn't worth signing a quote you haven't checked.</p>`;
    }
  },
  {
    slug: "how-to-read-a-solar-quote",
    short: "Reading a solar quote",
    title: "How to read a solar quote",
    description: "The seven things a good quote shows, and what to ask when one is missing.",
    html: () => `
<p>Two quotes for the "same" system can be thousands of dollars apart for good reasons, or bad ones. These are the things a quote should spell out.</p>
<ol>
<li><b>Itemised price.</b> System price, STC discount, any state rebate and the amount you pay, each on its own line.</li>
<li><b>Panel brand, model and quantity.</b> A model number you can look up, not just "tier 1 panels".</li>
<li><b>Inverter brand and model.</b> Including its size and whether it can run a battery now or later.</li>
<li><b>Battery details.</b> Usable capacity in kWh, whether it gives backup power in a blackout, and whether it's on the approved list for the rebate.</li>
<li><b>Warranties and who holds them.</b> Product warranties come from the manufacturer. The workmanship warranty comes from the installer and is only as good as the business behind it.</li>
<li><b>Export limit.</b> Your network may cap how much you can send to the grid, which affects what a bigger system is worth.</li>
<li><b>Paperwork and timing.</b> Who lodges the grid connection, who arranges the electrical certificate and meter change, and the install date.</li>
</ol>
<h2>Questions worth asking</h2>
<ul><li>Who will physically do the install: your own staff or a subcontractor?</li><li>How long has the business traded under its current ABN?</li><li>What happens if a panel or the inverter fails in year six?</li><li>Is the price fixed if the install date moves into next year?</li></ul>
<h2>Your rights</h2>
<p>If a salesperson sells to you at your home, the Australian Consumer Law gives you a 10 business day cooling-off period for most unsolicited agreements. Take the time to read the quote.</p>`
  },
  {
    slug: "is-a-battery-worth-it",
    short: "Is a battery worth it?",
    title: "Is a home battery worth it?",
    description: "When a battery pays for itself, and when you're better off waiting.",
    html: ({ R, money, L }) => {
      const r = R.batteryStcs(13.5, R.batteryWindows[0].factor) * R.stcPrice;
      return `
<p>A battery stores the solar you'd otherwise export for a few cents, and lets you use it in the evening instead of buying power at full price. Whether that pays off depends on your household more than on the battery.</p>
<h2>A battery tends to pay off when</h2>
<ul><li>You use a lot of power after the sun goes down: cooking, air conditioning, pool pumps, an electric car.</li><li>Your feed-in tariff is low, so exporting earns little.</li><li>You're on a time-of-use plan with expensive evening rates.</li><li>You can join a virtual power plant that pays you, or you're in WA where joining one unlocks the state rebate.</li></ul>
<h2>You might wait when</h2>
<ul><li>Your evening use is small, or someone is home using solar during the day.</li><li>Your solar system is small and has little left over to store.</li><li>Your switchboard needs an upgrade that adds a lot to the price. Ask the installer.</li></ul>
<h2>Sizing it</h2>
<p>Size the battery to your evening and overnight use, not to the biggest rebate. Because of the tiers, kWh above 14 earn 60% of the rate and above 28 only 15%. A 13.5 kWh battery currently attracts about <b class="mono">${money(r)}</b> in federal rebate.</p>
<p>Try the <a href="${L("tools/solar-savings-calculator/")}">savings calculator</a> with and without a battery to see the difference for your bill.</p>`;
    }
  }
];
