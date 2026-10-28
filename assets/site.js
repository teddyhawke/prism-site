/* Prism Entertainment: site behaviour (menu, work filters, video player, inquiry form). */
(function () {
  "use strict";

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
    setTimeout(done, 2500); // safety net
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

  /* Work filters */
  var chips = document.querySelectorAll("[data-filter]");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      document.querySelectorAll("[data-kind]").forEach(function (item) {
        item.hidden = !(f === "all" || item.getAttribute("data-kind") === f);
      });
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
        frame.innerHTML = '<iframe src="' + url + '" title="' + (tile.getAttribute("data-title") || "Video") +
          '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
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
    var type = new URLSearchParams(location.search).get("type");
    if (type) {
      var match = form.querySelector('input[name="project_type"][value="' + type + '"]');
      if (match) match.checked = true;
    }

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
      var typeErr = document.getElementById("type-error");
      if (!form.querySelector('input[name="project_type"]:checked')) {
        typeErr.textContent = "Choose the kind of project."; typeErr.hidden = false;
        first = first || form.querySelector('input[name="project_type"]');
      } else { typeErr.hidden = true; }
      if (first) { first.focus(); return; }

      var submit = form.querySelector('button[type="submit"]');
      var done = document.getElementById("form-done");
      var finish = function () {
        form.hidden = true; done.hidden = false; done.focus();
        window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 100 });
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
      var picked = form.querySelector('input[name="project_type"]:checked');
      if (picked) fields.push({ objectTypeId: "0-1", name: "project_type", value: TYPE_LABELS[picked.value] || picked.value });

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
