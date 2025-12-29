const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ==============================
// SERVEUR FICHIERS STATIQUES
// ==============================
app.use(express.static(path.join(__dirname, "../public")));

// ==============================
// ÉTAT GLOBAL DE L'APPLICATION
// ==============================
let scores = { A: 0, B: 0 };
let currentMatch = null;
let scheduledMatches = [];
let matches = [];

// Mots Croisés
let crosswordGame = {
  table: null,
  result: null,
  clues: {},            // position → indice
  revealedWords: {}     // position → mot révélé
};

// Arrêt sur Image
let stopImageGame = {
  image: null,
  grid: { rows: 10, cols: 10 },
  tiles: []             // { id: number, level: 1|2|3|4 }
};

// ==============================
// FONCTION SÉCURISÉE POUR ÉVITER DOUBLONS SOCKET
// ==============================
function safeOn(socket, event, handler) {
  socket.removeAllListeners(event);
  socket.on(event, handler);
}

// ==============================
// CONNEXION CLIENT
// ==============================
io.on("connection", (socket) => {
  console.log(`✅ [${new Date().toLocaleTimeString()}] Client connecté : ${socket.id}`);

  // Envoi immédiat de l'état complet au nouveau client
  socket.emit("scoreUpdate", scores);
  socket.emit("currentMatch", currentMatch);
  socket.emit("updateScheduledMatches", scheduledMatches);
  socket.emit("updateMatches", matches);
  socket.emit("gridUpdate", crosswordGame);
  socket.emit("stopImageUpdate", stopImageGame);

  // ==============================
  // GESTION DES SCORES & MATCHS
  // ==============================
  safeOn(socket, "updateScore", ({ team, value }) => {
    if (!["A", "B"].includes(team)) {
      console.warn(`⚠️ Équipe invalide : ${team}`);
      return;
    }
    scores[team] += value;
    console.log(`🏆 Score : Équipe ${team} +${value} → A=${scores.A} B=${scores.B}`);
    io.emit("scoreUpdate", scores);
  });

  safeOn(socket, "manOfMatch", (data) => {
    console.log(`⭐ Homme du match : ${JSON.stringify(data)}`);
    io.emit("updateManOfMatch", data);
  });

  safeOn(socket, "scheduleMatch", (match) => {
    if (!match?.teamA || !match?.teamB) {
      console.warn("⚠️ Match mal formé");
      return;
    }
    scheduledMatches.push(match);
    console.log(`📅 Match programmé : ${match.teamA} vs ${match.teamB}`);
    io.emit("updateScheduledMatches", scheduledMatches);
  });

  safeOn(socket, "saveScore", ({ teamA, teamB, aScore, bScore }) => {
    matches.push({ teamA, teamB, aScore, bScore });
    console.log(`💾 Score sauvegardé : ${teamA} ${aScore}-${bScore} ${teamB}`);
    io.emit("updateMatches", matches);
  });

  safeOn(socket, "adminMessage", (message) => {
    console.log(`📢 Message admin : "${message}"`);
    io.emit("displayMessage", message);
  });

  safeOn(socket, "updateTeamName", ({ team, name }) => {
    console.log(`✏️ Équipe ${team} renommée : ${name}`);
    io.emit("teamNameUpdated", { team, name });
  });

  safeOn(socket, "changePublicPage", (page) => {
    console.log(`📄 Page publique → ${page}`);
    io.emit("loadPage", page);
  });

  safeOn(socket, "nextMatch", () => {
    if (scheduledMatches.length === 0) {
      console.warn("⚠️ Aucun match programmé");
      socket.emit("noMatchAvailable", "Aucun match restant.");
      return;
    }
    currentMatch = scheduledMatches.shift();
    scores = { A: 0, B: 0 };
    console.log(`🚀 Match lancé : ${currentMatch.teamA} vs ${currentMatch.teamB}`);
    io.emit("currentMatch", currentMatch);
    io.emit("scoreUpdate", scores);
    io.emit("updateScheduledMatches", scheduledMatches);
  });

  // ==============================
  // MOTS CROISÉS
  // ==============================
  safeOn(socket, "newGrid", (data) => {
    if (!data?.table || !data?.result || !data?.clues) {
      console.warn("⚠️ Données grille mots croisés invalides");
      return;
    }

    crosswordGame = {
      table: data.table,
      result: data.result,
      clues: data.clues,
      revealedWords: {}
    };

    console.log(`🧩 Grille mots croisés générée (${data.result.length} mots)`);
    io.emit("gridUpdate", crosswordGame);
  });

  safeOn(socket, "revealWord", (position) => {
    const entry = crosswordGame.result?.find(e => e.position == position);
    if (!entry) {
      console.warn(`⚠️ Position ${position} introuvable`);
      return;
    }
    crosswordGame.revealedWords[position] = entry.answer.toUpperCase();
    console.log(`🔓 Mot révélé : ${position} → ${entry.answer.toUpperCase()}`);
    io.emit("gridUpdate", crosswordGame);
  });

  safeOn(socket, "revealAll", () => {
    if (!crosswordGame.result) return;
    crosswordGame.result.forEach(entry => {
      crosswordGame.revealedWords[entry.position] = entry.answer.toUpperCase();
    });
    console.log(`🔓 Tous les mots révélés`);
    io.emit("gridUpdate", crosswordGame);
  });

  safeOn(socket, "reset", () => {
    crosswordGame = { table: null, result: null, clues: {}, revealedWords: {} };
    console.log("🗑️ Grille mots croisés réinitialisée");
    io.emit("gridUpdate", crosswordGame);
  });

  // ==============================
  // ARRÊT SUR IMAGE
  // ==============================
  safeOn(socket, "stopImageUpdate", (data) => {
    if (!data?.image) {
      console.warn("⚠️ Image manquante dans Arrêt sur Image");
      return;
    }

    stopImageGame = {
      image: data.image,
      grid: data.grid || { rows: 10, cols: 10 },
      tiles: data.tiles || []
    };

    console.log(`🖼️ Arrêt sur Image : image chargée + ${stopImageGame.tiles.length} tuiles révélées`);
    io.emit("stopImageUpdate", stopImageGame);
  });

  safeOn(socket, "stopImageReset", () => {
    stopImageGame = { image: null, grid: { rows: 10, cols: 10 }, tiles: [] };
    console.log("🔄 Arrêt sur Image réinitialisé");
    io.emit("stopImageUpdate", stopImageGame);
  });

  // Admin envoie le nom correct
  safeOn(socket, "revealName", (name) => {
    console.log(`Nom correct diffusé : "${name}"`);
    io.emit("displayCorrectName", name);
  });

  // ==============================
  // DÉCONNEXION
  // ==============================
  socket.on("disconnect", () => {
    console.log(`❌ [${new Date().toLocaleTimeString()}] Client déconnecté : ${socket.id}`);
  });
});

// ==============================
// DÉMARRAGE SERVEUR
// ==============================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur LiveScore + Mots Croisés + Arrêt sur Image démarré !`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`👤 Admin → /admin.html`);
  console.log(`👥 Public → /public.html`);
});