# VM 2026 — Ändringslogg (2026-05-17)

Sammanfattning av alla designbeslut och tekniska ändringar gjorda idag.
Skriven för att ge en ny Claude-session fullständig kontext.

---

## Repo & stack

- **GitHub**: https://github.com/jonteeee-lab/vm2026 (branch: `main`)
- **Backend**: Node.js/Express + PostgreSQL (JSONB), hosted on Render
- **Frontend**: Vanilla JS, single-file (`public/index.html`, ~3 900 rader)
- **Scoring-simulering**: `STÄDAT/vm_sim.py` (fristående Python-skript)

---

## 1. Poängsystem — designbeslut

### Gruppspelets matcher (72 st)

| Komponent | Poäng | Multiplikator |
|---|---|---|
| Rätt tecken (1/X/2) | 3p | × konsensustillägg |
| Rätt marginal (vinstmål, ej X) | 2p | **fast, ingen mult** |

**Konsensustillägg** baseras på andelen spelare som valde det *vinnande* tecknet:

| Andel som valde rätt tecken | Multiplikator |
|---|---|
| > 50 % | 1× |
| 26–50 % | 1,5× |
| 11–25 % | 2× |
| ≤ 10 % | 3× |

Regler:
- X ger **aldrig** marginalbonus (marginal för kryss är alltid 0 per definition)
- Multiplikatorn gäller **enbart tecknet** — marginalen är alltid fast 2p
- Anti-AI-mekanismen: ju mer "mainstream" ett tips är, desto lägre bonus

Varför dessa val:
- 3p tecken > 2p marginal: tecknet är den svårare och mer fundamentala prediktionen
- Ingen mult på marginal: marginalen är ren skicklighetsbonus, inte ett konsensuspåslag
- X ingen marginalmult: undviker att kryss automatiskt ger mer än vinst

### Grupplaceringar (12 grupper)

Poäng per grupp baseras på hur många av de 4 lag man placerat på exakt rätt plats:

| Exakt rätt | Poäng |
|---|---|
| 0 | 0p |
| 1 | 5p |
| 2 | 10p |
| 4 | 20p |

(3 rätt är matematiskt omöjligt i en permutation av 4 lag.)

### Slutspel

| Runda | Per korrekt lag | Alla-rätt-bonus |
|---|---|---|
| Sextondelsfinal (32 lag) | 1p | +15p |
| Åttondelsfinal (16 lag) | 3p | +15p |
| Kvartsfinal (8 lag) | 6p | +15p |
| Semifinal (4 lag) | 12p | +15p |

### Final & pallplatser

| Händelse | Poäng |
|---|---|
| Korrekt finalist identifierad (plats 1 eller 2, ordningsoberoende) | 8p |
| Exakt vinnare (plats 1) | +12p |
| Exakt runner-up (plats 2) | +8p |
| Exakt 3:e plats | 8p |
| Exakt 4:e plats | 8p |

Max final-poäng: 20 + 16 + 8 + 8 = 52p

### Frågor

10 specialfrågor × 4p = max 40p. Servern är klar (`pred.questions.q1...q10`), frontend-UI återstår (frågorna är inte bestämda ännu).

---

## 2. Datamodell — predictions (JSON i databasen)

```json
{
  "matches": {
    "1": [2, 0],
    "2": [0, 0],
    "3": [0, 1]
  },
  "placements": {
    "A": ["Mexiko", "Sydkorea", "Tjeckien", "Sydafrika"]
  },
  "thirdPlaceQualifiers": ["Norge", "Belgien", "...x8"],
  "r16Teams": ["Mexiko", "Brasilien", "...x16"],
  "qfTeams": ["Mexiko", "...x8"],
  "sfTeams": ["Brasilien", "...x4"],
  "finalPlacements": {
    "1": "Brasilien",
    "2": "Frankrike",
    "3": "Argentina",
    "4": "Spanien"
  },
  "questions": {
    "q1": "svaret",
    "q2": "..."
  }
}
```

**Matchkodning** (istället för exakta mål):
- Tecken "1" + marginal M → `[M, 0]`
- Tecken "X" → `[0, 0]`
- Tecken "2" + marginal M → `[0, M]`

Servern deriverar tecken med `calcSign(h, a)` och marginal med `Math.abs(h - a)`, vilket fungerar korrekt med denna kodning.

**r32Teams** deriveras i `buildScoreablePrediction()` från:
- `placements[g][0]` (vinnare) + `placements[g][1]` (tvåa) för alla 12 grupper = 24 lag
- `thirdPlaceQualifiers` = 8 manuellt valda treor

---

## 3. Frontend — Tippa / Gruppspel

### Match-rad layout

3-kolumns grid: `1fr 94px 66px`

```
[Hemmalag – Bortalag]      [1][X][2]   [N mål]
[Hemmalag – Bortalag]      [1][X][2]
```

- Rubriker "Tecken" / "Marginal" visas som en header-rad ovanför matcherna i varje grupp
- Marginalrutan visas **enbart** om tecknet är 1 eller 2
- Byte av tecken uppdaterar gruppställningen direkt (utan sidsläsning)
- Mobil (≤520px): lagen tar full bredd, sign-knappar + marginalruta stackas på rad 2, headerraden döljs

