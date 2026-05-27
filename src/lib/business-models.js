// src/lib/business-models.js
//
// Engine v1.7.0 · Business-Model Archetype Registry
//
// 11 archetypes. Only `dtc_ecommerce` is `is_supported: true` in phase 1.
// Each unsupported archetype carries `library_priors` so rank-by-priors
// is testable even before pass variants ship · plus a `phase_target`
// indicating when full pass variants land · plus a
// `not_yet_supported_message` for the UI gate.
//
// NO FALLBACK. If a project classifies into an unsupported archetype,
// the UI blocks strategy-doc generation unless the user explicitly
// flips an "Override anyway (accept fit gap)" toggle. The system never
// silently produces a wrong-shape doc.

// Pass plan for DTC = full v1.6.12 roster + Pass L applied playbooks.
// DTC doc roster harmonized with v1.6.12 (19 base sections) + new
// strategic_context front + new applied_playbooks before methodology
// → 21 sections (v5 reference parity).
const DTC_PASS_PLAN = [
  "P1", "P2", "P3", "P4",                  // discovery (run by Run-Analysis)
  "P5", "P7", "P8", "P8_5", "P8_6", "P8_7", // creative + imagery + ad recreations + deep dive
  "P9", "P10",                              // scripts + email
  "P11", "P12", "P13", "P14",               // operational
  "P15", "P16", "P17", "P18",               // strategic + audit + demand + tribe
  "PL",                                     // applied playbooks (vault)
];

const DTC_DOC_SECTIONS = [
  "strategic_context",       // §00 (v1.7.0)
  // v1.8.0 · Hormozi Core · 3 new universal top-of-doc sections
  "offer",                   // §01 NEW · Pass O Grand Slam Offer + Value Equation
  "money_model",             // §02 NEW · Pass M 16-offer-type customer journey + CFA
  "lead_model",              // §03 NEW · Pass G Core Four + Lead Getters + Lead Magnets
  "positioning",             // §04 (was §01)
  "evidence",                // §05 (was §02)
  "value_prop",              // §06 (was §03)
  "personas",                // §07 (was §04)
  "swipe_file",              // §05
  "ad_recreations",          // §06 (v1.7.3)
  "ad_deep_dive",            // §07 NEW v1.7.4 · single-ad storyboard + production brief
  "scripts",                 // §08
  "email_flows",             // §09
  "entry_wedge",             // §10
  "channels",                // §11
  "matrix",                  // §12
  "landing",                 // §13
  "rollout",                 // §14
  "creators",                // §15
  "competitive",             // §16
  "brand_audit",             // §17
  "demand",                  // §18
  "tribe",                   // §19
  "applied_playbooks",       // §20
  "methodology",             // §21
  "colophon",                // §22
];

// ─────────────────────────────────────────────────────────────
// LOCAL_SERVICES · Phase 2 (v1.8 ship target · promoted from Phase 6+
// on 2026-05-27 because user has an active junk-removal client and
// local services has higher market reach than b2b_saas)
//
// User direction: "i do so tonight lets run everything we need to be
// prepared for that instead of the saas stuff."
//
// Pass plan delta vs DTC:
//   - P7         → P7_local             (life-event-triggered personas with service-area anchor)
//   - P10        → P10_sms              (SMS sequences · NOT Klaviyo email · residential opt-in is different)
//   - P14        → P14_partners         (partner referrals · realtors, property mgrs, contractors, estate attorneys)
//   - P16        → P16_trust            (trust-stack audit · bonded · insured · uniformed · transparent pricing)
//   - + P16b_gbp (NEW · Google Business Profile audit · category, service area, review velocity, photo strategy)
//   - P18        → P18_customer_quotes  (real customer reviews surfaced as quote wall · NOT creators)
//
// SHIP NOTE FOR v1.7.6:
// The 6 new pass functions are SPEC'D but not yet implemented. App.jsx
// continues to call the existing un-suffixed versions (P7, P10, P14, P16,
// P18). Their output renders for un-replaced sections; for replaced
// sections, the renderer is absent and the dispatcher silently skips
// (console.warn 'unknown section id' in dev). The user sees a doc with
// ~17-18 sections rendered correctly and 5-6 sections visibly absent
// where the dedicated local_services renderers belong. That gap IS the
// signal · drives implementation priority. Full impl ships v1.8.
// ─────────────────────────────────────────────────────────────

