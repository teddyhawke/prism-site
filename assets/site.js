/* Prism Entertainment: site behaviour (menu, work filters, video player, inquiry form). */
(function () {
  "use strict";

  /* Clicking the header logo replays the intro on the homepage. */
  var logo = document.querySelector(".site-header .logo");
  if (logo) logo.addEventListener("click", function () {
    try { sessionStorage.removeItem("prism-intro"); } catch (e) {}
  });

  /* Homepage intro: remember it played, and let a tap or key skip it. */
  var intro = document.getElementById("intro");
  var root = document.documentElement;
  if (intro && root.classList.contains("intro-on")) {
    var done = function () {
      root.classList.remove("intro-on");
      if (intro.parentNode) intro.parentNode.removeChild(intro);
      try { sessionStorage.setItem("prism-intro", "1"); } catch (e) {}
    };
    intro.addEventListener("animationend", function (e) { if (e.target === intro) done(); });
    intro.addEventListener("click", done);
    document.addEventListener("keydown", function () { if (intro.parentNode) done(); }, { once: true });
    setTimeout(done, 2400); // safety net
  }

  /* Mobile menu */
  var btn = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu");
  if (btn && menu) {
    btn.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) btn.click();
    });
  }

  /* Newsletter: beehiiv hides its form from people who already subscribed in this browser, and it can
     occasionally fail to load. Either way, after a few seconds without a form, show a "Go to newsletter" button. */
  var signup = document.querySelector(".signup-form");
  var fallback = document.querySelector(".signup-fallback");
  if (signup) {
    setTimeout(function () {
      var rendered = Array.prototype.some.call(signup.children, function (el) {
        return el.tagName !== "SCRIPT" && el.getBoundingClientRect().height > 10;
      });
      if (!rendered) {
        signup.style.minHeight = "0";
        if (fallback) fallback.hidden = false;
      }
    }, 4000);
  }

  /* Produce mosaic: tiles rest on a still frame.
     - Hover (mouse): the tile under the cursor plays its loop; leaving pauses and rewinds it.
     - Every couple of seconds a sheen sweeps across a random tile to invite a hover.
     - Touch screens (no hover): the tile that gets the sheen also plays through once.
     Runs only while the mosaic is on screen and the tab is visible; no motion for reduced-motion users. */
  var mosaic = document.querySelector(".mosaic");
  if (mosaic) {
    var tilesEls = mosaic.querySelectorAll(".mosaic-tile");
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = matchMedia("(hover: hover)").matches;
    var playTile = function (t) { var v = t.querySelector("video"); if (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } };
    var stopTile = function (t) { var v = t.querySelector("video"); if (v) { v.pause(); v.currentTime = 0; } };

    if (!reduce && canHover) {
      tilesEls.forEach(function (t) {
        t.addEventListener("mouseenter", function () { playTile(t); });
        t.addEventListener("mouseleave", function () { stopTile(t); });
      });
    }

    if (!reduce) {
      var last = -1, timer = null, onScreen = true;
      var shine = function () {
        if (!onScreen || document.hidden || !tilesEls.length) return;
        var i; do { i = Math.floor(Math.random() * tilesEls.length); } while (i === last && tilesEls.length > 1);
        last = i;
        var t = tilesEls[i];
        t.classList.remove("shine"); void t.offsetWidth; t.classList.add("shine");
        setTimeout(function () { t.classList.remove("shine"); }, 1200);
        if (!canHover) { playTile(t); setTimeout(function () { stopTile(t); }, 2600); }
      };
      var start = function () { if (!timer) { timer = setInterval(shine, canHover ? 2400 : 3000); setTimeout(shine, 600); } };
      var stop = function () { clearInterval(timer); timer = null; };
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          onScreen = entries[0].isIntersecting; onScreen ? start() : stop();
        }).observe(mosaic);
      } else { start(); }
    }
  }

  /* Work filters */
  var chips = document.querySelectorAll("[data-filter]");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      document.querySelectorAll("[data-kind]").forEach(function (item) {
        // An item can belong to several filters, e.g. data-kind="promo music".
        var kinds = (item.getAttribute("data-kind") || "").split(" ");
        item.hidden = !(f === "all" || kinds.indexOf(f) > -1);
      });
      document.querySelectorAll("[data-group]").forEach(function (g) {
        g.hidden = !g.querySelector("[data-kind]:not([hidden])");
      });
    });
  });

  /* Work page: a #music, #brand, #narrative or #promo link opens with that filter on. */
  if (location.hash && document.querySelector('[data-filter="' + location.hash.slice(1) + '"]')) {
    document.querySelector('[data-filter="' + location.hash.slice(1) + '"]').click();
  }

  /* Vertical promo: one card per project opens a list of its videos. */
  document.querySelectorAll(".promo-card").forEach(function (card) {
    var list = document.getElementById(card.getAttribute("aria-controls"));
    if (!list) return;
    card.addEventListener("click", function () {
      var open = card.getAttribute("aria-expanded") !== "true";
      card.setAttribute("aria-expanded", open ? "true" : "false");
      list.hidden = !open;
    });
  });

  /* Video player: tiles load the embed only when tapped, so pages stay fast on phones. */
  var player = document.getElementById("player");
  if (player && typeof player.showModal === "function") {
    var frame = player.querySelector(".player-frame");
    document.querySelectorAll("[data-video]").forEach(function (tile) {
      tile.addEventListener("click", function () {
        var url = tile.getAttribute("data-video");
        if (!url) return;
        frame.classList.toggle("vertical", tile.getAttribute("data-vertical") === "true");
        var title = tile.getAttribute("data-title") || "Video";
        if (/\.mp4($|\?)/i.test(url)) {
          // Self-hosted clip: native player.
          frame.innerHTML = '<video src="' + url + '" controls autoplay playsinline title="' + title + '"></video>';
        } else {
          frame.innerHTML = '<iframe src="' + url + '" title="' + title +
            '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
        }
        player.showModal();
      });
    });
    var close = function () { frame.innerHTML = ""; };
    player.addEventListener("close", close);
    player.querySelector(".player-close").addEventListener("click", function () { player.close(); });
    player.addEventListener("click", function (e) { if (e.target === player) player.close(); });
  }

  /* Inquiry form */
  var form = document.getElementById("inquiry");
  if (form) {
    // Where submissions go. Empty = staging mode (nothing is sent).
    var ENDPOINT = form.getAttribute("data-endpoint") || "";

    // Preselect project type from links like start.html?type=music
    // "Ask about" links name the package or service, e.g. start.html?type=development&about=Pitch%20Deck. It goes in the "Anything else" box.
    var about = new URLSearchParams(location.search).get("about");
    if (about && form.elements.message && !form.elements.message.value) {
      form.elements.message.value = "Asking about: " + about.slice(0, 60) + "\n";
    }
    var type = new URLSearchParams(location.search).get("type");
    var typeSel = form.elements.project_type;
    if (type && typeSel && typeSel.querySelector('option[value="' + type + '"]')) typeSel.value = type;

    /* Fill-in-the-blanks: each blank grows to fit its words, and its underline lights up once filled. */
    var blanks = form.querySelectorAll(".blank");
    var ruler = document.createElement("canvas").getContext("2d");
    var fit = function (el) {
      var cs = getComputedStyle(el);
      var text = el.tagName === "SELECT" ? el.options[el.selectedIndex].text : (el.value || el.placeholder);
      ruler.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      if ("letterSpacing" in ruler) ruler.letterSpacing = cs.letterSpacing;
      var extra = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + (el.tagName === "SELECT" ? 2 : 1);
      el.style.width = Math.ceil(ruler.measureText(text).width + extra) + "px";
      el.classList.toggle("filled", !!el.value);
      el.classList.toggle("is-empty", !el.value);
    };
    var fitAll = function () {
      // Long example placeholders swap to a short prompt when the sentence column is narrow (phones).
      blanks.forEach(function (el) {
        if (!el.dataset.short) return;
        if (!el.dataset.long) el.dataset.long = el.placeholder;
        el.placeholder = el.closest(".madlib").clientWidth < 520 ? el.dataset.short : el.dataset.long;
      });
      blanks.forEach(fit);
    };
    blanks.forEach(function (el) {
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () {
        fit(el);
        if (el.getAttribute("aria-invalid") && el.value) clear(el);
      });
    });
    fitAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

    /* Drop-off counts (GoatCounter, no cookies). Only counts are sent, never anything typed:
       "inquiry-started" on the first answer, "inquiry-sent" on success, and if someone leaves
       without sending, which blank they stopped at and how many of the blanks they had filled. */
    var track = function (name) {
      try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) {}
    };
    var BLANK_NAMES = { firstname: "first-name", lastname: "last-name", company: "company", project_type: "project-type",
      deliverables: "what-you-need", timing: "timeline", budget_range: "budget", email: "email" };
    var progress = { started: false, sent: false, reported: false };
    form.addEventListener("input", function () { if (!progress.started) { progress.started = true; track("inquiry-started"); } });
    form.addEventListener("change", function () { if (!progress.started) { progress.started = true; track("inquiry-started"); } });
    var reportDrop = function () {
      if (!progress.started || progress.sent || progress.reported) return;
      progress.reported = true;
      // "Stopped at" is the blank right after the furthest one they answered (some blanks are optional).
      var filled = 0, last = -1;
      blanks.forEach(function (el, i) { if (el.value.trim()) { filled++; last = i; } });
      var next = blanks[last + 1], stop = next ? (BLANK_NAMES[next.name] || next.name) : null;
      track("inquiry-stopped-at-" + (stop || "send-button"));
      track("inquiry-filled-" + filled + "-of-" + blanks.length);
    };
    window.addEventListener("pagehide", reportDrop);
    window.addEventListener("resize", fitAll);

    var fail = function (el, msg) {
      el.setAttribute("aria-invalid", "true");
      var err = document.getElementById(el.getAttribute("aria-describedby"));
      if (err) { err.textContent = msg; err.hidden = false; }
    };
    var clear = function (el) {
      el.removeAttribute("aria-invalid");
      var err = document.getElementById(el.getAttribute("aria-describedby"));
      if (err) { err.textContent = ""; err.hidden = true; }
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = null;
      ["firstname", "email"].forEach(function (n) {
        var el = form.elements[n];
        clear(el);
        if (!el.value.trim()) { fail(el, n === "firstname" ? "Add your first name so we know who to reply to." : "Add an email address so we can reply."); first = first || el; }
        else if (n === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) { fail(el, "Check the email address. It should look like name@company.com."); first = first || el; }
      });
      clear(typeSel);
      if (!typeSel.value) { fail(typeSel, "Pick the kind of project you're looking for."); first = first || typeSel; }
      if (first) { first.focus(); return; }

      var submit = form.querySelector('button[type="submit"]');
      var done = document.getElementById("form-done");
      var finish = function () {
        progress.sent = true; track("inquiry-sent");
        var hit = done.querySelector(".done-hit");
        var swap = function () {
          form.hidden = true; done.hidden = false;
          window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 140 });
          done.focus({ preventScroll: true });
        };
        // Sent: the RGB bands wipe across the screen. In their wake, "Good call." is left large in the middle,
        // then it glides down and settles into the first words of the thank-you line.
        if (matchMedia("(prefers-reduced-motion: reduce)").matches || !hit || !hit.animate) { done.classList.add("fade-in"); swap(); return; }
        var sweep = document.createElement("div");
        sweep.className = "send-sweep"; sweep.setAttribute("aria-hidden", "true");
        sweep.innerHTML = '<div class="sweep-backdrop"></div><div class="sweep-word"></div><div class="sweep-track"><div class="sweep-band r"></div><div class="sweep-band g"></div><div class="sweep-band b"></div></div>';
        document.body.appendChild(sweep);
        var fly = sweep.querySelector(".sweep-word"), backdrop = sweep.querySelector(".sweep-backdrop");
        fly.textContent = hit.textContent;
        done.classList.add("landing");
        // Copy the landed type exactly, so the hand-off is invisible.
        done.hidden = false;
        var cs = getComputedStyle(hit);
        fly.style.font = cs.fontWeight + " " + cs.fontSize + "/" + cs.lineHeight + " " + cs.fontFamily;
        fly.style.letterSpacing = cs.letterSpacing;
        done.hidden = true;
        var vw = window.innerWidth, vh = window.innerHeight;
        var w = fly.offsetWidth, h = fly.offsetHeight;
        var BIG = Math.min(3.4, (vw * 0.82) / w);
        var cx = (vw - w * BIG) / 2, cy = (vh - h * BIG) / 2;
        var at = function (x, y, s) { return "translate(" + x + "px," + y + "px) scale(" + s + ")"; };
        fly.style.transform = at(cx, cy, BIG);
        // While the bands cover the screen: swap the page underneath and place the word behind the bands.
        setTimeout(function () { swap(); backdrop.style.opacity = "1"; fly.style.opacity = "1"; }, 620);
        setTimeout(function () {
          var r = hit.getBoundingClientRect();
          var ease = "cubic-bezier(.65,0,.25,1)";
          backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: ease, fill: "forwards" });
          fly.animate([
            { transform: at(cx, cy, BIG) },
            { transform: at(r.left, r.top, 1) }
          ], { duration: 680, easing: ease, fill: "forwards" }).onfinish = function () {
            done.classList.remove("landing");
            if (sweep.parentNode) sweep.parentNode.removeChild(sweep);
          };
        }, 1500);
      };

      if (!ENDPOINT) { console.log("Staging mode, inquiry not sent:", Object.fromEntries(new FormData(form))); finish(); return; }

      // Bots fill the hidden field; quietly pretend success and send nothing.
      if (form.elements.website && form.elements.website.value) { finish(); return; }

      // HubSpot dropdown values are the full option labels.
      var TYPE_LABELS = {
        music: "Music video or release content",
        brand: "Commercial or branded content",
        services: "Production services",
        development: "Film or TV development",
        other: "Something else"
      };
      var fields = [];
      ["firstname", "lastname", "email", "company", "deliverables", "timing", "budget_range", "message"].forEach(function (n) {
        var el = form.elements[n];
        if (el && el.value.trim()) fields.push({ objectTypeId: "0-1", name: n, value: el.value.trim() });
      });
      if (typeSel.value) fields.push({ objectTypeId: "0-1", name: "project_type", value: TYPE_LABELS[typeSel.value] || typeSel.value });

      var hutk = (document.cookie.match(/(?:^|; )hubspotutk=([^;]+)/) || [])[1];
      var context = { pageUri: location.href, pageName: document.title };
      if (hutk) context.hutk = hutk;

      submit.disabled = true; submit.textContent = "Sending…";
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submittedAt: Date.now(), fields: fields, context: context })
      })
        .then(function (res) {
          if (!res.ok) return res.text().then(function (t) { throw new Error(t); });
          finish();
        })
        .catch(function (err) {
          console.error("Inquiry failed:", err);
          submit.disabled = false; submit.textContent = "Send inquiry";
          document.getElementById("send-error").hidden = false;
        });
    });
  }
})();
