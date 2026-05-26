(function () {
  const API_URL =
    "https://seminai-be-v2-661301438659.europe-west1.run.app/email/send-email";
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const overlay = document.getElementById("invoices-modal-overlay");
  const dialog = document.getElementById("invoices-modal");
  const form = document.getElementById("invoices-modal-form");
  const nameInput = document.getElementById("invoices-name");
  const emailInput = document.getElementById("invoices-email");
  const messageInput = document.getElementById("invoices-message");
  const filesInput = document.getElementById("invoices-files");
  const fileList = document.getElementById("invoices-file-list");
  const errorEl = document.getElementById("invoices-error");
  const successEl = document.getElementById("invoices-success");
  const submitBtn = document.getElementById("invoices-submit");
  const cancelBtn = document.getElementById("invoices-cancel");
  const closeBtn = document.getElementById("invoices-close");

  if (!overlay || !dialog || !form) return;

  let selectedFiles = [];
  let lastFocused = null;

  function setStatus(message, type) {
    errorEl.hidden = type !== "error";
    successEl.hidden = type !== "success";
    if (type === "error") errorEl.textContent = message;
    if (type === "success") successEl.textContent = message;
  }

  function clearStatus() {
    errorEl.hidden = true;
    successEl.hidden = true;
    errorEl.textContent = "";
    successEl.textContent = "";
  }

  function renderFileList() {
    fileList.innerHTML = "";
    selectedFiles.forEach(function (file, index) {
      const item = document.createElement("li");
      item.className = "invoices-file-item";

      const name = document.createElement("span");
      name.textContent = file.name;
      name.className = "invoices-file-name";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "invoices-file-remove";
      remove.textContent = "Rimuovi";
      remove.addEventListener("click", function () {
        selectedFiles = selectedFiles.filter(function (_, i) {
          return i !== index;
        });
        renderFileList();
        clearStatus();
      });

      item.appendChild(name);
      item.appendChild(remove);
      fileList.appendChild(item);
    });
  }

  function resetForm() {
    form.reset();
    selectedFiles = [];
    renderFileList();
    clearStatus();
    submitBtn.disabled = false;
    submitBtn.textContent = "Invia fatture";
  }

  function openModal() {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    nameInput.focus();
  }

  function closeModal() {
    if (submitBtn.disabled) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
    resetForm();
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  document.querySelectorAll(".js-open-invoices-modal").forEach(function (trigger) {
    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      openModal();
    });
  });

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (event) {
    if (overlay.hidden) return;
    if (event.key === "Escape") closeModal();
  });

  filesInput.addEventListener("change", function () {
    if (!filesInput.files?.length) return;
    selectedFiles = Array.from(filesInput.files);
    renderFileList();
    clearStatus();
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearStatus();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !email || selectedFiles.length === 0) {
      setStatus("Compila nome, email e allega almeno una fattura.", "error");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setStatus("Inserisci un indirizzo email valido.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append(
      "body",
      message || "Invio fatture dalla landing Seminai, " + name,
    );
    selectedFiles.forEach(function (file) {
      formData.append("files", file);
    });

    submitBtn.disabled = true;
    submitBtn.textContent = "Invio in corso...";

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = await response.json();
      setStatus(
        data.message ||
          "Fatture inviate correttamente. Ti risponderemo via email.",
        "success",
      );
      nameInput.value = "";
      emailInput.value = "";
      messageInput.value = "";
      selectedFiles = [];
      filesInput.value = "";
      renderFileList();
    } catch {
      setStatus("Invio non riuscito. Riprova tra qualche minuto.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Invia fatture";
    }
  });
})();
