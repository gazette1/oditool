// src/lib/hormozi-core.js
//
// Engine v1.8.0 / v2.0-alpha · Hormozi Core Architecture
//
// Three universal core passes that produce the new top-of-doc sections
// every strategy doc gets, regardless of business archetype:
//
//   Pass O · generateGrandSlamOffer → §01 The Offer
//   Pass M · generateMoneyModel    → §02 The Money Model
//   Pass G · generateLeadModel     → §03 The Lead Model
//
// Spec: <vault>/19 - Hormozi Core Architecture (Money Model + Offer + Lead Model).md
//
// Source frameworks (verbatim-quoted in HORMOZI_DEFINITIONS below):
//   - $100M Offers (Alex Hormozi, 2021) · Value Equation + Starving Crowd
//     + 5 enhancement layers (Scarcity / Urgency / Bonuses / Guarantees / Naming)
//   - $100M Leads (2023) · Core Four + 4 Lead Getters + 3 Lead Magnet types
//   - $100M Money Models (2025) · 16 offer types across 4 categories
//
// Same architectural pattern as PM101_DEFINITIONS in anthropic.js: framework
// text embedded verbatim in each pass's system prompt so Claude classifies
// against the canonical structure, not a paraphrase.
//
// Anchoring rule (carried from Pass L · Pass 8.6 · Pass 8.7): every output
// MUST anchor to a real Pass 7 persona name AND a real Pass 2 Ulwick outcome.
// If anchors can't be satisfied, output is dropped with retry.

import { callClaude, extractJSON } from "./anthropic.js";

// ─────────────────────────────────────────────────────────────
// HORMOZI_DEFINITIONS · canonical framework text from the trilogy
// ─────────────────────────────────────────────────────────────

