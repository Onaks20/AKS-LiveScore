// public/js/admin.js
const socket = io();

// 
const selectA = document.getElementById('select-equipe-A');
const selectB = document.getElementById('select-equipe-B');
const scoreAEl = document.getElementById('scoreA');
const scoreBEl = document.getElementById('scoreB');
const serverStateEl = document.getElementById('serverState');
const motmInput = document.getElementById('motmInput');
const infoText = document.getElementById('infoText');

// bouton actions (score)
document.querySelectorAll('button[data-team]').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    const teamKey = btn.dataset.team;
    const value = Number(btn.dataset.value);
    const teamName = teamKey === 'A' ? selectA.value : selectB.value;
    socket.emit('updateScore', { teamKey, teamName, value });
  });
});

// match actions
document.getElementById('saveResult').addEventListener('click', ()=> socket.emit('saveResult'));
document.getElementById('nextMatch').addEventListener('click', ()=> socket.emit('nextMatch'));

// motm election
document.getElementById('setMotm').addEventListener('click', ()=>{
  const name = motmInput.value.trim();
  if (!name) return alert('Donne un nom pour l\'homme du match');
  socket.emit('setMotm', { name });
  motmInput.value = '';
});

// reception état serveur
socket.on('state', s => {
  scoreAEl.textContent = s.currentMatch?.aScore ?? 0;
  scoreBEl.textContent = s.currentMatch?.bScore ?? 0;
  serverStateEl.textContent = JSON.stringify(s, null, 2);
});
