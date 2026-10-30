/* Browser code: attribution, the rebate quiz, calculators and the thank-you follow-up. */
(function () {
  "use strict";
  var R = window.Rebates;
  var SITE = window.SITE || {};
  var PREVIEW = !!SITE.preview;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  function store(kind) { try { var s = window[kind]; s.setItem("__t", "1"); s.removeItem("__t"); return s; } catch (e) { return null; } }
  var LS = store("localStorage"), SS = store("sessionStorage");
  var mem = {};
  function get(k) { try { return JSON.parse((SS && SS.getItem(k)) || (LS && LS.getItem(k)) || "null") || mem[k] || null; } catch (e) { return mem[k] || null; } }
  function put(k, v, persist) { mem[k] = v; try { (persist && LS ? LS : SS) && (persist && LS ? LS : SS).setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- Attribution: where did this visitor come from? ---------- */
  function cookie(n) { var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
  var attribution = (function () {
    var p = new URLSearchParams(location.search);
    var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "aff"];
    var now = {};
    keys.forEach(function (k) { if (p.get(k)) now[k] = p.get(k); });
    var saved = get("attr") || {};
    var hasNew = Object.keys(now).length > 0;
    // Last paid or tagged touch wins; untagged return visits keep the earlier source
    var a = hasNew ? now : saved;
    if (!a.landing || hasNew) { a.landing = location.pathname; a.referrer = document.referrer || ""; a.firstSeen = new Date().toISOString(); }
    put("attr", a, true);
    return a;
  })();
  function currentAttribution() {
    var a = Object.assign({}, attribution);
    a.fbp = cookie("_fbp");
    a.fbc = cookie("_fbc") || (a.fbclid ? "fb.1." + Date.now() + "." + a.fbclid : "");
    return a;
  }
  // Keep campaign tags on internal links so the landing page to quiz hop doesn't lose them
  if (location.search && /utm_|gclid|fbclid|aff=/.test(location.search)) {
    $$("a[data-keep-tags]").forEach(function (a) { a.href += (a.href.indexOf("?") > -1 ? "&" : "?") + location.search.slice(1); });
  }

  /* ---------- Countdown to the next battery step-down ---------- */
  $$("[data-countdown]").forEach(function (el) {
    var days = Math.ceil((new Date("2027-01-01T00:00:00+10:00") - new Date()) / 86400000);
    if (days > 0) el.textContent = days + (days === 1 ? " day" : " days");
    else el.closest(".countdown") && (el.closest(".countdown").hidden = true);
  });

  /* ---------- The rebate quiz ---------- */
  var STEPS = [
    { id: "product", q: "What are you looking to install?", hint: "We'll match the rebates to what you want.", options: [
      ["both", "Solar and a battery", "The biggest combined rebate"], ["battery", "A battery", "I already have solar"], ["solar", "Solar panels", "No battery for now"]] },
    { id: "postcode", q: "What's your postcode?", hint: "Rebates depend on your STC zone and state.", input: true },
    { id: "ownership", q: "Do you own the home?", hint: "The rebate and the install need the owner's sign-off.", options: [
      ["owner-occupier", "I own it and live in it"], ["landlord", "I own it and rent it out"], ["renter", "I'm renting"], ["business", "It's a business premises"]] },
    { id: "bill", q: "Roughly how much is your power bill each quarter?", hint: "A guess is fine. This sets the system size we estimate on.", cols: true, options: [
      ["lt300", "Under $300"], ["300-500", "$300 to $500"], ["500-750", "$500 to $750"], ["gt750", "Over $750"]] },
    { id: "existing", q: "Do you already have solar panels?", skip: function (d) { return d.product === "battery"; }, options: [
      ["none", "No, this would be our first system"], ["has-solar", "Yes, we'd add to or replace it"]] },
    { id: "waRetailer", q: "Who supplies your electricity?", hint: "WA's battery rebate is different for each.", skip: function (d) { return d.state !== "WA" || d.product === "solar"; }, options: [
      ["synergy", "Synergy", "Perth and the south-west"], ["horizon", "Horizon Power", "Regional WA"], ["unsure", "Not sure"]] },
    { id: "timeframe", q: "When are you hoping to have it installed?", options: [
      ["asap", "As soon as possible"], ["1-3m", "In the next 1 to 3 months"], ["3-6m", "In 3 to 6 months"], ["researching", "Just researching for now"]] },
    { id: "result" }
  ];

  function Quiz(root) {
    this.root = root;
    this.data = {};
    this.started = Date.now();
    this.eventId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    var preset = root.getAttribute("data-product");
    var presetState = root.getAttribute("data-state");
    if (presetState) this.presetState = presetState;
    this.history = [];
    this.i = 0;
    if (preset) { this.data.product = preset; this.i = 1; }
    this.render();
  }
  Quiz.prototype.visible = function () { var d = this.data; return STEPS.filter(function (s) { return !(s.skip && s.skip(d)); }); };
  Quiz.prototype.go = function (n) { this.history.push(this.i); this.i = n; this.render(true); };
  Quiz.prototype.next = function () {
    var vis = this.visible(), cur = STEPS[this.i];
    var idx = vis.indexOf(cur);
    var nxt = vis[idx + 1];
    this.go(STEPS.indexOf(nxt));
  };
  Quiz.prototype.back = function () { if (this.history.length) { this.i = this.history.pop(); this.render(true); } };
  Quiz.prototype.render = function (focus) {
    var self = this, step = STEPS[this.i], vis = this.visible();
    var pos = vis.indexOf(step) + 1, total = vis.length;
    if (this.data.ownership === "renter" && step.id !== "ownership") return this.renderRenter();
    var html = '<div class="quiz-top"><div class="quiz-progress" aria-hidden="true"><span style="width:' + Math.round((pos / total) * 100) + '%"></span></div>' +
      '<div class="quiz-steplabel"><span>Step ' + pos + ' of ' + total + '</span><span>About 60 seconds</span></div></div>';
    if (step.id === "result") { this.root.innerHTML = html; return this.renderResult(focus); }
    html += '<h2 tabindex="-1">' + step.q + '</h2>' + (step.hint ? '<p class="hint">' + step.hint + '</p>' : "");
    if (step.input) {
      html += '<form class="stack" novalidate><div class="field"><label for="q-postcode">Postcode</label>' +
        '<input id="q-postcode" name="postcode" inputmode="numeric" autocomplete="postal-code" maxlength="4" pattern="\\d{4}" value="' + (this.data.postcode || "") + '" placeholder="e.g. 4152">' +
        '<div class="err" id="q-postcode-err" role="alert"></div></div><div id="q-zone"></div>' +
        '<button class="btn" type="submit">Next</button></form>';
    } else {
      html += '<div class="choices' + (step.cols ? " cols-2" : "") + '" role="group" aria-label="' + step.q + '">' + step.options.map(function (o) {
        return '<button type="button" class="choice" data-v="' + o[0] + '" aria-pressed="' + (self.data[step.id] === o[0]) + '"><span class="dot"></span><span>' + o[1] + (o[2] ? "<small>" + o[2] + "</small>" : "") + "</span></button>";
      }).join("") + "</div>";
    }
    html += '<div class="quiz-nav">' + (this.history.length ? '<button type="button" class="linkish" data-back>Back</button>' : "<span></span>") +
      '<span class="small muted">Free. No obligation.</span></div>';
    this.root.innerHTML = html;
    if (focus) { var h = $("h2", this.root); h && h.focus({ preventScroll: true }); }
    $$(".choice", this.root).forEach(function (b) {
      b.addEventListener("click", function () {
        self.data[step.id] = b.getAttribute("data-v");
        if (step.id === "ownership" && self.data.ownership === "renter") return self.renderRenter();
        self.next();
      });
    });
    var back = $("[data-back]", this.root); back && back.addEventListener("click", function () { self.back(); });
    if (step.input) {
      var inp = $("#q-postcode", this.root), zone = $("#q-zone", this.root), err = $("#q-postcode-err", this.root);
      var show = function () {
        var st = R.stateFromPostcode(inp.value);
        zone.innerHTML = st ? '<span class="zonechip">' + R.states[st] + ' · STC zone <b>' + R.zoneFromPostcode(inp.value) + "</b></span>" : "";
      };
      inp.addEventListener("input", function () { inp.value = inp.value.replace(/\D/g, "").slice(0, 4); err.textContent = ""; show(); });
      show();
      $("form", this.root).addEventListener("submit", function (e) {
        e.preventDefault();
        var st = R.stateFromPostcode(inp.value);
        if (!st) { err.textContent = "Enter a 4-digit Australian postcode."; inp.closest(".field").classList.add("bad"); inp.focus(); return; }
        self.data.postcode = inp.value; self.data.state = st;
        self.next();
      });
      if (!focus) {} else inp.focus({ preventScroll: true });
    }
  };
  Quiz.prototype.renderRenter = function () {
    var self = this;
    this.root.innerHTML = '<h2 tabindex="-1">Thanks for checking</h2>' +
      '<p>Solar and battery rebates are claimed on the property, so the owner needs to arrange the install. Many landlords are open to it, because it lifts the value of the home.</p>' +
      '<p class="muted small">If you\'re in Victoria, Solar Victoria also runs a rebate for rental properties that needs an agreement signed by both the landlord and the tenant.</p>' +
      '<div class="quiz-nav"><button type="button" class="linkish" data-back>Go back</button><a class="btn btn-small btn-ghost" href="' + link("guides/how-solar-rebates-work/") + '">How rebates work</a></div>';
    $("[data-back]", this.root).addEventListener("click", function () { self.data.ownership = null; self.render(true); });
    $("h2", this.root).focus({ preventScroll: true });
  };
  Quiz.prototype.renderResult = function (focus) {
    var self = this, d = this.data;
    var est = R.estimate({ postcode: d.postcode, product: d.product, bill: d.bill, waRetailer: d.waRetailer });
    this.estimate = est;
    var rows = est.lines.map(function (l) {
      return '<div class="receipt-row"><span class="lbl">' + l.label + (l.conditional ? '<span class="cond">if eligible</span>' : "") + '</span><span class="amt">' + R.money(l.amount) + '</span><span class="det">' + l.detail + "</span></div>";
    }).join("");
    var wrap = document.createElement("div");
    wrap.className = "stack";
    wrap.innerHTML =
      '<h2 tabindex="-1">Your estimated rebates</h2>' +
      '<div class="receipt" aria-label="Rebate estimate"><div class="receipt-head"><span>' + d.postcode + " · " + R.states[est.state] + '</span><span>As at ' + R.asAt + "</span></div>" + rows +
      '<div class="receipt-total"><span><b>Estimated total</b></span><span class="amt">' + R.money(est.total) + "</span></div>" +
      '<p class="receipt-foot">Based on a typical ' + (d.product === "battery" ? est.size.kwh + " kWh battery" : d.product === "solar" ? est.size.kw + " kW system" : est.size.kw + " kW system and " + est.size.kwh + " kWh battery") + ' for your bill, installed before 1 January 2027. Your installer confirms the exact figure.</p></div>' +
      '<p><b>Where should we send it?</b> We\'ll pass your details to ' + (SITE.partner || 'our installation partner') + ', our installation partner, for a free written quote.</p>' +
      '<form class="stack" id="lead-form" novalidate>' +
      '<div class="grid-2">' + field("firstName", "First name", "given-name") + field("lastName", "Last name", "family-name") + "</div>" +
      '<div class="grid-2">' + field("mobile", "Mobile", "tel", "tel", "04") + field("email", "Email", "email", "email") + "</div>" +
      field("street", "Street address", "address-line1") +
      '<div class="grid-2">' + field("suburb", "Suburb", "address-level2") + '<div class="field"><label for="f-postcode">Postcode</label><input id="f-postcode" value="' + d.postcode + '" readonly></div></div>' +
      '<label class="hp" aria-hidden="true">Leave this empty<input name="hp" tabindex="-1" autocomplete="off"></label>' +
      '<label class="check"><input type="checkbox" id="f-consent" name="consent"><span>I agree to ' + (SITE.brand || "this site") + ' passing my details to its installation partner, ' + (SITE.partner || 'our installation partner') + ', and to both contacting me by phone, SMS and email about my quote, even if my number is on the Do Not Call Register. See the <a href="' + link("collection-statement/") + '" target="_blank" rel="noopener">collection statement</a>.</span></label>' +
      '<div class="err small" id="f-consent-err" role="alert" style="color:var(--danger)"></div>' +
      '<div class="formerror" id="f-error" role="alert" hidden></div>' +
      '<button class="btn" type="submit" id="f-submit">Get my free quote</button>' +
      '<p class="small muted">Only ' + (SITE.partner || 'our installation partner') + ' contacts you. We don\'t pass your details to anyone else.</p></form>' +
      '<div class="quiz-nav"><button type="button" class="linkish" data-back>Back</button><span></span></div>';
    this.root.appendChild(wrap);
    if (focus) $("h2", this.root).focus({ preventScroll: true });
    $("[data-back]", this.root).addEventListener("click", function () { self.back(); });
    $("#lead-form", this.root).addEventListener("submit", function (e) { e.preventDefault(); self.submit(this); });
  };
  function field(name, label, ac, type, ph) {
    return '<div class="field"><label for="f-' + name + '">' + label + '</label><input id="f-' + name + '" name="' + name + '" type="' + (type || "text") + '" autocomplete="' + ac + '"' + (type === "tel" ? ' inputmode="tel"' : "") + (ph ? ' placeholder="' + ph + '"' : "") + '><div class="err" id="f-' + name + '-err" role="alert"></div></div>';
  }
  function link(path) { return (SITE.root || "/") + path + (SITE.pretty ? "" : "index.html"); }

  Quiz.prototype.submit = function (form) {
    var self = this, d = this.data, est = this.estimate;
    var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ""; };
    var payload = {
      firstName: v("firstName"), lastName: v("lastName"), mobile: v("mobile"), email: v("email"),
      street: v("street"), suburb: v("suburb"), postcode: d.postcode, state: d.state,
      product: d.product, ownership: d.ownership, bill: d.bill, timeframe: d.timeframe,
      existing: d.product === "battery" ? "has-solar" : d.existing, waRetailer: d.waRetailer || "",
      consent: $("#f-consent", form).checked, hp: form.elements.hp.value,
      elapsedMs: Date.now() - this.started, estimateTotal: est.total,
      estimateLines: est.lines.map(function (l) { return { label: l.label, amount: l.amount }; }),
      attribution: currentAttribution(), eventId: this.eventId, pageUrl: location.href.split("#")[0]
    };
    // Quick checks in the browser; the server checks everything again
    var errs = {};
    if (!payload.firstName) errs.firstName = "Enter your first name.";
    if (!payload.lastName) errs.lastName = "Enter your last name.";
    if (!/^(\+?61|0)4\d{8}$/.test(payload.mobile.replace(/[\s()-]/g, ""))) errs.mobile = "Enter an Australian mobile, like 0412 345 678.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) errs.email = "Enter a valid email address.";
    if (!payload.street) errs.street = "Enter your street address.";
    if (!payload.suburb) errs.suburb = "Enter your suburb.";
    if (!payload.consent) errs.consent = "Tick the box so we can pass your details to our installation partner.";
    showErrors(form, errs);
    if (Object.keys(errs).length) return;
    var btn = $("#f-submit", form), box = $("#f-error", form);
    btn.disabled = true; btn.textContent = "Sending…"; box.hidden = true;
    var done = function (out) {
      put("lead", { ref: out.ref, token: out.token, firstName: payload.firstName, suburb: payload.suburb, total: est.total, grade: out.grade });
      if (window.fbq) window.fbq("track", "Lead", { content_category: payload.product }, { eventID: self.eventId });
      if (window.gtag) window.gtag("event", "generate_lead", { value: 1, currency: "AUD", lead_grade: out.grade });
      location.href = link("thank-you/") + "?ref=" + encodeURIComponent(out.ref) + "&t=" + encodeURIComponent(out.token);
    };
    if (PREVIEW) return setTimeout(function () { done({ ref: "preview", token: "preview", grade: "A" }); }, 500);
    fetch((SITE.api || "") + "/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body.ok) return done(res.body);
        if (res.body.fields) showErrors(form, res.body.fields);
        box.textContent = res.body.error || "Something went wrong. Try again in a minute.";
        box.hidden = false; btn.disabled = false; btn.textContent = "Get my free quote";
      })
      .catch(function () {
        box.textContent = "We couldn't reach our server. Check your connection and try again" + (SITE.phone ? ", or call " + SITE.phone : "") + ".";
        box.hidden = false; btn.disabled = false; btn.textContent = "Get my free quote";
      });
  };
  function showErrors(form, errs) {
    $$(".field", form).forEach(function (f) { f.classList.remove("bad"); var e = $(".err", f); if (e) e.textContent = ""; });
    var c = $("#f-consent-err", form); if (c) c.textContent = errs.consent || "";
    var first = null;
    Object.keys(errs).forEach(function (k) {
      var el = $("#f-" + k + "-err", form);
      if (el && k !== "consent") { el.textContent = errs[k]; el.closest(".field").classList.add("bad"); first = first || $("#f-" + k, form); }
    });
    if (first) first.focus();
  }
  $$("[data-quiz]").forEach(function (el) { new Quiz(el); });

  /* ---------- Thank-you page ---------- */
  var ty = $("#followup");
  if (ty) {
    var q = new URLSearchParams(location.search);
    var lead = get("lead") || {};
    var ref = q.get("ref") || lead.ref, token = q.get("t") || lead.token;
    var hi = $("#ty-name"); if (hi && lead.firstName) hi.textContent = ", " + lead.firstName;
    var tot = $("#ty-total"); if (tot && lead.total) { tot.textContent = R.money(lead.total); tot.closest("[hidden]") && (tot.closest("[hidden]").hidden = false); }
    ty.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = ty.elements, msg = $("#ty-msg");
      var body = { ref: ref, token: token, roof: f.roof.value, storeys: f.storeys.value, phase: f.phase.value, callTime: f.callTime.value, notes: f.notes.value };
      var btn = $("button[type=submit]", ty); btn.disabled = true;
      var ok = function () { ty.hidden = true; msg.hidden = false; };
      if (PREVIEW || ref === "preview") return ok();
      fetch((SITE.api || "") + "/api/lead-update", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); }).then(function (j) { if (j.ok) ok(); else { btn.disabled = false; alert2(j.error); } })
        .catch(function () { btn.disabled = false; alert2("We couldn't send that. Your enquiry is still with us."); });
    });
  }
  function alert2(t) { var b = $("#ty-err"); if (b) { b.textContent = t; b.hidden = false; } }

  /* ---------- Calculators ---------- */
  function bindCalc(id, fn) {
    var root = document.getElementById(id); if (!root) return;
    var run = function () { try { fn(root); } catch (e) { console.error(e); } };
    $$("input, select", root).forEach(function (el) { el.addEventListener("input", run); el.addEventListener("change", run); });
    run();
  }
  function setOut(root, name, v) { var el = $('[data-out="' + name + '"]', root); if (el) el.textContent = v; }

  bindCalc("calc-stc", function (root) {
    var pc = $("#stc-postcode", root).value.replace(/\D/g, "").slice(0, 4);
    var kw = parseFloat($("#stc-kw", root).value);
    var year = parseInt($("#stc-year", root).value, 10);
    setOut(root, "kw", kw.toFixed(1) + " kW");
    var zone = R.zoneFromPostcode(pc), st = R.stateFromPostcode(pc);
    if (!zone) { setOut(root, "zone", "–"); setOut(root, "stcs", "–"); setOut(root, "value", "–"); setOut(root, "where", "Enter a postcode"); return; }
    var n = R.solarStcs(kw, zone, year);
    setOut(root, "where", R.states[st]); setOut(root, "zone", "Zone " + zone);
    setOut(root, "stcs", n + " certificates"); setOut(root, "value", R.money(n * R.stcPrice));
    setOut(root, "working", kw.toFixed(1) + " kW × " + R.zoneRating[zone] + " (zone " + zone + ") × " + R.deeming[year] + " years = " + n + " STCs × $" + R.stcPrice);
  });

  bindCalc("calc-battery", function (root) {
    var kwh = parseFloat($("#bat-kwh", root).value);
    var win = R.batteryWindows.filter(function (w) { return w.id === $("#bat-window", root).value; })[0];
    var wa = $("#bat-wa", root).value;
    setOut(root, "kwh", kwh.toFixed(1) + " kWh");
    var n = R.batteryStcs(kwh, win.factor), fed = n * R.stcPrice, st = R.waBattery(kwh, wa);
    setOut(root, "fed", R.money(fed)); setOut(root, "state", st ? R.money(st) : "$0");
    setOut(root, "total", R.money(fed + st)); setOut(root, "perkwh", R.money((fed + st) / kwh) + " per kWh");
    setOut(root, "working", n + " certificates (" + win.factor + " per kWh on the first 14 kWh, 60% to 28 kWh, 15% to 50 kWh) × $" + R.stcPrice);
  });

  bindCalc("calc-savings", function (root) {
    var st = $("#sav-state", root).value, bill = parseFloat($("#sav-bill", root).value) || 0;
    var kw = parseFloat($("#sav-kw", root).value), battery = $("#sav-battery", root).checked;
    var tariff = (parseFloat($("#sav-tariff", root).value) || 32) / 100, fit = (parseFloat($("#sav-fit", root).value) || 5) / 100;
    setOut(root, "kw", kw.toFixed(1) + " kW");
    var y = (SITE.yields || {})[st] || 4;
    var gen = kw * y * 365;
    var supply = 1.1 * 365; // daily supply charge, roughly
    var usage = Math.max(0, (bill * 4 - supply) / tariff);
    var self = Math.min(gen * (battery ? 0.7 : 0.3), usage * (battery ? 0.85 : 0.45));
    var exported = Math.max(0, gen - self);
    var saving = self * tariff + exported * fit;
    var zone = st === "VIC" || st === "TAS" ? 4 : st === "NT" ? 2 : 3;
    var solarCost = kw * 1000 - R.solarStcs(kw, zone, 2026) * R.stcPrice;
    var batCost = battery ? 13.5 * 1050 - R.batteryStcs(13.5, R.batteryWindows[0].factor) * R.stcPrice : 0;
    var cost = Math.max(0, solarCost + batCost);
    setOut(root, "gen", Math.round(gen).toLocaleString("en-AU") + " kWh");
    setOut(root, "saving", R.money(saving));
    setOut(root, "cost", R.money(cost));
    setOut(root, "payback", saving > 0 ? (cost / saving).toFixed(1) + " years" : "–");
  });
})();
