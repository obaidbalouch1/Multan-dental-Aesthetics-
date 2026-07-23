/* =====================================================================
   Multan Dental Aesthetic — front-end interactions
   Vanilla JS + GSAP (loaded via CDN in index.html) for scroll reveals.
   No build step, no dependencies to install.
===================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* ---------------------------------------------------------------
     Image fallback: if a photo listed in images/ hasn't been added
     yet, keep the gradient placeholder instead of a broken icon.
  --------------------------------------------------------------- */
  document.querySelectorAll(".img-fallback img").forEach(function (img) {
    var wrap = img.closest(".img-fallback");
    img.addEventListener("load", function () {
      if (img.naturalWidth > 1) wrap.classList.add("has-image");
    });
    img.addEventListener("error", function () {
      wrap.classList.remove("has-image");
    });
    if (img.complete) img.dispatchEvent(new Event(img.naturalWidth > 1 ? "load" : "error"));
  });

  /* ---------------------------------------------------------------
     Nav: mobile toggle + shrink-on-scroll shadow
  --------------------------------------------------------------- */
  var navbar = document.getElementById("navbar");
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  var navScrim = document.getElementById("navScrim");

  function closeNav() {
    navbar.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }
  navToggle.addEventListener("click", function () {
    var isOpen = navbar.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen);
    navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });
  navLinks.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeNav);
  });
  if (navScrim) navScrim.addEventListener("click", closeNav);

  /* ---------------------------------------------------------------
     Scroll reveal (GSAP + ScrollTrigger, with a plain-CSS fallback
     so content is never invisible if the CDN script fails to load)
  --------------------------------------------------------------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    root.classList.add("reveal-ready");

    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: reduceMotion ? 0.01 : 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" }
      });
    });

    // subtle stagger for grids that read as one group
    ["services-grid", "trust-grid"].forEach(function (cls) {
      var group = document.querySelector("." + cls);
      if (!group) return;
      gsap.to(group.children, {
        opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.08,
        scrollTrigger: { trigger: group, start: "top 85%" }
      });
    });

    // Recalculate trigger positions once everything (fonts, placeholder
    // images, real photos added later) has settled into final layout.
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  } else {
    root.classList.add("js-no-gsap");
  }

  /* ---------------------------------------------------------------
     Hero visual: gentle pointer-tilt (desktop only, respects
     reduced-motion, disabled on touch devices)
  --------------------------------------------------------------- */
  var tiltEl = document.querySelector("[data-tilt] .hero-card-main");
  var tiltZone = document.querySelector("[data-tilt]");
  if (tiltEl && tiltZone && !reduceMotion && window.matchMedia("(hover:hover)").matches) {
    tiltZone.addEventListener("mousemove", function (e) {
      var r = tiltZone.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      tiltEl.style.transform = "rotateY(" + (px * 8) + "deg) rotateX(" + (py * -8) + "deg)";
    });
    tiltZone.addEventListener("mouseleave", function () {
      tiltEl.style.transform = "rotateY(0deg) rotateX(0deg)";
    });
  }

  /* ---------------------------------------------------------------
     Before / after comparison slider
  --------------------------------------------------------------- */
  var baSlider = document.getElementById("baSlider");
  var baHandle = document.getElementById("baHandle");
  var baBeforeClip = document.getElementById("baBeforeClip");

  function setBaPosition(percent) {
    percent = Math.min(100, Math.max(0, percent));
    baBeforeClip.style.clipPath = "inset(0 " + (100 - percent) + "% 0 0)";
    baHandle.style.left = percent + "%";
    baHandle.setAttribute("aria-valuenow", Math.round(percent));
  }

  if (baSlider && baHandle) {
    var dragging = false;

    function positionFromEvent(clientX) {
      var r = baSlider.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * 100;
    }
    function startDrag(e) {
      dragging = true;
      move(e);
    }
    function move(e) {
      if (!dragging) return;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setBaPosition(positionFromEvent(clientX));
    }
    function endDrag() { dragging = false; }

    baHandle.addEventListener("mousedown", startDrag);
    baSlider.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", endDrag);

    baHandle.addEventListener("touchstart", startDrag, { passive: true });
    baSlider.addEventListener("touchstart", startDrag, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", endDrag);

    baHandle.addEventListener("keydown", function (e) {
      var current = parseFloat(baHandle.getAttribute("aria-valuenow")) || 50;
      if (e.key === "ArrowLeft") setBaPosition(current - 5);
      if (e.key === "ArrowRight") setBaPosition(current + 5);
    });
  }

  /* ---------------------------------------------------------------
     Before / after case tabs: swap which pair of photos the slider
     above is showing. Multiple cases share the one slider instead of
     duplicating its markup (which is what caused duplicate-id bugs
     when this was hand-copied before).
  --------------------------------------------------------------- */
  var baTabs = document.querySelectorAll(".ba-tab");
  var baAfterWrap = document.getElementById("baAfterWrap");
  var baNote = document.getElementById("baNote");

  function activateCase(tab) {
    baTabs.forEach(function (t) {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");

    var afterImg = baAfterWrap.querySelector("img");
    var beforeImg = baBeforeClip.querySelector("img");

    // Reset fallback state before swapping src so a slow-loading photo
    // shows the gradient placeholder instead of the previous case's photo.
    baAfterWrap.classList.remove("has-image");
    baBeforeClip.classList.remove("has-image");
    afterImg.src = tab.dataset.after;
    beforeImg.src = tab.dataset.before;

    if (baNote) baNote.textContent = tab.dataset.note;
    setBaPosition(50);
  }

  baTabs.forEach(function (tab) {
    tab.addEventListener("click", function () { activateCase(tab); });
  });

  /* ---------------------------------------------------------------
     Testimonials: prev/next scroll-snap navigation
  --------------------------------------------------------------- */
  var track = document.getElementById("testimonialTrack");
  var prevBtn = document.querySelector(".t-prev");
  var nextBtn = document.querySelector(".t-next");
  if (track && prevBtn && nextBtn) {
    var scrollByCard = function (dir) {
      var card = track.querySelector(".testimonial-card");
      var gap = 24;
      track.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: "smooth" });
    };
    prevBtn.addEventListener("click", function () { scrollByCard(-1); });
    nextBtn.addEventListener("click", function () { scrollByCard(1); });
  }

  /* ---------------------------------------------------------------
     Floating "Book" button: appears once the hero is scrolled past
  --------------------------------------------------------------- */
  var fabBook = document.querySelector(".fab-book");
  var heroEl = document.querySelector(".hero");
  if (fabBook && heroEl) {
    var toggleFab = function () {
      var heroBottom = heroEl.getBoundingClientRect().bottom;
      fabBook.classList.toggle("is-visible", heroBottom < 0);
    };
    window.addEventListener("scroll", toggleFab, { passive: true });
    toggleFab();
  }

  /* ---------------------------------------------------------------
     Back-to-top
  --------------------------------------------------------------- */
  var toTop = document.getElementById("toTop");
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------------
     Footer year
  --------------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------
     Floating labels: keep <select> label lifted once a value is set
  --------------------------------------------------------------- */
  document.querySelectorAll(".form-group select").forEach(function (select) {
    var sync = function () {
      select.closest(".form-group").classList.toggle("select-filled", !!select.value);
    };
    select.addEventListener("change", sync);
    sync();
  });

  /* ---------------------------------------------------------------
     Appointment form → WhatsApp
     Validates the fields, then opens WhatsApp with a pre-filled
     booking message to the clinic. Works with zero hosting/backend.

     (The email backend in /server still exists and is fully wired —
     to switch back to it later, see the git-less "fetch version"
     documented at the bottom of this file.)
  --------------------------------------------------------------- */
  var WHATSAPP_NUMBER = "923117594193"; // country code + number, digits only
  var form = document.getElementById("appointmentForm");
  var submitBtn = document.getElementById("formSubmit");
  var formNote = document.getElementById("formNote");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      formNote.textContent = "";
      formNote.classList.remove("is-error");

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = Object.fromEntries(new FormData(form).entries());
      var lines = [
        "Assalam-o-Alaikum, Multan Dental Aesthetic!",
        "",
        "I'd like to book an appointment.",
        "Name: " + data.name,
        "Phone: " + data.phone,
        "Treatment: " + data.service,
        "Preferred date: " + (data.date || "flexible")
      ];
      if (data.message && data.message.trim()) {
        lines.push("Note: " + data.message.trim());
      }

      var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      // note: don't pass a "noopener" feature string here — that makes
      // window.open return null, which we rely on to detect blocked pop-ups
      var win = window.open(url, "_blank");
      if (win) win.opener = null;

      if (win) {
        formNote.textContent = "WhatsApp is opening with your request, " + data.name.split(" ")[0] + " — just press send.";
        form.reset();
        document.querySelectorAll(".form-group select").forEach(function (s) {
          s.closest(".form-group").classList.remove("select-filled");
        });
      } else {
        // pop-up blocked — give a direct link instead of failing silently
        formNote.innerHTML = "";
        var link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Tap here to open WhatsApp and send your request.";
        formNote.appendChild(link);
      }
    });
  }

  /* To switch the form back to the email backend in /server later,
     replace the WhatsApp block inside the submit handler with:

       fetch("/api/appointments", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(data)
       })
         .then(function (res) { return res.json().then(function (b) { return { ok: res.ok, body: b }; }); })
         .then(function (r) {
           if (!r.ok || !r.body.ok) throw new Error((r.body && r.body.error) || "Request failed");
           formNote.textContent = "Thank you, " + data.name.split(" ")[0] + " — we'll confirm your appointment by phone within one working day.";
           form.reset();
         })
         .catch(function (err) {
           formNote.textContent = err.message === "Failed to fetch"
             ? "Couldn't reach the booking service. Please call us at +92 311-7594193."
             : err.message;
           formNote.classList.add("is-error");
         });
  */
})();
