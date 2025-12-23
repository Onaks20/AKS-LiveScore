const socket = io();

socket.on('update', ({ scoreA, scoreB, chrono, title }) => {
  document.getElementById('scoreA').textContent = scoreA;
  document.getElementById('scoreB').textContent = scoreB;
  document.getElementById('match-title').textContent = title;
});

// Mise à jour des scores uniquement
socket.on('scoreUpdate', (scores) => {
  document.getElementById('scoreA').textContent = scores.A;
  document.getElementById('scoreB').textContent = scores.B;
});
socket.on("connect", () => {
  console.log("🟢 Connecté à Socket.IO");
});

// Programmation Matchs
socket.on("updateScheduledMatches", (data) => {
    scheduledMatches = data;
    nextMatches.innerHTML = '';
    scheduledMatches.forEach(m => {
        const li = document.createElement('li');
        li.textContent = `${m.teamA} vs ${m.teamB}`;
        nextMatches.appendChild(li);
    });
    totalMatches.textContent = scheduledMatches.length;
});

socket.on("updateMatches", (data) => {
    playedMatches = data;
    matchesList.innerHTML = '';
    playedMatches.forEach(m => {
        const card = document.createElement('div');
        card.className = 'match-card';
        card.innerHTML = `
        <div class="teams">
            <div class="team"><div class="badge">${abbr(m.teamA)}</div><div class="team-name">${m.teamA}</div></div>
            <div class="team"><div class="badge">${abbr(m.teamB)}</div><div class="team-name">${m.teamB}</div></div>
        </div>
        <div class="score">
            <div class="num">${m.aScore}</div><div class="vs">—</div><div class="num">${m.bScore}</div>
        </div>`;
        matchesList.appendChild(card);
    });
});

// Quand le serveur envoie un message admin
socket.on("displayMessage", (message) => {
  console.log("📩 Message reçu côté display:", message);

  // Afficher dans le <marquee>
  const info = document.getElementById("section-info");
  if (info) {
    info.textContent = message;
  }
});

// Debug
socket.on("connect", () => {
  console.log("✅ Display connecté au serveur");
});