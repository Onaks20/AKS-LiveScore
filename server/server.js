const express = require("express");
const app = express();
const path = require("path");
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// ===============================
// ÉTAT GLOBAL
// ===============================
let scores = { A: 0, B: 0 };
let currentMatch = null;
let scheduledMatches = [];
let matches = [];

// ===============================
// SERVE FICHIERS STATIQUES
// ===============================
app.use(express.static(path.join(__dirname, "../public")));

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

  // --- État initial envoyé au client ---
  console.log("📤 Envoi de l'état initial au client...");
  socket.emit("scoreUpdate", scores);
  socket.emit("currentMatch", currentMatch);
  socket.emit("updateScheduledMatches", scheduledMatches);
  socket.emit("updateMatches", matches);

  // ===============================
  // ACTIONS AVEC LOGS
  // ===============================

  // --- Score ---
  safeOn(socket, "updateScore", ({ team, value }) => {
    console.log(`🏆 [SCORE] Reçu: +${value} pour l’équipe ${team}`);
    if (scores.hasOwnProperty(team)) {
      scores[team] += value;
      console.log(`➡️ Nouveau score: A=${scores.A} | B=${scores.B}`);
      io.emit("scoreUpdate", scores);
    } else {
      console.warn(`⚠️ Équipe inconnue : ${team}`);
    }
  });

  // --- Homme du match ---
  safeOn(socket, "manOfMatch", (data) => {
    console.log(`⭐ [HOMME DU MATCH] ${JSON.stringify(data)}`);
    io.emit("updateManOfMatch", data);
  });

  // --- Matches programmés ---
  safeOn(socket, "scheduleMatch", (match) => {
    console.log(`📅 [PROGRAMMATION] Nouveau match ajouté : ${match.teamA} vs ${match.teamB}`);
    scheduledMatches.push(match);
    io.emit("updateScheduledMatches", scheduledMatches);
    console.log(`📋 Liste matches programmés : ${JSON.stringify(scheduledMatches)}`);
  });

  // --- Sauvegarde des scores ---
  safeOn(socket, "saveScore", ({ teamA, teamB, aScore, bScore }) => {
    console.log(`💾 [SAUVEGARDE SCORE] ${teamA} ${aScore} - ${bScore} ${teamB}`);
    matches.push({ teamA, teamB, aScore, bScore });
    io.emit("updateMatches", matches);
    console.log(`📊 Historique des scores : ${JSON.stringify(matches)}`);
  });

  // --- Messages admin ---
  safeOn(socket, "adminMessage", (message) => {
    console.log(`📢 [MESSAGE ADMIN] "${message}"`);
    io.emit("displayMessage", message);
  });

  // --- Changement nom équipe ---
  safeOn(socket, "updateTeamName", ({ team, name }) => {
    console.log(`✏️ [RENOMMER ÉQUIPE] Équipe ${team} → "${name}"`);
    io.emit("teamNameUpdated", { team, name });
  });

  // --- Changement page publique ---
  safeOn(socket, "changePublicPage", (page) => {
    console.log(`📄 [PAGE PUBLIQUE] Changement → "${page}"`);
    io.emit("loadPage", page);
  });

  // --- Prochain match ---
  safeOn(socket, "nextMatch", () => {
    console.log("⏭️ [PROCHAIN MATCH] Demande de passage au match suivant");
    if (scheduledMatches.length > 0) {
      currentMatch = scheduledMatches.shift();
      scores = { A: 0, B: 0 };
      console.log(`🚀 Match lancé : ${currentMatch.teamA} vs ${currentMatch.teamB}`);
      io.emit("currentMatch", currentMatch);
      io.emit("scoreUpdate", scores);
      io.emit("updateScheduledMatches", scheduledMatches);
    } else {
      console.warn("⚠️ Aucun match disponible.");
      socket.emit("noMatchAvailable", "⚠️ Aucun match programmé.");
    }
  });
  // Arrêt sur image
  safeOn(socket, "next-level", () => {
    console.log("🖼️ [ARRÊT SUR IMAGE] Niveau suivant");
    io.emit("next-level");
  });

  safeOn(socket, "reset-image", () => {
    console.log("🔄 [ARRÊT SUR IMAGE] Réinitialisation");
    io.emit("reset-image");
  });

  safeOn(socket, "change-image", (imageUrl) => {
    console.log(`🖼️ [ARRÊT SUR IMAGE] Nouvelle image : ${imageUrl}`);
    io.emit("change-image", imageUrl);
  });

  // --- Déconnexion ---
  socket.on("disconnect", () => {
    console.log(`❌ [${new Date().toLocaleTimeString()}] Client déconnecté : ${socket.id}`);
  });
});

// ===============================
// LANCEMENT SERVEUR
// ===============================
http.listen(3000, () =>
  console.log(`🚀 Serveur GSDDM LiveScore démarré sur http://localhost:3000`)
);