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

    // Premier essai : endpoint dédié /api/standings
    try {
      const response = await fetch(`${API_BASE_URL}/api/standings`);
      if (response.ok) {
        const standings = await response.json();
        renderStandingsTable(standings);
        return;
      }
      console.warn('/api/standings returned', response.status);
    } catch (err) {
      console.warn('Fetch /api/standings failed:', err);
    }

    // Fallback : calculer le classement à partir de /api/matches
    const respMatches = await fetch(`${API_BASE_URL}/api/matches`);
    if (!respMatches.ok) {
      throw new Error(`Erreur API matches (${respMatches.status})`);
    }
    const matches = await respMatches.json();
    const computed = computeStandingsFromMatches(matches);
    renderStandingsTable(computed);
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

// Calcule un classement simple (points 3/1/0) à partir d'un tableau de matchs
function computeStandingsFromMatches(matches) {
  const now = new Date();
  const playedStatuses = new Set(["played", "finished", "completed"]);

  const stats = {};
  const ensureTeam = (name) => {
    if (!stats[name]) {
      stats[name] = { played: 0, won: 0, draw: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 };
    }
  };

  matches.forEach((m) => {
    const matchDate = parseMatchDate(m.match_date);
    const status = (m.status || '').toString().toLowerCase();
    // Considérer match joué si scores fournis, statut joué, ou date passée
    const hasScores = m.home_score != null && m.away_score != null;
    const isPlayed = hasScores || playedStatuses.has(status) || matchDate <= now;
    if (!isPlayed) return;

    const home = m.home_team || 'Unknown';
    const away = m.away_team || 'Unknown';
    ensureTeam(home);
    ensureTeam(away);

    const hs = Number(m.home_score ?? 0);
    const as = Number(m.away_score ?? 0);

    stats[home].played += 1;
    stats[away].played += 1;
    stats[home].goals_for += hs;
    stats[home].goals_against += as;
    stats[away].goals_for += as;
    stats[away].goals_against += hs;

    if (hs > as) {
      stats[home].won += 1;
      stats[away].lost += 1;
      stats[home].points += 3;
    } else if (hs < as) {
      stats[away].won += 1;
      stats[home].lost += 1;
      stats[away].points += 3;
    } else {
      stats[home].draw += 1;
      stats[away].draw += 1;
      stats[home].points += 1;
      stats[away].points += 1;
    }
  });

  const table = Object.keys(stats).map((team) => {
    const s = stats[team];
    const gd = s.goals_for - s.goals_against;
    return {
      team,
      played: s.played,
      won: s.won,
      draw: s.draw,
      lost: s.lost,
      goals_for: s.goals_for,
      goals_against: s.goals_against,
      goal_diff: gd,
      points: s.points,
    };
  });

  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team.localeCompare(b.team);
  });

  // Ajouter la position
  return table.map((r, idx) => ({ position: idx + 1, ...r }));
}

