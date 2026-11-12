(() => {
  "use strict";

  const config = window.JPDB_CONFIG || {};
  const form = document.getElementById("projectForm");
  const fields = {
    id: document.getElementById("projectId"),
    name: document.getElementById("projectName"),
    assigned: document.getElementById("assignedTo"),
    assignmentDate: document.getElementById("assignmentDate"),
    deadline: document.getElementById("deadline")
  };
  const message = document.getElementById("message");
  const notice = document.getElementById("connectionNotice");
  const saveButton = document.getElementById("saveButton");
  const updateButton = document.getElementById("updateButton");
  const resetButton = document.getElementById("resetButton");
  let mode = "idle";
  let lookupSequence = 0;
  let lookupTimer;

  const hasToken = Boolean(config.token && config.token.trim());
  notice.hidden = hasToken;

  function showMessage(text, type = "info") {
    message.textContent = text;
    message.className = `alert alert-${type}`;
    message.hidden = false;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = "";
  }

  function setDetailsEnabled(enabled) {
    Object.values(fields).slice(1).forEach((field) => { field.disabled = !enabled; });
  }

  function resetForm(focus = true) {
    clearTimeout(lookupTimer);
    lookupSequence += 1;
    form.reset();
    form.classList.remove("was-validated");
    Object.values(fields).forEach((field) => {
      field.classList.remove("is-invalid", "is-valid");
      field.disabled = field !== fields.id;
    });
    saveButton.disabled = true;
    updateButton.disabled = true;
    resetButton.disabled = false;
    mode = "idle";
    clearMessage();
    if (focus) fields.id.focus();
  }

  function extractRecord(response) {
    const data = response && response.data;
    if (!data || response.status !== 200) return null;
    if (data.record && typeof data.record === "object") return data.record;
    if (typeof data === "object" && !Array.isArray(data)) return data;
    return null;
  }

  async function request(path, payload, { allowNotFound = false } = {}) {
      const response = await fetch(`${config.apiBase || "http://api.login2explore.com:5577"}${path}`, {
      method: "POST",
      // This is a CORS-simple content type, so the browser sends the JSON body
      // directly instead of issuing an OPTIONS preflight that JPDB rejects.
      // JSONPowerDB's jQuery examples use this same raw-JSON POST convention.
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (allowNotFound && response.status === 400) return result;
    if (!response.ok || (result.status && result.status !== 200)) {
      throw new Error(result.message || `JSONPowerDB returned HTTP ${response.status}.`);
    }
    return result;
  }

  function payloadRecord() {
    return {
      "Project-ID": fields.id.value.trim(),
      "Project-Name": fields.name.value.trim(),
      "Assigned-To": fields.assigned.value.trim(),
      "Assignment-Date": fields.assignmentDate.value,
      "Deadline": fields.deadline.value
    };
  }

  async function lookupProject() {
    const projectId = fields.id.value.trim();
    clearMessage();
    if (!projectId) {
      fields.id.classList.add("is-invalid");
      fields.id.focus();
      return;
    }
    fields.id.classList.remove("is-invalid");
    if (!hasToken) {
      showMessage("Add your JSONPowerDB token in config.js before using the form.", "warning");
      return;
    }

    const sequence = ++lookupSequence;
    saveButton.disabled = true;
    updateButton.disabled = true;
    setDetailsEnabled(false);
    showMessage("Checking project ID…", "info");
    try {
      const result = await request("/api/irl", {
        token: config.token.trim(),
        cmd: "GET_BY_KEY",
        dbName: config.database || "COLLEGE-DB",
        rel: config.relation || "PROJECT-TABLE",
        jsonStr: { "Project-ID": projectId }
      }, { allowNotFound: true });
      if (sequence !== lookupSequence) return;
      const record = extractRecord(result);
      if (record) {
        fields.name.value = record["Project-Name"] ?? "";
        fields.assigned.value = record["Assigned-To"] ?? "";
        fields.assignmentDate.value = record["Assignment-Date"] ?? "";
        fields.deadline.value = record.Deadline ?? "";
        fields.id.disabled = true;
        setDetailsEnabled(true);
        mode = "update";
        updateButton.disabled = false;
        resetButton.disabled = false;
        showMessage("Existing project loaded. Update the details and choose Update.", "success");
      } else {
        fields.name.value = "";
        fields.assigned.value = "";
        fields.assignmentDate.value = "";
        fields.deadline.value = "";
        fields.id.disabled = false;
        setDetailsEnabled(true);
        mode = "save";
        saveButton.disabled = false;
        resetButton.disabled = false;
        showMessage("Project ID is available. Enter the project details.", "primary");
      }
      fields.name.focus();
    } catch (error) {
      if (sequence !== lookupSequence) return;
      mode = "idle";
      setDetailsEnabled(false);
      saveButton.disabled = true;
      updateButton.disabled = true;
      showMessage(`JSONPowerDB did not return a valid HTTP response (${error.message}). Your connection reached the host, but the browser cannot read its response; the token has not been checked. Confirm the API endpoint/service with Login2Xplore support.`, "danger");
    }
  }

  function validateForm() {
    form.classList.add("was-validated");
    const invalid = [...form.querySelectorAll("input[required]:not(:disabled)")].find((field) => !field.value.trim());
    if (invalid) {
      invalid.classList.add("is-invalid");
      invalid.focus();
      return false;
    }
    if (fields.deadline.value < fields.assignmentDate.value) {
      fields.deadline.setCustomValidity("Deadline must be on or after the assignment date.");
      fields.deadline.classList.add("is-invalid");
      fields.deadline.focus();
      showMessage("Deadline must be on or after the assignment date.", "danger");
      fields.deadline.setCustomValidity("");
      return false;
    }
    return true;
  }

  async function saveOrUpdate(kind) {
    if (mode !== kind || !validateForm()) return;
    if (!hasToken) {
      showMessage("Add your JSONPowerDB token in config.js before saving.", "warning");
      return;
    }
    const record = payloadRecord();
    const button = kind === "save" ? saveButton : updateButton;
    button.disabled = true;
    resetButton.disabled = true;
    showMessage(kind === "save" ? "Saving project…" : "Updating project…", "info");
    try {
      const result = await request("/api/iml/set", {
        token: config.token.trim(),
        cmd: "SET",
        dbName: config.database || "COLLEGE-DB",
        rel: config.relation || "PROJECT-TABLE",
        type: kind === "save" ? "PUT" : "UPDATE",
        primaryKey: "Project-ID",
        jsonStr: record
      });
      showMessage(result.message || (kind === "save" ? "Project saved successfully." : "Project updated successfully."), "success");
      window.setTimeout(() => resetForm(), 900);
    } catch (error) {
      button.disabled = false;
      resetButton.disabled = false;
      showMessage(`Could not ${kind === "save" ? "save" : "update"} the project. ${error.message}`, "danger");
    }
  }

  fields.id.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      lookupProject();
    }
  });
  fields.id.addEventListener("blur", () => {
    if (fields.id.value.trim() && mode === "idle") lookupTimer = window.setTimeout(lookupProject, 120);
  });
  fields.id.addEventListener("input", () => {
    if (mode !== "idle") {
      const projectId = fields.id.value;
      resetForm(false);
      fields.id.value = projectId;
    }
    fields.id.classList.remove("is-invalid");
  });
  saveButton.addEventListener("click", () => saveOrUpdate("save"));
  updateButton.addEventListener("click", () => saveOrUpdate("update"));
  resetButton.addEventListener("click", () => resetForm());
  form.addEventListener("submit", (event) => event.preventDefault());
  resetForm();
})();
