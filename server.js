try {
  require("dotenv").config();
} catch (_) {}
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");

let words = {};

function normalize(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function snapshot(source = words) {
  const sorted = Object.entries(source)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(sorted);
}

function createApp() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const docRef = db.collection("pieparty").doc("words");

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  app.use(express.static("public"));
  app.use(express.json());

  async function loadWords() {
    const doc = await docRef.get();
    if (doc.exists) {
      words = doc.data() || {};
      console.log("Loaded words from Firestore:", Object.keys(words).length, "topics");
    } else {
      console.log("No existing data in Firestore, starting fresh");
    }
  }

  async function persist() {
    try {
      await docRef.set(Object.assign({}, words));
      console.log("Persisted to Firestore:", Object.keys(words).length, "topics");
    } catch (err) {
      console.error("FIRESTORE WRITE FAILED:", err.message);
    }
  }

  app.get("/api/status", (req, res) => {
    res.json({ inMemory: snapshot(), topicCount: Object.keys(words).length });
  });

  if (process.env.NODE_ENV !== "production") {
    app.post("/api/seed", (req, res) => {
      const entries = req.body;
      if (!Array.isArray(entries)) return res.status(400).json({ error: "send an array" });
      for (const { word, count } of entries) {
        const w = normalize(word);
        if (w) words[w] = (words[w] || 0) + (count || 1);
      }
      persist();
      io.emit("state", snapshot());
      res.json(snapshot());
    });
  }

  io.on("connection", (socket) => {
    socket.emit("state", snapshot());

    socket.on("submit", async ({ word }) => {
      const fresh = normalize(word);
      if (!fresh || fresh.length > 30) return;

      words[fresh] = (words[fresh] || 0) + 1;
      io.emit("state", snapshot());
      await persist();
    });
  });

  return { app, server, loadWords };
}

if (require.main === module) {
  const { server, loadWords } = createApp();
  const PORT = process.env.PORT || 3000;

  loadWords().then(() => {
    server.listen(PORT, () => {
      console.log(`Pie Party running on port ${PORT}`);
    });
  });
}

module.exports = { normalize, snapshot, createApp };
