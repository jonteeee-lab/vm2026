const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDb, run, all, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vm-bettet-2026-secret-change-me';

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════════════════════════════════
// TOURNAMENT DATA
// ══════════════════════════════════════════════════════════════════════════════

const GROUPS = {
  A: ['Mexiko', 'Sydafrika', 'Sydkorea', 'Tjeckien'],
  B: ['Kanada', 'Bosnien', 'Qatar', 'Schweiz'],
  C: ['Brasilien', 'Marocko', 'Haiti', 'Skottland'],
  D: ['USA', 'Paraguay', 'Australien', 'Turkiet'],
  E: ['Tyskland', 'Curaçao', 'Elfenbenskusten', 'Ecuador'],
  F: ['Nederländerna', 'Japan', 'Sverige', 'Tunisien'],
  G: ['Belgien', 'Egypten', 'Iran', 'Nya Zeeland'],
  H: ['Spanien', 'Kap Verde', 'Saudiarabien', 'Uruguay'],
  I: ['Frankrike', 'Senegal', 'Norge', 'Irak'],
  J: ['Argentina', 'Algeriet', 'Österrike', 'Jordanien'],
  K: ['Portugal', 'DR Kongo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Kroatien', 'Ghana', 'Panama']
};

const ALL_TEAMS = Object.values(GROUPS).flat();

