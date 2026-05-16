const FILE_ORDER = [
  "identity.md",
  "role-and-responsibilities.md",
  "current-projects.md",
  "team-and-relationships.md",
  "tools-and-systems.md",
  "communication-style.md",
  "goals-and-priorities.md",
  "preferences-and-constraints.md",
  "domain-knowledge.md",
  "decision-log.md",
];

const HEADING_TO_FILE = new Map([
  ["identity", "identity.md"],
  ["role and responsibilities", "role-and-responsibilities.md"],
  ["current projects", "current-projects.md"],
  ["team and relationships", "team-and-relationships.md"],
  ["tools and systems", "tools-and-systems.md"],
  ["communication style", "communication-style.md"],
  ["goals and priorities", "goals-and-priorities.md"],
  ["preferences and constraints", "preferences-and-constraints.md"],
  ["domain knowledge", "domain-knowledge.md"],
  ["decision log", "decision-log.md"],
]);

const state = {
  systemPrompt: "",
  messages: [],
  files: new Map(),
  lastAssistantDraft: "",
};

const baseUrlEl = document.getElementById("baseUrl");
const modelEl = document.getElementById("model");
const apiKeyEl = document.getElementById("apiKey");
const startBtn = document.getElementById("startBtn");
const sendBtn = document.getElementById("sendBtn");
const userInputEl = document.getElementById("userInput");
const messagesEl = document.getElementById("messages");
const fileSelectEl = document.getElementById("fileSelect");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const downloadZipBtn = document.getElementById("downloadZipBtn");
const fileListEl = document.getElementById("fileList");

for (const file of FILE_ORDER) {
  const option = document.createElement("option");
  option.value = file;
  option.textContent = file;
  fileSelectEl.appendChild(option);
}

function appendMessage(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = "message";
  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = role === "assistant" ? "Assistant" : role === "user" ? "You" : "System";
  const contentEl = document.createElement("div");
  contentEl.textContent = content;
  wrapper.append(roleEl, contentEl);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderFiles() {
  fileListEl.innerHTML = "";
  for (const file of FILE_ORDER) {
    const li = document.createElement("li");
    if (state.files.has(file)) {
      const a = document.createElement("button");
      a.type = "button";
      a.textContent = `Download ${file}`;
      a.addEventListener("click", () => {
        const url = URL.createObjectURL(new Blob([state.files.get(file)], { type: "text/markdown;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = file;
        link.click();
        URL.revokeObjectURL(url);
      });
      li.append(document.createElement("code")).textContent = file;
      li.append(" — ", a);
    } else {
      li.innerHTML = `<code>${file}</code> — pending`;
    }
    fileListEl.appendChild(li);
  }
}

function detectFileFromDraft(text) {
  const match = text.match(/^#\s+(.+)$/m);
  if (!match) return null;
  const normalized = match[1].trim().toLowerCase().replace(/\s+/g, " ");
  return HEADING_TO_FILE.get(normalized) ?? null;
}

async function loadSystemPrompt() {
  if (state.systemPrompt) return state.systemPrompt;
  const res = await fetch("../interview-protocol/agent-system-prompt.md");
  if (!res.ok) throw new Error(`Failed to load interview protocol: ${res.status}`);
  state.systemPrompt = await res.text();
  return state.systemPrompt;
}

async function chatWithModel() {
  const baseUrl = baseUrlEl.value.trim().replace(/\/+$/, "");
  const model = modelEl.value.trim();
  const apiKey = apiKeyEl.value.trim();
  if (!baseUrl || !model || !apiKey) throw new Error("Base URL, model, and API key are required.");

  const payload = {
    model,
    temperature: 0.2,
    messages: state.messages,
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM response did not include assistant message content.");
  }

  return content;
}

async function sendUserMessage(userText) {
  state.messages.push({ role: "user", content: userText });
  appendMessage("user", userText);

  const assistantText = await chatWithModel();
  state.messages.push({ role: "assistant", content: assistantText });
  state.lastAssistantDraft = assistantText;
  appendMessage("assistant", assistantText);

  const guessedFile = detectFileFromDraft(assistantText);
  if (guessedFile) fileSelectEl.value = guessedFile;
}

startBtn.addEventListener("click", async () => {
  try {
    const prompt = await loadSystemPrompt();
    state.messages = [{ role: "system", content: prompt }];
    messagesEl.innerHTML = "";
    appendMessage("system", "Interview initialized.");
    await sendUserMessage("Let's begin.");
  } catch (err) {
    appendMessage("system", `Error: ${err.message}`);
  }
});

sendBtn.addEventListener("click", async () => {
  const text = userInputEl.value.trim();
  if (!text) return;
  userInputEl.value = "";
  try {
    await sendUserMessage(text);
  } catch (err) {
    appendMessage("system", `Error: ${err.message}`);
  }
});

saveDraftBtn.addEventListener("click", () => {
  const file = fileSelectEl.value;
  if (!state.lastAssistantDraft) {
    appendMessage("system", "No assistant draft is available yet.");
    return;
  }
  state.files.set(file, state.lastAssistantDraft);
  renderFiles();
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n) { return [n & 0xff, (n >>> 8) & 0xff]; }
function u32(n) { return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]; }

function buildZip(fileEntries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, text] of fileEntries) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(text);
    const crc = crc32(dataBytes);

    const localHeader = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(dataBytes.length), ...u32(dataBytes.length),
      ...u16(nameBytes.length), ...u16(0),
    ];

    const centralHeader = [
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(dataBytes.length), ...u32(dataBytes.length),
      ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ];

    const local = new Uint8Array(localHeader.length + nameBytes.length + dataBytes.length);
    local.set(localHeader, 0);
    local.set(nameBytes, localHeader.length);
    local.set(dataBytes, localHeader.length + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(centralHeader.length + nameBytes.length);
    central.set(centralHeader, 0);
    central.set(nameBytes, centralHeader.length);
    centralParts.push(central);

    offset += local.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fileEntries.length), ...u16(fileEntries.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);

  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

downloadZipBtn.addEventListener("click", () => {
  const entries = FILE_ORDER.filter((f) => state.files.has(f)).map((f) => [f, state.files.get(f)]);
  if (!entries.length) {
    appendMessage("system", "No saved files available to download.");
    return;
  }
  const zipBlob = buildZip(entries);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = "personal-context-portfolio.zip";
  a.click();
  URL.revokeObjectURL(a.href);
});

renderFiles();