export const HORMOZI_DEFINITIONS = `
═══════════════════════════════════════════════════════════════
HORMOZI TRILOGY · CANONICAL FRAMEWORKS
═══════════════════════════════════════════════════════════════

─── BOOK 1 · $100M OFFERS · THE VALUE EQUATION (ch 6) ───

                Dream Outcome  ×  Perceived Likelihood of Achievement
  Value  =  ──────────────────────────────────────────────────────────
                Time Delay     ×   Effort & Sacrifice

Four primary drivers of value · two to MAXIMIZE (top) · two to MINIMIZE (bottom · drive toward zero):

  1. (Yay) Dream Outcome (Goal: Increase) — what they get
  2. (Yay) Perceived Likelihood of Achievement (Goal: Increase) — proof + edification + social proof
  3. (Boo) Perceived Time Delay Between Start and Achievement (Goal: Decrease) — speed
  4. (Boo) Perceived Effort & Sacrifice (Goal: Decrease) — friction

Apple, Amazon, Netflix all won by collapsing the denominator (bottom side). Big claims (top side) are easy — anyone can promise. The unfair advantage is making things IMMEDIATE and EFFORTLESS.

Perception is reality. The Grand Slam Offer is only valuable once the prospect perceives the increases and decreases. The dotted map in the London tunnel decreased perceived time delay more than faster trains would have, at 1000× lower cost.

─── BOOK 1 · STARVING CROWD (ch 4) · 4 MARKET INDICATORS ───

Hormozi: "A starving crowd > Offer Strength > Persuasion Skills."

When picking a market, look for:

  1. MASSIVE PAIN — they don't WANT, they NEED. Pain = anything that frustrates people about their lives. Degree of pain ∝ price you can charge.
  2. PURCHASING POWER — they have the money (or access to it) to pay you what you're worth.
  3. EASY TO TARGET — they gather somewhere (associations, mailing lists, social groups, channels). If you have to find needles in a haystack, no Grand Slam Offer will save you.
  4. GROWING — markets are tailwinds (growing) or headwinds (declining). Newspapers shrinking 25%/year = no offer fixes that.

Classify a market as: starving | hungry | fed | sated based on these four together.

─── BOOK 1 · 5 ENHANCEMENT LAYERS (chapters 11-16) ───

After the Value Equation, enhance the offer with five layers:

  • SCARCITY (ch 12) — supply-limited (only N exist) · demand-limited (only N customers per cohort) · time-limited (only available until X)
  • URGENCY (ch 13) — rolling-deadline · event-deadline (real reason like "before Q4") · bonus-deadline (price holds 24h)
  • BONUSES (ch 14) — every bonus removes a specific objection. Stack-of-value with anchored prices ("$497 value") · trim by impact-per-cost
  • GUARANTEES (ch 15) — unconditional · conditional ("if X then refund") · anti-guarantee ("we don't refund · here's why") · implied (results-based stake)
  • NAMING (ch 16) — MAGIC formula: Magnetic reason + Announce avatar + Give them a goal + Indicate a time interval + Container word ("the 6-Week Founder Sleep Reset System")

─── BOOK 2 · $100M LEADS · THE CORE FOUR ───

There are only 4 ways to let strangers know your business exists. Memorize them.

                  | WARM audience (knows you)  | COLD audience (doesn't know you)
  ────────────────┼────────────────────────────┼──────────────────────────────────
  1-to-1          | Warm Outreach              | Cold Outreach
                  | (DM the followers · text   | (email · DM · phone · "Cold Email
                  |  customers · text friends) |  Outreach" theme · sales reps)
  1-to-many       | Posting Content            | Paid Ads
                  | (organic social · email    | (Meta · Google · TikTok · GBP ·
                  |  list · YouTube · podcast) |  Lead Service Ads · billboards)

If you aren't getting enough leads, you're not doing the Core Four with enough SKILL or VOLUME.

─── BOOK 2 · 4 LEAD GETTERS (Section IV) ───

When you scale beyond yourself, you need OTHERS doing your Core Four:

  1. CUSTOMER REFERRALS — word of mouth · referral programs · "tell a friend, get $X" mechanics
  2. EMPLOYEES — in-house sales team · content team · creators
  3. AGENCIES — paid ad agencies · content shops · SEO firms
  4. AFFILIATES & PARTNERS — revenue-share partners · for local services: realtors, GCs, estate attorneys, property managers · for B2B SaaS: integrators, consultants

─── BOOK 2 · 3 LEAD MAGNET TYPES × 4 FORMATS = 12 VARIANTS ───

A LEAD MAGNET is a complete solution to a NARROW problem · given for free (or near-free).

3 types:
  1. REVEAL THEIR PROBLEM (diagnosis) — speed test, posture analysis, termite inspection, business audit, free SEO scan, hormone-level quiz
  2. SAMPLE THE SOLUTION (trial) — Costco food samples, free chiropractic adjustment, software trial, first chapter free
  3. ONE STEP OF A MULTI-STEP PROCESS — free garage-door sealant coat #1 (3 coats needed for full protection), free first session of a 12-week program

4 formats:
  1. INFORMATION (PDF guide, course, video, book chapter)
  2. SOFTWARE (calculator, tool, template, app)
  3. SERVICE (free consult, audit, inspection, sample)
  4. PHYSICAL OBJECT (sample-sized product, swatch, free physical book, demo unit)

Combine: 3 × 4 = 12 variants. Rotate them. Whichever converts best becomes the dominant lead magnet.

─── BOOK 3 · $100M MONEY MODELS · 4 CATEGORIES × 16 OFFER TYPES ───

A MONEY MODEL = a SEQUENCE of offers arranged into a customer journey.

The four offer categories serve different journey roles:

  ATTRACTION (6 types) — turn strangers into first-time customers:
    1. Win Your Money Back — "if X doesn't happen, get your money back" (asymmetric upside)
    2. Giveaways — free thing of value · creates engagement + reciprocation
    3. Decoy Offer — bad/inferior option makes the real offer look amazing
    4. Buy X Get Y Free — "Buy the pajama set, get the eye mask free" · raises perceived value
    5. Pay Less Now or Pay More Later — payment plans · split-pay
    6. Free Goodwill — give first · no ask · powers reciprocation (Cialdini)

  UPSELL (4 types) — maximize AOV at moment of purchase:
    7. Classic Upsell — "Want the protein bar with that workout plan?"
    8. Menu Upsell — show menu of 3 tiers · most pick the middle (anchoring)
    9. Anchor Upsell — price something HIGH first to make the real offer feel cheap
    10. Rollover Upsell — auto-bill on day N unless customer opts out

  DOWNSELL (3 types) — recover the buyer who said no:
    11. Payment Plan Downsells — "Can't afford $1000? Try 12 × $99"
    12. Trial With Penalty — "Cancel before day 14 or you're charged"
    13. Feature Downsells — strip features, lower price, still close the sale

  CONTINUITY (3 types) — convert one-time → recurring:
    14. Continuity Bonus — "Subscribe and get [free thing]" each month
    15. Continuity Discount — "Subscribe and save 15%"
    16. Waived Fee Offer — "Annual fee waived if you subscribe"

CFA — Client-Funded Acquisition: the FIRST sale in the money model should cover your CAC immediately. That way growth is self-financed.

─── HOW THE THREE BOOKS STACK ───

  LEAD MODEL (Book 2) → delivers prospects into your funnel
       ↓
  GRAND SLAM OFFER (Book 1) → the first thing they buy · maximally valuable
       ↓
  MONEY MODEL (Book 3) → upsell · downsell · continuity stacked into a journey

Combine all three: prospects show up cheap (Lead Model) · convert at premium (Grand Slam Offer · Value Equation max) · pay you again and again (Money Model · 4-category stack). That's the trilogy in 3 lines.
`.trim();

