const STORAGE_KEY = "cuaderno-visual-notas-v1";

const state = {
  notes: [],
  activeId: "",
  documentUrl: "",
  documentKind: "",
  drawing: false,
  tool: "pen",
  color: "#1d4ed8",
  size: 6,
  strokes: [],
  currentStroke: null
};

const els = {
  newNote: document.querySelector("[data-new-note]"),
  notesList: document.querySelector("[data-notes-list]"),
  search: document.querySelector("[data-search]"),
  title: document.querySelector("[data-title]"),
  tags: document.querySelector("[data-tags]"),
  body: document.querySelector("[data-body]"),
  saveState: document.querySelector("[data-save-state]"),
  deleteNote: document.querySelector("[data-delete-note]"),
  fileInput: document.querySelector("[data-file-input]"),
  pasteImage: document.querySelector("[data-paste-image]"),
  clearDocument: document.querySelector("[data-clear-document]"),
  clearCanvas: document.querySelector("[data-clear-canvas]"),
  undo: document.querySelector("[data-undo]"),
  tools: document.querySelectorAll("[data-tool]"),
  color: document.querySelector("[data-color]"),
  size: document.querySelector("[data-size]"),
  stage: document.querySelector("[data-reader-stage]"),
  canvas: document.querySelector("[data-canvas]"),
  pdfViewer: document.querySelector("[data-pdf-viewer]"),
  pdfObject: document.querySelector("[data-pdf-object]"),
  pdfLink: document.querySelector("[data-pdf-link]"),
  imagePreview: document.querySelector("[data-image-preview]"),
  documentTitle: document.querySelector("[data-document-title]"),
  documentType: document.querySelector("[data-document-type]")
};

const ctx = els.canvas.getContext("2d");

function makeNote() {
  return {
    id: crypto.randomUUID(),
    title: "Nueva nota",
    tags: "",
    body: "",
    updatedAt: new Date().toISOString()
  };
}

function loadNotes() {
  const saved = localStorage.getItem(STORAGE_KEY);
  state.notes = saved ? JSON.parse(saved) : [makeNote()];
  state.activeId = state.notes[0]?.id || "";
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
  els.saveState.textContent = "Guardado local";
}

function activeNote() {
  return state.notes.find((note) => note.id === state.activeId);
}

function renderNotes() {
  const query = els.search.value.trim().toLowerCase();
  const notes = state.notes.filter((note) => {
    const haystack = `${note.title} ${note.tags} ${note.body}`.toLowerCase();
    return haystack.includes(query);
  });

  els.notesList.innerHTML = "";
  notes.forEach((note) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `note-item${note.id === state.activeId ? " is-active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(note.title || "Sin titulo")}</strong>
      <span>${escapeHtml(note.tags || note.body || "Nota vacia")}</span>
    `;
    button.addEventListener("click", () => selectNote(note.id));
    els.notesList.append(button);
  });
}

function renderEditor() {
  const note = activeNote();
  if (!note) return;
  els.title.value = note.title;
  els.tags.value = note.tags;
  els.body.value = note.body;
}

function selectNote(id) {
  state.activeId = id;
  renderNotes();
  renderEditor();
}

function updateActiveNote() {
  const note = activeNote();
  if (!note) return;
  note.title = els.title.value;
  note.tags = els.tags.value;
  note.body = els.body.value;
  note.updatedAt = new Date().toISOString();
  els.saveState.textContent = "Guardando...";
  saveNotes();
  renderNotes();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function resetDocumentClasses() {
  els.stage.classList.remove("has-document", "show-pdf", "show-image", "show-ppt");
  els.pdfObject.removeAttribute("data");
  els.pdfLink.setAttribute("href", "#");
  els.imagePreview.removeAttribute("src");
}

function clearObjectUrl() {
  if (state.documentUrl) {
    URL.revokeObjectURL(state.documentUrl);
    state.documentUrl = "";
  }
}

function openFile(file) {
  if (!file) return;
  clearObjectUrl();
  clearCanvas();
  resetDocumentClasses();

  state.documentUrl = URL.createObjectURL(file);
  const fileName = file.name || "Documento";
  const lower = fileName.toLowerCase();

  els.documentTitle.textContent = fileName;
  els.stage.classList.add("has-document");

  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    state.documentKind = "pdf";
    els.documentType.textContent = "PDF";
    els.pdfObject.data = state.documentUrl;
    els.pdfLink.href = state.documentUrl;
    els.stage.classList.add("show-pdf");
  } else if (file.type.startsWith("image/")) {
    state.documentKind = "image";
    els.documentType.textContent = "Imagen";
    els.imagePreview.src = state.documentUrl;
    els.stage.classList.add("show-image");
  } else if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) {
    state.documentKind = "ppt";
    els.documentType.textContent = "PowerPoint";
    els.stage.classList.add("show-ppt");
  } else {
    state.documentKind = "file";
    els.documentType.textContent = "Archivo";
  }

  resizeCanvas();
}