### Viktiga JS-funktioner (index.html)

| Funktion | Vad den gör |
|---|---|
| `setMatchTip(mn, sign, group)` | Sätter tecken, behåller marginal om möjligt |
| `setMatchMarginUI(mn, val, group)` | Uppdaterar marginal för 1/2 |
| `_applyMatchTip(mn, sign, margin, group)` | Lagrar `[home, away]` och kör standings-uppdatering |
| `_refreshGroupStandings(mn, group)` | Uppdaterar standings-tabell och placerings-knappar live |
| `getMatchSign(mn)` | Deriverar '1'/'X'/'2' eller null från lagrad `[h, a]` |
| `getMatchMargin(mn)` | Deriverar marginal från lagrad `[h, a]` |

---

## 4. Frontend — Tippa / Slutspel

Hela SVG-bracket-trädet är borttaget och ersatt med dropdown-/chip-baserat UI:

### Sextondelsfinal (32 lag)
- 12 vinnarchips (auto, dashed border) — från `placements[g][0]`
- 12 tvåorchips (auto) — från `placements[g][1]`
- 8 dropdown-selects för bästa treor (`thirdPlaceQualifiers`)
- Counter visar X/32 lag

### Åttondelsfinal / Kvartsfinal / Semifinal
- Toggle-chip-grid — klicka för att välja/avvälja lag
- Max 16 → 8 → 4 lag väljs
- Cascade: avmarkeras ett lag tas det bort från alla efterföljande rundor
- Avsnittet är låst tills föregående runda är ifylld

### Final & pallplatser
- 4 placeringsrader (Vinnare / Runner-up / 3:e / 4:e)
- Alla 4 semifinalister visas automatiskt som chips per rad
- Klick tilldelar lag till position, klick igen avmarkerar
- Klick på ett lag som är tilldelat annan position flyttar det hit

### Viktiga JS-funktioner (slutspel)

| Funktion | Vad den gör |
|---|---|
| `renderSlutspelDropdown(container)` | Renderar hela slutspelssektionen |
| `setThirdQualifier(idx, team)` | Uppdaterar `thirdPlaceQualifiers[idx]`, kör cascade-trim |
| `toggleKoTeam(roundKey, team)` | Lägger till/tar bort lag i r16/qf/sfTeams |
| `_cascadeKoRemoval(team, fromRound)` | Tar bort lag från alla rundor efter `fromRound` |
| `_cascadeKoTrim()` | Rensär r16/qf/sf/final om r32-laget försvunnit |
| `setFinalPlacement(position, team)` | Tilldelar lag till plats 1–4 |
| `refreshSlutspel()` | Renderar om slutspelssektionen om aktiv tab |

---

## 5. Server — scoring engine (server.js)

### `buildScoreablePrediction(predData)`
Normaliserar en användares rådata till scoreable format. Deriverar `r32Teams` automatiskt från placements + thirdPlaceQualifiers.

### `buildConsensusMap(allPredData)`
Bygger per-match teckendistribution från alla sparade predictions.
Returnerar `{ matchNum: { '1': 0.6, 'X': 0.2, '2': 0.2 } }`.

### `computeScore(pred, actual, consensusMap)`
Räknar totalpoäng + breakdown. Breakdown-nycklar:
- `matchSign`, `matchMargin`, `consensusBoost`
- `placements`
- `r32`, `r16`, `qf`, `sf`
- `finalPlacements`
- `questions`

### API-endpoints

| Endpoint | Auth | Beskrivning |
|---|---|---|
| `GET /api/tournament` | — | Turnerings-data (lag, matcher, scoring) |
| `GET /api/predictions` | user | Hämta egna tips |
| `POST /api/predictions` | user | Spara tips (blockeras efter deadline) |
| `GET /api/results` | user | Egna resultat + score + consensusMap |
| `GET /api/leaderboard` | — | Topplista med breakdown |
| `GET /api/consensus` | user | Aktuell konsensusfördelning |
| `GET /api/allPredictions` | user (locked) | Alla tipps efter låsning |

---

## 6. Borttagna funktioner

Dessa finns **inte längre** i koden — nämn dem inte i förslag:

**index.html:**
- `resolveR32Team`, `resolveKnockoutTeam`, `allocateThirdPlaceTeams`
- `computeBestThirds`, `getQualifyingThirds`, `getThirdPlaceTeamForSlot`
- `selectWinner`, `clearDownstream`, `setBracketMatch`
- `renderKnockoutMatch`, `formatSlotLabel`, `formatSourceLabel`
- `predictions.bracket` — används inte längre

**server.js:**
- `deriveKnockoutTeams()` — borttagen

---

## 7. Återstående att göra

1. **10 specialfrågor** — ägaren lämnar frågorna, servern är klar, UI saknas
2. **Dagens matcher-tab** — consensus-distribution med multiplikatormärken per match (påbörjat i CSS, JS saknas)
3. **Admin: r32Teams** — kan matas in som kommaseparerad sträng i admin-panelen
4. **`STÄDAT/vm_sim.py`** — simulationen använder gamla poängvärden (2+3), bör uppdateras till (3+2, ingen mult på marginal)
