/**
 * Editor state
 * @property {HTMLTextAreaElement} content
 * @property {HTMLDivElement} overlay
 * @property {boolean} rendered
 * @property {HTMLButtonElement} viewMode
 * @property {string|null} activeId
 * @property {string} docsMode
 */
const editor = {
  content: {},
  overlay: {},
  rendered: true,
  viewMode: {},
  activeId: null,
  docsMode: "load",
  saveBtn: {},
  loadBtn: {},
  renameBtn: {},
  deleteBtn: {},
  downloadBtn: {},
  exportBtn: {},
  docsDialog: {},
  docsSelect: {},
  docsTitle: {},
  docsConfirm: {},
  exportAllBtn: {},
};

const CARET_MARK = "\u0001";
const SEL_START = "\u0002";
const SEL_END = "\u0003";

const STORAGE_KEY = "scriptorium-docs";
const LEGACY_STORAGE_KEY = "scriptorium-content";

/**
 * @returns {{ activeId: string|null, temp: string, documents: Record<string, { content: string, updatedAt: number }> }}
 */
function emptyStore() {
  return { activeId: null, temp: "", documents: {} };
}

/**
 * @returns {{ activeId: string|null, temp: string, documents: Record<string, { content: string, updatedAt: number }> }}
 */
function readStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        activeId: parsed.activeId ?? null,
        temp: typeof parsed.temp === "string" ? parsed.temp : "",
        documents:
          parsed.documents && typeof parsed.documents === "object"
            ? parsed.documents
            : {},
      };
    } catch {
      return emptyStore();
    }
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy !== null) {
    const store = emptyStore();
    store.temp = legacy;
    writeStore(store);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return store;
  }

  return emptyStore();
}

/**
 * @param {{ activeId: string|null, temp: string, documents: Record<string, { content: string, updatedAt: number }> }} store
 */
function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function hasUnsavedTemp() {
  return editor.activeId === null && editor.content.value.length > 0;
}

function documentNames() {
  return Object.keys(readStore().documents).sort((a, b) =>
    a.localeCompare(b),
  );
}

function autosave() {
  const store = readStore();
  const value = editor.content.value;
  if (editor.activeId && store.documents[editor.activeId]) {
    store.documents[editor.activeId] = {
      content: value,
      updatedAt: Date.now(),
    };
    store.activeId = editor.activeId;
  } else {
    editor.activeId = null;
    store.activeId = null;
    store.temp = value;
  }
  writeStore(store);
}

function restoreFromStore() {
  const store = readStore();
  if (store.activeId && store.documents[store.activeId]) {
    editor.activeId = store.activeId;
    editor.content.value = store.documents[store.activeId].content;
  } else {
    editor.activeId = null;
    editor.content.value = store.temp || "";
    store.activeId = null;
    writeStore(store);
  }
}

/**
 * @param {string} name
 */
function openDocument(name) {
  const store = readStore();
  const doc = store.documents[name];
  if (!doc) {
    alert("Document not found.");
    return;
  }
  editor.activeId = name;
  editor.content.value = doc.content;
  store.activeId = name;
  writeStore(store);
  handleInput();
}

/**
 * @param {string} name
 */
function saveDocumentAs(name) {
  const store = readStore();
  const exists = Object.hasOwn(store.documents, name);
  if (exists && name !== editor.activeId) {
    if (!confirm(`Overwrite existing document "${name}"?`)) {
      return;
    }
  }
  store.documents[name] = {
    content: editor.content.value,
    updatedAt: Date.now(),
  };
  store.activeId = name;
  editor.activeId = name;
  writeStore(store);
}

/**
 * @param {string} oldName
 * @param {string} newName
 */
function renameDocument(oldName, newName) {
  const store = readStore();
  if (!store.documents[oldName]) {
    alert("Document not found.");
    return;
  }
  if (oldName === newName) {
    return;
  }
  if (store.documents[newName]) {
    if (!confirm(`Overwrite existing document "${newName}"?`)) {
      return;
    }
  }
  store.documents[newName] = {
    ...store.documents[oldName],
    updatedAt: Date.now(),
  };
  delete store.documents[oldName];
  if (store.activeId === oldName || editor.activeId === oldName) {
    store.activeId = newName;
    editor.activeId = newName;
  }
  writeStore(store);
}

/**
 * @param {string} name
 */
function deleteDocument(name) {
  const store = readStore();
  if (!store.documents[name]) {
    alert("Document not found.");
    return;
  }
  delete store.documents[name];
  if (editor.activeId === name || store.activeId === name) {
    editor.activeId = null;
    editor.content.value = "";
    store.activeId = null;
    store.temp = "";
    writeStore(store);
    handleInput();
    return;
  }
  writeStore(store);
}

/**
 * @param {string} name
 * @returns {string}
 */
function safeFilename(name) {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim();
  return cleaned || "untitled";
}

/**
 * @param {string} filename
 * @param {string} text
 */
function downloadMarkdown(filename, text) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {"load"|"rename"|"delete"|"export"} mode
 */