// Group matches: [matchNum, date, timeET, homeTeam, awayTeam, group]
const GROUP_MATCHES = [
  [1,'2026-06-11','15:00','Mexiko','Sydafrika','A'],
  [2,'2026-06-11','22:00','Sydkorea','Tjeckien','A'],
  [3,'2026-06-12','15:00','Kanada','Bosnien','B'],
  [4,'2026-06-12','21:00','USA','Paraguay','D'],
  [5,'2026-06-13','00:00','Australien','Turkiet','D'],
  [6,'2026-06-13','15:00','Qatar','Schweiz','B'],
  [7,'2026-06-13','18:00','Brasilien','Marocko','C'],
  [8,'2026-06-13','21:00','Haiti','Skottland','C'],
  [9,'2026-06-14','13:00','Tyskland','Curaçao','E'],
  [10,'2026-06-14','16:00','Nederländerna','Japan','F'],
  [11,'2026-06-14','19:00','Elfenbenskusten','Ecuador','E'],
  [12,'2026-06-14','22:00','Sverige','Tunisien','F'],
  [13,'2026-06-15','12:00','Spanien','Kap Verde','H'],
  [14,'2026-06-15','15:00','Belgien','Egypten','G'],
  [15,'2026-06-15','18:00','Saudiarabien','Uruguay','H'],
  [16,'2026-06-15','21:00','Iran','Nya Zeeland','G'],
  [17,'2026-06-16','15:00','Frankrike','Senegal','I'],
  [18,'2026-06-16','18:00','Irak','Norge','I'],
  [19,'2026-06-16','21:00','Argentina','Algeriet','J'],
  [20,'2026-06-17','00:00','Österrike','Jordanien','J'],
  [21,'2026-06-17','13:00','Portugal','DR Kongo','K'],
  [22,'2026-06-17','16:00','England','Kroatien','L'],
  [23,'2026-06-17','19:00','Ghana','Panama','L'],
  [24,'2026-06-17','22:00','Uzbekistan','Colombia','K'],
  [25,'2026-06-18','12:00','Tjeckien','Sydafrika','A'],
  [26,'2026-06-18','15:00','Schweiz','Bosnien','B'],
  [27,'2026-06-18','18:00','Kanada','Qatar','B'],
  [28,'2026-06-18','21:00','Mexiko','Sydkorea','A'],
  [29,'2026-06-19','00:00','Turkiet','Paraguay','D'],
  [30,'2026-06-19','15:00','USA','Australien','D'],
  [31,'2026-06-19','18:00','Skottland','Marocko','C'],
  [32,'2026-06-19','21:00','Brasilien','Haiti','C'],
  [33,'2026-06-20','00:00','Tunisien','Japan','F'],
  [34,'2026-06-20','13:00','Nederländerna','Sverige','F'],
  [35,'2026-06-20','16:00','Tyskland','Elfenbenskusten','E'],
  [36,'2026-06-20','20:00','Ecuador','Curaçao','E'],
  [37,'2026-06-21','12:00','Spanien','Saudiarabien','H'],
  [38,'2026-06-21','15:00','Belgien','Iran','G'],
  [39,'2026-06-21','18:00','Uruguay','Kap Verde','H'],
  [40,'2026-06-21','21:00','Nya Zeeland','Egypten','G'],
  [41,'2026-06-22','13:00','Argentina','Österrike','J'],
  [42,'2026-06-22','17:00','Frankrike','Irak','I'],
  [43,'2026-06-22','20:00','Norge','Senegal','I'],
  [44,'2026-06-22','23:00','Jordanien','Algeriet','J'],
  [45,'2026-06-23','13:00','Portugal','Uzbekistan','K'],
  [46,'2026-06-23','16:00','England','Ghana','L'],
  [47,'2026-06-23','19:00','Panama','Kroatien','L'],
  [48,'2026-06-23','22:00','Colombia','DR Kongo','K'],
  [49,'2026-06-24','15:00','Schweiz','Kanada','B'],
  [50,'2026-06-24','15:00','Bosnien','Qatar','B'],
  [51,'2026-06-24','18:00','Skottland','Brasilien','C'],
  [52,'2026-06-24','18:00','Marocko','Haiti','C'],
  [53,'2026-06-24','21:00','Tjeckien','Mexiko','A'],
  [54,'2026-06-24','21:00','Sydafrika','Sydkorea','A'],
  [55,'2026-06-25','16:00','Curaçao','Elfenbenskusten','E'],
  [56,'2026-06-25','16:00','Ecuador','Tyskland','E'],
  [57,'2026-06-25','19:00','Japan','Sverige','F'],
  [58,'2026-06-25','19:00','Tunisien','Nederländerna','F'],
  [59,'2026-06-25','22:00','Turkiet','USA','D'],
  [60,'2026-06-25','22:00','Paraguay','Australien','D'],
  [61,'2026-06-26','15:00','Norge','Frankrike','I'],
  [62,'2026-06-26','15:00','Senegal','Irak','I'],
  [63,'2026-06-26','20:00','Kap Verde','Saudiarabien','H'],
  [64,'2026-06-26','20:00','Uruguay','Spanien','H'],
  [65,'2026-06-26','23:00','Egypten','Iran','G'],
  [66,'2026-06-26','23:00','Nya Zeeland','Belgien','G'],
  [67,'2026-06-27','17:00','Panama','England','L'],
  [68,'2026-06-27','17:00','Kroatien','Ghana','L'],
  [69,'2026-06-27','19:30','Colombia','Portugal','K'],
  [70,'2026-06-27','19:30','DR Kongo','Uzbekistan','K'],
  [71,'2026-06-27','22:00','Algeriet','Österrike','J'],
  [72,'2026-06-27','22:00','Jordanien','Argentina','J']
];

// R32 bracket: [matchNum, date, timeET, homeSlot, awaySlot]
// Slots: "1A"=winner group A, "2B"=runner-up group B, "3ABCDF"=best 3rd from those groups
const R32_MATCHES = [
  [73,'2026-06-28','15:00','2A','2B'],
  [74,'2026-06-29','13:00','1C','2F'],
  [75,'2026-06-29','16:30','1E','3ABCDF'],
  [76,'2026-06-29','21:00','1F','2C'],
  [77,'2026-06-30','17:00','1I','3CDFGH'],
  [78,'2026-06-30','13:00','2E','2I'],
  [79,'2026-06-30','21:00','1A','3CEFHI'],
  [80,'2026-07-01','12:00','1L','3EHIJK'],
  [81,'2026-07-01','20:00','1D','3BEFIJ'],
  [82,'2026-07-01','16:00','1G','3AEHIJ'],
  [83,'2026-07-02','19:00','2K','2L'],
  [84,'2026-07-02','15:00','1H','2J'],
  [85,'2026-07-02','23:00','1B','3EFGIJ'],
  [86,'2026-07-03','18:00','1J','2H'],
  [87,'2026-07-03','21:30','1K','3DEIJL'],
  [88,'2026-07-03','14:00','2D','2G']
];