// ─────────────────────────────────────────────────────────────
// Shared helper · build the diagnostic context block all three
// passes need (personas, outcomes, positioning, diagnostic)
// ─────────────────────────────────────────────────────────────

function _buildAnchorContext({ projectContext, diagnostic, positioning, personas, mergedJobs, brandName }) {
  const personaNames = (personas || []).map((p) => p.name).filter(Boolean);
  const outcomesList = (mergedJobs || [])
    .flatMap((j) => (j.outcomes || []).map((o) => ({
      statement: o.statement,
      opportunity_score: o.opportunity_score,
      job_id: j.id,
      underserved: o.underserved,
    })))
    .filter((o) => o.statement)
    .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
    .slice(0, 12);

  const ctxBlock = `BRAND: ${brandName || projectContext?.sector || "the brand"}
SECTOR: ${projectContext?.sector || ""}
AUDIENCE: ${projectContext?.audience || ""}
VOICE RULES: ${projectContext?.brand_voice || "natural, sentence-case, no exclamation points"}
POSITIONING: "${positioning?.primary?.sentence || ""}"
DIAGNOSTIC:
  Archetype: ${diagnostic?.business_model?.primary || "unknown"}
  Market maturity: ${diagnostic?.market_maturity?.stage_label || "unknown"}
  Sophistication: ${diagnostic?.market_sophistication?.stage_label || "unknown"}
  Emotional journey: ${diagnostic?.emotional_journey?.from_state || "?"} → ${diagnostic?.emotional_journey?.to_state || "?"}
  Money model archetype: ${diagnostic?.money_model_archetype?.label || "unknown · classify in Pass M"}
  Lead model archetype: ${diagnostic?.lead_model_archetype?.label || "unknown · classify in Pass G"}
  Starving crowd strength: ${diagnostic?.starving_crowd_strength?.label || "unknown"}

PERSONAS (every anchor MUST use one of these exact names):
${personaNames.map((n) => `  - ${n}`).join("\n") || "(no personas)"}

TOP UNDERSERVED OUTCOMES (every outcome anchor MUST be one of these · verbatim or close paraphrase ≥80%):
${outcomesList.map((o) => `  - [opp ${o.opportunity_score} · Job ${o.job_id}${o.underserved ? " · UNDERSERVED" : ""}] ${o.statement}`).join("\n") || "(no outcomes)"}`;

  return { ctxBlock, personaNames, outcomesList };
}

