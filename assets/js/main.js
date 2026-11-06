/* True Care — progressive enhancement only. Every word of content is in the HTML;
   this file adds navigation behaviour, the live open/closed status and form submit. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js"); /* normally already set by the inline head script */

  /* ---------- Reveal on scroll (with failsafe so content can never stay hidden) ---------- */
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  function showAll() { reveals.forEach(function (el) { el.classList.add("is-in"); }); }
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    setTimeout(showAll, 2500);
  } else { showAll(); }

  /* ---------- Header shadow ---------- */
  var header = document.querySelector(".header");
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { header.classList.toggle("is-scrolled", window.scrollY > 8); ticking = false; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Desktop dropdowns (click + hover, Esc closes) ---------- */
  var items = [].slice.call(document.querySelectorAll(".nav__item[data-menu]"));
  function closeAll(except) {
    items.forEach(function (it) {
      if (it === except) return;
      it.classList.remove("is-open");
      var b = it.querySelector("button"); if (b) b.setAttribute("aria-expanded", "false");
    });
  }
  items.forEach(function (it) {
    var btn = it.querySelector("button");
    var t;
    btn.addEventListener("click", function () {
      var open = !it.classList.contains("is-open");
      closeAll(it); it.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open));
    });
    it.addEventListener("mouseenter", function () { if (window.matchMedia("(hover:hover)").matches) { clearTimeout(t); closeAll(it); it.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); } });
    it.addEventListener("mouseleave", function () { if (window.matchMedia("(hover:hover)").matches) { t = setTimeout(function () { it.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }, 160); } });
    it.addEventListener("focusout", function (e) { if (!it.contains(e.relatedTarget)) { it.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); } });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeAll(); closeDrawer(); } });
  document.addEventListener("click", function (e) { if (!e.target.closest(".nav__item")) closeAll(); });

  /* ---------- Mobile drawer ---------- */
  var drawer = document.getElementById("drawer");
  var burger = document.querySelector(".burger");
  var lastFocus = null;
  function openDrawer() {
    if (!drawer) return; lastFocus = document.activeElement;
    drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden";
    var c = drawer.querySelector(".drawer__close"); if (c) c.focus();
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false"); document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  if (burger && drawer) {
    burger.addEventListener("click", openDrawer);
    drawer.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeDrawer(); });
  }

  /* ---------- Hours: today's row + open/closed, always in the clinic's timezone ---------- */
  var hoursData = null;
  try { hoursData = JSON.parse(document.body.getAttribute("data-hours") || "null"); } catch (e) { hoursData = null; }
  var TZ = document.body.getAttribute("data-tz") || "America/Toronto";
  function clinicNow() {
    var parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: map[o.weekday], mins: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
  }
  function toMins(s) { var a = s.split(":"); return parseInt(a[0], 10) * 60 + parseInt(a[1], 10); }
  function fmt(s) { var m = toMins(s), h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + (mm ? ":" + String(mm).padStart(2, "0") : "") + " " + ap; }
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function statusText() {
    if (!hoursData) return null;
    var n = clinicNow(), today = hoursData[String(n.day)];
    if (today && n.mins >= toMins(today[0]) && n.mins < toMins(today[1])) return { open: true, text: "Open now · until " + fmt(today[1]) };
    if (today && n.mins < toMins(today[0])) return { open: false, text: "Closed · opens today at " + fmt(today[0]) };
    for (var i = 1; i <= 7; i++) {
      var d = (n.day + i) % 7, h = hoursData[String(d)];
      if (h) return { open: false, text: "Closed · opens " + (i === 1 ? "tomorrow" : DAYS[d]) + " at " + fmt(h[0]) };
    }
    return null;
  }
  function paintHours() {
    var s = statusText();
    if (s) [].forEach.call(document.querySelectorAll("[data-status]"), function (el) {
      el.setAttribute("data-open", String(s.open));
      var t = el.querySelector(".status__text"); if (t) t.textContent = s.text;
    });
    if (hoursData) {
      var d = clinicNow().day;
      [].forEach.call(document.querySelectorAll(".hours tr[data-day]"), function (tr) {
        tr.classList.toggle("is-today", tr.getAttribute("data-day") === String(d));
      });
    }
  }
  paintHours(); setInterval(paintHours, 60000);

  /* ---------- Forms (Web3Forms-style JSON endpoint; no health information collected) ---------- */
  [].forEach.call(document.querySelectorAll("form[data-ajax]"), function (form) {
    var status = form.querySelector(".form__status");
    function setErr(field, on) { var f = field.closest(".field"); if (f) f.classList.toggle("is-invalid", on); field.setAttribute("aria-invalid", on ? "true" : "false"); }
    [].forEach.call(form.querySelectorAll("[required]"), function (f) {
      f.addEventListener("blur", function () { setErr(f, !f.checkValidity()); });
    });
    form.addEventListener("submit", function (e) {
      var bad = [].filter.call(form.querySelectorAll("[required]"), function (f) { var b = !f.checkValidity(); setErr(f, b); return b; });
      if (bad.length) { e.preventDefault(); bad[0].focus(); return; }
      var key = form.querySelector("[name=access_key]");
      if (!window.fetch || !key || /PLACEHOLDER/.test(key.value)) {
        e.preventDefault();
        status.className = "form__status is-err";
        status.textContent = "Online enquiries are not connected yet. Please call (289) 674-9676 or email reception@truecarefertility.ca.";
        return;
      }
      e.preventDefault();
      var btn = form.querySelector("[type=submit]"); btn.disabled = true; var label = btn.textContent; btn.textContent = "Sending…";
      fetch(form.action, { method: "POST", headers: { "Accept": "application/json" }, body: new FormData(form) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.success !== false }; }); })
        .then(function (r) {
          if (r.ok) { form.reset(); status.className = "form__status is-ok"; status.textContent = "Thank you — your message has been sent. Our reception team will reply by phone or email."; }
          else throw new Error();
        })
        .catch(function () { status.className = "form__status is-err"; status.textContent = "Sorry, that didn’t send. Please call (289) 674-9676 or email reception@truecarefertility.ca."; })
        .then(function () { btn.disabled = false; btn.textContent = label; status.setAttribute("tabindex", "-1"); status.focus(); });
    });
  });

  /* ---------- Click-to-load maps ---------- */
  [].forEach.call(document.querySelectorAll("[data-load-map]"), function (b) {
    b.addEventListener("click", function () {
      var box = b.closest("[data-map]"); if (!box) return;
      var f = document.createElement("iframe");
      f.src = box.getAttribute("data-map"); f.title = box.getAttribute("data-title") || "Map";
      f.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      box.classList.remove("map-facade"); box.innerHTML = ""; box.appendChild(f); f.focus();
    });
  });

  /* ---------- Year ---------- */
  [].forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(new Date());
  });
})();