const LOCAL_SERVICES_PASS_PLAN = [
  "P1", "P2", "P3", "P4",                        // discovery · universal
  "P5", "P7_local", "P8", "P8_5", "P8_6", "P8_7",// creative · P7 → P7_local
  "P9", "P10_sms",                                // scripts + SMS · P10 → P10_sms (NOT email_flows)
  "P11", "P12", "P13",                            // operational · universal
  "P14_partners",                                 // partner referrals · P14 → P14_partners (NOT creators)
  "P15", "P16_trust", "P16b_gbp",                 // strategic + trust + GBP (NEW pass)
  "P17", "P18_customer_quotes",                   // demand + customer wall · P18 → P18_customer_quotes
  "PL",                                           // applied playbooks · universal
];

const LOCAL_SERVICES_DOC_SECTIONS = [
  "strategic_context",       // §00 · universal (Pass D)
  // v1.8.0 · Hormozi Core · 3 new universal top-of-doc sections
  "offer",                   // §01 NEW · Grand Slam Offer
  "money_model",             // §02 NEW · 16-type customer journey + CFA
  "lead_model",              // §03 NEW · Core Four + Lead Getters
  "positioning",             // §04 · universal
  "evidence",                // §02 · universal (JTBD outcomes)
  "value_prop",              // §03 · universal (supply 1-800-GOT-JUNK / category leader as competitor)
  "personas",                // §04 · local_personas variant (P7_local) when renderer ships
  "swipe_file",              // §05 · universal
  "ad_recreations",          // §05b · universal
  "ad_deep_dive",            // §05c · universal
  "scripts",                 // §06 · universal
  "sms_sequences",           // §07 NEW · NO RENDERER YET (renderer ships with P10_sms in v1.8 · drops silently today)
  "entry_wedge",             // §08 · universal
  "channels",                // §09 · universal (already weights GBP + Yelp + paid Google search correctly)
  "matrix",                  // §10 · universal
  "landing",                 // §11 · universal (booking-form focused works)
  "rollout",                 // §12 · universal
  "partner_referrals",       // §13 NEW · NO RENDERER YET (replaces creators · realtors + property mgrs + contractors)
  "competitive",             // §14 · universal (against 1-800-GOT-JUNK, College Hunks, local operators)
  "trust_stack_audit",       // §15 NEW · NO RENDERER YET (local_services variant of brand_audit)
  "gbp_audit",               // §15b NEW · NO RENDERER YET (Google Business Profile · category, service area, photos)
  "demand",                  // §16 · universal (TOFU/MOFU/BOFU funnel concept transfers)
  "customer_quote_wall",     // §17 NEW · NO RENDERER YET (replaces tribe · real customer reviews instead of creators)
  "applied_playbooks",       // §18 · universal (Pass L)
  "methodology",             // §19 · universal
  "colophon",                // §20 · universal
];
// Total: 24 sections · 18 with existing renderers + 6 placeholders waiting for v1.8

