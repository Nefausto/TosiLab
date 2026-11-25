const form = document.querySelector("[data-agenda-form]");
const list = document.querySelector("[data-agenda-list]");
const statusLine = document.querySelector("[data-agenda-status]");
const dayInput = form.elements.day;
let busy = false;
const labels = { pending: "Pendiente", confirmed: "Confirmado", blocked: "Bloqueado", free: "Libre" };

dayInput.value = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Argentina/Buenos_Aires"
}).format(new Date());

function renderRows(rows, available, day) {
  const slots = [...rows, ...available.map(time => ({ time, status: "free" }))];
  slots.sort((first, second) => first.time.localeCompare(second.time));
  list.replaceChildren();
  for (const slot of slots) {
    const row = document.createElement("li");
    const description = document.createElement("div");
    description.textContent = slot.time + " · " + labels[slot.status];
    if (slot.status === "pending") {
      const code = document.createElement("small");
      code.textContent = slot.id;
      description.append(code);
    }
    row.append(description);
    const actions = slot.status === "free" ? [["block", "Bloquear"]]
      : slot.status === "pending" ? [["confirm", "Confirmar"], ["release", "Liberar"]]
      : [["release", "Liberar"]];
    const controls = document.createElement("div");
    controls.className = "agenda-actions";
    for (const [action, label] of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-secondary dark";
      button.textContent = label;
      button.addEventListener("click", () => {
        if (dayInput.value !== day) return;
        if (action === "release" && !window.confirm("¿Liberar este horario?")) return;
        updateAgenda({ action, time: slot.time, id: slot.id });
      });
      controls.append(button);
    }
    row.append(controls);
    list.append(row);
  }
  statusLine.textContent = slots.length ? "" : "No hay horarios para este día.";
}

async function updateAgenda(change) {
  if (busy || !form.reportValidity()) return;
  busy = true;
  const day = dayInput.value;
  const headers = { Authorization: "Bearer " + form.elements.key.value };
  const endpoint = "/api/agenda/admin";
  list.replaceChildren();
  statusLine.textContent = "Cargando agenda…";
  try {
    let changed = true;
    if (change) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ day, ...change })
      });
      changed = response.ok;
    }
    const response = await fetch(endpoint + "?day=" + encodeURIComponent(day), { headers });
    if (day !== dayInput.value) return;
    if (response.status === 401) {
      statusLine.textContent = "La clave no es correcta.";
      return;
    }
    if (!response.ok) throw new Error("Agenda unavailable");
    const { rows, available } = await response.json();
    if (day !== dayInput.value) return;
    renderRows(rows, available, day);
    if (!changed) statusLine.textContent = "El horario cambió. Revisá el estado actualizado.";
  } catch {
    statusLine.textContent = "No se pudo conectar con la agenda.";
  } finally {
    busy = false;
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  updateAgenda();
});

dayInput.addEventListener("change", () => {
  list.replaceChildren();
  statusLine.textContent = "";
});