function _validateAnchors(parsed, personaNames, outcomesList) {
  const personaOk = parsed.persona_anchor && personaNames.includes(parsed.persona_anchor);
  const matchedOutcome = outcomesList.find((o) =>
    o.statement === parsed.outcome_anchor ||
    (parsed.outcome_anchor && o.statement.toLowerCase().includes(parsed.outcome_anchor.toLowerCase().slice(0, 40))) ||
    (parsed.outcome_anchor && parsed.outcome_anchor.toLowerCase().includes(o.statement.toLowerCase().slice(0, 40)))
  );
  return { personaOk, matchedOutcome };
}

// ─────────────────────────────────────────────────────────────
// Pass O · generateGrandSlamOffer · §01 The Offer
// ─────────────────────────────────────────────────────────────

const PASS_O_SYSTEM = `You are constructing a Grand Slam Offer using Alex Hormozi's $100M Offers framework. The Value Equation governs perceived value:

${HORMOZI_DEFINITIONS}

Construct ONE offer for the brand. Use the Value Equation to break down its current state and the 5 enhancement layers to make it irresistible.

Return ONLY raw JSON in this exact shape:

{
  "offer": {
    "name": "<6-10 word offer name · per Hormozi 'Naming' MAGIC formula>",
    "one_line_pitch": "<single sentence the buyer hears · brand voice respected>",

    "value_equation": {
      "dream_outcome": "<what the buyer gets · grounded in the highest-opp Ulwick outcome from the list>",
      "perceived_likelihood": "<why the buyer believes it will happen · proof stack · Cialdini Authority + Social Proof live here>",
      "time_delay": "<how long until value · the bottom-half lever · drive toward zero>",
      "effort_sacrifice": "<what the buyer must do · drive toward zero>",
      "verdict": "infinite | strong | moderate | weak",
      "rationale": "<1-2 sentences on which lever does the heavy lifting AND which lever is weakest (= the biggest optimization opportunity)>",
      "weakest_lever": "dream_outcome | perceived_likelihood | time_delay | effort_sacrifice",
      "biggest_unlock": "<1 sentence on what to ship next to improve the weakest lever>"
    },

    "enhancements": {
      "scarcity": {
        "type": "supply-limited | demand-limited | time-limited | none",
        "spec": "<concrete instantiation · e.g., 'Only 40 spots per cohort · 4 cohorts per year'>",
        "rationale": "<why this scarcity type fits the offer>"
      },
      "urgency": {
        "mechanism": "rolling-deadline | event-deadline | bonus-deadline | none",
        "spec": "<concrete instantiation>",
        "rationale": "<why · keep honest · no fake urgency>"
      },
      "bonuses": [
        {
          "name": "<bonus name>",
          "anchored_value_usd": "<$X · what it would cost standalone>",
          "removes_objection": "<which specific objection this neutralizes>"
        }
      ],
      "guarantee": {
        "type": "unconditional | conditional | anti | implied",
        "terms": "<exact terms · honest · enforceable>",
        "rationale": "<why this guarantee type fits>"
      },
      "naming": {
        "final_offer_name": "<the named offer · MAGIC formula applied>",
        "magic_breakdown": {
          "magnetic_reason": "<the M>",
          "announce_avatar": "<the A>",
          "give_them_goal": "<the G>",
          "indicate_time": "<the I>",
          "container_word": "<the C>"
        }
      }
    },

    "starving_crowd_check": {
      "massive_pain": "<evidence the audience has this · cite a specific Ulwick outcome>",
      "purchasing_power": "<can they afford the offer's price tier>",
      "easy_to_target": "<where they gather · channels · associations>",
      "growing": "<tailwind | headwind | flat>",
      "verdict": "starving | hungry | fed | sated"
    },

    "persona_anchor": "<exact persona name from the list above>",
    "outcome_anchor": "<exact Ulwick outcome statement from the list above · verbatim or ≥80% paraphrase>"
  }
}

ABSOLUTE RULES:
1. persona_anchor MUST be an exact name from the persona list. outcome_anchor MUST match a listed outcome verbatim or ≥80% paraphrase.
2. NO mention of generic placeholders ("the target audience", "improve conversion"). Use real persona names and real outcome statements.
3. Voice rules govern offer name + one_line_pitch + bonus names.
4. If voice rules say "no exclamation points" — honor it.
5. Scarcity + Urgency + Guarantee must be HONEST and ENFORCEABLE in real life. No fake countdown timers.
6. Bonuses: 3-5 of them. Each removes a SPECIFIC objection (not "more value").
7. Rationale fields are concrete observations grounded in the diagnostic + outcomes · not generic claims.
8. weakest_lever + biggest_unlock are CRITICAL · they drive what passes downstream should emphasize.`;