// R16 onwards: [matchNum, date, timeET, homeSource, awaySource]
const R16_MATCHES = [
  [89,'2026-07-04','17:00','W74','W77'],
  [90,'2026-07-04','13:00','W73','W75'],
  [91,'2026-07-05','16:00','W76','W78'],
  [92,'2026-07-05','20:00','W79','W80'],
  [93,'2026-07-06','15:00','W83','W84'],
  [94,'2026-07-06','20:00','W81','W82'],
  [95,'2026-07-07','12:00','W86','W88'],
  [96,'2026-07-07','16:00','W85','W87']
];

const QF_MATCHES = [
  [97,'2026-07-09','16:00','W89','W90'],
  [98,'2026-07-10','15:00','W93','W94'],
  [99,'2026-07-11','17:00','W91','W92'],
  [100,'2026-07-11','21:00','W95','W96']
];

const SF_MATCHES = [
  [101,'2026-07-14','15:00','W97','W98'],
  [102,'2026-07-15','15:00','W99','W100']
];

const BRONZE_MATCH = [103,'2026-07-18','17:00','L101','L102'];
const FINAL_MATCH = [104,'2026-07-19','15:00','W101','W102'];

// ══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

const SCORING = {
  matchSign: 10,       // correct 1X2
  matchExact: 5,       // correct exact score
  signGroupBonus: 30,  // all 6 signs correct in a group
  exactGroupBonus: 50, // all 6 exact scores correct in a group
  placement: 10,       // correct group placement
  placementGroupBonus: 20, // all 4 correct in a group
  r32Team: 3,          // correct team in R32
  r32Bonus: 100,       // all 32 correct
  r16Team: 5,          // correct team in R16
  r16Bonus: 100,       // all 16 correct
  qfTeam: 20,          // correct team in QF
  qfBonus: 50,         // all 8 correct
  sfTeam: 20,          // correct team in SF
  sfBonus: 50,         // all 4 correct
  finalAdvance: 20,    // team in correct final/bronze match
  finalExact: 30,      // team on exact position
  finalBonus: 100,     // all 4 exact
  topScorerInList: 10, // correct player in top 3
  topScorerExact: 20,  // correct position
  firstScorer: 30,
  firstRedCard: 20,
  firstPenalty: 20
};

function calcSign(h, a) {
  if (h > a) return '1';
  if (h === a) return 'X';
  return '2';
}