async function pasteImageFromClipboard() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      openFile(new File([blob], "imagen-pegada.png", { type: imageType }));
      return;
    }
    els.documentType.textContent = "No habia imagen en el portapapeles";
  } catch (error) {
    els.documentType.textContent = "Usa Ctrl+V para pegar la imagen";
  }
}

function canvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  const clientX = event.touches?.[0]?.clientX ?? event.clientX;
  const clientY = event.touches?.[0]?.clientY ?? event.clientY;
  return {
    x: (clientX - rect.left) * (els.canvas.width / rect.width),
    y: (clientY - rect.top) * (els.canvas.height / rect.height)
  };
}

function startStroke(event) {
  if (!state.documentKind) return;
  event.preventDefault();
  state.drawing = true;
  state.currentStroke = {
    tool: state.tool,
    color: state.color,
    size: Number(state.size),
    points: [canvasPoint(event)]
  };
}

function moveStroke(event) {
  if (!state.drawing || !state.currentStroke) return;
  event.preventDefault();
  state.currentStroke.points.push(canvasPoint(event));
  redrawCanvas();
}

function endStroke() {
  if (!state.currentStroke) return;
  state.strokes.push(state.currentStroke);
  state.currentStroke = null;
  state.drawing = false;
  redrawCanvas();
}

function drawStroke(stroke) {
  if (stroke.points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.globalAlpha = stroke.tool === "marker" ? .32 : 1;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.tool === "marker" ? stroke.size * 2.4 : stroke.size;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
  ctx.restore();
}

function redrawCanvas() {
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  state.strokes.forEach(drawStroke);
  if (state.currentStroke) drawStroke(state.currentStroke);
}

function clearCanvas() {
  state.strokes = [];
  state.currentStroke = null;
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
}

function resizeCanvas() {
  const rect = els.stage.getBoundingClientRect();
  const contentHeight = Math.max(
    els.stage.scrollHeight,
    els.pdfViewer.offsetHeight,
    els.imagePreview.offsetHeight,
    rect.height
  );
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(contentHeight));
  if (els.canvas.width === width && els.canvas.height === height) return;
  els.canvas.width = width;
  els.canvas.height = height;
  redrawCanvas();
}

function clearDocument() {
  clearObjectUrl();
  clearCanvas();
  resetDocumentClasses();
  state.documentKind = "";
  els.documentTitle.textContent = "Sin archivo abierto";
  els.documentType.textContent = "PDF, imagen o PPT";
}

els.newNote.addEventListener("click", () => {
  const note = makeNote();
  state.notes.unshift(note);
  state.activeId = note.id;
  saveNotes();
  renderNotes();
  renderEditor();
  els.title.focus();
});

[els.title, els.tags, els.body].forEach((input) => {
  input.addEventListener("input", updateActiveNote);
});

els.search.addEventListener("input", renderNotes);

els.deleteNote.addEventListener("click", () => {
  if (state.notes.length === 1) {
    state.notes = [makeNote()];
  } else {
    state.notes = state.notes.filter((note) => note.id !== state.activeId);
  }
  state.activeId = state.notes[0].id;
  saveNotes();
  renderNotes();
  renderEditor();
});

els.fileInput.addEventListener("change", (event) => openFile(event.target.files[0]));
els.pasteImage.addEventListener("click", pasteImageFromClipboard);
els.clearDocument.addEventListener("click", clearDocument);
els.clearCanvas.addEventListener("click", clearCanvas);
els.undo.addEventListener("click", () => {
  state.strokes.pop();
  redrawCanvas();
});

els.tools.forEach((tool) => {
  tool.addEventListener("click", () => {
    state.tool = tool.dataset.tool;
    els.tools.forEach((item) => item.classList.toggle("is-active", item === tool));
  });
});

els.color.addEventListener("input", () => {
  state.color = els.color.value;
});

els.size.addEventListener("input", () => {
  state.size = els.size.value;
});

els.canvas.addEventListener("pointerdown", startStroke);
els.canvas.addEventListener("pointermove", moveStroke);
window.addEventListener("pointerup", endStroke);
window.addEventListener("resize", resizeCanvas);
els.imagePreview.addEventListener("load", resizeCanvas);
els.pdfObject.addEventListener("load", resizeCanvas);

document.addEventListener("paste", (event) => {
  const file = [...event.clipboardData.files].find((item) => item.type.startsWith("image/"));
  if (file) openFile(file);
});

loadNotes();
renderNotes();
renderEditor();
resizeCanvas();