export async function generateGrandSlamOffer(apiKey, opts) {
  const { ctxBlock, personaNames, outcomesList } = _buildAnchorContext(opts);

  let attempts = 0;
  let lastError;
  while (attempts < 2) {
    attempts++;
    try {
      const raw = await callClaude(apiKey, PASS_O_SYSTEM, ctxBlock, { maxTokens: 5000 });
      const parsed = extractJSON(raw);
      const offer = parsed?.offer;
      if (!offer) { lastError = new Error("Pass O returned no offer"); continue; }

      const { personaOk, matchedOutcome } = _validateAnchors(offer, personaNames, outcomesList);
      if (!personaOk && attempts < 2) {
        console.warn(`[Pass O] persona anchor "${offer.persona_anchor}" not in persona list · retry`);
        lastError = new Error("persona anchor failed"); continue;
      }
      if (!matchedOutcome && attempts < 2) {
        console.warn(`[Pass O] outcome anchor "${offer.outcome_anchor}" not in outcomes list · retry`);
        lastError = new Error("outcome anchor failed"); continue;
      }
      if (matchedOutcome) offer.outcome_anchor = matchedOutcome.statement;

      offer._engine_version = "v1.8.0";
      offer._generated_at = new Date().toISOString();
      return { offer };
    } catch (e) {
      lastError = e;
      if (attempts >= 2) break;
      console.warn(`[Pass O] attempt ${attempts} failed: ${e.message} · retry`);
    }
  }
  console.warn(`[Pass O] giving up after ${attempts} attempts: ${lastError?.message || "unknown"}`);
  return { offer: null, note: `Pass O failed: ${lastError?.message || "unknown"}` };
}

// ─────────────────────────────────────────────────────────────
// Pass M · generateMoneyModel · §02 The Money Model
// ─────────────────────────────────────────────────────────────

