(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DebugOverlay = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── state ── */
  var config = { project: "", endpoint: "", apiKey: "" };
  var active = false;
  var notes = [];
  var currentTarget = null;

  /* ── DOM refs (created lazily) ── */
  var highlight = null;
  var bar = null;
  var dialog = null;
  var counter = null;

  /* ── helpers ── */

  function getXPath(el) {
    if (!el || el === document.body) return "/body";
    var parts = [];
    while (el && el !== document.body) {
      var idx = 1;
      var sib = el.previousElementSibling;
      while (sib) {
        if (sib.tagName === el.tagName) idx++;
        sib = sib.previousElementSibling;
      }
      parts.unshift(el.tagName.toLowerCase() + "[" + idx + "]");
      el = el.parentElement;
    }
    return "/body/" + parts.join("/");
  }

  function isOwnElement(el) {
    while (el) {
      if (el.getAttribute && el.getAttribute("data-debug-overlay") === "true")
        return true;
      el = el.parentElement;
    }
    return false;
  }

  function truncate(str, max) {
    if (!str) return "";
    str = str.trim().replace(/\s+/g, " ");
    return str.length > max ? str.slice(0, max) + "..." : str;
  }

  /* ── UI creation ── */

  function createHighlight() {
    if (highlight) return;
    highlight = document.createElement("div");
    highlight.setAttribute("data-debug-overlay", "true");
    Object.assign(highlight.style, {
      position: "fixed",
      pointerEvents: "none",
      border: "2px solid #ef4444",
      background: "rgba(239, 68, 68, 0.1)",
      zIndex: "99998",
      display: "none",
      transition: "top 0.05s, left 0.05s, width 0.05s, height 0.05s",
      boxSizing: "border-box",
    });
    document.body.appendChild(highlight);
  }

  function createBar() {
    if (bar) return;
    bar = document.createElement("div");
    bar.setAttribute("data-debug-overlay", "true");
    Object.assign(bar.style, {
      position: "fixed",
      bottom: "0",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#002856",
      color: "#ffffff",
      padding: "10px 24px",
      borderRadius: "12px 12px 0 0",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      fontWeight: "600",
      zIndex: "99999",
      boxShadow: "0 -2px 12px rgba(0,0,0,0.3)",
      userSelect: "none",
    });

    var label = document.createElement("span");
    label.textContent = "DEBUG AKTIV";

    counter = document.createElement("span");
    counter.style.color = "#facc15";
    counter.style.fontWeight = "700";
    updateCounter();

    var btn = document.createElement("button");
    btn.setAttribute("data-debug-overlay", "true");
    btn.textContent = "Speichern & Beenden";
    Object.assign(btn.style, {
      background: "#ef4444",
      color: "#ffffff",
      border: "none",
      padding: "6px 14px",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "13px",
    });
    btn.addEventListener("click", function () {
      submitNotes();
    });

    bar.appendChild(label);
    bar.appendChild(counter);
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  function updateCounter() {
    if (counter) {
      counter.textContent = notes.length + " Notiz" + (notes.length !== 1 ? "en" : "");
    }
  }

  function createDialog(el) {
    if (dialog) dialog.remove();

    var tag = el.tagName.toLowerCase();
    var id = el.id ? "#" + el.id : "";
    var classes = Array.prototype.slice.call(el.classList).join(" ");
    var text = truncate(el.textContent, 100);
    var xpath = getXPath(el);

    dialog = document.createElement("div");
    dialog.setAttribute("data-debug-overlay", "true");
    Object.assign(dialog.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "#1e293b",
      color: "#ffffff",
      padding: "24px",
      borderRadius: "12px",
      zIndex: "99999",
      width: "440px",
      maxWidth: "90vw",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    });

    var title = document.createElement("h3");
    title.textContent = "Element-Info";
    Object.assign(title.style, {
      margin: "0 0 12px 0",
      fontSize: "16px",
      color: "#facc15",
    });

    var info = document.createElement("pre");
    info.textContent =
      "Tag:     " + tag + id + "\n" +
      "Klassen: " + (classes || "(keine)") + "\n" +
      "Text:    " + (text || "(leer)") + "\n" +
      "XPath:   " + xpath;
    Object.assign(info.style, {
      background: "#0f172a",
      padding: "12px",
      borderRadius: "6px",
      fontSize: "12px",
      overflow: "auto",
      maxHeight: "120px",
      margin: "0 0 12px 0",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
    });

    var textarea = document.createElement("textarea");
    textarea.placeholder = "Kommentar eingeben... (Ctrl+Enter zum Speichern)";
    Object.assign(textarea.style, {
      width: "100%",
      minHeight: "80px",
      background: "#0f172a",
      color: "#ffffff",
      border: "1px solid #334155",
      borderRadius: "6px",
      padding: "10px",
      fontSize: "13px",
      resize: "vertical",
      boxSizing: "border-box",
      fontFamily: "system-ui, -apple-system, sans-serif",
      outline: "none",
    });

    textarea.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        addNote(el, textarea.value);
      }
    });

    var btnRow = document.createElement("div");
    Object.assign(btnRow.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "12px",
    });

    var cancelBtn = document.createElement("button");
    cancelBtn.setAttribute("data-debug-overlay", "true");
    cancelBtn.textContent = "Abbrechen";
    Object.assign(cancelBtn.style, {
      background: "transparent",
      color: "#94a3b8",
      border: "1px solid #334155",
      padding: "6px 14px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "13px",
    });
    cancelBtn.addEventListener("click", function () {
      closeDialog();
    });

    var addBtn = document.createElement("button");
    addBtn.setAttribute("data-debug-overlay", "true");
    addBtn.textContent = "Hinzufuegen";
    Object.assign(addBtn.style, {
      background: "#0a84ff",
      color: "#ffffff",
      border: "none",
      padding: "6px 14px",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "13px",
    });
    addBtn.addEventListener("click", function () {
      addNote(el, textarea.value);
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(addBtn);

    dialog.appendChild(title);
    dialog.appendChild(info);
    dialog.appendChild(textarea);
    dialog.appendChild(btnRow);
    document.body.appendChild(dialog);

    setTimeout(function () {
      textarea.focus();
    }, 50);
  }

  function closeDialog() {
    if (dialog) {
      dialog.remove();
      dialog = null;
    }
  }

  function addNote(el, comment) {
    if (!comment || !comment.trim()) {
      closeDialog();
      return;
    }
    var tag = el.tagName.toLowerCase();
    var id = el.id ? "#" + el.id : "";
    notes.push({
      page: window.location.href,
      elementTag: tag + id,
      elementText: truncate(el.textContent, 100),
      elementClasses: Array.prototype.slice.call(el.classList).join(" "),
      xpath: getXPath(el),
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
    });
    updateCounter();
    closeDialog();
  }

  /* ── event handlers ── */

  function onMouseMove(e) {
    if (!active || dialog) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOwnElement(el)) {
      highlight.style.display = "none";
      currentTarget = null;
      return;
    }
    currentTarget = el;
    var rect = el.getBoundingClientRect();
    Object.assign(highlight.style, {
      display: "block",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
  }

  function onClick(e) {
    if (!active) return;
    if (isOwnElement(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (currentTarget) {
      createDialog(currentTarget);
    }
  }

  function onKeyDown(e) {
    // F16 key
    if (e.key === "F16") {
      e.preventDefault();
      toggle();
      return;
    }
    // Ctrl+Shift+D / Cmd+Shift+D fallback
    if ((e.key === "D" || e.key === "d") && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      toggle();
      return;
    }
    // Escape closes dialog
    if (e.key === "Escape" && dialog) {
      closeDialog();
    }
  }

  /* ── submit / download ── */

  function generateMarkdown() {
    var now = new Date().toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    var md = "# Debug Notes — " + config.project + "\n";
    md += "**Date:** " + now + "\n";
    md += "**Page:** " + window.location.href + "\n";
    md += "**Notes:** " + notes.length + "\n\n---\n";

    notes.forEach(function (n, i) {
      md += "\n## " + (i + 1) + ". " + n.elementTag + "\n";
      md += "- **XPath:** `" + n.xpath + "`\n";
      md += "- **Classes:** `" + n.elementClasses + "`\n";
      md += "- **Text:** " + n.elementText + "\n";
      md += "- **Page:** " + n.page + "\n";
      md += "- **Time:** " + n.timestamp + "\n\n";
      md += "> " + n.comment + "\n";
    });

    return md;
  }

  function downloadMarkdown() {
    var md = generateMarkdown();
    var blob = new Blob([md], { type: "text/markdown" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "debug-notes-" + config.project + "-" + Date.now() + ".md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function submitNotes() {
    if (notes.length === 0) {
      deactivate();
      return;
    }

    if (!config.endpoint) {
      downloadMarkdown();
      deactivate();
      return;
    }

    var headers = { "Content-Type": "application/json" };
    if (config.apiKey) headers["X-Debug-Key"] = config.apiKey;

    var payload = JSON.stringify({ notes: notes, project: config.project });

    fetch(config.endpoint, {
      method: "POST",
      headers: headers,
      body: payload,
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        console.log("[DebugOverlay] Notes submitted successfully (" + notes.length + ")");
        deactivate();
      })
      .catch(function (err) {
        console.warn("[DebugOverlay] Submit failed, downloading as Markdown:", err);
        downloadMarkdown();
        deactivate();
      });
  }

  /* ── lifecycle ── */

  function activate() {
    if (active) return;
    active = true;
    notes = [];
    createHighlight();
    createBar();
    document.body.style.cursor = "crosshair";
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
  }

  function deactivate() {
    active = false;
    notes = [];
    currentTarget = null;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    if (highlight) {
      highlight.remove();
      highlight = null;
    }
    if (bar) {
      bar.remove();
      bar = null;
      counter = null;
    }
    closeDialog();
  }

  function toggle() {
    if (active) {
      submitNotes();
    } else {
      activate();
    }
  }

  function destroy() {
    deactivate();
    document.removeEventListener("keydown", onKeyDown, true);
  }

  function init(opts) {
    config.project = opts.project || "";
    config.endpoint = opts.endpoint || "";
    config.apiKey = opts.apiKey || "";

    // register global shortcut
    document.addEventListener("keydown", onKeyDown, true);

    // check if debug is active for this project
    if (config.endpoint && config.project) {
      var configUrl = config.endpoint.replace("/debug/notes", "/debug/config/" + config.project);
      fetch(configUrl, {
        headers: config.apiKey ? { "X-Debug-Key": config.apiKey } : {},
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (!data.active) {
            console.log("[DebugOverlay] Debug disabled for project:", config.project);
            document.removeEventListener("keydown", onKeyDown, true);
          } else {
            console.log("[DebugOverlay] Ready — press Ctrl+Shift+D or F16 to start");
          }
        })
        .catch(function () {
          // offline or endpoint not reachable — keep listener for local dev
          console.log("[DebugOverlay] Config fetch failed, keeping overlay available for local dev");
        });
    } else {
      console.log("[DebugOverlay] Ready (no endpoint) — press Ctrl+Shift+D or F16 to start");
    }
  }

  /* ── public API ── */
  return {
    init: init,
    activate: activate,
    deactivate: deactivate,
    toggle: toggle,
    destroy: destroy,
  };
});
