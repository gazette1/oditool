// projects/siraj/scripts/push-flex-concepts.mjs
//
// PROJECT-SPECIFIC ONE-OFF — not part of the engine surface.
// Moved out of engine/ad-intel/ in v1.6.5 isolation audit.
//
// One-shot push of the 7 named Summer Flex Campaign concepts (Siraj
// project, May 2 production) into the Airtable Creative Briefs table.
// Each concept is authored by Jael Harris (Creative Director) and
// corresponds to a specific shoot block. Maps each to its §02 outcome
// + §13 persona.
//
// This script will only work against an Airtable base that contains
// the `siraj_001` project record. Do not adapt for other brands — for
// any new project, generate concepts via the engine's Pass 14
// (generateCreatorBriefs) + Stage D (generateBrief) flows instead.
//
// Run: AIRTABLE_KEY=... AIRTABLE_BASE=... node projects/siraj/scripts/push-flex-concepts.mjs

const KEY = process.env.AIRTABLE_KEY;
const BASE = process.env.AIRTABLE_BASE;
if (!KEY || !BASE) { console.error("Set AIRTABLE_KEY + AIRTABLE_BASE"); process.exit(1); }

async function at(table, opts = {}) {
  const enc = encodeURIComponent(table);
  const url = `https://api.airtable.com/v0/${BASE}/${enc}${opts.path || ""}${opts.query ? "?" + opts.query : ""}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function findRecord(table, formula) {
  const data = await at(table, { query: `filterByFormula=${encodeURIComponent(formula)}&maxRecords=1` });
  return data.records[0] || null;
}

const project = await findRecord("Projects", `{project_id} = "siraj_001"`);
if (!project) { console.error("Siraj project not found"); process.exit(1); }
console.log(`Project: ${project.id}`);

const CONCEPTS = [
  {
    brief_id: "flex_concept_01",
    name: "The Village (Mom's Night In) · Sabia + Kiaan",
    angle: "village_handoff",
    outcome_job: 3,
    outcome_score: 14.4,
    persona: "Amira",
    brief: `Outcome anchor: Job 03 · Recovery from a depleting season · opp 14.4
Persona: Amira (The Cautious Indulger)
Concept author: Jael Harris (May 2 production)

Hook (frame 1):
  Sabia alone with Kiaan. Weight, tenderness, solo parenting.

Body:
  Door opens. Friends arrive. Energy shifts immediately. THE HANDOFF — Sabia passes Kiaan (the hero shot of the entire campaign). Her face as she lets go — the exhale. Wide group: laughing, sharing a meal. Two-shot of Sabia poured into by another model. Final wide: full village, ease in every body, Siraj Flex throughout.

CTA:
  For the version of motherhood the hospital didn't see.

Producer flag:
  The handoff is the emotional centerpiece of the entire shoot. Protect it above all other shots in Block 1. Kiaan wraps immediately after — do not push the baby past 2:25 PM. Real laughter only.

Shot list (from production schedule):
  1. Wide: Sabia alone with Kiaan — weight, tenderness
  2. Door opens — friends arrive, energy shifts
  3. THE HANDOFF — Sabia passes Kiaan (hero shot)
  4. Close: Sabia's face as she lets go — the exhale
  5. Wide group: laughing, sharing a meal, village energy
  6. Two-shot: Sabia + another model, poured into
  7. Final wide — full village, ease in every body

Targets: 7 narrative + 6 evergreen + 3 paid ads frames
Linked Swipe Ad pattern: SWP-Lunya-problem-statement (cart-stall mechanic, flipped to community-as-relief)
Belief to shift: "Postpartum recovery is medical-coded, not me-coded."
Evidence to use: TENCEL Modal waistband does not pinch a c-section line.`,
  },
  {
    brief_id: "flex_concept_02",
    name: "My Time, His Time, Our Time · Sabia + Kiaan",
    angle: "ritual_pov",
    outcome_job: 3,
    outcome_score: 14.4,
    persona: "Amira",
    brief: `Outcome anchor: Job 03 / Job 02 · opp 14.4 / 11.8
Persona: Amira
Concept author: Jael Harris

Hook:
  Mirror affirmations — Sabia solo.

Body:
  Journal insert: one slow, deliberate sentence. Face: filtering out the noise, inner permission. Pickup: Sabia receives Kiaan — shift in her face. Wide: playing together, grounded and restored. Close: Kiaan's hands in hers — connection.

CTA:
  Make room for both of you.

Producer flag:
  Shoot Sabia solo for the first 20 min. Bring Kiaan in only for the final payoff shots. Real connection only.

Shot list (6 narrative):
  1. Mirror affirmations
  2. Journal insert — one slow sentence
  3. Face filtering out the noise
  4. Pickup of Kiaan — shift in her face
  5. Wide: playing together, grounded
  6. Close: Kiaan's hands in hers

Targets: 6 narrative + 5 evergreen + 3 paid ads
Belief to shift: "Caring for him erases me."`,
  },
  {
    brief_id: "flex_concept_03",
    name: "Still. Here. · Sabrina",
    angle: "before_after_pivot",
    outcome_job: 1,
    outcome_score: 13.6,
    persona: "Imani / Maya",
    brief: `Outcome anchor: Job 01 · Reclaim my body from the demands of the day · opp 13.6
Persona: Imani (Sensory Romantic) / Maya (Reflective Rewarder)
Concept author: Jael Harris

Hook:
  Couch. Phone glow. Old t-shirt. Mental overload established.

Body:
  Medium: phone screen light on her face, doom scroll. Insert: notification flood (run a marathon / start a business / make more money). Close: glazed, overwhelmed, disconnected. THE PIVOT — she sets the phone down. Wide held long. Cut to fireplace: knees folded, room warm and bright. Face softens, quiet release. Hands resting easy in lap, fireplace glow behind. Wide final hold — still, present, at ease.

CTA:
  Set it down. Stay.

Producer flag:
  Room MUST dim for mental overload. Then fully reset/brighten before stillness. THE PIVOT shot is non-negotiable — wide, held long, do not cut early.

Shot list (9 narrative):
  1. Wide: couch, old t-shirt, phone glow — Mental Overload
  2. Medium: phone screen light on face, doom scroll
  3. Insert: notification flood on screen
  4. Close: glazed overwhelmed expression
  5. Wide: phone set down — THE PIVOT (hold long)
  6. Wide: fireplace — knees folded, room warm
  7. Medium: face softens, quiet release
  8. Close: hands resting easy in lap
  9. Wide final hold — still, present

Targets: 9 narrative + 6 evergreen + 3 paid ads
Linked Swipe Ad pattern: Skims before/after composition, flipped from beach-body to bedroom-stillness.
Belief to shift: "If I stop scrolling I'll fall behind."`,
  },
  {
    brief_id: "flex_concept_04",
    name: "Be Anxious for Nothing · Sabrina",
    angle: "diptych_micro",
    outcome_job: 1,
    outcome_score: 13.6,
    persona: "Imani",
    brief: `Outcome anchor: Job 01 · opp 13.6
Persona: Imani
Concept author: Jael Harris

Hook:
  Eating standing up, frantic.

Body (7 diptych beats, each a cut not a long take):
  1. Standing → sit down, chew slowly
  2. Typing blur → shut laptop → one word in notebook
  3. Watch check repeatedly → remove it, set face-down
  4. Rushed walk → consciously slow to a stroll
  5. Jaw clenched at phone → deep breath → shoulders drop
  6. Frantically scrolling playlist → phone face-down, silence
  7. Mug gripped tight with white knuckles → hands loosen, feel the heat

CTA:
  One beat at a time.

Producer flag:
  Each beat is a cut, not a long take — move through with momentum. Camera stays tight and mobile. Insert/close shots throughout.

Targets: 7 narrative + 5 evergreen + 2 paid ads
Belief to shift: "Rushing is just being responsible."`,
  },
  {
    brief_id: "flex_concept_05",
    name: "The Art of Dilly Dallying · Yana",
    angle: "category_pivot",
    outcome_job: 5,
    outcome_score: 12.2,
    persona: "Maya / Imani",
    brief: `Outcome anchor: Job 05 · Stop apologizing for choosing rest · opp 12.2
Persona: Maya (Reflective Rewarder) / Imani
Concept author: Jael Harris

Hook:
  Busy-work surrounding her — mail, laptop, notifications pinging.

Body:
  She pushes it aside — intentional, not impulsive. Hands opening a coloring book, selecting a pencil. Medium: coloring, absorbed, unhurried, fluid. Record player NEEDLE DROP (hero shot). Wide: dancing alone, free, unselfconscious. Insert: hands bedazzling a hat, playful and close.

CTA:
  Permission, granted.

Producer flag:
  Do not over-direct. Real movement, especially the dancing. Needle drop on the record player is a hero shot — get it clean.

Shot list (8 narrative):
  1. Wide: busy-work surrounding her
  2. Medium: she pushes it aside — intentional
  3. Insert: hands opening coloring book
  4. Medium: coloring — absorbed, unhurried
  5. Medium: record player NEEDLE DROP (hero)
  6. Wide: dancing alone, free, unselfconscious
  7. Insert: hands bedazzling a hat
  8. Wide: full room, soft chaos, joy

Targets: 8 narrative + 6 evergreen + 2 paid ads
Belief to shift: "Doing nothing is unproductive. I should feel guilty."`,
  },
  {
    brief_id: "flex_concept_06",
    name: "Grounding the Village · Yana",
    angle: "ritual_handoff",
    outcome_job: 4,
    outcome_score: 12.6,
    persona: "Simone",
    brief: `Outcome anchor: Job 04 · Mark a transition moment with a tactile, ownable ritual · opp 12.6
Persona: Simone (Soft-Life Loyalist)
Concept author: Jael Harris

Hook:
  Yana alone with a single grounding object — candle, journal, breath.

Body:
  Solo grounding ritual: 10-min sequence — lighting, settling, releasing. Then the group enters frame — Sabia returns (if Kiaan has wrapped). The handoff beat is the village receiving what Yana has prepared. Soft transitions, warm light.

CTA:
  Make the room before the people arrive.

Producer flag:
  Yana's solo 10-min ritual MUST shoot before the group enters frame. If Kiaan has wrapped, adjust the handoff beat — do not delay the scene.

Targets: 6 narrative + 5 evergreen + 3 paid ads
Belief to shift: "Hosting means performing. I have to perform for it to count."`,
  },
  {
    brief_id: "flex_concept_07",
    name: "Fly Girl at Home · Adaeze + Bria",
    angle: "rest_to_motion",
    outcome_job: 2,
    outcome_score: 11.8,
    persona: "Imani / Simone",
    brief: `Outcome anchor: Job 02 · Public-private continuum · opp 11.8
Persona: Imani / Simone
Concept author: Jael Harris

Hook:
  Two women, two cups, soft light. Rest mode.

Body:
  Rings on, candle lit, keys collected. Synchronized exit — walk out together. 7 narrative shots + the synchronized exit walk. Final concept of the day, clock is running. Move fast.

CTA:
  Same set. Two modes. Both yours.

Producer flag:
  Move fast — final concept, clock is running. Two-shot paid-ads portrait is the PRIORITY ASSET — get it before releasing models. 4 frames, direct gaze, vertical, clean background.

Shot list (7 narrative + synchronized exit):
  1. Two women, cups, soft light — at rest
  2. Wide: shared space, two modes
  3. Rings on — close insert
  4. Candle lit — hands
  5. Keys collected — both hands
  6. Synchronized exit walk — wide
  7. Close: two-shot at the door

Targets: 7 narrative + 6 evergreen (+ 4 paid ads portraits)
Belief to shift: "Sleepwear is for staying home. Going out means changing all of it."`,
  },
];

console.log(`\nPushing ${CONCEPTS.length} concept briefs to Airtable…\n`);

for (const c of CONCEPTS) {
  const existing = await findRecord("Creative Briefs", `{brief_id} = "${c.brief_id}"`);
  if (existing) { console.log(`  · ${c.name} (exists)`); continue; }

  const fields = {
    brief_id: c.brief_id,
    user_id: "engine_internal",
    project_id_link: [project.id],
    name: c.name,
    status: "ready",
    source_belief_session: null,
    source_cell_id: null,
    source_angle_code: c.angle,
    brief: c.brief,
    tool: "higgsfield",
    preset_mode: "soul-id-portrait",
    format: "9:16",
    duration_seconds: 8,
    iteration_count: 1,
    created_at: new Date().toISOString().split("T")[0],
  };

  const res = await at("Creative Briefs", { method: "POST", body: { records: [{ fields }] } });
  console.log(`  ✓ ${c.name}`);
}

console.log(`\n✓ Pushed ${CONCEPTS.length} Summer Flex concepts to Airtable`);