const PASS_M_SYSTEM = `You are designing a Money Model using Alex Hormozi's $100M Money Models framework. A Money Model is a SEQUENCE of offers arranged into a customer journey. There are 16 offer types across 4 categories.

${HORMOZI_DEFINITIONS}

Pick 2-4 of the 16 offer types and stack them into a customer journey for this brand. The stack should produce CFA (Client-Funded Acquisition) economics — the first sale covers CAC immediately so growth is self-financed.

Return ONLY raw JSON in this exact shape:

{
  "money_model": {
    "archetype": "Attraction-led | Upsell-led | Downsell-led | Continuity-led | Hybrid",
    "summary": "<1-paragraph describing the journey shape · how a stranger becomes a recurring customer>",

    "stack": [
      {
        "position": 1,
        "category": "Attraction | Upsell | Downsell | Continuity",
        "type": "<one of the 16 specific types · e.g., 'Buy X Get Y Free', 'Classic Upsell', 'Payment Plan Downsell', 'Continuity Bonus'>",
        "specifics": "<concrete instantiation for THIS brand · 2-3 sentences · what it actually is>",
        "target_persona": "<persona name from the list>",
        "target_outcome": "<Ulwick outcome from the list>",
        "economics": {
          "price_usd": "<$X>",
          "expected_take_rate": "<Z% · realistic>",
          "margin_pct": "<Y%>",
          "rationale": "<why these economics work for the category and persona>"
        },
        "first_test": "<concrete 2-week first-test of this offer · ships fast>"
      }
    ],

    "cfa_analysis": {
      "cac_target_usd": "<$X · industry benchmark for the lead channels>",
      "first_offer_revenue_usd": "<$Y · what stack[0] brings in net of margin>",
      "cumulative_ltv_usd": "<$Z over N months from full stack>",
      "ltv_cac_ratio": "<X:1>",
      "cfa_status": "client-funded | partially-funded | not-funded",
      "lever_to_pull": "<1 sentence · which specific offer to add, improve, or sequence differently to fix CFA · concrete>"
    },

    "voice_of_customer_anchor": "<1 sentence · how a real customer would describe being moved through this journey · their words · not marketing speak>",

    "persona_anchor": "<exact persona name>",
    "outcome_anchor": "<exact Ulwick outcome statement>"
  }
}

ABSOLUTE RULES:
1. Stack: 2-4 offers. NOT 1. NOT 5+. The 2-offer floor is because one offer alone isn't a money model. The 4-offer ceiling is because more than 4 in the journey loses the buyer's attention.
2. The 16 offer types are the ONLY allowed type values. Don't invent new types.
3. At least ONE offer in the stack MUST be in the Attraction category (you can't have a money model without entry).
4. Continuity is OPTIONAL but RECOMMENDED · LTV without continuity is fragile.
5. CFA analysis must show MATH that works in the real world. Don't claim "$50 CAC and $5000 LTV" unless the offer pricing supports it.
6. cfa_status MUST be "client-funded" only if first_offer_revenue_usd >= cac_target_usd. Honest assessment.
7. Every position.target_outcome MUST match a listed outcome verbatim or ≥80%.
8. The 4-category coverage matters: if the brand's archetype is established and has product-market fit, lean Upsell/Continuity. If brand is pre-PMF, lean Attraction/Downsell.
9. persona_anchor MUST be exact persona name. outcome_anchor MUST be exact outcome statement.
10. NO fabricated continuity offers if the brand has no recurring product. NO upsells without a real second product to sell.`;

export async function generateMoneyModel(apiKey, opts) {
  const { ctxBlock, personaNames, outcomesList } = _buildAnchorContext(opts);
  // Append the Pass O offer if available — it informs Pass M
  const offerBlock = opts.offer
    ? `\n\nGRAND SLAM OFFER FROM PASS O (use as stack[0] or close to it):\n  Name: ${opts.offer.name}\n  Pitch: ${opts.offer.one_line_pitch}\n  Dream outcome: ${opts.offer.value_equation?.dream_outcome}`
    : "";

  let attempts = 0;
  let lastError;
  while (attempts < 2) {
    attempts++;
    try {
      const raw = await callClaude(apiKey, PASS_M_SYSTEM, ctxBlock + offerBlock, { maxTokens: 5500 });
      const parsed = extractJSON(raw);
      const mm = parsed?.money_model;
      if (!mm) { lastError = new Error("Pass M returned no money_model"); continue; }

      const { personaOk, matchedOutcome } = _validateAnchors(mm, personaNames, outcomesList);
      if (!personaOk && attempts < 2) {
        console.warn(`[Pass M] persona anchor "${mm.persona_anchor}" not in list · retry`);
        lastError = new Error("persona anchor failed"); continue;
      }
      if (!matchedOutcome && attempts < 2) {
        console.warn(`[Pass M] outcome anchor failed · retry`);
        lastError = new Error("outcome anchor failed"); continue;
      }
      if (matchedOutcome) mm.outcome_anchor = matchedOutcome.statement;

      // Validate stack: 2-4 entries, at least one Attraction
      if (!Array.isArray(mm.stack) || mm.stack.length < 2 || mm.stack.length > 4) {
        if (attempts < 2) { lastError = new Error(`Pass M stack length ${mm.stack?.length} outside 2-4 · retry`); continue; }
      }
      const hasAttraction = (mm.stack || []).some((s) => s.category === "Attraction");
      if (!hasAttraction && attempts < 2) {
        lastError = new Error("Pass M stack missing Attraction category · retry"); continue;
      }

      mm._engine_version = "v1.8.0";
      mm._generated_at = new Date().toISOString();
      return { money_model: mm };
    } catch (e) {
      lastError = e;
      if (attempts >= 2) break;
      console.warn(`[Pass M] attempt ${attempts} failed: ${e.message} · retry`);
    }
  }
  console.warn(`[Pass M] giving up after ${attempts} attempts: ${lastError?.message || "unknown"}`);
  return { money_model: null, note: `Pass M failed: ${lastError?.message || "unknown"}` };
}

