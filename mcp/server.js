#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const rootFlagIndex = args.indexOf("--root");
const rootPath = rootFlagIndex >= 0 ? args[rootFlagIndex + 1] : process.cwd();
const ROOT = path.resolve(rootPath);

function listMarkdownFiles(dir, output = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listMarkdownFiles(full, output);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      output.push(full);
    }
  }
  return output;
}

function toUri(filePath) {
  const rel = path.relative(ROOT, filePath).split(path.sep).join("/");
  return `portfolio://${rel}`;
}

function fromUri(uri) {
  if (!uri.startsWith("portfolio://")) throw new Error("Unsupported resource URI.");
  const rel = uri.slice("portfolio://".length);
  const absolute = path.resolve(ROOT, rel);
  if (!absolute.startsWith(ROOT)) throw new Error("Resource path escapes root directory.");
  if (!fs.existsSync(absolute)) throw new Error("Resource not found.");
  const stats = fs.statSync(absolute);
  if (!stats.isFile() || !absolute.endsWith(".md")) throw new Error("Resource not found.");
  return absolute;
}

function send(message) {
  const json = JSON.stringify(message);
  const payload = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
  process.stdout.write(payload);
}

function success(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function failure(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleRequest(req) {
  const { id, method, params } = req;
  try {
    switch (method) {
      case "initialize": {
        return success(id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            resources: {
              subscribe: false,
              listChanged: false,
            },
          },
          serverInfo: {
            name: "personal-context-portfolio-mcp",
            version: "1.0.0",
          },
        });
      }
      case "notifications/initialized":
        return;
      case "ping":
        return success(id, {});
      case "resources/list": {
        const resources = listMarkdownFiles(ROOT).map((filePath) => ({
          uri: toUri(filePath),
          name: path.relative(ROOT, filePath),
          mimeType: "text/markdown",
        }));
        return success(id, { resources });
      }
      case "resources/read": {
        const uri = params && params.uri;
        if (!uri) return failure(id, -32602, "Missing resource URI.");
        const filePath = fromUri(uri);
        const text = fs.readFileSync(filePath, "utf8");
        return success(id, {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text,
            },
          ],
        });
      }
      default:
        if (id !== undefined && id !== null) return failure(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    if (id !== undefined && id !== null) return failure(id, -32000, err.message || "Server error");
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = "";
      break;
    }

    const contentLength = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (buffer.length < bodyStart + contentLength) break;

    const body = buffer.slice(bodyStart, bodyStart + contentLength);
    buffer = buffer.slice(bodyStart + contentLength);

    let message;
    try {
      message = JSON.parse(body);
    } catch {
      continue;
    }

    if (message && message.jsonrpc === "2.0" && message.method) {
      handleRequest(message);
    }
  }
});

process.stderr.write(`MCP server started (root: ${ROOT})\n`);
