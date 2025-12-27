const express = require("express");
const app = express();
const path = require("path");
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" } // nécessaire pour mots croisés
});

// ===============================
// ÉTAT GLOBAL
// ===============================
let scores = { A: 0, B: 0 };
let currentMatch = null;
let scheduledMatches = [];
let matches = [];

// ===============================
// MOTS CROISÉS
// ===============================
let words = []; // stockage temporaire des mots croisés

// ===============================
// SERVE FICHIERS STATIQUES
// ===============================
app.use(express.static(path.join(__dirname, "../public"))); // contient public.html, admin.html, page mots croisés

// ===============================
// FONCTION UTILITAIRE
// ===============================
function safeOn(socket, event, handler) {
  socket.removeAllListeners(event);
  socket.on(event, handler);
}

// ===============================
// CONNEXION SOCKET.IO
// ===============================
io.on("connection", (socket) => {
  console.log(`✅ [${new Date().toLocaleTimeString()}] Client connecté : ${socket.id}`);

  // --- État initial pour LiveScore ---
  socket.emit("scoreUpdate", scores);
  socket.emit("currentMatch", currentMatch);
  socket.emit("updateScheduledMatches", scheduledMatches);
  socket.emit("updateMatches", matches);

  // --- État initial pour mots croisés ---
  socket.emit("updateGrid", { words });

  // ===============================
  // ACTIONS LIVE SCORE
  // ===============================
  safeOn(socket, "updateScore", ({ team, value }) => {
    if (scores.hasOwnProperty(team)) {
      scores[team] += value;
      io.emit("scoreUpdate", scores);
    }
  });

  safeOn(socket, "manOfMatch", (data) => io.emit("updateManOfMatch", data));

  safeOn(socket, "scheduleMatch", (match) => {
    scheduledMatches.push(match);
    io.emit("updateScheduledMatches", scheduledMatches);
  });

  safeOn(socket, "saveScore", ({ teamA, teamB, aScore, bScore }) => {
    matches.push({ teamA, teamB, aScore, bScore });
    io.emit("updateMatches", matches);
  });

  safeOn(socket, "adminMessage", (message) => io.emit("displayMessage", message));

  safeOn(socket, "updateTeamName", ({ team, name }) => io.emit("teamNameUpdated", { team, name }));

  safeOn(socket, "changePublicPage", (page) => io.emit("loadPage", page));

  safeOn(socket, "nextMatch", () => {
    if (scheduledMatches.length > 0) {
      currentMatch = scheduledMatches.shift();
      scores = { A: 0, B: 0 };
      io.emit("currentMatch", currentMatch);
      io.emit("scoreUpdate", scores);
      io.emit("updateScheduledMatches", scheduledMatches);
    } else {
      socket.emit("noMatchAvailable", "⚠️ Aucun match programmé.");
    }
  });

  safeOn(socket, "next-level", () => io.emit("next-level"));
  safeOn(socket, "reset-image", () => io.emit("reset-image"));
  safeOn(socket, "change-image", (imageUrl) => io.emit("change-image", imageUrl));

  // ===============================
  // ACTIONS MOTS CROISÉS
  // ===============================
  safeOn(socket, "updateGrid", (data) => {
    words = data.words;
    io.emit("updateGrid", { words });
  });

  safeOn(socket, "revealWord", (index) => io.emit("revealWord", index));
  safeOn(socket, "revealAll", () => io.emit("revealAll"));

  // ===============================
  // Déconnexion
  // ===============================
  socket.on("disconnect", () => {
    console.log(`❌ [${new Date().toLocaleTimeString()}] Client déconnecté : ${socket.id}`);
  });
});

// ===============================
// LANCEMENT SERVEUR
// ===============================
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🚀 Serveur GSDDM LiveScore démarré sur http://localhost:3000`));