// ─────────────────────────────────────────────────────────────
// Pass G · generateLeadModel · §03 The Lead Model
// ─────────────────────────────────────────────────────────────

const PASS_G_SYSTEM = `You are designing a Lead Model using Alex Hormozi's $100M Leads framework. There are only 4 ways to let strangers know a business exists (the Core Four). For scaling, 4 Lead Getters amplify the Core Four. Lead Magnets bridge awareness to conversion (3 types × 4 formats = 12 variants).

${HORMOZI_DEFINITIONS}

Design a Lead Model for THIS brand. Pick 1-2 of the Core Four as PRIMARY channels (the ones the brand should focus 80% of effort on). Optionally suggest 0-2 Lead Getters appropriate to the brand's scale stage. Then design 1-3 Lead Magnets calibrated to the audience's awareness level and the Grand Slam Offer.

Return ONLY raw JSON in this exact shape:

{
  "lead_model": {
    "archetype": "Warm-Outreach-led | Content-led | Cold-Outreach-led | Paid-led | Hybrid",
    "summary": "<1-paragraph describing the acquisition shape · how a stranger first encounters this brand>",

    "core_four_selection": [
      {
        "type": "Warm Outreach | Posting Content | Cold Outreach | Paid Ads",
        "primary": true,
        "platform": "<specific platform · TikTok / LinkedIn / Meta / GBP / YouTube / Apollo · etc.>",
        "rationale": "<why this fits THIS brand · audience location + budget + voice fit>",
        "first_30_days": ["<3 concrete moves to execute>"],
        "budget_or_time_per_week": "<X hours OR $Y · realistic>",
        "skill_or_volume_gap": "<which · skill (need to learn) or volume (need to do more) · honest>"
      }
    ],

    "lead_getters": [
      {
        "type": "Customer Referrals | Employees | Agencies | Affiliates & Partners",
        "when_to_activate": "<stage gate · e.g., 'Once at $50K MRR' OR 'After first 100 customers'>",
        "comp_structure": "<concrete · 'Flat $50/referral' OR '15% rev share' OR '$X retainer + Y% performance'>",
        "first_kpi": "<measurable · e.g., '25%+ of jobs sourced from realtor partners within 6 months'>",
        "specifics": "<for local services: which realtor/GC/attorney archetypes · for B2B: which integrators/consultants · for DTC: which referral mechanic>"
      }
    ],

    "lead_magnets": [
      {
        "type": "Reveal Their Problem | Sample the Solution | One Step of a Multi-Step Process",
        "format": "Information | Software | Service | Physical Object",
        "title": "<5-9 word name · MAGIC-like naming · benefit-forward>",
        "promise": "<single line promise · 'In 5 minutes, see exactly which X you're losing'>",
        "delivery_mechanism": "<concrete · 'PDF behind email gate' OR 'free 15-min consult booked via Calendly' OR 'free sample mailed if they pay shipping'>",
        "narrow_problem_solved": "<the specific narrow problem this lead magnet solves entirely>",
        "first_test": "<concrete · 'Run as Meta ad to lookalike audience for $300 over 2 weeks'>",
        "target_persona": "<persona name>"
      }
    ],

    "persona_anchor": "<exact persona name>",
    "outcome_anchor": "<exact Ulwick outcome statement>"
  }
}

ABSOLUTE RULES:
1. Core Four: pick 1 or 2 PRIMARY. Don't pick all 4. Focus matters more than breadth at early stage.
2. core_four_selection.type MUST be exactly one of "Warm Outreach", "Posting Content", "Cold Outreach", "Paid Ads".
3. lead_getters: 0-2. Empty array if the brand is early-stage. Activated by stage gates, not "from day 1."
4. lead_magnets: 1-3. Each solves a NARROW problem entirely. NOT "improve your business" — "see exactly which 3 leaks lose you $X/mo."
5. Every lead_magnet.type MUST be one of the 3 Hormozi types. format MUST be one of the 4 Hormozi formats.
6. Cold Outreach for B2C residential local services is FORBIDDEN (you don't cold-call residential customers about junk removal). Local services use Warm + Paid + Lead Getters (partner referrals).
7. Paid Ads as primary requires either (a) budget ≥ $1K/mo or (b) a proven Grand Slam Offer. Otherwise Posting Content is the right primary.
8. Each lead magnet's narrow_problem_solved should map to a real Ulwick outcome from the list.
9. persona_anchor MUST be exact persona name. outcome_anchor MUST be exact outcome statement.
10. NO inventing channels outside the Core Four. "Influencer marketing" = Posting Content (paid amplification of someone else's content) OR Lead Getter type "Affiliates & Partners" if revenue-share.`;