function fillDocsSelect(mode) {
  const names = documentNames();
  editor.docsSelect.innerHTML = "";
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === editor.activeId) {
      option.selected = true;
    }
    editor.docsSelect.appendChild(option);
  }
  if (!editor.docsSelect.value && names.length > 0) {
    editor.docsSelect.selectedIndex = 0;
  }

  const titles = {
    load: "Load document",
    rename: "Rename document",
    delete: "Delete document",
    export: "Export document",
  };
  editor.docsTitle.textContent = titles[mode] || "Documents";
  editor.docsConfirm.textContent =
    mode === "delete" ? "Delete" : mode === "export" ? "Export" : "OK";
  editor.exportAllBtn.hidden = mode !== "export";
}

/**
 * @param {"load"|"rename"|"delete"|"export"} mode
 */
function openDocsDialog(mode) {
  const names = documentNames();
  if (names.length === 0) {
    alert("No saved documents yet.");
    return;
  }

  if (mode === "load" && hasUnsavedTemp()) {
    if (
      !confirm(
        "You have an unsaved temporary draft. Loading another document will discard it. Continue?",
      )
    ) {
      return;
    }
  }

  editor.docsMode = mode;
  fillDocsSelect(mode);
  editor.docsDialog.showModal();
}

function handleDocsDialogClose(event) {
  if (event.target !== editor.docsDialog) {
    return;
  }
  if (editor.docsDialog.returnValue !== "confirm") {
    return;
  }

  const name = editor.docsSelect.value;
  if (!name) {
    alert("Select a document.");
    return;
  }

  if (editor.docsMode === "load") {
    openDocument(name);
    return;
  }

  if (editor.docsMode === "rename") {
    const next = prompt("New document name:", name);
    if (next === null) {
      return;
    }
    const trimmed = next.trim();
    if (!trimmed) {
      alert("Name cannot be empty.");
      return;
    }
    renameDocument(name, trimmed);
    return;
  }

  if (editor.docsMode === "delete") {
    if (!confirm(`Permanently delete "${name}"?`)) {
      return;
    }
    deleteDocument(name);
    return;
  }

  if (editor.docsMode === "export") {
    const store = readStore();
    const doc = store.documents[name];
    if (!doc) {
      alert("Document not found.");
      return;
    }
    downloadMarkdown(safeFilename(name), doc.content);
  }
}

function handleSaveClick() {
  const suggested = editor.activeId || "";
  const name = prompt("Save document as:", suggested);
  if (name === null) {
    return;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }
  saveDocumentAs(trimmed);
}

function handleDownloadClick() {
  const base = safeFilename(editor.activeId || "untitled");
  downloadMarkdown(base, editor.content.value);
}

function handleExportAllClick() {
  const store = readStore();
  const names = Object.keys(store.documents);
  if (names.length === 0) {
    alert("No saved documents yet.");
    return;
  }
  names.forEach((name, index) => {
    window.setTimeout(() => {
      downloadMarkdown(safeFilename(name), store.documents[name].content);
    }, index * 200);
  });
}

function stripMarks(text) {
  return text
    .replaceAll(CARET_MARK, "")
    .replaceAll(SEL_START, "")
    .replaceAll(SEL_END, "");
}

function applyMarks(html) {
  return html
    .replaceAll(SEL_START, '<span class="selection">')
    .replaceAll(SEL_END, "</span>")
    .replaceAll(CARET_MARK, '<span class="caret"></span>');
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text) {
  return text.replaceAll('"', "&quot;");
}

function formatEmphasis(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<span style="font-weight: bold; font-style: italic">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<span style="font-weight: bold">$1</span>')
    .replace(/__(.+?)__/g, '<span style="font-weight: bold">$1</span>')
    .replace(/\*(.+?)\*/g, '<span style="font-style: italic">$1</span>')
    .replace(/_(.+?)_/g, '<span style="font-style: italic">$1</span>');
}

