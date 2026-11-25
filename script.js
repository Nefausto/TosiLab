const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const bookingForm = document.querySelector("[data-booking-form]");
const blogStage = document.querySelector(".blog-stage");
const blogCards = document.querySelectorAll("[data-blog-topic]");
const blogExpanded = document.querySelector("[data-blog-expanded]");
const blogExpandedTitle = document.querySelector("[data-blog-expanded-title]");
const blogExpandedContent = document.querySelector("[data-blog-expanded-content]");
const blogClose = document.querySelector("[data-blog-close]");
const whatsappNumber = "5492216324432";

const blogArticles = {
  cuello: {
    text: "El cuello suele contracturarse por una mezcla de postura sostenida, estrés, poca movilidad y tensión acumulada en hombros. En una sesión se evalúa dónde está la sobrecarga para trabajar la zona sin aplicar presión genérica.",
    bullets: ["Postura de computadora o celular", "Hombros elevados por estrés", "Rigidez al girar la cabeza", "Dolor que baja hacia trapecios"]
  },
  cervical: {
    text: "El dolor cervical mejora cuando se combina descarga muscular, respiración, movilidad suave y cambios simples en la rutina. El masaje puede ayudar a bajar la tensión y recuperar movimiento.",
    bullets: ["Trabajo progresivo de cuello y hombros", "Presión adaptada a tu tolerancia", "Recomendaciones para la rutina", "Ideal para oficina y estrés"]
  },
  lumbar: {
    text: "La zona lumbar se carga mucho cuando pasás horas sentado, entrenás con fatiga o compensás con mala postura. La clave es identificar si predomina rigidez, tensión muscular o sobrecarga.",
    bullets: ["Molestia al estar sentado", "Rigidez al levantarte", "Sobrecarga por gimnasio", "Trabajo localizado y cuidadoso"]
  },
  deportivo: {
    text: "El masaje deportivo ayuda a descargar musculatura exigida, mejorar sensación de recuperación y preparar el cuerpo para sostener entrenamientos sin acumular tanta tensión.",
    bullets: ["Piernas pesadas", "Espalda u hombros cargados", "Recuperación post entrenamiento", "Prevención de sobrecargas"]
  },
  estres: {
    text: "El estrés suele aparecer en el cuerpo como mandíbula apretada, cuello tenso, hombros elevados y espalda rígida. El masaje relajante o descontracturante puede bajar esa carga física.",
    bullets: ["Tensión en cuello y trapecios", "Respiración más corta", "Sensación de cuerpo pesado", "Mejor descanso"]
  }
};

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 18);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  document.body.classList.toggle("nav-open", isOpen);
  header.classList.toggle("nav-active", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    header.classList.remove("nav-active");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
}

const { service: bookingService, plan: bookingPlan, date: bookingDate, time: bookingTime } = bookingForm.elements;
const bookingNote = bookingForm.querySelector("[data-booking-note]");

function syncBookingFields() {
  const isGift = bookingService.value === "Gift Card";
  const showPlan = Boolean(bookingService.value) && !isGift &&
    bookingService.value !== "Orientación" && !bookingService.value.startsWith("Pack ");

  bookingPlan.disabled = !showPlan;
  bookingPlan.closest("[data-booking-plan]").hidden = !showPlan;
  bookingDate.disabled = isGift;
  bookingTime.disabled = isGift;
  bookingDate.closest("[data-booking-schedule]").hidden = isGift;
  bookingNote.textContent = isGift
    ? "Consultá valores y opciones de entrega por WhatsApp."
    : "El turno se confirma por WhatsApp según disponibilidad.";
}

const today = new Date();
bookingDate.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0")].join("-");
bookingService.addEventListener("change", syncBookingFields);
window.addEventListener("pageshow", syncBookingFields);
syncBookingFields();

function buildWhatsAppMessage() {
  const formData = new FormData(bookingForm);
  const service = formData.get("service");
  const plan = formData.get("plan");
  const date = formData.get("date");
  const time = formData.get("time");
  const name = formData.get("name").trim();
  const notes = formData.get("notes").trim();
  const lines = [name ? `Hola, soy ${name}.` : "¡Hola!"];

  if (service === "Gift Card") {
    lines.push("Quisiera consultar las opciones y valores de las Gift Cards.");
  } else {
    lines.push(service === "Orientación"
      ? "Quisiera coordinar un turno. ¿Me pueden orientar sobre qué masaje elegir?"
      : `Quisiera consultar disponibilidad para: ${service}.`);
    if (plan) lines.push(`Plan: ${plan}`);
    if (date) lines.push(`Día preferido: ${formatDate(date)}`);
    if (time) lines.push(`Horario preferido: ${time}`);
  }

  if (notes) lines.push(`Observaciones: ${notes}`);
  return lines.join("\n");
}

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = buildWhatsAppMessage();
  window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
});

document.querySelectorAll("[data-booking-choice]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    bookingService.value = link.dataset.bookingChoice;
    syncBookingFields();
    bookingService.focus({ preventScroll: true });
  });
});

function openBlogArticle(card) {
  const article = blogArticles[card.dataset.blogTopic];
  if (!article) return;

  blogExpandedTitle.textContent = card.dataset.blogTitle;
  blogExpandedContent.innerHTML = `
    <div>
      <p>${article.text}</p>
      <p>Si esta molestia se repite, conviene hacer una evaluación breve para adaptar la sesión a tu caso y evitar trabajar a ciegas.</p>
    </div>
    <ul>
      ${article.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
    </ul>
  `;
  blogExpanded.hidden = false;
  blogStage.classList.add("is-expanded");
  blogStage.scrollIntoView({ behavior: "smooth", block: "center" });
  blogExpanded.focus();
}

blogCards.forEach((card) => {
  card.addEventListener("click", () => openBlogArticle(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBlogArticle(card);
    }
  });
});

blogClose.addEventListener("click", () => {
  blogExpanded.hidden = true;
  blogStage.classList.remove("is-expanded");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    blogExpanded.hidden = true;
    blogStage.classList.remove("is-expanded");
  }
});

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
