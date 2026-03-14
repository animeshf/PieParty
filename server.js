require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const docRef = db.collection("pieparty").doc("words");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());

let words = {};

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

function normalize(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function snapshot() {
  const sorted = Object.entries(words)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(sorted);
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

  socket.on("submit", async ({ oldWord, newWord }) => {
    const fresh = normalize(newWord);
    if (!fresh || fresh.length > 30) return;

    if (oldWord) {
      const prev = normalize(oldWord);
      if (words[prev]) {
        words[prev]--;
        if (words[prev] <= 0) delete words[prev];
      }
    }

    words[fresh] = (words[fresh] || 0) + 1;
    io.emit("state", snapshot());
    await persist();
  });
});

const PORT = process.env.PORT || 3000;

loadWords().then(() => {
  server.listen(PORT, () => {
    console.log(`Pie Party running on port ${PORT}`);
  });
});
