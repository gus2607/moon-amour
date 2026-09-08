(function(){
  "use strict";

  // ---------- Wax palm silhouette (Valle de Cocora) ----------
  function palmSVG(scale, opacity){
    var w = 46 * scale, h = 170 * scale;
    return '<svg viewBox="0 0 46 170" width="'+w+'" height="'+h+'" style="opacity:'+opacity+'">' +
      '<rect x="21" y="40" width="4" height="130" fill="var(--palm)"></rect>' +
      '<g fill="var(--palm-light)">' +
      '<path d="M23 40 C10 30 2 18 4 4 C16 10 24 22 23 40 Z"></path>' +
      '<path d="M23 40 C36 30 44 18 42 4 C30 10 22 22 23 40 Z"></path>' +
      '<path d="M23 34 C13 22 6 10 10 0 C20 8 26 20 23 34 Z"></path>' +
      '<path d="M23 34 C33 22 40 10 36 0 C26 8 20 20 23 34 Z"></path>' +
      '</g></svg>';
  }
  function fillPalms(id, count, baseScale){
    var el = document.getElementById(id);
    if(!el) return;
    var html = "";
    for(var i=0;i<count;i++){
      var s = baseScale * (0.65 + Math.random()*0.7);
      var o = 0.55 + Math.random()*0.4;
      html += palmSVG(s, o.toFixed(2));
    }
    el.innerHTML = html;
  }
  fillPalms("palmsHero", 7, 0.9);
  fillPalms("palmsSunset", 6, 1);
  fillPalms("palmsClosing", 7, 1);

  // ---------- Scroll reveal ----------
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal:not(.in-view)");
  if(reduceMotion || !("IntersectionObserver" in window)){
    revealEls.forEach(function(el){ el.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function(el){ io.observe(el); });
  }

  // ---------- Live counters ----------
  // Cambia estas dos fechas si en algún momento ajustan el aniversario.
  var ANNIV = new Date("2026-03-07T00:00:00-05:00").getTime();
  var NEXT_ANNIV = new Date("2027-03-07T00:00:00-05:00").getTime();

  function setNum(id, val){
    var el = document.getElementById(id);
    if(el) el.textContent = String(val);
  }

  function tick(){
    var now = Date.now();

    var since = Math.max(0, now - ANNIV);
    var sd = Math.floor(since / 86400000);
    var sh = Math.floor((since % 86400000) / 3600000);
    var sm = Math.floor((since % 3600000) / 60000);
    var ss = Math.floor((since % 60000) / 1000);
    setNum("cd-days", sd);
    setNum("cd-hours", sh);
    setNum("cd-mins", sm);
    setNum("cd-secs", ss);

    var until = Math.max(0, NEXT_ANNIV - now);
    var ud = Math.floor(until / 86400000);
    var uh = Math.floor((until % 86400000) / 3600000);
    var um = Math.floor((until % 3600000) / 60000);
    var us = Math.floor((until % 60000) / 1000);
    setNum("na-days", ud);
    setNum("na-hours", uh);
    setNum("na-mins", um);
    setNum("na-secs", us);
  }
  tick();
  setInterval(tick, 1000);

  // ---------- Envelope / letter ----------
  var envelope = document.getElementById("envelope");
  var letter = document.getElementById("letterPaper");
  if(envelope && letter){
    envelope.addEventListener("click", function(){
      var open = envelope.getAttribute("aria-expanded") === "true";
      envelope.setAttribute("aria-expanded", open ? "false" : "true");
      letter.classList.toggle("open", !open);
    });
  }
})();
