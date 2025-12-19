// À adapter avec VOTRE URL Render

const API_BASE_URL = "https://apiscore-9jm8.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

  const page = document.body.dataset.page;

  if (page === "home") {

    initHomePage();

  } else if (page === "results") {

    initResultsPage();

  } else if (page === "classement") {

    initStandingsPage();

  }

});

// Affiche une erreur dans un élément <div id="error-message">

function showError(message) {

  const errorDiv = document.getElementById("error-message");

  if (errorDiv) {

    errorDiv.textContent = message;

    errorDiv.classList.add("error");

  } else {

    alert(message);

  }

}

async function initHomePage() {

  try {

    const response = await fetch(`${API_BASE_URL}/api/matches`);

    if (!response.ok) {

      throw new Error(`Erreur API (${response.status})`);

    }

    const matches = await response.json();

    const now = new Date();

    // Debug : afficher tous les matchs et leurs statuts
    console.log("Tous les matchs :", matches);
    console.log("Date actuelle :", now);

    // Séparation des matchs joués et à venir
    // On accepte plusieurs variantes de statut et on retombe sur la comparaison par date.
    const normalizeStatus = (s) => (s || "").toString().toLowerCase();
    const upcomingStatuses = new Set(["scheduled", "upcoming", "future", "pending"]);
    const playedStatuses = new Set(["played", "finished", "completed"]);

    const played = matches.filter((m) => {
      const matchDate = parseMatchDate(m.match_date);
      const st = normalizeStatus(m.status);
      console.log(`Match ${m.home_team} vs ${m.away_team} : rawStatus=${m.status}, norm=${st}, date=${matchDate}, isPast=${matchDate <= now}`);
      // Si le statut indique joué, ou si la date est passée => considéré joué
      return playedStatuses.has(st) || matchDate <= now;
    });

    const scheduled = matches.filter((m) => {
      const matchDate = parseMatchDate(m.match_date);
      const st = normalizeStatus(m.status);
      // Si le statut est clairement 'à venir' ou si la date est dans le futur => considéré à venir
      return upcomingStatuses.has(st) || matchDate > now;
    });

    console.log("Matchs joués :", played);
    console.log("Matchs à venir :", scheduled);

    // Dernier match joué = le plus récent dans le passé

    let lastMatch = null;

    if (played.length > 0) {

      played.sort(

        (a, b) => parseMatchDate(a.match_date) - parseMatchDate(b.match_date)

      );

      lastMatch = played[played.length - 1];

    }

    // Prochain match = le plus proche dans le futur

    let nextMatch = null;

    if (scheduled.length > 0) {

      scheduled.sort(

        (a, b) => parseMatchDate(a.match_date) - parseMatchDate(b.match_date)

      );

      nextMatch = scheduled[0];

    }

    updateHomePage(nextMatch, lastMatch);

  } catch (error) {

    console.error(error);

    showError("Impossible de charger les données (API ou réseau indisponible).");

  }

}

function formatMatchDate(dateString) {

  const date = parseMatchDate(dateString);

  // Affichage simple : JJ/MM/AAAA HH:MM

  const day = String(date.getDate()).padStart(2, "0");

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");

  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}h${minutes}`;

}

// Parse une date fournie par la base (ex: "YYYY-MM-DD HH:MM:SS").
// On essaye plusieurs variantes pour couvrir différents navigateurs / formats.
function parseMatchDate(dateString) {
  if (!dateString) return new Date(NaN);
  if (dateString instanceof Date) return dateString;
  let s = String(dateString).trim();

  // 1) essai direct
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // 2) remplacer l'espace entre date et heure par 'T' -> "YYYY-MM-DDTHH:MM:SS"
  const t = s.replace(' ', 'T');
  d = new Date(t);
  if (!isNaN(d.getTime())) return d;

  // 3) essayer en forçant UTC (ajouter 'Z') si les timestamps sont en UTC
  d = new Date(t + 'Z');
  return d;
}

function updateHomePage(nextMatch, lastMatch) {

  const nextDiv = document.getElementById("next-match");

  const lastDiv = document.getElementById("last-match");

  // Prochain match

  if (nextMatch) {

    nextDiv.innerHTML = `

      <p><strong>${nextMatch.home_team}</strong> vs <strong>${nextMatch.away_team}</strong></p>

      <p>Date : ${formatMatchDate(nextMatch.match_date)}</p>
      <p>Statut : <span class="status-${nextMatch.status}">${nextMatch.status}</span></p>
    `;

  } else {
    nextDiv.innerHTML = "<p>Aucun match à venir trouvé.</p>";
  }

  // Dernier match

  if (lastMatch) {

    let score = "Score non renseigné";
    if (lastMatch.home_score != null && lastMatch.away_score != null) {
      score = `${lastMatch.home_score} - ${lastMatch.away_score}`;
    }

    lastDiv.innerHTML = `
      <p><strong>${lastMatch.home_team}</strong> vs <strong>${lastMatch.away_team}</strong></p>

      <p>Date : ${formatMatchDate(lastMatch.match_date)}</p>
      <p>Score : ${score}</p>
      <p>Statut : <span class="status-${lastMatch.status}">${lastMatch.status}</span></p>
    `;

  } else {
    lastDiv.innerHTML = "<p>Aucun match joué trouvé.</p>";
  }
}

async function initResultsPage() {

  try {
    const response = await fetch(`${API_BASE_URL}/api/matches`);

    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`);
    }

    const matches = await response.json();
    renderMatchesTable(matches);

  } catch (error) {

    console.error(error);
    showError("Impossible de charger la liste des matchs.");
  }
}