export const BUSINESS_MODELS = {
  dtc_ecommerce: {
    id: "dtc_ecommerce",
    label: "DTC E-commerce",
    description: "Direct-to-consumer physical product brand sold via Shopify-class storefront",
    signals: ["physical product", "consumer", "shopify or woo", "paid social", "klaviyo", "review-driven"],
    is_supported: true,
    phase_target: null,
    pass_plan: DTC_PASS_PLAN,
    doc_sections: DTC_DOC_SECTIONS,
    persona_variant: "P7",
    library_priors: {
      priority_themes: [
        "Ad Creative Testing",
        "Ad Hook Design",
        "Paid Ads Strategy",
        "Email Marketing Tactics",
        "Review & Social Proof",
        "Influencer & Creator Marketing",
        "Content Hook Types",
        "Copywriting Frameworks",
        "Landing Page Design",
        "Conversion Rate Optimization",
        "Above-the-Fold Optimization",
      ],
      deprioritize: ["Cold Email Outreach"],
    },
  },

  b2b_saas: {
    id: "b2b_saas",
    label: "B2B SaaS",
    description: "Subscription software sold to companies via sales-led or product-led motion",
    signals: ["saas", "subscription", "enterprise", "self-serve trial", "sales team", "ICP", "ARR", "MRR"],
    is_supported: false,
    // 2026-05-27 · demoted from Phase 2 → Phase 6+ pool. User pivoted to
    // prioritize local_services (active junk-removal client). b2b_saas
    // gets its dedicated pass roster in the Phase 6+ bundle (after
    // marketplace + creator). Architecture support is unchanged · just
    // the phase ordering shifted.
    phase_target: 6,
    pass_plan: null,
    doc_sections: null,
    persona_variant: null,
    library_priors: {
      priority_themes: [
        "Cold Email Outreach",
        "Content Strategy & Planning",
        "SEO & Organic Search",
        "AI Search Optimization",
        "Community-Led Growth",
        "Growth Loops & Flywheels",
        "Copywriting Frameworks",
        "Customer Research & Insights",
        "Messaging & Positioning",
      ],
      deprioritize: ["Influencer & Creator Marketing"],
    },
    not_yet_supported_message:
      "B2B SaaS gets its own fully-built pass roster in the Phase 6+ pool (ICPs, buying committee mapping, ABM tiering, sales enablement, pricing positioning). Generating a DTC-shaped doc for a SaaS brand would produce wrong-shape output, so it is blocked by default. Override below only if you understand the fit gap. (Cold-email drafting is explicitly NOT in scope for any phase · see <vault>/13 - Roadmap for the 2026-05-21 scope decision.)",
  },

  b2b_services: {
    id: "b2b_services",
    label: "B2B Services / Agency",
    description: "Done-for-you or done-with-you services sold to companies (consulting, agency, fractional)",
    signals: ["agency", "consulting", "services", "retainer", "engagement", "case studies"],
    is_supported: false,
    phase_target: 3,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: [
        "Customer Research & Insights",
        "Content Strategy & Planning",
        "SEO & Organic Search",
        "Cold Email Outreach",
        "Messaging & Positioning",
        "Brand Identity & Story",
        "Review & Social Proof",
      ],
      deprioritize: [],
    },
    not_yet_supported_message:
      "Services gets case-study production system, lead-gen mix (referral + cold + content + speaking), sales process, pricing model (retainer vs project vs value-based), and capacity planning in phase 3.",
  },

  two_sided_marketplace: {
    id: "two_sided_marketplace",
    label: "Two-Sided Marketplace",
    description: "Platform matching supply-side providers with demand-side buyers (Uber, Airbnb, Etsy class)",
    signals: ["marketplace", "supply side", "demand side", "liquidity", "take rate", "GMV"],
    is_supported: false,
    phase_target: 4,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: [
        "Growth Loops & Flywheels",
        "Platform-Specific Tactics",
        "Community-Led Growth",
        "Referral & Viral Programs",
        "Organic Social Growth",
      ],
      deprioritize: ["Cold Email Outreach"],
    },
    not_yet_supported_message:
      "Marketplaces get supply/demand persona splits, liquidity strategy, geographic launch sequencing, two flywheel diagrams, and balance-of-trade KPIs in phase 4.",
  },

  creator_personal_brand: {
    id: "creator_personal_brand",
    label: "Creator Personal Brand",
    description: "Audience-first brand monetized via courses, sponsorships, merch, paid newsletters",
    signals: ["creator", "personal brand", "audience", "newsletter", "course", "patreon"],
    is_supported: false,
    phase_target: 5,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: [
        "Organic Social Growth",
        "Content Strategy & Planning",
        "Content Hook Types",
        "Video Content Production",
        "Growth Loops & Flywheels",
        "AI Content Creation",
      ],
      deprioritize: ["Cold Email Outreach", "Paid Ads Strategy"],
    },
    not_yet_supported_message:
      "Creator brands get audience segmentation (lurker/sharer/super-fan/buyer), content engine, platform strategy, monetization stack, and growth-loop mechanics in phase 5.",
  },

  aggregator: {
    id: "aggregator",
    label: "Aggregator / Content Site",
    description: "Multi-source content site monetized via ads, affiliate, paid memberships",
    signals: ["aggregator", "directory", "review site", "affiliate", "SEO-first"],
    is_supported: false,
    phase_target: 6,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: ["SEO & Organic Search", "AI Search Optimization", "Content Strategy & Planning"],
      deprioritize: [],
    },
    not_yet_supported_message: "Aggregator pass variants ship in phase 6.",
  },

  subscription_consumer: {
    id: "subscription_consumer",
    label: "Consumer Subscription",
    description: "Recurring consumer service (streaming, subscription box, membership)",
    signals: ["subscription", "recurring", "monthly box", "membership", "retention", "churn"],
    is_supported: false,
    phase_target: 6,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: [
        "Email Marketing Tactics",
        "Review & Social Proof",
        "Paid Ads Strategy",
        "Customer Research & Insights",
        "Growth Loops & Flywheels",
      ],
      deprioritize: [],
    },
    not_yet_supported_message:
      "Consumer subscription pass variants (retention loops, win-back, churn cohorts) ship in phase 6.",
  },

  local_services: {
    id: "local_services",
    label: "Local Services",
    description: "Geographically-bounded service business sold to residential or commercial customers · trades, home services, food + beverage, professional services (junk removal, plumbing, HVAC, dental, restaurants, cleaning, lawn care, locksmith, movers)",
    signals: ["local", "geographic", "service area", "google business profile", "yelp", "reviews-driven", "phone-call-driven", "booking form", "service area", "uniformed crew", "bonded insured", "lead service ads", "LSA", "nextdoor"],
    // 2026-05-27 · promoted from Phase 6+ → Phase 2. User has active
    // junk-removal client tonight. Architecture supports immediate flip;
    // 6 dedicated pass renderers (sms_sequences, partner_referrals,
    // trust_stack_audit, gbp_audit, customer_quote_wall, local_personas)
    // are SPEC'D for v1.8 implementation. Until those renderers ship,
    // the corresponding 5 sections drop out of the strategy doc silently
    // — the user gets ~18 of 24 sections rendered correctly. That gap
    // IS the signal · drives implementation priority. Spec at
    // <vault>/18 - Local Services Phase Spec.md.
    is_supported: true,
    phase_target: null,
    pass_plan: LOCAL_SERVICES_PASS_PLAN,
    doc_sections: LOCAL_SERVICES_DOC_SECTIONS,
    persona_variant: "P7_local",
    partial_support: true,                // flag for diagnostic post-process · NEW v1.7.6
    partial_support_pending_sections: [
      "sms_sequences",
      "partner_referrals",
      "trust_stack_audit",
      "gbp_audit",
      "customer_quote_wall",
    ],
    library_priors: {
      priority_themes: [
        "Review & Social Proof",
        "SEO & Organic Search",
        "Brand Identity & Story",
        "Conversion Rate Optimization",
        "Above-the-Fold Optimization",
        "Customer Research & Insights",
        "Referral & Viral Programs",
        "Persuasion Principles",          // Cialdini · Authority + Scarcity + Social Proof especially clutch for local
        "Paid Ads Strategy",              // Google search + LSAs is the primary paid surface
        "Email Marketing Tactics",        // post-job nurture + seasonal · NOT cold outreach
        "Landing Page Design",
        "Copywriting Frameworks",
      ],
      deprioritize: [
        "Cold Email Outreach",            // B2C residential customers don't get cold-emailed
        "Influencer & Creator Marketing", // creators are irrelevant for local services
        "AI Search Optimization",         // too forward-looking for most local operators
        "Ad Creative Testing",            // local ads are simpler · less creative testing variety
      ],
    },
  },

  hardware_b2b: {
    id: "hardware_b2b",
    label: "Hardware B2B",
    description: "Physical products sold to businesses (industrial, medical devices, manufacturing tools)",
    signals: ["hardware", "device", "industrial", "OEM", "long sales cycle"],
    is_supported: false,
    phase_target: 6,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: [
        "Customer Research & Insights",
        "Content Strategy & Planning",
        "SEO & Organic Search",
        "Cold Email Outreach",
      ],
      deprioritize: ["Influencer & Creator Marketing"],
    },
    not_yet_supported_message: "Hardware B2B pass variants ship in phase 6.",
  },

  healthcare_regulated: {
    id: "healthcare_regulated",
    label: "Healthcare (Regulated)",
    description: "Healthcare brand operating under HIPAA / FDA / clinical-claims constraints",
    signals: ["healthcare", "HIPAA", "FDA", "clinical", "patient", "physician"],
    is_supported: false,
    phase_target: 6,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: [
        "Brand Identity & Story",
        "Customer Research & Insights",
        "Content Strategy & Planning",
        "Review & Social Proof",
      ],
      deprioritize: ["Paid Ads Strategy"],
    },
    not_yet_supported_message:
      "Regulated healthcare gets compliance-aware variants (claims discipline, IRB pathways, HCP comms) in phase 6.",
  },

  fintech_regulated: {
    id: "fintech_regulated",
    label: "Fintech (Regulated)",
    description: "Financial services brand under SEC / state-banking / FINRA constraints",
    signals: ["fintech", "banking", "lending", "investing", "regulated", "compliance"],
    is_supported: false,
    phase_target: 6,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: [
        "Brand Identity & Story",
        "Customer Research & Insights",
        "Messaging & Positioning",
      ],
      deprioritize: [],
    },
    not_yet_supported_message: "Regulated fintech pass variants (claims discipline, disclosure copy patterns) ship in phase 6.",
  },
};