function formatInline(text) {
  return formatEmphasis(
    text
      .replace(
        /!\[(.+?)\]\((.+?)\)/g,
        (_, alt, url) =>
          `<img alt="${escapeAttr(alt)}" src="${escapeAttr(url)}">`,
      )
      .replace(
        /\[(.+?)\]\((.+?)\)/g,
        (_, label, url) =>
          `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
      ),
  );
}

function renderLine(line) {
  const marks = `[${CARET_MARK}${SEL_START}${SEL_END}]*`;
  const quote = line.match(new RegExp(`^(${marks})>(\\s?)(.*)$`));
  if (quote) {
    return `<blockquote>${formatInline(escapeHtml(quote[1] + quote[3]))}</blockquote>`;
  }

  const escaped = escapeHtml(line);
  const heading = escaped.match(new RegExp(`^(${marks})(#{1,3})\\s+(.*)$`));
  const unordered = escaped.match(new RegExp(`^(${marks})([-*+])\\s+(.*)$`));
  const ordered = escaped.match(new RegExp(`^(${marks})(\\d+)\\.\\s+(.*)$`));
  if (heading) {
    const level = heading[2].length;
    return `<h${level}>${formatInline(heading[1] + heading[3])}</h${level}>`;
  }
  if (unordered) {
    return `<ul><li>${formatInline(unordered[1] + unordered[3])}</li></ul>`;
  }
  if (ordered) {
    return `<ol start="${ordered[2]}"><li>${formatInline(ordered[1] + ordered[3])}</li></ol>`;
  }
  return `${formatInline(escaped)}<br>`;
}

function renderCodeBlock(lines, language) {
  const body = escapeHtml(lines.join("\n"));
  const lang = language ? escapeAttr(language) : "";
  const langAttr = lang ? ` data-lang="${lang}"` : "";
  const langClass = lang ? ` class="language-${lang}"` : "";
  return `<pre class="code-block"${langAttr}><code${langClass}>${body}</code></pre>`;
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  const out = [];
  let inCode = false;
  let codeLang = "";
  let codeLines = [];

  for (const line of lines) {
    const bare = stripMarks(line);
    if (/^```/.test(bare)) {
      if (inCode) {
        out.push(renderCodeBlock(codeLines, codeLang));
        codeLines = [];
        codeLang = "";
        inCode = false;
      } else {
        inCode = true;
        codeLang = bare.slice(3).trim();
      }
      const fenceMarks = [...line]
        .filter(
          (ch) =>
            ch === CARET_MARK || ch === SEL_START || ch === SEL_END,
        )
        .join("");
      if (fenceMarks) {
        out.push(applyMarks(fenceMarks));
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    out.push(renderLine(line));
  }

  if (inCode) {
    out.push(renderCodeBlock(codeLines, codeLang));
  }

  return applyMarks(out.join(""));
}

function withEditorMarks(
  value,
  selectionStart,
  selectionEnd,
  selectionDirection,
  focused,
) {
  if (!focused) {
    return value;
  }

  if (selectionStart === selectionEnd) {
    return (
      value.slice(0, selectionStart) +
      CARET_MARK +
      value.slice(selectionStart)
    );
  }

  const selected = value.slice(selectionStart, selectionEnd);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);

  if (selectionDirection === "backward") {
    return before + CARET_MARK + SEL_START + selected + SEL_END + after;
  }

  return before + SEL_START + selected + SEL_END + CARET_MARK + after;
}

function handleInput() {
  const { value, selectionStart, selectionEnd, selectionDirection } =
    editor.content;
  const focused = document.activeElement === editor.content;
  const text = withEditorMarks(
    value,
    selectionStart,
    selectionEnd,
    selectionDirection,
    focused,
  );

  if (editor.rendered) {
    editor.overlay.innerHTML = renderMarkdown(text);
  } else {
    editor.overlay.innerHTML = applyMarks(escapeHtml(text));
  }
}

function toggleViewMode() {
  editor.rendered = !editor.rendered;
  editor.viewMode.textContent = editor.rendered
    ? "Switch to Raw Text"
    : "Switch to Rendered Markup";
  handleInput();
}

function main() {
  editor.content = document.getElementById("content");
  editor.overlay = document.getElementById("overlay");
  editor.viewMode = document.getElementById("view-mode");
  editor.saveBtn = document.getElementById("save-doc");
  editor.loadBtn = document.getElementById("load-doc");
  editor.renameBtn = document.getElementById("rename-doc");
  editor.deleteBtn = document.getElementById("delete-doc");
  editor.downloadBtn = document.getElementById("download-doc");
  editor.exportBtn = document.getElementById("export-doc");
  editor.docsDialog = document.getElementById("docs-dialog");
  editor.docsSelect = document.getElementById("docs-select");
  editor.docsTitle = document.getElementById("docs-dialog-title");
  editor.docsConfirm = document.getElementById("docs-confirm");
  editor.exportAllBtn = document.getElementById("export-all");

  restoreFromStore();
  handleInput();

  editor.viewMode.addEventListener("click", toggleViewMode);
  editor.saveBtn.addEventListener("click", handleSaveClick);
  editor.loadBtn.addEventListener("click", () => openDocsDialog("load"));
  editor.renameBtn.addEventListener("click", () => openDocsDialog("rename"));
  editor.deleteBtn.addEventListener("click", () => openDocsDialog("delete"));
  editor.downloadBtn.addEventListener("click", handleDownloadClick);
  editor.exportBtn.addEventListener("click", () => openDocsDialog("export"));
  editor.exportAllBtn.addEventListener("click", handleExportAllClick);
  editor.docsDialog.addEventListener("close", handleDocsDialogClose);

  editor.content.addEventListener("input", () => {
    autosave();
    handleInput();
  });
  editor.content.addEventListener("keyup", handleInput);
  editor.content.addEventListener("click", handleInput);
  editor.content.addEventListener("focus", handleInput);
  editor.content.addEventListener("blur", handleInput);
  document.addEventListener("selectionchange", () => {
    if (document.activeElement === editor.content) {
      handleInput();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedTemp()) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  });
}

document.addEventListener("DOMContentLoaded", main);