function computeScore(pred, actual) {
  if (!pred || !actual) return { total: 0, breakdown: {} };
  const bd = {};
  let total = 0;

  // ── A. Group matches ──
  let matchSignPts = 0, matchExactPts = 0, matchSignBonus = 0, matchExactBonus = 0;
  const groupLetters = Object.keys(GROUPS);
  for (const g of groupLetters) {
    const gMatches = GROUP_MATCHES.filter(m => m[5] === g);
    let signCorrect = 0, exactCorrect = 0, signTotal = 0, exactTotal = 0;
    for (const m of gMatches) {
      const mn = String(m[0]);
      const p = pred.matches?.[mn];
      const a = actual.matches?.[mn];
      if (!p || !a || a[0] == null || a[1] == null) continue;
      signTotal++;
      exactTotal++;
      const pSign = calcSign(p[0], p[1]);
      const aSign = calcSign(a[0], a[1]);
      if (pSign === aSign) { matchSignPts += SCORING.matchSign; signCorrect++; }
      if (p[0] === a[0] && p[1] === a[1]) { matchExactPts += SCORING.matchExact; exactCorrect++; }
    }
    if (signTotal === 6 && signCorrect === 6) matchSignBonus += SCORING.signGroupBonus;
    if (exactTotal === 6 && exactCorrect === 6) matchExactBonus += SCORING.exactGroupBonus;
  }
  bd.matchSign = matchSignPts;
  bd.matchExact = matchExactPts;
  bd.matchSignBonus = matchSignBonus;
  bd.matchExactBonus = matchExactBonus;
  total += matchSignPts + matchExactPts + matchSignBonus + matchExactBonus;

  // ── B. Group placements ──
  let placePts = 0, placeBonus = 0;
  for (const g of groupLetters) {
    const pArr = pred.placements?.[g];
    const aArr = actual.placements?.[g];
    if (!pArr || !aArr || aArr.length < 4) continue;
    let correct = 0;
    for (let i = 0; i < 4; i++) {
      if (pArr[i] && aArr[i] && pArr[i] === aArr[i]) { placePts += SCORING.placement; correct++; }
    }
    if (correct === 4) placeBonus += SCORING.placementGroupBonus;
  }
  bd.placements = placePts;
  bd.placementsBonus = placeBonus;
  total += placePts + placeBonus;

  // ── C-F. Knockout round teams ──
  function scoreRoundTeams(predKey, actualKey, perTeam, bonus, expectedCount) {
    const pTeams = pred[predKey] || [];
    const aTeams = actual[actualKey] || [];
    if (aTeams.length === 0) return { pts: 0, bonus: 0 };
    let correct = 0;
    for (const t of pTeams) {
      if (t && aTeams.includes(t)) correct++;
    }
    const pts = correct * perTeam;
    const b = (correct === expectedCount && expectedCount === aTeams.length) ? bonus : 0;
    return { pts, bonus: b };
  }

  const r32 = scoreRoundTeams('r32Teams', 'r32Teams', SCORING.r32Team, SCORING.r32Bonus, 32);
  bd.r32 = r32.pts; bd.r32Bonus = r32.bonus; total += r32.pts + r32.bonus;

  const r16 = scoreRoundTeams('r16Teams', 'r16Teams', SCORING.r16Team, SCORING.r16Bonus, 16);
  bd.r16 = r16.pts; bd.r16Bonus = r16.bonus; total += r16.pts + r16.bonus;

  const qf = scoreRoundTeams('qfTeams', 'qfTeams', SCORING.qfTeam, SCORING.qfBonus, 8);
  bd.qf = qf.pts; bd.qfBonus = qf.bonus; total += qf.pts + qf.bonus;

  const sf = scoreRoundTeams('sfTeams', 'sfTeams', SCORING.sfTeam, SCORING.sfBonus, 4);
  bd.sf = sf.pts; bd.sfBonus = sf.bonus; total += sf.pts + sf.bonus;

  // ── G. Placements 1-4 ──
  let finalPts = 0;
  const pFinal = pred.finalPlacements || {};
  const aFinal = actual.finalPlacements || {};
  if (aFinal['1']) {
    // Check finalists (1&2) and bronze match (3&4) separately
    const pFinalists = [pFinal['1'], pFinal['2']].filter(Boolean);
    const aFinalists = [aFinal['1'], aFinal['2']].filter(Boolean);
    const pBronze = [pFinal['3'], pFinal['4']].filter(Boolean);
    const aBronze = [aFinal['3'], aFinal['4']].filter(Boolean);
    for (const t of pFinalists) { if (aFinalists.includes(t)) finalPts += SCORING.finalAdvance; }
    for (const t of pBronze) { if (aBronze.includes(t)) finalPts += SCORING.finalAdvance; }
    let exactCount = 0;
    for (const pos of ['1','2','3','4']) {
      if (pFinal[pos] && aFinal[pos] && pFinal[pos] === aFinal[pos]) {
        finalPts += SCORING.finalExact;
        exactCount++;
      }
    }
    if (exactCount === 4) finalPts += SCORING.finalBonus;
  }
  bd.finalPlacements = finalPts;
  total += finalPts;

  // ── H. Top 3 scorers ──
  let scorerPts = 0;
  const pScorers = pred.topScorers || [];
  const aScorers = actual.topScorers || [];
  if (aScorers.length > 0) {
    for (let i = 0; i < 3; i++) {
      if (!pScorers[i]) continue;
      const pName = pScorers[i].toLowerCase().trim();
      const inList = aScorers.some(s => s && s.toLowerCase().trim() === pName);
      if (inList) scorerPts += SCORING.topScorerInList;
      if (aScorers[i] && aScorers[i].toLowerCase().trim() === pName) scorerPts += SCORING.topScorerExact;
    }
  }
  bd.topScorers = scorerPts;
  total += scorerPts;

  // ── I. First scorer ──
  let firstScorerPts = 0;
  if (pred.firstScorer && actual.firstScorer &&
      pred.firstScorer.toLowerCase().trim() === actual.firstScorer.toLowerCase().trim()) {
    firstScorerPts = SCORING.firstScorer;
  }
  bd.firstScorer = firstScorerPts;
  total += firstScorerPts;

  // ── J. First red card ──
  let redPts = 0;
  if (pred.firstRedCard && actual.firstRedCard && pred.firstRedCard === actual.firstRedCard) {
    redPts = SCORING.firstRedCard;
  }
  bd.firstRedCard = redPts;
  total += redPts;

  // ── K. First penalty ──
  let penPts = 0;
  if (pred.firstPenalty && actual.firstPenalty && pred.firstPenalty === actual.firstPenalty) {
    penPts = SCORING.firstPenalty;
  }
  bd.firstPenalty = penPts;
  total += penPts;

  return { total, breakdown: bd };
}