export async function generateLeadModel(apiKey, opts) {
  const { ctxBlock, personaNames, outcomesList } = _buildAnchorContext(opts);
  // Append the Pass O offer if available — it informs Pass G
  const offerBlock = opts.offer
    ? `\n\nGRAND SLAM OFFER FROM PASS O (the lead model delivers prospects to THIS offer):\n  Name: ${opts.offer.name}\n  Pitch: ${opts.offer.one_line_pitch}\n  Starving crowd verdict: ${opts.offer.starving_crowd_check?.verdict || "?"}`
    : "";

  let attempts = 0;
  let lastError;
  while (attempts < 2) {
    attempts++;
    try {
      const raw = await callClaude(apiKey, PASS_G_SYSTEM, ctxBlock + offerBlock, { maxTokens: 5500 });
      const parsed = extractJSON(raw);
      const lm = parsed?.lead_model;
      if (!lm) { lastError = new Error("Pass G returned no lead_model"); continue; }

      const { personaOk, matchedOutcome } = _validateAnchors(lm, personaNames, outcomesList);
      if (!personaOk && attempts < 2) {
        console.warn(`[Pass G] persona anchor "${lm.persona_anchor}" not in list · retry`);
        lastError = new Error("persona anchor failed"); continue;
      }
      if (!matchedOutcome && attempts < 2) {
        console.warn(`[Pass G] outcome anchor failed · retry`);
        lastError = new Error("outcome anchor failed"); continue;
      }
      if (matchedOutcome) lm.outcome_anchor = matchedOutcome.statement;

      // Validate Core Four selection
      const VALID_CORE_FOUR = new Set(["Warm Outreach", "Posting Content", "Cold Outreach", "Paid Ads"]);
      const validSelection = (lm.core_four_selection || []).every((s) => VALID_CORE_FOUR.has(s.type));
      if (!validSelection && attempts < 2) {
        lastError = new Error("Pass G core_four_selection has invalid type · retry"); continue;
      }
      if (!Array.isArray(lm.core_four_selection) || lm.core_four_selection.length < 1 || lm.core_four_selection.length > 2) {
        if (attempts < 2) { lastError = new Error("Pass G core_four_selection size must be 1-2 · retry"); continue; }
      }

      lm._engine_version = "v1.8.0";
      lm._generated_at = new Date().toISOString();
      return { lead_model: lm };
    } catch (e) {
      lastError = e;
      if (attempts >= 2) break;
      console.warn(`[Pass G] attempt ${attempts} failed: ${e.message} · retry`);
    }
  }
  console.warn(`[Pass G] giving up after ${attempts} attempts: ${lastError?.message || "unknown"}`);
  return { lead_model: null, note: `Pass G failed: ${lastError?.message || "unknown"}` };
}