export const DEFAULT_BUSINESS_MODEL = "dtc_ecommerce";

export function resolveBusinessModel(id) {
  return BUSINESS_MODELS[id] || BUSINESS_MODELS[DEFAULT_BUSINESS_MODEL];
}

export function isSupported(id) {
  return Boolean(BUSINESS_MODELS[id]?.is_supported);
}

export function listSupported() {
  return Object.values(BUSINESS_MODELS).filter((bm) => bm.is_supported);
}

export function listUnsupported() {
  return Object.values(BUSINESS_MODELS).filter((bm) => !bm.is_supported);
}

export function getControlledVocabulary() {
  return Object.keys(BUSINESS_MODELS);
}

// ─────────────────────────────────────────────────────────────
// DEV-only sanity check: every entry has either (pass_plan AND
// doc_sections) OR is_supported === false. Run once at module load
// in dev mode.
// ─────────────────────────────────────────────────────────────
if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
  Object.values(BUSINESS_MODELS).forEach((bm) => {
    if (bm.is_supported) {
      console.assert(Array.isArray(bm.pass_plan) && bm.pass_plan.length > 0,
        `[business-models] supported archetype "${bm.id}" missing pass_plan`);
      console.assert(Array.isArray(bm.doc_sections) && bm.doc_sections.length > 0,
        `[business-models] supported archetype "${bm.id}" missing doc_sections`);
    } else {
      console.assert(bm.phase_target && typeof bm.phase_target === "number",
        `[business-models] unsupported archetype "${bm.id}" missing phase_target`);
      console.assert(typeof bm.not_yet_supported_message === "string" && bm.not_yet_supported_message.length > 30,
        `[business-models] unsupported archetype "${bm.id}" missing not_yet_supported_message`);
    }
    console.assert(bm.library_priors && Array.isArray(bm.library_priors.priority_themes),
      `[business-models] "${bm.id}" missing library_priors.priority_themes`);
  });
}