// Derive knockout teams from prediction bracket
function deriveKnockoutTeams(pred) {
  const bracket = pred.bracket || {};
  const r32Teams = [], r16Teams = [], qfTeams = [], sfTeams = [];
  // R32: teams in each match
  for (const m of R32_MATCHES) {
    const mn = String(m[0]);
    const b = bracket[mn];
    if (b) {
      if (b.home) r32Teams.push(b.home);
      if (b.away) r32Teams.push(b.away);
    }
  }
  // R16: winners of R32
  for (const m of R16_MATCHES) {
    const mn = String(m[0]);
    const b = bracket[mn];
    if (b) {
      if (b.home) r16Teams.push(b.home);
      if (b.away) r16Teams.push(b.away);
    }
  }
  // QF: winners of R16
  for (const m of QF_MATCHES) {
    const mn = String(m[0]);
    const b = bracket[mn];
    if (b) {
      if (b.home) qfTeams.push(b.home);
      if (b.away) qfTeams.push(b.away);
    }
  }
  // SF: winners of QF
  for (const m of SF_MATCHES) {
    const mn = String(m[0]);
    const b = bracket[mn];
    if (b) {
      if (b.home) sfTeams.push(b.home);
      if (b.away) sfTeams.push(b.away);
    }
  }
  return {
    r32Teams: [...new Set(r32Teams)],
    r16Teams: [...new Set(r16Teams)],
    qfTeams: [...new Set(qfTeams)],
    sfTeams: [...new Set(sfTeams)]
  };
}

// Build a scoreable prediction from stored data
function buildScoreablePrediction(predData) {
  const kt = deriveKnockoutTeams(predData);
  const bracket = predData.bracket || {};
  // Final placements from bracket
  const fp = {};
  const finalMatch = bracket['104'];
  const bronzeMatch = bracket['103'];
  if (finalMatch?.winner) {
    fp['1'] = finalMatch.winner;
    fp['2'] = finalMatch.home === finalMatch.winner ? finalMatch.away : finalMatch.home;
  }
  if (bronzeMatch?.winner) {
    fp['3'] = bronzeMatch.winner;
    fp['4'] = bronzeMatch.home === bronzeMatch.winner ? bronzeMatch.away : bronzeMatch.home;
  }
  return {
    matches: predData.matches || {},
    placements: predData.placements || {},
    r32Teams: kt.r32Teams,
    r16Teams: kt.r16Teams,
    qfTeams: kt.qfTeams,
    sfTeams: kt.sfTeams,
    finalPlacements: fp,
    topScorers: predData.topScorers || [],
    firstScorer: predData.firstScorer || '',
    firstRedCard: predData.firstRedCard || '',
    firstPenalty: predData.firstPenalty || ''
  };
}

