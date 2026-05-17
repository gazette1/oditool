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
  "P5", "P7", "P8", "P8_5", "P8_6",         // creative + imagery + ad recreations
  "P9", "P10",                              // scripts + email
  "P11", "P12", "P13", "P14",               // operational
  "P15", "P16", "P17", "P18",               // strategic + audit + demand + tribe
  "PL",                                     // applied playbooks (vault)
];

const DTC_DOC_SECTIONS = [
  "strategic_context",       // §00 (v1.7.0)
  "positioning",             // §01
  "evidence",                // §02
  "value_prop",              // §03
  "personas",                // §04
  "swipe_file",              // §05
  "ad_recreations",          // §06 NEW v1.7.3 · real ads + recreation prompts
  "scripts",                 // §07
  "email_flows",             // §08
  "entry_wedge",             // §09
  "channels",                // §10
  "matrix",                  // §11
  "landing",                 // §12
  "rollout",                 // §13
  "creators",                // §14
  "competitive",             // §15
  "brand_audit",             // §16
  "demand",                  // §17
  "tribe",                   // §18
  "applied_playbooks",       // §19
  "methodology",             // §20
  "colophon",                // §21
];

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
    phase_target: 2,
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
      "B2B SaaS gets its own fully-built pass roster in phase 2 (ICPs, buying committee mapping, cold-email sequences, ABM tiering, sales enablement, pricing positioning). Generating a DTC-shaped doc for a SaaS brand would produce wrong-shape output, so it is blocked by default. Override below only if you understand the fit gap.",
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
    description: "Geographically-bounded service business (plumbers, dentists, restaurants)",
    signals: ["local", "geographic", "service area", "google business profile", "reviews-driven"],
    is_supported: false,
    phase_target: 6,
    pass_plan: null,
    doc_sections: null,
    library_priors: {
      priority_themes: ["Review & Social Proof", "SEO & Organic Search", "Brand Identity & Story"],
      deprioritize: ["Cold Email Outreach"],
    },
    not_yet_supported_message: "Local services pass variants (GBP optimization, review engine, neighborhood mix) ship in phase 6.",
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
