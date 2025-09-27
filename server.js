const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Multer config (photo upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Upload photo API
app.post("/upload", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ success: true, file: `/uploads/${req.file.filename}` });
});

// Pair code + set profile picture API
app.get("/pair", async (req, res) => {
  const number = req.query.number;
  const photoUrl = req.query.photo;

  if (!number || !photoUrl)
    return res.status(400).json({ error: "number & photo required" });

  try {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
    });

    sock.ev.on("creds.update", saveCreds);

    const code = await sock.requestPairingCode(number);
    console.log("PAIR CODE:", code);

    // Once connected → update profile picture
    sock.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        const jid = number + "@s.whatsapp.net";
        try {
          await sock.updateProfilePicture(jid, { url: "." + photoUrl });
          console.log("✅ Profile picture updated!");
        } catch (err) {
          console.error("DP update error:", err);
        }
      }
    });

    res.json({ pairCode: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
