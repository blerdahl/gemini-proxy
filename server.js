const http = require("http");
const https = require("https");

const GEMINI_API_KEY = "AIzaSyD2wVvHTfYiZSpGaZCAcW1eNkq40WYg77g";
const PORT = 3001;

const server = http.createServer((req, res) => {
  // Allow requests from anywhere (Claude artifact, localhost, etc.)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/gemini") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    let prompt;
    try {
      prompt = JSON.parse(body).prompt;
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid JSON body" }));
      return;
    }

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1000 },
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const geminiReq = https.request(options, geminiRes => {
      let data = "";
      geminiRes.on("data", chunk => (data += chunk));
      geminiRes.on("end", () => {
        try {
          const json = JSON.parse(data);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ text }));
        } catch {
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Failed to parse Gemini response", raw: data }));
        }
      });
    });

    geminiReq.on("error", err => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });

    geminiReq.write(payload);
    geminiReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`✅ Gemini proxy running at http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/gemini  { "prompt": "..." }`);
});