function buildScoreableResults(resData) {
  return {
    matches: resData.matches || {},
    placements: resData.placements || {},
    r32Teams: resData.r32Teams || [],
    r16Teams: resData.r16Teams || [],
    qfTeams: resData.qfTeams || [],
    sfTeams: resData.sfTeams || [],
    finalPlacements: resData.finalPlacements || {},
    topScorers: resData.topScorers || [],
    firstScorer: resData.firstScorer || '',
    firstRedCard: resData.firstRedCard || '',
    firstPenalty: resData.firstPenalty || ''
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════

function auth(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Ej inloggad' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Ogiltig session' }); }
}
function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Endast admin' });
    next();
  });
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Alla fält krävs' });
    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'E-postadressen är redan registrerad' });
    const hash = bcrypt.hashSync(password, 10);
    const isFirst = !(await get('SELECT id FROM users LIMIT 1'));
    await run('INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
      [name, email, hash, isFirst ? 1 : 0]);
    const user = await get('SELECT id, name, email, is_admin FROM users WHERE email = ?', [email]);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 30*24*60*60*1000 });
    res.json({ user, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Fel e-post eller lösenord' });
    const payload = { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 30*24*60*60*1000 });
    res.json({ user: payload, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

// ══════════════════════════════════════════════════════════════════════════════
// TOURNAMENT DATA ENDPOINT
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/tournament', (req, res) => {
  res.json({
    groups: GROUPS,
    allTeams: ALL_TEAMS,
    groupMatches: GROUP_MATCHES,
    r32Matches: R32_MATCHES,
    r16Matches: R16_MATCHES,
    qfMatches: QF_MATCHES,
    sfMatches: SF_MATCHES,
    bronzeMatch: BRONZE_MATCH,
    finalMatch: FINAL_MATCH,
    scoring: SCORING
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/settings', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    const s = {}; rows.forEach(r => { s[r.key] = r.value; });
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PREDICTIONS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/predictions', auth, async (req, res) => {
  try {
    const row = await get('SELECT data FROM predictions WHERE user_id = ?', [req.user.id]);
    res.json(row ? row.data : {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/predictions', auth, async (req, res) => {
  try {
    const settings = {};
    (await all('SELECT key, value FROM settings')).forEach(r => { settings[r.key] = r.value; });
    if (settings.locked === '1') return res.status(403).json({ error: 'Tipset är låst' });
    if (new Date(settings.deadline) < new Date()) return res.status(403).json({ error: 'Deadline har passerat' });
    const { data } = req.body;
    const existing = await get('SELECT id FROM predictions WHERE user_id = ?', [req.user.id]);
    if (existing) {
      await run('UPDATE predictions SET data = ?, updated_at = NOW() WHERE user_id = ?',
        [JSON.stringify(data), req.user.id]);
    } else {
      await run('INSERT INTO predictions (user_id, data) VALUES (?, ?)',
        [req.user.id, JSON.stringify(data)]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// RESULTS & SCORING
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/results', auth, async (req, res) => {
  try {
    const resRow = await get('SELECT data FROM results ORDER BY id LIMIT 1');
    const actualData = resRow ? resRow.data : {};
    const predRow = await get('SELECT data FROM predictions WHERE user_id = ?', [req.user.id]);
    const predData = predRow ? predRow.data : {};
    const scoreable = buildScoreablePrediction(predData);
    const scoreableActual = buildScoreableResults(actualData);
    const score = computeScore(scoreable, scoreableActual);
    res.json({ actual: actualData, prediction: predData, score });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════════

async function calcLeaderboard() {
  const users = await all('SELECT id, name FROM users ORDER BY created_at');
  const preds = await all('SELECT user_id, data FROM predictions');
  const resRow = await get('SELECT data FROM results ORDER BY id LIMIT 1');
  const actualData = resRow ? resRow.data : {};
  const scoreableActual = buildScoreableResults(actualData);

  const predMap = {};
  preds.forEach(p => { predMap[p.user_id] = p.data; });

  const board = users.map(u => {
    const predData = predMap[u.id] || {};
    const scoreable = buildScoreablePrediction(predData);
    const score = computeScore(scoreable, scoreableActual);
    return { name: u.name, points: score.total, breakdown: score.breakdown };
  });
  board.sort((a, b) => b.points - a.points);
  return board;
}

app.get('/api/leaderboard', async (req, res) => {
  try {
    const board = await calcLeaderboard();
    const snap = await get('SELECT data FROM leaderboard_snapshots ORDER BY created_at DESC LIMIT 1');
    const prevSnapshot = snap ? (typeof snap.data === 'string' ? JSON.parse(snap.data) : snap.data) : null;
    res.json({ board, prevSnapshot });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ALL PREDICTIONS (visible after lock)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/allPredictions', auth, async (req, res) => {
  try {
    const locked = await get("SELECT value FROM settings WHERE key='locked'");
    const deadline = await get("SELECT value FROM settings WHERE key='deadline'");
    const isLocked = locked?.value === '1' || new Date(deadline?.value) < new Date();
    if (!isLocked) return res.status(403).json({ error: 'Inte låst ännu' });
    const users = await all('SELECT id, name FROM users ORDER BY name');
    const preds = await all('SELECT user_id, data FROM predictions');
    const predMap = {};
    preds.forEach(p => { predMap[p.user_id] = p.data; });
    const participants = users.map(u => ({ name: u.name, data: predMap[u.id] || {} }));
    res.json({ participants });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PROJECTION
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/projection', auth, async (req, res) => {
  try {
    const locked = await get("SELECT value FROM settings WHERE key='locked'");
    const deadline = await get("SELECT value FROM settings WHERE key='deadline'");
    const isLocked = locked?.value === '1' || new Date(deadline?.value) < new Date();
    if (!isLocked) return res.status(403).json({ error: 'Inte låst ännu' });
    const resRow = await get('SELECT data FROM results ORDER BY id LIMIT 1');
    const users = await all('SELECT id, name FROM users ORDER BY name');
    const preds = await all('SELECT user_id, data FROM predictions');
    const predMap = {};
    preds.forEach(p => { predMap[p.user_id] = p.data; });
    const participants = users.map(u => ({
      name: u.name,
      data: predMap[u.id] || {}
    }));
    res.json({ actual: resRow ? resRow.data : {}, participants, scoring: SCORING });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBETS
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/sidebets', auth, async (req, res) => {
  try {
    await run("DELETE FROM sidebets WHERE status = 'open' AND expires_at IS NOT NULL AND expires_at < NOW()");
    const rows = await all(`
      SELECT s.id, s.title, s.stake, s.status, s.created_at, s.expires_at,
        s.creator_id, uc.name AS creator_name,
        s.acceptor_id, ua.name AS acceptor_name,
        s.winner_id, uw.name AS winner_name, s.comment
      FROM sidebets s
      JOIN users uc ON uc.id = s.creator_id
      LEFT JOIN users ua ON ua.id = s.acceptor_id
      LEFT JOIN users uw ON uw.id = s.winner_id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sidebets', auth, async (req, res) => {
  try {
    const { title, stake, expires_at } = req.body;
    if (!title || !stake || stake < 1) return res.status(400).json({ error: 'Titel och insats krävs' });
    await run('INSERT INTO sidebets (title, stake, creator_id, expires_at) VALUES (?, ?, ?, ?)',
      [title.trim(), parseInt(stake), req.user.id, expires_at || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sidebets/:id/accept', auth, async (req, res) => {
  try {
    const bet = await get('SELECT * FROM sidebets WHERE id = ?', [req.params.id]);
    if (!bet) return res.status(404).json({ error: 'Bet ej hittat' });
    if (bet.status !== 'open') return res.status(400).json({ error: 'Inte öppet' });
    if (bet.creator_id === req.user.id) return res.status(400).json({ error: 'Kan inte acceptera eget bet' });
    await run("UPDATE sidebets SET acceptor_id = ?, status = 'matched' WHERE id = ?", [req.user.id, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sidebets/:id/withdraw', auth, async (req, res) => {
  try {
    const bet = await get('SELECT * FROM sidebets WHERE id = ?', [req.params.id]);
    if (!bet) return res.status(404).json({ error: 'Bet ej hittat' });
    if (bet.creator_id !== req.user.id) return res.status(403).json({ error: 'Inte ditt bet' });
    if (bet.status !== 'open') return res.status(400).json({ error: 'Kan bara ta tillbaka öppna' });
    await run('DELETE FROM sidebets WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sidebets/:id/settle', auth, async (req, res) => {
  try {
    const { winner_id, comment } = req.body;
    const bet = await get('SELECT * FROM sidebets WHERE id = ?', [req.params.id]);
    if (!bet) return res.status(404).json({ error: 'Bet ej hittat' });
    if (bet.creator_id !== req.user.id) return res.status(403).json({ error: 'Bara skaparen kan rätta' });
    if (bet.status !== 'matched') return res.status(400).json({ error: 'Inte matchat' });
    await run("UPDATE sidebets SET winner_id = ?, comment = ?, status = 'settled' WHERE id = ?",
      [winner_id, comment || null, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/admin/results', adminAuth, async (req, res) => {
  try {
    const row = await get('SELECT data FROM results ORDER BY id LIMIT 1');
    res.json(row ? row.data : {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/results', adminAuth, async (req, res) => {
  try {
    const { data } = req.body;
    await run('UPDATE results SET data = ?, updated_at = NOW() WHERE id = (SELECT id FROM results ORDER BY id LIMIT 1)',
      [JSON.stringify(data)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const { pool_name, deadline, locked } = req.body;
    if (pool_name !== undefined) await run("INSERT INTO settings (key,value) VALUES ('pool_name',?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [pool_name]);
    if (deadline !== undefined) await run("INSERT INTO settings (key,value) VALUES ('deadline',?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [deadline]);
    if (locked !== undefined) await run("INSERT INTO settings (key,value) VALUES ('locked',?) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [locked ? '1' : '0']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
  try { res.json(await all('SELECT id, name, email, is_admin, created_at FROM users ORDER BY created_at')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const { name, email, password, is_admin } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Alla fält krävs' });
    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'E-post redan registrerad' });
    const hash = bcrypt.hashSync(password, 10);
    await run('INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)', [name, email, hash, is_admin ? 1 : 0]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/toggle-admin', adminAuth, async (req, res) => {
  try {
    const user = await get('SELECT id, is_admin FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Ej hittad' });
    await run('UPDATE users SET is_admin = ? WHERE id = ?', [user.is_admin ? 0 : 1, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Kan inte ta bort dig själv' });
    await run('DELETE FROM predictions WHERE user_id = ?', [req.params.id]);
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/leaderboard/snapshot', adminAuth, async (req, res) => {
  try {
    const board = await calcLeaderboard();
    const { label } = req.body;
    await run('INSERT INTO leaderboard_snapshots (data, label) VALUES (?, ?)', [JSON.stringify(board), label || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/leaderboard/snapshot', adminAuth, async (req, res) => {
  try {
    await run('DELETE FROM leaderboard_snapshots');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/sidebets/:id/winner', adminAuth, async (req, res) => {
  try {
    const { winner_id, comment } = req.body;
    const bet = await get('SELECT * FROM sidebets WHERE id = ?', [req.params.id]);
    if (!bet) return res.status(404).json({ error: 'Ej hittat' });
    if (bet.status !== 'matched') return res.status(400).json({ error: 'Inte matchat' });
    await run("UPDATE sidebets SET winner_id = ?, comment = ?, status = 'settled' WHERE id = ?",
      [winner_id, comment || null, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

(async () => {
  await initDb();
  app.listen(PORT, () => console.log(`VM-Bettet running on http://localhost:${PORT}`));
})();
