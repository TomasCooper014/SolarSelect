/*
 * Rebate maths shared by the browser (quiz + calculators) and the build.
 * Every number here is an assumption you can change in one place.
 * Figures checked 29 October 2026. Re-check each January and July.
 */
(function (root) {
  var R = {};

  R.asAt = "29 October 2026";
  R.stcPrice = 37; // $ per certificate, moves with the market

  // Solar STCs: rating (MWh per kW per year) by zone
  R.zoneRating = { 1: 1.622, 2: 1.536, 3: 1.382, 4: 1.185 };
  // Deeming years by install year (scheme ends 2030)
  R.deeming = { 2026: 5, 2027: 4, 2028: 3, 2029: 2, 2030: 1 };

  // Cheaper Home Batteries: STCs per usable kWh, by install window
  R.batteryWindows = [
    { id: "2026", label: "Installed by 31 Dec 2026", factor: 6.8 },
    { id: "2027h1", label: "Installed Jan to Jun 2027", factor: 5.7 }
  ];
  R.batteryNextStep = "1 January 2027";

  R.states = {
    NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia",
    SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory"
  };

  R.stateFromPostcode = function (pc) {
    var n = parseInt(String(pc || "").trim(), 10);
    if (!/^\d{4}$/.test(String(pc || "").trim()) || isNaN(n)) return null;
    if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return "ACT";
    if (n >= 800 && n <= 999) return "NT";
    if (n >= 1000 && n <= 2999) return "NSW";
    if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999)) return "VIC";
    if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9999)) return "QLD";
    if (n >= 5000 && n <= 5999) return "SA";
    if (n >= 6000 && n <= 6999) return "WA";
    if (n >= 7000 && n <= 7999) return "TAS";
    return null;
  };

  // Estimated STC zone. The Clean Energy Regulator sets the exact zone per postcode;
  // this is a close approximation and the installer's quote is final.
  R.zoneFromPostcode = function (pc) {
    var st = R.stateFromPostcode(pc);
    var n = parseInt(pc, 10);
    if (!st) return null;
    if (st === "VIC" || st === "TAS") return 4;
    if (st === "NT") return n >= 870 && n <= 879 ? 1 : 2;
    if (st === "WA") return n >= 6700 && n <= 6799 ? 1 : 3;
    return 3;
  };

  R.solarStcs = function (kw, zone, year) {
    var d = R.deeming[year] || 0;
    var r = R.zoneRating[zone] || 0;
    if (!(kw > 0)) return 0;
    return Math.floor(kw * r * d);
  };

  R.batteryStcs = function (kwh, factor) {
    var k = Math.min(Math.max(kwh || 0, 0), 50);
    if (k < 5) return 0;
    var weighted = Math.min(k, 14) + 0.6 * Math.max(0, Math.min(k, 28) - 14) + 0.15 * Math.max(0, k - 28);
    return Math.floor(weighted * factor);
  };

  R.waBattery = function (kwh, retailer) {
    if (!(kwh >= 5)) return 0;
    if (retailer === "horizon") return Math.min(380 * kwh, 3800);
    if (retailer === "synergy") return Math.min(130 * kwh, 1300);
    return 0;
  };

  // Typical sizes by quarterly bill band, used only to illustrate the rebate
  R.sizeForBill = {
    "lt300": { kw: 6.6, kwh: 10 },
    "300-500": { kw: 10, kwh: 13.5 },
    "500-750": { kw: 13.3, kwh: 16 },
    "gt750": { kw: 13.3, kwh: 20 }
  };

  // Full estimate shown at the end of the quiz
  R.estimate = function (o) {
    // o: { postcode, product: solar|battery|both, bill, waRetailer, batteryWindow }
    var state = R.stateFromPostcode(o.postcode);
    var zone = R.zoneFromPostcode(o.postcode);
    var size = R.sizeForBill[o.bill] || R.sizeForBill["300-500"];
    var win = R.batteryWindows[0];
    var lines = [];
    var wantSolar = o.product === "solar" || o.product === "both";
    var wantBattery = o.product === "battery" || o.product === "both";
    if (wantSolar && zone) {
      var s = R.solarStcs(size.kw, zone, 2026);
      lines.push({ key: "stc", label: "Federal solar rebate (STCs)", detail: size.kw + " kW, zone " + zone + ": " + s + " certificates at $" + R.stcPrice, amount: s * R.stcPrice });
    }
    if (wantBattery) {
      var b = R.batteryStcs(size.kwh, win.factor);
      lines.push({ key: "chb", label: "Federal battery rebate", detail: size.kwh + " kWh battery: " + b + " certificates at $" + R.stcPrice, amount: b * R.stcPrice });
    }
    if (state === "VIC" && wantSolar) {
      lines.push({ key: "vic", label: "Solar Homes rebate (VIC)", detail: "Up to $1,400 if eligible: owner occupier, household income under $150,000, no earlier Solar Homes rebate", amount: 1400, conditional: true });
    }
    if (state === "WA" && wantBattery && (o.waRetailer === "synergy" || o.waRetailer === "horizon")) {
      lines.push({ key: "wa", label: "WA Residential Battery Scheme", detail: (o.waRetailer === "horizon" ? "Horizon Power customer" : "Synergy customer") + ", battery joined to a VPP", amount: R.waBattery(size.kwh, o.waRetailer), conditional: true });
    }
    var total = lines.reduce(function (t, l) { return t + l.amount; }, 0);
    return { state: state, zone: zone, size: size, lines: lines, total: total };
  };

  R.money = function (n) {
    return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  root.Rebates = R;
})(typeof globalThis !== "undefined" ? globalThis : this);
