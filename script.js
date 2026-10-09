const CONFIG = {
  whatsappNumber: "557382444882",
  whatsappDisplay: "(73) 8244-4882",
  email: "hipersolenergiasolar@gmail.com",
  calc: {
    tariff: 0.95,
    sunHours: 5.5,
    performance: 0.80,
    panelWatts: 620,
    minPanels: 4,
    costPerKwp: 4300,
    minFeeKwh: {
      residencial: 30,
      comercial: 50,
      rural: 50,
      industrial: 100
    },
    yearlyTariffIncrease: 0.07,
    degradation: 0.007,
    lifetimeYears: 25
  }
};

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

document.documentElement.classList.add("js");

function whatsappUrl(text = "") {
  const number = CONFIG.whatsappNumber.replace(/\D/g, "");
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

$$("[data-whatsapp-link]").forEach((el) => {
  el.href = whatsappUrl("Olá! Gostaria de saber mais sobre energia solar com a Hiper Sol.");
  el.target = "_blank";
  el.rel = "noopener";
  if (el.tagName === "A" && el.textContent.includes("(00)")) el.textContent = CONFIG.whatsappDisplay;
});
$$("[data-email-link]").forEach((el) => {
  el.href = `mailto:${CONFIG.email}`;
  el.textContent = CONFIG.email;
});

$("#year").textContent = new Date().getFullYear();

const header = $("#header");
function onScroll() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const nav = $("#nav");
const menuToggle = $("#menuToggle");
const overlay = $("#navOverlay");

function setMenu(open) {
  nav.classList.toggle("is-open", open);
  overlay.classList.toggle("is-open", open);
  header.classList.toggle("is-scrolled", open || window.scrollY > 24);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  document.body.style.overflow = open ? "hidden" : "";
}
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
overlay.addEventListener("click", () => setMenu(false));
$$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
window.matchMedia("(min-width: 960px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

const sections = $$("main section[id]");
const navLinks = $$(".nav__list a");
const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${entry.target.id}`));
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
sections.forEach((s) => spy.observe(s));

const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

$$(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  revealObserver.observe(el);
});

function animateCounter(el) {
  const target = Number(el.dataset.count);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const duration = 1600;
  const start = performance.now();

  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
const counterObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) { animateCounter(entry.target); obs.unobserve(entry.target); }
  });
}, { threshold: 0.6 });
$$("[data-count]").forEach((el) => counterObserver.observe(el));

const billInput = $("#bill");
const billRange = $("#billRange");
const calcType  = $("#calcType");

function updateRangeFill() {
  const min = Number(billRange.min), max = Number(billRange.max);
  const val = Math.min(Math.max(Number(billRange.value), min), max);
  billRange.style.setProperty("--fill", `${((val - min) / (max - min)) * 100}%`);
}

function calculate() {
  const c = CONFIG.calc;
  const bill = Math.max(Number(billInput.value) || 0, 0);
  const type = calcType.value;

  const minFeeKwh = c.minFeeKwh[type];
  const consumption = Math.max(bill / c.tariff - minFeeKwh, 0);
  const kwp = consumption / (30 * c.sunHours * c.performance);
  const panels = bill > 0
    ? Math.max(Math.ceil((kwp * 1000) / c.panelWatts), c.minPanels)
    : 0;
  const realKwp = (panels * c.panelWatts) / 1000;

  const minFee = minFeeKwh * c.tariff;
  const monthly = Math.max(bill - minFee, 0);
  const invest = realKwp * c.costPerKwp;

  let lifetime = 0, accumulated = 0, payback = null;
  for (let year = 1; year <= c.lifetimeYears; year++) {
    const yearly = monthly * 12 * Math.pow(1 + c.yearlyTariffIncrease, year - 1) * Math.pow(1 - c.degradation, year - 1);
    lifetime += yearly;
    accumulated += yearly;
    if (payback === null && accumulated >= invest) {
      const prev = accumulated - yearly;
      payback = year - 1 + (invest - prev) / yearly;
    }
  }

  $("#resMonthly").textContent = brl(monthly);
  $("#resLife").textContent    = brl(lifetime);
  $("#resKwp").textContent     = `${realKwp.toFixed(2).replace(".", ",")} kWp`;
  $("#resPanels").textContent  = panels ? `${panels} painéis` : "—";
  $("#resInvest").textContent  = invest ? brl(invest) : "—";
  $("#resPayback").textContent = payback ? `${payback.toFixed(1).replace(".", ",")} anos` : "—";

  const formBill = $("#formBill");
  if (formBill && !formBill.dataset.touched) formBill.value = bill || "";
  const formType = $("#type");
  if (formType && !formType.dataset.touched) {
    formType.value = type.charAt(0).toUpperCase() + type.slice(1);
  }
}

billRange.addEventListener("input", () => {
  billInput.value = billRange.value;
  updateRangeFill();
  calculate();
});
billInput.addEventListener("input", () => {
  const v = Number(billInput.value);
  if (v >= Number(billRange.min) && v <= Number(billRange.max)) billRange.value = v;
  updateRangeFill();
  calculate();
});
calcType.addEventListener("change", calculate);
$("#calcForm").addEventListener("submit", (e) => e.preventDefault());
updateRangeFill();
calculate();

$$("[data-interest]").forEach((link) => {
  link.addEventListener("click", () => {
    const select = $("#type");
    select.value = link.dataset.interest;
    select.dataset.touched = "1";
  });
});
$("#type").addEventListener("change", (e) => { e.target.dataset.touched = "1"; });
$("#formBill").addEventListener("input", (e) => { e.target.dataset.touched = "1"; });

$$(".faq__item").forEach((item) => {
  const btn = $(".faq__q", item);
  const panel = $(".faq__a", item);

  btn.addEventListener("click", () => {
    const isOpen = item.classList.contains("is-open");

    $$(".faq__item.is-open").forEach((other) => {
      if (other !== item) {
        other.classList.remove("is-open");
        $(".faq__q", other).setAttribute("aria-expanded", "false");
        $(".faq__a", other).style.maxHeight = null;
      }
    });

    item.classList.toggle("is-open", !isOpen);
    btn.setAttribute("aria-expanded", String(!isOpen));
    panel.style.maxHeight = !isOpen ? `${panel.scrollHeight}px` : null;
  });
});
window.addEventListener("resize", () => {
  $$(".faq__item.is-open .faq__a").forEach((p) => { p.style.maxHeight = `${p.scrollHeight}px`; });
});

const form = $("#contactForm");
const phoneInput = $("#phone");

phoneInput.addEventListener("input", () => {
  let d = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  if (d.length > 10)      d = d.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  else if (d.length > 6)  d = d.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  else if (d.length > 2)  d = d.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
  else if (d.length > 0)  d = d.replace(/^(\d*)/, "($1");
  phoneInput.value = d;
});

function setError(id, msg) {
  const field = $(`#${id}`).closest(".field");
  const out = $(`[data-error-for="${id}"]`);
  field.classList.toggle("has-error", Boolean(msg));
  out.textContent = msg || "";
}

function validate() {
  let ok = true;
  const name = $("#name").value.trim();
  const phoneDigits = phoneInput.value.replace(/\D/g, "");
  const city = $("#city").value.trim();

  setError("name",  name.length < 3 ? "Informe seu nome completo." : "");
  setError("phone", phoneDigits.length < 10 ? "Informe um WhatsApp válido com DDD." : "");
  setError("city",  city.length < 2 ? "Informe sua cidade." : "");

  if (name.length < 3 || phoneDigits.length < 10 || city.length < 2) ok = false;
  return ok;
}

["name", "phone", "city"].forEach((id) => $(`#${id}`).addEventListener("input", () => setError(id, "")));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validate()) {
    const firstError = $(".field.has-error input", form);
    if (firstError) firstError.focus();
    return;
  }

  const data = new FormData(form);
  const lines = [
    "Olá! Gostaria de solicitar um orçamento de energia solar com a Hiper Sol.",
    "",
    `*Nome:* ${data.get("name").trim()}`,
    `*WhatsApp:* ${data.get("phone")}`,
    `*Cidade:* ${data.get("city").trim()}`,
    `*Tipo de imóvel:* ${data.get("type")}`
  ];
  if (data.get("bill")) lines.push(`*Conta de luz média:* R$ ${data.get("bill")}`);
  if (data.get("message").trim()) lines.push(`*Mensagem:* ${data.get("message").trim()}`);

  window.open(whatsappUrl(lines.join("\n")), "_blank", "noopener");
});

$("#calcCta").addEventListener("click", () => {
  const msg = $("#message");
  if (msg && !msg.value) {
    msg.value = `Fiz a simulação no site: conta de ${$("#bill").value ? "R$ " + $("#bill").value : "—"}, sistema estimado de ${$("#resKwp").textContent} (economia de ${$("#resMonthly").textContent}/mês).`;
  }
});