function renderMatchesTable(matches) {

  const tbody = document.getElementById("matches-body");
  tbody.innerHTML = ""; // on vide d'abord

  if (!matches || matches.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Aucun match trouvé dans la base.";
    tr.appendChild(td);
    tbody.appendChild(tr);

    return;
  }

  // Option : trier par date croissante
  matches.sort((a, b) => parseMatchDate(a.match_date) - parseMatchDate(b.match_date));

  matches.forEach((match) => {
    const tr = document.createElement("tr");

    const dateTd = document.createElement("td");
    dateTd.textContent = formatMatchDate(match.match_date);

    const homeTd = document.createElement("td");
    homeTd.textContent = match.home_team;

    const awayTd = document.createElement("td");
    awayTd.textContent = match.away_team;

    const scoreTd = document.createElement("td");

    if (match.home_score != null && match.away_score != null) {
      scoreTd.textContent = `${match.home_score} - ${match.away_score}`;
    } else {
      scoreTd.textContent = "—";
    }

    const statusTd = document.createElement("td");

    statusTd.textContent = match.status;
    statusTd.classList.add(`status-${match.status}`);
    tr.appendChild(dateTd);
    tr.appendChild(homeTd);
    tr.appendChild(awayTd);
    tr.appendChild(scoreTd);
    tr.appendChild(statusTd);
    tbody.appendChild(tr);

  });

}

// ---------- Classement / Standings ----------
async function initStandingsPage() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/standings`);
    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`);
    }
    const standings = await response.json();
    renderStandingsTable(standings);
  } catch (error) {
    console.error(error);
    // Si l'API /api/standings n'existe pas, afficher message clair
    showError("Impossible de charger le classement (API ou réseau indisponible). Vérifiez /api/standings.");
  }
}

function renderStandingsTable(standings) {
  const container = document.getElementById("standings-container");
  if (!container) return;

  if (!standings || standings.length === 0) {
    container.innerHTML = "<p>Aucun classement disponible.</p>";
    return;
  }

  // Table headers FR
  const table = document.createElement('table');
  table.className = 'standings-table';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>Pos</th>
    <th>Équipe</th>
    <th>J</th>
    <th>G</th>
    <th>N</th>
    <th>P</th>
    <th>BP</th>
    <th>BC</th>
    <th>Diff</th>
    <th>Pts</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  // Attendu: tableau d'objets { position, team, played, won, draw, lost, goals_for, goals_against, goal_diff, points }
  standings.forEach((row) => {
    const tr = document.createElement('tr');
    const pos = document.createElement('td'); pos.textContent = row.position ?? '';
    const team = document.createElement('td'); team.textContent = row.team ?? row.name ?? '';
    const played = document.createElement('td'); played.textContent = row.played ?? row.p ?? '';
    const won = document.createElement('td'); won.textContent = row.won ?? row.w ?? '';
    const draw = document.createElement('td'); draw.textContent = row.draw ?? row.d ?? '';
    const lost = document.createElement('td'); lost.textContent = row.lost ?? row.l ?? '';
    const gf = document.createElement('td'); gf.textContent = row.goals_for ?? row.gf ?? '';
    const ga = document.createElement('td'); ga.textContent = row.goals_against ?? row.ga ?? '';
    const gd = document.createElement('td'); gd.textContent = row.goal_diff ?? row.gd ?? '';
    const pts = document.createElement('td'); pts.textContent = row.points ?? row.pts ?? '';

    tr.appendChild(pos);
    tr.appendChild(team);
    tr.appendChild(played);
    tr.appendChild(won);
    tr.appendChild(draw);
    tr.appendChild(lost);
    tr.appendChild(gf);
    tr.appendChild(ga);
    tr.appendChild(gd);
    tr.appendChild(pts);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);
}

