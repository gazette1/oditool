// src/lib/compose-strategy.js
//
// Engine v1.7.0 — Strategy Doc Composer.
//
// Section order now driven by `diagnostic.business_model.doc_sections`
// instead of a hardcoded chain. TOTAL_SECTIONS closes Known Issue #3
// (hardcoded /N section numbering). New §00 Strategic Context (Pass D)
// and §-near-end Applied Playbooks (Pass L). DTC archetype = 21
// sections total · v5 reference parity.
// Takes the full set of pass outputs + Pass 0 context and returns a
// self-contained HTML document matching the v5 strategy-doc template.
//
// Color palette (v1.6.4 · moss-and-brick · coolors.co/palette/386641-6a994e-a7c957-f2e8cf-bc4749):
//   --moss-deep  #386641  primary accent · borders, tags, win-states
//   --moss-mid   #6a994e  secondary text · section labels, citations
//   --moss-light #a7c957  light highlight · gradients, soft accents
//   --moss-lime  #a7c957  bright highlight (alias)
//   --bg-warm    #f2e8cf  cream paper background
//   --bg-card    #f7ecda  card-tinted variant
//   --brick      #bc4749  underserved / error / lose-states
//
// Palette is engine-wide default. To customize per project, fork the
// TOKENS string at runtime and pass `customTokens` into composeStrategyDoc.
// (Per-project palette override is a v1.7+ enhancement — not yet wired.)
//
// Input shape:
//   {
//     project_name, project_context,
//     positioning (Pass 4 positioning_spine),
//     personas (Pass 7 array),
//     mergedJobs (Pass 1+2 merged),
//     valueProp (Pass 5 comparisons array),
//     swipeFile (Pass 8 array),
//     scripts (Pass 9 array),
//     emailFlows (Pass 10 array),
//     recommendations (Pass 4 recommendations),
//   }

const TOKENS = `
:root {
  --moss-light: #a7c957; --moss-deep: #386641; --moss-mid: #6a994e; --moss-lime: #a7c957;
  --bg-base: #FFFFFF; --bg-warm: #f2e8cf; --bg-card: #f7ecda; --brick: #bc4749;
  --ink-primary: #2C2422; --ink-secondary: #5a6b5d; --ink-muted: #9aa68f;
  --enter: cubic-bezier(0.16, 1, 0.3, 1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg-warm);color:var(--ink-primary);font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:13px;line-height:1.75;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
.display-xl{font-family:"DM Serif Display",serif;font-weight:400;font-size:clamp(48px,9vw,96px);line-height:1.0;letter-spacing:-0.02em}
.display-lg{font-family:"DM Serif Display",serif;font-weight:400;font-size:clamp(36px,5vw,56px);line-height:1.05;letter-spacing:-0.015em}
.display{font-family:"DM Serif Display",serif;font-weight:400;font-size:32px;line-height:1.1;letter-spacing:-0.01em}
.h2{font-family:"DM Serif Display",serif;font-weight:400;font-size:22px;line-height:1.25}
.h3{font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-secondary)}
.body-lg{font-size:16px;line-height:1.7}
.caption{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-secondary)}
em,.italic{font-style:italic;font-family:"Cormorant Garamond",serif;font-weight:300}
.container{max-width:1100px;margin:0 auto;padding:0 32px}
.section{padding:112px 0}
.hairline{height:1px;background:var(--ink-muted);opacity:.3}
.section-tag-row{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:48px;flex-wrap:wrap;gap:12px}
.section-name{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid)}
.section-number{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.wordmark{font-family:"DM Serif Display",serif;font-weight:400;font-size:28px;letter-spacing:0.04em;background:linear-gradient(110deg,var(--moss-deep),var(--moss-light),var(--moss-lime));-webkit-background-clip:text;background-clip:text;color:transparent}
nav.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(20px);border-bottom:1px solid rgba(106,153,78,.3)}
nav.top .container{height:64px;display:flex;align-items:center;justify-content:space-between;gap:24px}
/* v1.7.1 · nav-links area scrolls horizontally on narrow viewports
   instead of wrapping ugly. The wordmark stays anchored left. */
nav.top .nav-links{flex:1;display:flex;gap:24px;font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-secondary);overflow-x:auto;overflow-y:hidden;white-space:nowrap;scrollbar-width:thin;justify-content:flex-end;padding:8px 0}
nav.top .nav-links::-webkit-scrollbar{height:3px}
nav.top .nav-links::-webkit-scrollbar-thumb{background:rgba(106,153,78,.4);border-radius:2px}
nav.top .nav-links a{flex-shrink:0;padding:4px 0;transition:color .15s var(--enter)}
nav.top .nav-links a:hover{color:var(--moss-deep)}
.cover{padding:120px 0 96px;background:radial-gradient(ellipse at 80% 20%,rgba(167,201,87,.25),transparent 50%),radial-gradient(ellipse at 20% 80%,rgba(56,102,65,.18),transparent 50%),var(--bg-base)}
.cover-tag{display:flex;align-items:center;gap:16px;margin-bottom:32px;flex-wrap:wrap}
.cover-tag .doc-num{padding:6px 14px;border:1px solid var(--moss-mid);border-radius:999px;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-secondary)}
.cover-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:64px;padding-top:32px;border-top:1px solid rgba(106,153,78,.4)}
@media (max-width:720px){.cover-meta{grid-template-columns:1fr 1fr}}
.cover-meta-item{transition:transform .18s var(--enter), opacity .18s var(--enter);cursor:pointer}
.cover-meta-item:hover{transform:translateY(-2px);opacity:.82}
.cover-meta-item .label{font-size:9px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:8px}
.cover-meta-item .value{font-family:"DM Serif Display",serif;font-size:20px;line-height:1.2;color:var(--ink-primary)}
.position-primary{background:linear-gradient(135deg,var(--bg-card),var(--bg-base));border:2px solid var(--moss-deep);border-radius:16px;padding:56px 40px;margin-top:32px;position:relative}
.position-primary .tag{position:absolute;top:-12px;left:32px;background:var(--moss-deep);color:var(--ink-primary);padding:4px 12px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.position-primary .claim{font-family:"DM Serif Display",serif;font-size:clamp(28px,4.5vw,44px);line-height:1.1;letter-spacing:-0.015em;margin-bottom:24px}
.citation{display:inline-flex;align-items:center;gap:12px;padding:8px 16px;background:rgba(56,102,65,.15);border-radius:6px;font-size:12px}
.citation .score{font-family:"DM Serif Display",serif;font-size:18px;color:var(--moss-mid)}
.position-primary .rationale{margin-top:24px;font-size:14px;line-height:1.65;max-width:680px}
.position-alt{background:var(--bg-base);border:1px solid rgba(106,153,78,.4);border-radius:12px;padding:32px;margin-top:16px}
.position-alt .alt-tag{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:12px}
.position-alt .claim{font-family:"DM Serif Display",serif;font-size:24px;line-height:1.2;margin-bottom:16px}
.position-alt .citation{background:var(--bg-warm);padding:6px 12px;font-size:11px;color:var(--ink-secondary)}
.position-alt .citation .score{font-size:16px}
.position-alt .rationale{margin-top:16px;font-size:13px;line-height:1.6;color:var(--ink-secondary)}
.ev-table,.vp-table{margin-top:32px;background:var(--bg-base);border-radius:12px;overflow:hidden;border:1px solid rgba(106,153,78,.3)}
/* v1.8.1 · §05 Evidence font sizes bumped per user feedback ·
   was 12px row / 13px ulwick · now 14px row / 16px ulwick · easier
   to read at arm's length when scanning the underserved-outcome list */
.ev-row{display:grid;grid-template-columns:60px 1fr 80px 80px 90px;gap:18px;padding:22px 26px;border-bottom:1px solid rgba(106,153,78,.25);align-items:start;font-size:14px}
.ev-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.ev-row .job-id{font-family:"DM Serif Display",serif;font-size:24px;color:var(--moss-mid)}
.ev-row .num,.ev-row .opp{font-family:"DM Serif Display",serif;font-size:22px}
.ev-row .opp{font-size:26px;font-weight:500}
.ev-row.underserved .opp{color:#bc4749}
.ev-row .anchor-quote{grid-column:2/-1;margin-top:8px;padding:10px 14px;background:var(--bg-card);border-left:2px solid var(--moss-deep);border-radius:0 4px 4px 0;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:15px}
.ev-row .outcome .ulwick{display:block;margin-top:8px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:16px;color:var(--ink-primary);line-height:1.5}
@media (max-width:720px){.ev-row,.ev-row.head{grid-template-columns:1fr;gap:6px}.ev-row.head{display:none}}
/* v1.8.1 · §06 Value-prop fixes · was 140px name column with long
   URLs overflowing into the quote column · now 180px wide-enough
   name column + word-break:break-all on .meta + min-width:0 on
   children so grid actually respects column widths */
.vp-row{display:grid;grid-template-columns:180px 1.8fr 1fr 1fr 1.4fr;gap:18px;padding:22px 26px;border-bottom:1px solid rgba(106,153,78,.25);align-items:start;font-size:13px;line-height:1.6}
.vp-row > *{min-width:0;overflow-wrap:anywhere}
.vp-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.vp-row.brand{background:rgba(56,102,65,.08);border-left:3px solid var(--moss-deep)}
.vp-row .name{font-family:"DM Serif Display",serif;font-size:17px;line-height:1.25}
.vp-row .name .meta{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:500;letter-spacing:0.06em;color:var(--ink-muted);margin-top:6px;word-break:break-all;line-height:1.4}
.vp-row .quote{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:14px;line-height:1.55}
@media (max-width:720px){.vp-row,.vp-row.head{grid-template-columns:1fr;gap:6px}.vp-row.head{display:none}}
.persona{display:grid;grid-template-columns:280px 1fr;gap:48px;padding:40px 0;border-top:1px solid rgba(106,153,78,.4)}
.persona:last-of-type{border-bottom:1px solid rgba(106,153,78,.4)}
@media (max-width:720px){.persona{grid-template-columns:1fr;gap:24px}}
.persona-avatar{aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:"DM Serif Display",serif;font-size:80px;color:rgba(44,36,34,.7)}
.persona-body .number{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:8px}
.persona-body .name{font-family:"DM Serif Display",serif;font-size:32px;line-height:1.1;margin-bottom:4px}
.persona-body .one-liner{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:17px;color:var(--ink-secondary);margin-bottom:24px}
.persona-fields{display:grid;grid-template-columns:140px 1fr;gap:12px 24px;margin-top:16px}
.persona-fields .pf-label{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);padding-top:4px}
.persona-fields .pf-value{font-size:13px;line-height:1.65;padding-bottom:14px;border-bottom:1px solid rgba(106,153,78,.25)}
.persona-fields .pf-value .handle-chip{display:inline-block;margin:2px 4px 2px 0;padding:2px 9px;background:var(--bg-warm);border-radius:3px;font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:500;color:var(--ink-secondary);letter-spacing:0.02em;border:1px solid rgba(106,153,78,.2)}
.swipe-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:32px}
@media (max-width:720px){.swipe-grid{grid-template-columns:1fr}}
.swipe-card{background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.swipe-card .ad-mock{aspect-ratio:4/5;display:flex;align-items:flex-end;padding:24px;position:relative;background:linear-gradient(135deg,var(--moss-light),var(--moss-deep))}
.swipe-card .ad-mock::before{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(44,36,34,.55) 100%)}
.swipe-card .ad-format-tag{position:absolute;top:14px;left:14px;z-index:2;font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:3px 8px;background:rgba(255,255,255,.85);color:var(--ink-primary);border-radius:3px}
.swipe-card .ad-headline{position:relative;z-index:2;font-family:"DM Serif Display",serif;color:#FFF;font-size:20px;line-height:1.15;text-shadow:0 2px 8px rgba(44,36,34,.4)}
.swipe-card .ad-body{padding:20px 24px 24px;display:flex;flex-direction:column;flex:1}
.swipe-card .ad-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.swipe-card .ad-chip{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;padding:3px 8px;border-radius:3px;background:var(--bg-warm);color:var(--ink-secondary)}
.swipe-card .ad-chip.persona{background:rgba(56,102,65,.2);color:#7a2c2e}
.swipe-card .ad-id{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px}
.swipe-card .ad-title{font-family:"DM Serif Display",serif;font-size:18px;line-height:1.25;margin-bottom:12px}
.swipe-card .ad-copy{font-size:12.5px;line-height:1.65;margin-bottom:14px}
/* v1.9.0 · ad-source · "Based on real running ad" reference block ·
   surfaces source_brand + source_url + source_pattern_summary so the
   reader can click through to see the original ad in the wild before
   adapting. The adapted_headline/body/cta in the card are ORIGINAL
   brand-voice creative · not paraphrases of source ad copy. */
.swipe-card .ad-source{margin-top:14px;padding:10px 12px;background:var(--bg-warm);border-left:3px solid var(--moss-mid);border-radius:0 6px 6px 0;font-family:"IBM Plex Mono",monospace;font-size:10px;line-height:1.55;color:var(--ink-secondary);word-break:break-word;overflow-wrap:anywhere}
.swipe-card .ad-source strong{color:var(--moss-deep);font-weight:600}
.swipe-card .ad-source-pattern{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:11.5px;color:var(--ink-primary);display:inline-block;margin-top:3px}
.swipe-card .ad-source-url{display:inline-block;margin-top:3px;color:var(--moss-deep);text-decoration:underline;font-size:9.5px;word-break:break-all}
/* v1.10.0 · validator + vision chips on swipe cards · only render when the
   underlying data is present (Foreplay-sourced + Pass 8.4 vision analyzed) */
.swipe-card .ad-validator{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;font-family:"IBM Plex Mono",monospace;font-size:9px;line-height:1.3}
.swipe-card .v-chip{display:inline-block;padding:3px 8px;border-radius:3px;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;color:#2a3328}
.swipe-card .v-chip.platform{background:rgba(56,102,65,0.12);color:var(--moss-deep)}
.swipe-card .v-chip.verdict-canonical{background:rgba(56,102,65,0.22);color:#1f3a26}
.swipe-card .v-chip.verdict-strong{background:rgba(167,201,87,0.28);color:#2a4a30}
.swipe-card .v-chip.verdict-moderate{background:rgba(200,164,92,0.22);color:#7a5e1e}
.swipe-card .v-chip.verdict-weak{background:rgba(188,71,73,0.15);color:#7a2c2e}
.swipe-card .v-chip.duration{background:var(--bg-warm);color:var(--ink-secondary)}
.swipe-card .ad-vision{margin-top:8px;padding:8px 10px;background:rgba(167,201,87,0.08);border-left:3px solid var(--moss-light);border-radius:0 4px 4px 0;font-family:"IBM Plex Mono",monospace;font-size:9.5px;line-height:1.45;color:var(--ink-secondary)}
.swipe-card .ad-vision strong{color:var(--moss-deep);font-weight:600}
.swipe-card .ad-vision .v-prompt{display:block;margin-top:4px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:11px;color:var(--ink-primary);word-break:break-word}
.swipe-card .ad-footer{margin-top:auto;padding-top:14px;border-top:1px solid rgba(106,153,78,.3);display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px}
.swipe-card .ad-footer .label{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:2px}
.script{background:var(--bg-base);border-radius:12px;padding:32px;margin-bottom:24px;border:1px solid rgba(106,153,78,.3)}
.script-header{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:16px;border-bottom:1px solid rgba(106,153,78,.3);margin-bottom:20px;gap:16px;flex-wrap:wrap}
.script-title{font-family:"DM Serif Display",serif;font-size:22px;line-height:1.2}
.script-meta{display:flex;gap:6px;flex-wrap:wrap}
.script-meta .chip{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:4px 10px;background:rgba(44,36,34,.85);color:#FBF7F4;border-radius:4px}
.script-meta .chip.persona{background:rgba(56,102,65,.25);color:#7a2c2e}
.script-hook{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:17px;color:var(--ink-secondary);margin-bottom:20px}
.shot-row{display:grid;grid-template-columns:64px 80px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid rgba(106,153,78,.2)}
.shot-row:last-child{border-bottom:0}
.shot-time{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--moss-mid);letter-spacing:0.08em}
.shot-cue{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);padding-top:2px}
.shot-detail{font-size:13px;line-height:1.55}
.shot-detail .ost,.shot-detail .vo{display:block;margin-top:6px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary)}
.script-notes{margin-top:16px;padding-top:16px;border-top:1px solid rgba(106,153,78,.3);display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
@media (max-width:720px){.script-notes{grid-template-columns:1fr}}
.script-notes .note .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:4px}
.script-notes .note .val{font-size:11px;line-height:1.5}
.email-flow{background:var(--bg-base);border-radius:12px;padding:32px;margin-bottom:24px;border:1px solid rgba(106,153,78,.3)}
.email-flow-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.email-flow-name{font-family:"DM Serif Display",serif;font-size:24px}
.email-flow-trigger{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);padding:6px 12px;background:var(--bg-card);border-radius:4px}
.email-flow-desc{font-size:13px;line-height:1.65;color:var(--ink-secondary);margin-bottom:24px}
.email-card{background:var(--bg-warm);border-left:3px solid var(--moss-deep);border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:14px}
.email-card .email-when{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:6px}
.email-card .email-subject{font-family:"DM Serif Display",serif;font-size:18px;margin-bottom:4px;line-height:1.25}
.email-card .email-preview{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary);margin-bottom:14px}
.email-card .email-body{font-size:13px;line-height:1.75;white-space:pre-line}
.email-card .email-cta{display:inline-block;margin-top:14px;padding:8px 16px;background:var(--ink-primary);color:var(--bg-base);font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.channel-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:24px}
@media (max-width:720px){.channel-grid{grid-template-columns:1fr}}
.channel-card{background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:10px;padding:20px 22px}
.channel-card .ch-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:12px}
.channel-card .ch-name{font-family:"DM Serif Display",serif;font-size:18px;line-height:1.2}
.channel-card .ch-budget{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--moss-mid);background:var(--bg-card);padding:3px 8px;border-radius:4px;white-space:nowrap}
.channel-card .ch-role{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary);margin-bottom:12px}
.channel-card .ch-row{display:grid;grid-template-columns:80px 1fr;gap:10px;padding:6px 0;border-top:1px solid rgba(106,153,78,.2);font-size:12px;line-height:1.5}
.channel-card .ch-row .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);padding-top:2px}
.matrix-table{margin-top:24px;background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:12px;overflow:hidden}
.matrix-row{display:grid;grid-template-columns:120px 110px 1.4fr 1fr 90px;gap:14px;padding:16px 22px;border-bottom:1px solid rgba(106,153,78,.25);font-size:12px;line-height:1.5;align-items:start}
.matrix-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.matrix-row .pname{font-family:"DM Serif Display",serif;font-size:14px;line-height:1.2}
.matrix-row .cname{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.12em;color:var(--moss-mid)}
.matrix-row .share{font-family:"DM Serif Display",serif;font-size:18px;color:var(--moss-mid);text-align:right}
.matrix-row .tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.matrix-row .tags .tag{font-family:"IBM Plex Mono",monospace;font-size:9px;background:var(--bg-warm);padding:2px 6px;border-radius:3px;color:var(--ink-secondary)}
@media (max-width:720px){.matrix-row,.matrix-row.head{grid-template-columns:1fr;gap:6px}.matrix-row.head{display:none}}
.landing-variant{background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:12px;padding:32px;margin-bottom:20px}
.landing-variant .lp-head{display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.landing-variant .lp-id{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;color:var(--moss-mid)}
.landing-variant .lp-slug{font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-muted)}
.landing-variant .lp-hero{padding:24px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:10px;margin-bottom:16px}
.landing-variant .lp-hero h3{font-family:"DM Serif Display",serif;font-size:26px;line-height:1.15;margin-bottom:8px}
.landing-variant .lp-hero p{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:15px;color:var(--ink-secondary);margin-bottom:14px}
.landing-variant .lp-cta-pill{display:inline-block;padding:8px 16px;background:var(--ink-primary);color:var(--bg-base);font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.landing-variant .lp-proof{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.landing-variant .lp-proof span{font-family:"IBM Plex Mono",monospace;font-size:9px;background:rgba(56,102,65,.15);color:var(--ink-secondary);padding:4px 10px;border-radius:3px;letter-spacing:0.08em}
.landing-variant .lp-section{padding:12px 0;border-top:1px solid rgba(106,153,78,.25)}
.landing-variant .lp-section .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px}
.landing-variant .lp-section h4{font-family:"DM Serif Display",serif;font-size:17px;margin-bottom:6px;line-height:1.25}
.landing-variant .lp-section p{font-size:12.5px;line-height:1.6}
.landing-variant .lp-foot{margin-top:18px;padding-top:14px;border-top:1px solid rgba(106,153,78,.3);display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:11px}
.landing-variant .lp-foot .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:3px}
.phase-card{background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:12px;padding:32px;margin-bottom:20px;position:relative}
.phase-card .ph-tag{position:absolute;top:-12px;left:24px;background:var(--moss-deep);color:var(--ink-primary);padding:4px 12px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.phase-card .ph-head{display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:10px;margin-top:8px}
.phase-card .ph-theme{font-family:"DM Serif Display",serif;font-size:24px;line-height:1.2}
.phase-card .ph-budget{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--moss-mid);background:var(--bg-card);padding:4px 10px;border-radius:4px}
.phase-card .ph-obj{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:15px;color:var(--ink-secondary);margin-bottom:18px}
.phase-card .ph-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:16px}
@media (max-width:720px){.phase-card .ph-grid{grid-template-columns:1fr}}
.phase-card .ph-grid .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px}
.phase-card .ph-grid ul{margin-left:0;list-style:none;font-size:12.5px;line-height:1.65}
.phase-card .ph-grid li{padding:2px 0}
.phase-card .ph-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
@media (max-width:720px){.phase-card .ph-kpis{grid-template-columns:1fr}}
.phase-card .ph-kpi{background:var(--bg-warm);border-radius:6px;padding:10px 14px}
.phase-card .ph-kpi .m{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.phase-card .ph-kpi .t{font-family:"DM Serif Display",serif;font-size:17px;margin-top:4px}
.phase-card .ph-gate{padding:12px 16px;background:rgba(56,102,65,.12);border-left:3px solid var(--moss-deep);border-radius:0 6px 6px 0;font-size:12.5px;line-height:1.55}
.phase-card .ph-gate strong{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:4px}
.cadence-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
@media (max-width:720px){.cadence-grid{grid-template-columns:1fr}}
.cadence-col{background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:12px;padding:24px}
.cadence-col .h{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:14px}
.cadence-col ul{margin-left:0;list-style:none}
.cadence-col li{padding:8px 0;border-bottom:1px solid rgba(106,153,78,.25);font-size:12.5px;line-height:1.55}
.cadence-col li:last-child{border-bottom:0}
.creator-card{background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:12px;padding:32px;margin-bottom:20px;position:relative}
.creator-card .cr-tag{position:absolute;top:-12px;left:24px;background:var(--moss-lime);color:var(--ink-primary);padding:4px 12px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.creator-card .cr-head{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:baseline;margin-top:8px;margin-bottom:14px}
.creator-card .cr-arch{font-family:"DM Serif Display",serif;font-size:22px;line-height:1.2}
.creator-card .cr-arch .platform{display:block;font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;color:var(--moss-mid);margin-top:6px}
.creator-card .cr-persona{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--moss-mid);background:rgba(56,102,65,.15);padding:4px 10px;border-radius:4px;white-space:nowrap}
.creator-card .cr-fit{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:14px;color:var(--ink-secondary);margin-bottom:18px;line-height:1.6}
.creator-card .cr-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
@media (max-width:720px){.creator-card .cr-grid{grid-template-columns:1fr}}
.creator-card .cr-block .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px}
.creator-card .cr-block p,.creator-card .cr-block ul{font-size:12.5px;line-height:1.65}
.creator-card .cr-block ul{margin-left:0;list-style:none}
.creator-card .cr-block li{padding:3px 0;border-bottom:1px solid rgba(106,153,78,.2)}
.creator-card .cr-block li:last-child{border-bottom:0}
.creator-card .cr-concept{padding:16px 20px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:10px;margin-bottom:18px}
.creator-card .cr-concept .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px}
.creator-card .cr-concept p{font-size:13.5px;line-height:1.65}
.creator-card .cr-deliv{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.creator-card .cr-deliv .chip{font-family:"IBM Plex Mono",monospace;font-size:10px;background:var(--bg-warm);color:var(--ink-secondary);padding:5px 10px;border-radius:4px;border:1px solid rgba(106,153,78,.3)}
.creator-card .cr-dosdont{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
@media (max-width:720px){.creator-card .cr-dosdont{grid-template-columns:1fr}}
.creator-card .cr-do,.creator-card .cr-dont{padding:12px 14px;border-radius:8px}
.creator-card .cr-do{background:rgba(34,197,94,.06);border-left:3px solid #386641}
.creator-card .cr-dont{background:rgba(239,68,68,.06);border-left:3px solid #bc4749}
.creator-card .cr-do .lbl{color:#2a4a30}
.creator-card .cr-dont .lbl{color:#7a2c2e}
.creator-card .cr-dm{padding:18px 22px;background:var(--bg-warm);border-left:3px solid var(--moss-deep);border-radius:0 8px 8px 0;font-family:"Cormorant Garamond",serif;font-size:14px;line-height:1.7;color:var(--ink-primary);white-space:pre-line;margin-bottom:14px}
.creator-card .cr-dm .lbl{display:block;font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:8px}
.creator-card .cr-foot{padding-top:14px;border-top:1px solid rgba(106,153,78,.3);display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
@media (max-width:720px){.creator-card .cr-foot{grid-template-columns:1fr}}
.creator-card .cr-foot .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:4px}
.creator-card .cr-foot .val{font-size:11.5px;line-height:1.5}
.comp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:32px}
@media (max-width:720px){.comp-grid{grid-template-columns:1fr}}
.comp-card{background:var(--bg-base);border:1px solid rgba(106,153,78,.3);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:14px}
.comp-card .cp-head{padding-bottom:12px;border-bottom:1px solid rgba(106,153,78,.25)}
.comp-card .cp-name{font-family:"DM Serif Display",serif;font-size:24px;line-height:1.15;margin-bottom:6px}
.comp-card .cp-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.comp-card .cp-meta .chip{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;padding:3px 9px;border-radius:4px;background:var(--bg-warm);color:var(--ink-secondary)}
.comp-card .cp-meta .chip.price{background:rgba(167,201,87,0.2);color:#2a4a30}
.comp-card .cp-promise{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:14px;line-height:1.55;color:var(--ink-primary)}
.comp-card .cp-promise::before{content:"\"";color:var(--moss-mid);margin-right:2px}
.comp-card .cp-promise::after{content:"\"";color:var(--moss-mid);margin-left:2px}
/* v1.8.1 · §19 Competitive · "Where we win:" / "Where we lose:" /
   "Wedge to attack:" / "First punch:" are now INLINE bold + colon
   per user feedback. The labels were previously block-displayed
   uppercase mini-caps · user found them harder to skim than a
   plain "**Bold label:** content" inline pattern. CSS revises all
   strong elements in the comp-card to be inline-bold ink color
   matching the section accent (moss for win, brick for lose). */
.comp-card .cp-creative{font-size:12.5px;line-height:1.6;color:var(--ink-primary)}
.comp-card .cp-creative strong{font-weight:700;color:var(--ink-primary)}
.comp-card .cp-winlose{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.comp-card .cp-win,.comp-card .cp-lose{padding:12px 14px;border-radius:6px;font-size:12.5px;line-height:1.6}
.comp-card .cp-win{background:rgba(34,197,94,0.08);border-left:3px solid #386641}
.comp-card .cp-lose{background:rgba(239,68,68,0.06);border-left:3px solid #bc4749}
.comp-card .cp-win strong{font-weight:700;color:#2a4a30}
.comp-card .cp-lose strong{font-weight:700;color:#7a2c2e}
.comp-card .cp-wedge{padding:12px 14px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-left:3px solid var(--moss-deep);border-radius:0 6px 6px 0;font-size:13px;line-height:1.65}
.comp-card .cp-wedge strong{font-weight:700;color:var(--moss-deep)}
.comp-card .cp-punch{padding:12px 14px;border:1px dashed rgba(106,153,78,0.5);border-radius:6px;font-size:12.5px;line-height:1.6;color:var(--ink-primary)}
.comp-card .cp-punch strong{font-weight:700;color:var(--ink-primary)}

/* ─────────────────────────────────────────────────────────────
   v1.8.1 · Unified table layout for §20-23 (Brand Audit · Demand ·
   Tribe · Methodology). User feedback: card grids were dense and
   hard to scan · tables surface the same data in a glanceable row
   structure that prints cleanly.
   ───────────────────────────────────────────────────────────── */
.engine-table{width:100%;background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:12px;overflow:hidden;margin-bottom:24px;font-size:13px;line-height:1.55;border-collapse:collapse}
.engine-table thead th{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);text-align:left;padding:14px 16px;border-bottom:1px solid rgba(106,153,78,0.3);vertical-align:bottom}
.engine-table tbody td{padding:14px 16px;border-bottom:1px solid rgba(106,153,78,0.18);vertical-align:top;overflow-wrap:anywhere;word-break:normal}
.engine-table tbody tr:last-child td{border-bottom:none}
.engine-table tbody tr:nth-child(even){background:rgba(106,153,78,0.03)}
.engine-table .cell-key{font-family:"DM Serif Display",serif;font-size:15px;line-height:1.3;color:var(--ink-primary)}
.engine-table .cell-mono{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:0.05em;color:var(--ink-secondary)}
.engine-table .cell-italic{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary);line-height:1.5}
.engine-table .pill-priority{display:inline-block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:3px 9px;border-radius:4px;white-space:nowrap}
.engine-table .pill-priority.high{background:rgba(188,71,73,0.15);color:#7a2c2e}
.engine-table .pill-priority.medium{background:rgba(167,201,87,0.2);color:#2a4a30}
.engine-table .pill-priority.low{background:var(--bg-warm);color:var(--ink-secondary)}
.engine-table .pill-priority.scrape{background:rgba(106,153,78,0.1);border:1px dashed rgba(106,153,78,0.5);color:var(--moss-deep)}
.engine-table .tier-chip{display:inline-block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:3px 9px;border-radius:4px;background:rgba(56,102,65,0.15);color:#2a4a30;white-space:nowrap}
.engine-table .tier-chip.t1{background:rgba(56,102,65,0.15);color:#2a4a30}
.engine-table .tier-chip.t2{background:rgba(167,201,87,0.2);color:#2a4a30}
.engine-table .tier-chip.t3{background:var(--bg-warm);color:var(--ink-secondary)}
.engine-table .tier-chip.aspirational{background:rgba(106,153,78,0.15);color:var(--moss-deep)}
.engine-table .unverified-tag{color:var(--brick);font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase}
.engine-table tbody td strong{font-weight:700;color:var(--ink-primary)}
@media (max-width:720px){.engine-table thead{display:none}.engine-table tbody td{display:block;padding:8px 14px;border-bottom:none}.engine-table tbody td::before{content:attr(data-label);display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px}.engine-table tbody tr{border-bottom:1px solid rgba(106,153,78,0.25);padding:14px 0;display:block}}
.engine-table-caption{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:14px;color:var(--ink-secondary);margin-bottom:12px;line-height:1.55}

/* v1.9.1 · PE-firm agenda / contents slide */
.toc-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 48px}
@media (max-width:720px){.toc-grid{grid-template-columns:1fr}}
.toc-row{display:flex;align-items:baseline;gap:16px;padding:11px 0;border-bottom:1px solid rgba(106,153,78,0.2)}
.toc-row .toc-num{font-family:"DM Serif Display",serif;font-size:20px;color:var(--moss-mid);min-width:34px;line-height:1}
.toc-row .toc-label{font-family:"DM Serif Display",serif;font-size:17px;color:var(--ink-primary);line-height:1.2}
.axis-summary{margin-top:48px;padding:32px;background:linear-gradient(135deg,var(--bg-base),var(--bg-card));border-radius:16px;border:2px solid var(--moss-deep);position:relative}
.axis-summary .as-tag{position:absolute;top:-14px;left:32px;background:var(--moss-deep);color:var(--ink-primary);padding:5px 14px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.axis-summary .as-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px;margin-bottom:20px}
@media (max-width:720px){.axis-summary .as-grid{grid-template-columns:1fr}}
.axis-summary .as-axis{padding:14px 16px;background:var(--bg-warm);border-radius:8px}
.axis-summary .as-axis .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px}
.axis-summary .as-axis .val{font-family:"DM Serif Display",serif;font-size:15px;line-height:1.3}
.axis-summary .as-position,.axis-summary .as-open{padding:14px 18px;margin-bottom:14px;border-radius:8px;font-size:13px;line-height:1.6}
.axis-summary .as-position{background:rgba(56,102,65,0.12)}
.axis-summary .as-open{background:rgba(106,153,78,0.1);border:1px solid rgba(106,153,78,0.3)}
.axis-summary .as-position .lbl,.axis-summary .as-open .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:4px}
.axis-summary .as-summary{font-family:"DM Serif Display",serif;font-size:clamp(20px,3vw,28px);line-height:1.2;text-align:center;padding:20px 16px;color:var(--ink-primary);background:var(--bg-base);border-radius:8px;margin-top:8px}
/* §15 · Brand Audit */
.audit-summary{padding:24px 28px;background:linear-gradient(135deg,var(--bg-card),var(--bg-base));border-radius:12px;border:1px solid rgba(106,153,78,0.3);font-family:"Cormorant Garamond",serif;font-style:italic;font-size:17px;line-height:1.55;margin-bottom:24px;color:var(--ink-primary)}
.audit-summary::before{content:"\\201C";color:var(--moss-mid);font-size:28px;line-height:0;vertical-align:-12px;margin-right:4px}
.audit-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-bottom:32px}
@media (max-width:720px){.audit-grid{grid-template-columns:1fr}}
.audit-card{background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px;padding:20px 22px;display:flex;flex-direction:column;gap:12px}
.audit-card .au-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-bottom:10px;border-bottom:1px solid rgba(106,153,78,0.15)}
.audit-card .au-name{font-family:"DM Serif Display",serif;font-size:18px;line-height:1.2}
.audit-card .au-priority{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:3px 9px;border-radius:4px}
.audit-card .au-priority.high{background:rgba(188,71,73,0.15);color:#7a2c2e}
.audit-card .au-priority.scrape{background:rgba(200,164,92,0.18);color:#5a4710}
.audit-card.no-visibility{border:1px dashed rgba(200,164,92,0.6);background:rgba(200,164,92,0.04)}
.audit-card .au-no-vis{padding:14px 16px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13.5px;line-height:1.55;color:#5a4710}
.audit-card .au-no-vis strong{display:block;font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#b8911c;margin-bottom:4px}
.audit-card .au-priority.medium{background:rgba(167,201,87,0.2);color:#2a4a30}
.audit-card .au-priority.low{background:var(--bg-warm);color:var(--ink-secondary)}
.audit-card .au-current{font-size:12.5px;line-height:1.6;color:var(--ink-primary)}
.audit-card .au-current strong{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px}
.audit-card .au-split{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.audit-card .au-works,.audit-card .au-breaks{padding:10px 12px;border-radius:6px;font-size:11.5px;line-height:1.55}
.audit-card .au-works{background:rgba(56,102,65,0.08);border-left:3px solid #386641}
.audit-card .au-breaks{background:rgba(188,71,73,0.06);border-left:3px solid var(--brick)}
.audit-card .au-works .lbl,.audit-card .au-breaks .lbl{display:block;font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:4px}
.audit-card .au-works .lbl{color:#2a4a30}
.audit-card .au-breaks .lbl{color:#7a2c2e}
.audit-card .au-fix{padding:10px 12px;border:1px dashed rgba(106,153,78,0.4);border-radius:6px;font-size:11.5px;line-height:1.6}
.audit-card .au-fix strong{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:4px}
.audit-card .au-fix .anchor{font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-muted);margin-left:6px}
.audit-bottom{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:8px}
@media (max-width:720px){.audit-bottom{grid-template-columns:1fr}}
.audit-voice,.audit-discover{padding:20px 24px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px}
.audit-voice h4,.audit-discover h4{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:14px}
.audit-voice .voice-score{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}
.audit-voice .voice-score .num{font-family:"DM Serif Display",serif;font-size:42px;line-height:1;color:var(--moss-deep)}
.audit-voice .voice-score .out{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--ink-muted)}
.audit-voice .voice-row{font-size:12px;line-height:1.55;padding:4px 0}
.audit-voice .voice-row .lbl{display:inline-block;width:90px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-muted)}
.audit-discover .dscore{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.audit-discover .dscore .pill{padding:8px 12px;border-radius:6px;background:var(--bg-warm);font-size:11px;line-height:1.4}
.audit-discover .dscore .pill .lbl{display:block;font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px}
.audit-discover .dscore .pill .val{font-family:"DM Serif Display",serif;font-size:16px}
.audit-discover .dscore .pill.good .val{color:#386641}
.audit-discover .dscore .pill.spotty .val{color:#9a7b1c}
.audit-discover .dscore .pill.weak .val{color:var(--brick)}
.audit-discover .dnotes{font-size:12px;line-height:1.6;color:var(--ink-secondary);font-style:italic;font-family:"Cormorant Garamond",serif}
/* §16 · Demand Landscape */
.dl-temp{padding:24px 28px;background:linear-gradient(135deg,var(--bg-card),var(--bg-base));border-left:4px solid var(--moss-deep);border-radius:0 12px 12px 0;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.dl-temp .temp-left .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:4px}
.dl-temp .temp-left .val{font-family:"DM Serif Display",serif;font-size:28px;line-height:1}
.dl-temp .temp-left .val.heating{color:var(--brick)}
.dl-temp .temp-left .val.stable{color:var(--moss-mid)}
.dl-temp .temp-left .val.cooling{color:var(--ink-secondary)}
.dl-temp .temp-evidence{flex:1;min-width:200px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:14px;line-height:1.55;color:var(--ink-primary)}
.dl-summary{padding:16px 22px;background:var(--bg-warm);border-radius:8px;margin-bottom:24px;font-size:14px;line-height:1.65}
.funnel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
@media (max-width:900px){.funnel-grid{grid-template-columns:1fr}}
.funnel-card{background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px;padding:20px 18px;display:flex;flex-direction:column;gap:12px}
.funnel-card .fn-stage{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);padding-bottom:6px;border-bottom:2px solid var(--moss-deep)}
.funnel-card .fn-intent{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;line-height:1.55;color:var(--ink-primary)}
.funnel-card .fn-kw-list{display:flex;flex-direction:column;gap:6px}
.funnel-card .fn-kw{padding:8px 10px;background:var(--bg-warm);border-radius:5px;font-size:11.5px;line-height:1.4}
.funnel-card .fn-kw .kw-text{font-family:"DM Serif Display",serif;font-size:13.5px;display:block;margin-bottom:3px}
.funnel-card .fn-kw .kw-meta{font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:0.08em;color:var(--ink-muted);display:flex;gap:8px;flex-wrap:wrap}
.funnel-card .fn-kw .kw-meta .v.high{color:#386641;font-weight:600}
.funnel-card .fn-kw .kw-meta .v.medium{color:#9a7b1c;font-weight:600}
.funnel-card .fn-kw .kw-meta .v.low{color:var(--ink-secondary)}
.funnel-card .fn-kw .kw-meta .c.high{color:var(--brick);font-weight:600}
.funnel-card .fn-kw .kw-meta .c.medium{color:#9a7b1c}
.funnel-card .fn-kw .kw-meta .c.low{color:#386641;font-weight:600}
.funnel-card .fn-kw .kw-wedge{display:block;margin-top:4px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:11.5px;color:var(--ink-secondary);line-height:1.5}
.funnel-card .fn-questions{display:flex;flex-wrap:wrap;gap:5px}
.funnel-card .fn-questions .q{font-family:"IBM Plex Mono",monospace;font-size:9.5px;background:var(--bg-warm);border:1px solid rgba(106,153,78,0.2);padding:3px 8px;border-radius:3px;color:var(--ink-secondary)}
.funnel-card .fn-block-lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-top:4px}
.whitespace-block,.seasonal-block{padding:24px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px;margin-bottom:18px}
.whitespace-block h4,.seasonal-block h4{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:14px}
.whitespace-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.ws-card{padding:14px 16px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:8px;font-size:12px;line-height:1.55}
.ws-card .ws-kw{font-family:"DM Serif Display",serif;font-size:16px;color:var(--moss-deep);margin-bottom:6px;display:block}
.ws-card .ws-why{margin-bottom:6px}
.ws-card .ws-test{font-style:italic;font-family:"Cormorant Garamond",serif;font-size:12.5px;color:var(--ink-secondary)}
.ws-card .ws-test strong{font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:2px}
.seasonal-list{display:flex;flex-direction:column;gap:10px}
.seasonal-row{display:grid;grid-template-columns:160px 90px 1fr;gap:14px;padding:12px 14px;background:var(--bg-warm);border-radius:6px;font-size:12px;line-height:1.55;align-items:start}
@media (max-width:720px){.seasonal-row{grid-template-columns:1fr;gap:6px}}
.seasonal-row .period{font-family:"DM Serif Display",serif;font-size:14px}
.seasonal-row .lift{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--moss-deep)}
.seasonal-row .play{color:var(--ink-secondary)}
/* §00 · Strategic Context (v1.7.0 · Pass D) */
.strat-ctx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:32px;margin-bottom:24px}
@media (max-width:720px){.strat-ctx-grid{grid-template-columns:1fr}}
.strat-ctx-tile{background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:10px;padding:20px 22px}
.strat-ctx-tile .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:6px}
.strat-ctx-tile .stage{font-family:"DM Serif Display",serif;font-size:28px;line-height:1;color:var(--moss-deep);margin-bottom:4px}
.strat-ctx-tile .stage-label{font-family:"DM Serif Display",serif;font-size:15px;line-height:1.2;color:var(--ink-primary);margin-bottom:8px}
.strat-ctx-tile .rationale{font-size:11.5px;line-height:1.55;color:var(--ink-secondary)}
.strat-ctx-archetype{padding:20px 24px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:12px;border:2px solid var(--moss-lime);margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.strat-ctx-archetype .archetype-pill{font-family:"DM Serif Display",serif;font-size:26px;background:var(--moss-lime);color:var(--ink-primary);padding:8px 20px;border-radius:999px;display:inline-block}
.strat-ctx-archetype .archetype-rationale{flex:1;min-width:200px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:14px;line-height:1.55;color:var(--ink-primary)}
.strat-ctx-journey{padding:18px 22px;background:var(--bg-warm);border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.strat-ctx-journey .from-state,.strat-ctx-journey .to-state{padding:10px 18px;background:var(--bg-base);border-radius:8px;flex:1;min-width:140px}
.strat-ctx-journey .from-state .lbl,.strat-ctx-journey .to-state .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px}
.strat-ctx-journey .from-state .val,.strat-ctx-journey .to-state .val{font-family:"DM Serif Display",serif;font-size:22px;line-height:1}
.strat-ctx-journey .from-state .paradigm,.strat-ctx-journey .to-state .paradigm{font-size:10px;color:var(--ink-secondary);font-style:italic;margin-top:4px}
.strat-ctx-journey .from-state .val{color:var(--brick)}
.strat-ctx-journey .to-state .val{color:var(--moss-deep)}
.strat-ctx-journey .arrow{font-family:"DM Serif Display",serif;font-size:32px;color:var(--moss-mid)}
.strat-ctx-bm{padding:16px 20px;background:rgba(106,153,78,0.08);border-left:3px solid var(--moss-mid);border-radius:0 8px 8px 0;margin-bottom:16px;font-size:13px;line-height:1.55}
.strat-ctx-bm strong{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:4px}
.strat-ctx-warning{padding:16px 20px;background:rgba(246,211,141,0.18);border:2px solid #b8911c;border-radius:8px;margin-bottom:20px;color:#5a4710;font-size:13px;line-height:1.6}
.strat-ctx-warning strong{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#5a4710;margin-bottom:6px}

/* §-near-end · Applied Playbooks (v1.7.0 · Pass L) */
.playbook-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:24px}
@media (max-width:720px){.playbook-grid{grid-template-columns:1fr}}
.playbook-card{background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:12px;padding:22px 24px;display:flex;flex-direction:column;gap:12px}
.playbook-card .pb-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-bottom:10px;border-bottom:1px solid rgba(106,153,78,0.2)}
.playbook-card .pb-name{font-family:"DM Serif Display",serif;font-size:19px;line-height:1.2}
.playbook-card .pb-theme{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid);background:rgba(106,153,78,0.1);padding:3px 9px;border-radius:4px;white-space:nowrap}
.playbook-card .pb-why{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13.5px;line-height:1.55;color:var(--ink-primary);padding:10px 12px;background:var(--bg-warm);border-radius:6px}
.playbook-card .pb-anchors{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11.5px;line-height:1.5}
@media (max-width:720px){.playbook-card .pb-anchors{grid-template-columns:1fr}}
.playbook-card .pb-anchors .a-row{padding:8px 10px;background:var(--bg-warm);border-left:3px solid var(--moss-mid);border-radius:0 4px 4px 0}
.playbook-card .pb-anchors .a-row .lbl{display:block;font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px}
.playbook-card .pb-first{padding:10px 12px;border:1px dashed rgba(106,153,78,0.4);border-radius:6px;font-size:12px;line-height:1.55}
.playbook-card .pb-first strong{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:4px}
.playbook-card .pb-foot{padding-top:8px;border-top:1px solid rgba(106,153,78,0.2);display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:10.5px;line-height:1.45}
@media (max-width:720px){.playbook-card .pb-foot{grid-template-columns:1fr}}
.playbook-card .pb-foot .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:2px;display:block}
.playbook-card .pb-source{font-family:"IBM Plex Mono",monospace;font-size:9px;color:var(--ink-muted);text-align:right;font-style:italic}

/* §05b · Ad Recreations (Pass 8.6 · v1.7.3) */
.ar-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:24px}
@media (max-width:720px){.ar-grid{grid-template-columns:1fr}}
.ar-card{background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:12px;padding:22px 24px;display:flex;flex-direction:column;gap:14px}
.ar-card .ar-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-bottom:10px;border-bottom:1px solid rgba(106,153,78,0.2)}
.ar-card .ar-id{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;color:var(--moss-mid);text-transform:uppercase}
.ar-card .ar-inspired{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:12px;color:var(--ink-secondary)}
.ar-card .ar-format{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;background:var(--bg-warm);padding:3px 9px;border-radius:4px;color:var(--ink-secondary);white-space:nowrap}
.ar-card .ar-prompt-block{padding:14px 16px;background:linear-gradient(135deg,rgba(56,102,65,0.06),rgba(167,201,87,0.08));border:1px dashed rgba(56,102,65,0.45);border-radius:8px;position:relative}
.ar-card .ar-prompt-lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:6px;display:block}
.ar-card .ar-prompt-text{font-family:"IBM Plex Mono",monospace;font-size:12px;line-height:1.55;color:var(--ink-primary);user-select:all}
.ar-card .ar-prompt-hint{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:11px;color:var(--ink-muted);margin-top:8px}
.ar-card .ar-headline{font-family:"DM Serif Display",serif;font-size:22px;line-height:1.22;color:var(--ink-primary)}
.ar-card .ar-body{font-size:13px;line-height:1.65;color:var(--ink-primary)}
.ar-card .ar-cta{display:inline-block;padding:7px 16px;background:var(--ink-primary);color:var(--bg-base);font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px;width:fit-content}
.ar-card .ar-anchors{padding:12px 14px;background:var(--bg-warm);border-left:3px solid var(--moss-mid);border-radius:0 6px 6px 0;font-size:12px;line-height:1.55}
.ar-card .ar-anchors .a-row{display:grid;grid-template-columns:80px 1fr;gap:10px;align-items:start}
.ar-card .ar-anchors .a-row + .a-row{margin-top:6px}
.ar-card .ar-anchors .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);padding-top:2px}
.ar-card .ar-why{padding:10px 14px;background:rgba(56,102,65,0.06);border-radius:6px;font-size:12px;line-height:1.55;color:var(--ink-primary)}
.ar-card .ar-why strong{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);display:block;margin-bottom:4px}
.ar-card .ar-source{font-family:"IBM Plex Mono",monospace;font-size:9.5px;color:var(--ink-muted);padding-top:8px;border-top:1px solid rgba(106,153,78,0.15)}
.ar-card .ar-source a{color:var(--moss-mid);text-decoration:underline}
.ar-caveats{padding:14px 18px;background:rgba(200,164,92,0.1);border-left:3px solid #b8911c;border-radius:0 6px 6px 0;font-size:12px;line-height:1.6;margin-top:18px}
.ar-caveats .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;color:#5a4710;margin-bottom:6px;display:block;text-transform:uppercase}
.ar-caveats ul{margin:0;padding-left:18px;color:var(--ink-secondary)}
.ar-caveats li{margin-bottom:3px}

/* §05c · Ad Deep Dive (Pass 8.7 · v1.7.4) */
.dd-meta{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid rgba(106,153,78,0.25)}
.dd-meta .dd-title{font-family:"DM Serif Display",serif;font-size:30px;line-height:1.1;flex:1;min-width:280px}
.dd-meta .dd-runtime{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:0.12em;color:var(--moss-mid);background:var(--bg-warm);padding:5px 12px;border-radius:5px;white-space:nowrap}
.dd-meta .dd-anchors{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary);flex-basis:100%}
.dd-meta .dd-anchors strong{font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-right:8px}
.dd-hook{padding:22px 26px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border:1px solid var(--moss-deep);border-radius:12px;margin-bottom:24px}
.dd-hook h3{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:14px}
.dd-hook .dd-hook-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px}
@media (max-width:720px){.dd-hook .dd-hook-grid{grid-template-columns:1fr}}
.dd-hook .dd-hook-tile{padding:10px 12px;background:var(--bg-base);border-radius:6px}
.dd-hook .dd-hook-tile .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px;display:block}
.dd-hook .dd-hook-tile .val{font-family:"DM Serif Display",serif;font-size:15px;color:var(--ink-primary)}
.dd-hook .dd-mechanic{font-style:italic;font-family:"Cormorant Garamond",serif;font-size:14.5px;line-height:1.55;padding:10px 14px;background:var(--bg-base);border-radius:6px;margin-bottom:12px}
.dd-hook .dd-why{padding:14px 16px;background:rgba(56,102,65,0.08);border-left:3px solid var(--moss-deep);border-radius:0 6px 6px 0;font-size:13px;line-height:1.65}
.dd-hook .dd-why strong{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:6px}
.dd-hook .dd-retention{margin-top:14px;font-size:12px;line-height:1.7}
.dd-hook .dd-retention .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:6px}
.dd-hook .dd-retention .rd-row{display:grid;grid-template-columns:60px 120px 1fr;gap:10px;padding:5px 0;font-size:12px}
.dd-hook .dd-retention .rd-row .at{font-family:"IBM Plex Mono",monospace;font-weight:600;color:var(--moss-mid)}
.dd-hook .dd-retention .rd-row .dev{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-muted)}
.dd-arcs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:28px}
@media (max-width:720px){.dd-arcs{grid-template-columns:1fr}}
.dd-arc{padding:18px 20px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px}
.dd-arc h4{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(106,153,78,0.25)}
.dd-arc .arc-row{display:grid;grid-template-columns:48px 1fr;gap:8px;padding:6px 0;font-size:12px;line-height:1.5;border-bottom:1px solid rgba(106,153,78,0.12)}
.dd-arc .arc-row:last-child{border-bottom:0}
.dd-arc .arc-row .at{font-family:"IBM Plex Mono",monospace;font-weight:600;color:var(--moss-mid);font-size:10px}
.dd-arc .arc-row .text{color:var(--ink-primary)}
.dd-arc .arc-row .purpose,.dd-arc .arc-row .emotion{display:block;font-style:italic;font-family:"Cormorant Garamond",serif;font-size:11px;color:var(--ink-muted);margin-top:2px}
.dd-arc .music-row{font-size:12px;line-height:1.65}
.dd-arc .music-row .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);display:inline-block;width:54px}
.dd-arc .music-row .license{margin-top:8px;padding:8px 10px;background:var(--bg-warm);border-radius:5px;font-style:italic;font-family:"Cormorant Garamond",serif;font-size:11.5px;color:var(--ink-secondary)}
.dd-storyboard{margin-bottom:28px}
.dd-storyboard h3{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:14px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)}
.dd-shot{background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:10px;padding:18px 20px;margin-bottom:14px;display:grid;grid-template-columns:60px 1fr;gap:18px}
@media (max-width:720px){.dd-shot{grid-template-columns:1fr;gap:10px}}
.dd-shot .shot-num{font-family:"DM Serif Display",serif;font-size:34px;color:var(--moss-mid);line-height:1;padding-top:4px}
.dd-shot .shot-body{display:flex;flex-direction:column;gap:10px}
.dd-shot .shot-time{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.18em;color:var(--moss-mid);background:var(--bg-warm);padding:3px 10px;border-radius:4px;width:fit-content}
.dd-shot .shot-camera{font-family:"DM Serif Display",serif;font-size:17px;line-height:1.25;color:var(--ink-primary)}
.dd-shot .shot-camera .frame{display:block;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary);margin-top:3px}
.dd-shot .shot-action{font-size:13px;line-height:1.6;color:var(--ink-primary)}
.dd-shot .shot-cues{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;padding:10px 12px;background:var(--bg-warm);border-radius:6px;font-size:12px;line-height:1.55}
.dd-shot .shot-cues .cue{display:block}
.dd-shot .shot-cues .cue .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);display:block;margin-bottom:2px}
.dd-shot .shot-cues .cue .val{color:var(--ink-primary)}
.dd-shot .shot-cues .cue .val.vo{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px}
.dd-shot .shot-prompt{padding:12px 14px;background:linear-gradient(135deg,rgba(56,102,65,0.06),rgba(167,201,87,0.08));border:1px dashed rgba(56,102,65,0.45);border-radius:6px}
.dd-shot .shot-prompt .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:5px;display:block}
.dd-shot .shot-prompt .val{font-family:"IBM Plex Mono",monospace;font-size:11.5px;line-height:1.55;color:var(--ink-primary);user-select:all}
.dd-shot .shot-anchor{font-size:11px;line-height:1.5;color:var(--ink-secondary);padding-top:6px;border-top:1px solid rgba(106,153,78,0.15)}
.dd-shot .shot-anchor strong{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-right:6px}
.dd-shot .shot-why{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:12px;color:var(--ink-secondary);padding-top:4px}
.dd-prod{padding:22px 26px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:12px;margin-bottom:24px}
.dd-prod h3{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:14px}
.dd-prod-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
@media (max-width:720px){.dd-prod-grid{grid-template-columns:1fr}}
.dd-prod-block{display:flex;flex-direction:column;gap:6px;padding:12px 14px;background:var(--bg-warm);border-radius:7px}
.dd-prod-block .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:3px}
.dd-prod-block .val{font-size:12.5px;line-height:1.6;color:var(--ink-primary)}
.dd-prod-block ul{margin:4px 0 0 0;padding-left:16px;font-size:12px;line-height:1.55}
.dd-prod-block ul li{margin-bottom:3px;color:var(--ink-primary)}
.dd-prod-block .sub{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:11.5px;color:var(--ink-secondary);margin-top:4px}
.dd-thesis{padding:20px 26px;background:linear-gradient(135deg,rgba(56,102,65,0.1),rgba(167,201,87,0.06));border-left:4px solid var(--moss-deep);border-radius:0 10px 10px 0;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:15.5px;line-height:1.65;color:var(--ink-primary)}
.dd-thesis strong{display:block;font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:8px}

/* §17 · Tribe readout */
.tribe-summary{padding:20px 24px;background:linear-gradient(135deg,var(--bg-card),var(--bg-base));border:1px solid rgba(106,153,78,0.3);border-radius:12px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:16px;line-height:1.6;color:var(--ink-primary);margin-bottom:24px}
.tribe-caveats{padding:14px 18px;background:rgba(188,71,73,0.06);border-left:3px solid var(--brick);border-radius:0 6px 6px 0;font-size:12px;line-height:1.6;margin-bottom:24px}
.tribe-caveats .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#7a2c2e;margin-bottom:6px;display:block}
.tribe-caveats ul{margin:0;padding-left:18px;color:var(--ink-secondary)}
.tribe-caveats li{margin-bottom:3px}
.tribe-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:28px}
@media (max-width:720px){.tribe-grid{grid-template-columns:1fr}}
.tribe-card{background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px;padding:18px 20px;display:flex;flex-direction:column;gap:10px}
.tribe-card.unverified{border:1px dashed var(--brick);background:rgba(188,71,73,0.04)}
.tribe-card .tc-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding-bottom:8px;border-bottom:1px solid rgba(106,153,78,0.15)}
.tribe-card .tc-handle{font-family:"DM Serif Display",serif;font-size:20px;line-height:1.15;color:var(--moss-deep)}
.tribe-card.unverified .tc-handle{color:var(--brick)}
.tribe-card .tc-tier{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:3px 8px;border-radius:4px;background:var(--bg-warm);color:var(--ink-secondary)}
.tribe-card .tc-tier.t1{background:rgba(56,102,65,0.15);color:#2a4a30}
.tribe-card .tc-tier.t2{background:rgba(167,201,87,0.2);color:#2a4a30}
.tribe-card .tc-tier.t3{background:var(--bg-warm);color:var(--ink-secondary)}
.tribe-card .tc-tier.aspirational{background:rgba(106,153,78,0.15);color:var(--moss-deep)}
.tribe-card .tc-meta{display:flex;gap:8px;flex-wrap:wrap;font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:0.1em;color:var(--ink-muted)}
.tribe-card .tc-meta .chip{background:var(--bg-warm);padding:3px 8px;border-radius:3px}
.tribe-card .tc-meta .priority.high{background:rgba(56,102,65,0.15);color:#2a4a30;font-weight:600}
.tribe-card .tc-meta .priority.medium{background:rgba(167,201,87,0.2);color:#2a4a30}
.tribe-card .tc-meta .priority.low{background:var(--bg-warm);color:var(--ink-secondary)}
.tribe-card .tc-content{font-size:12.5px;line-height:1.55}
.tribe-card .tc-content strong{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px}
.tribe-card .tc-fit{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;line-height:1.55;color:var(--ink-primary);padding:8px 12px;background:var(--bg-warm);border-radius:5px}
.tribe-card .tc-evidence{font-size:11px;line-height:1.5;color:var(--ink-secondary);padding:8px 12px;background:rgba(56,102,65,0.06);border-left:2px solid var(--moss-mid);border-radius:0 4px 4px 0}
.tribe-card .tc-evidence::before{content:"\\2713  ";color:var(--moss-deep);font-weight:600}
.tribe-card.unverified .tc-evidence{background:rgba(188,71,73,0.06);border-left-color:var(--brick)}
.tribe-card.unverified .tc-evidence::before{content:"\\26A0  ";color:var(--brick)}
.search-paths{padding:24px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px;margin-bottom:18px}
.search-paths h4{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:14px}
.search-paths .sp-intro{font-size:12.5px;line-height:1.6;color:var(--ink-secondary);font-style:italic;font-family:"Cormorant Garamond",serif;margin-bottom:16px}
.sp-grid{display:flex;flex-direction:column;gap:10px}
.sp-row{display:grid;grid-template-columns:90px 1fr 1.4fr;gap:12px;padding:12px 14px;background:var(--bg-warm);border-radius:6px;font-size:11.5px;line-height:1.5;align-items:start}
@media (max-width:720px){.sp-row{grid-template-columns:1fr;gap:4px}}
.sp-row .platform{font-family:"IBM Plex Mono",monospace;font-size:9.5px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)}
.sp-row .query{font-family:"IBM Plex Mono",monospace;font-size:11px;background:var(--bg-base);padding:4px 8px;border-radius:4px;color:var(--ink-primary);word-break:break-word}
.sp-row .why{color:var(--ink-secondary)}
footer{padding:80px 0 56px;background:var(--bg-base);border-top:1px solid rgba(106,153,78,.4);text-align:center}
.footer-meta{font-size:11px;color:var(--ink-muted);letter-spacing:0.18em;text-transform:uppercase;font-family:"IBM Plex Mono",monospace}

/* ─────────────────────────────────────────────────────────────
   v1.7.4 · Print stylesheet · Cmd-P → Save as PDF should produce
   a usable multi-page PDF with no chopped content. Closes the v1.7
   backlog item "no print stylesheet · 30 awkward pages".

   User flow: open the .html in Chrome / Edge / Brave, Cmd-P,
   destination Save as PDF, layout portrait, A4 or Letter, enable
   "Background graphics" so moss-and-brick tokens print correctly.
   ───────────────────────────────────────────────────────────── */
/* v1.9.0 · PE-DECK PRINT STYLESHEET · landscape A4 · one section per
   slide · dense typography · table-first information density.
   Triggered by ↓ PDF button (window.print()) OR manual Cmd-P → Save
   as PDF. The on-screen layout stays portrait + flowing for browser
   reading · print rules transform to PE-deck slide style. */
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm 12mm 14mm 12mm;
    /* Slide footer via running header · jsPDF/Puppeteer would respect
       this · most browsers show their own page-N-of-M when "Headers and
       footers" is enabled in the print dialog · we provide our own
       too via .pe-footer on each section. */
  }
  *,*::before,*::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html,body { background: #fff !important; font-size: 9.5pt; line-height: 1.5; overflow: visible !important; color: var(--ink-primary) !important; }
  nav.top, nav.top .nav-links { display: none !important; }
  .container { padding: 0 6mm !important; max-width: 100% !important; }
  a { color: inherit !important; text-decoration: none !important; }
  /* No transitions or hover effects in print */
  *,*:hover { transition: none !important; transform: none !important; }

  /* ─── COVER SLIDE · compact · one printed page ─── */
  .cover { padding: 14pt 0 12pt !important; background: #fff !important; page-break-after: always; min-height: 80vh; }
  .cover .display-xl { font-size: 36pt !important; line-height: 1.0; color: var(--ink-primary) !important; margin-bottom: 16pt !important; }
  .cover .body-lg { font-size: 11pt !important; max-width: 480pt !important; }
  .cover-meta { margin-top: 28pt !important; padding-top: 14pt !important; grid-template-columns: repeat(4, 1fr) !important; gap: 14pt !important; }
  .cover-meta-item { cursor: default !important; }
  .cover-meta-item .value { font-size: 24pt !important; }
  .cover-tag .doc-num { font-size: 8pt !important; padding: 4pt 10pt !important; }

  /* ─── EVERY SECTION IS A SLIDE · page-break-after always ─── */
  .section {
    padding: 12pt 0 8pt !important;
    page-break-after: always !important;
    page-break-inside: auto;
    min-height: 75vh;
  }
  .section:last-of-type { page-break-after: auto !important; }

  /* Section-tag-row becomes the PE-deck slide title bar */
  .section-tag-row {
    margin-bottom: 10pt !important;
    padding: 6pt 0 6pt !important;
    border-bottom: 1.5pt solid var(--moss-deep) !important;
    align-items: center !important;
  }
  .section-name { color: var(--moss-deep) !important; font-size: 10pt !important; font-weight: 700 !important; }
  .section-number { font-size: 8pt !important; color: var(--ink-muted) !important; }

  /* Big section headlines kept as the slide takeaway line */
  .display-lg { font-size: 22pt !important; line-height: 1.12 !important; page-break-after: avoid !important; margin-bottom: 10pt !important; color: var(--ink-primary) !important; }
  .display { font-size: 16pt !important; page-break-after: avoid !important; }
  .h2, h2.display-lg { page-break-after: avoid !important; }
  h2, h3, h4 { page-break-after: avoid !important; }

  /* Tables · PE-deck primary information structure · pack denser in landscape */
  .engine-table { font-size: 9pt !important; margin-bottom: 12pt !important; }
  .engine-table thead th { padding: 8pt 10pt !important; font-size: 8pt !important; }
  .engine-table tbody td { padding: 8pt 10pt !important; }
  .engine-table .cell-key { font-size: 11pt !important; }
  .engine-table .cell-italic { font-size: 9.5pt !important; }
  .engine-table .cell-mono { font-size: 8.5pt !important; }
  .engine-table .pill-priority, .engine-table .tier-chip { font-size: 7pt !important; padding: 2pt 6pt !important; }
  .engine-table-caption { font-size: 10pt !important; margin-bottom: 8pt !important; }

  /* Existing legacy tables (evidence + value-prop + matrix) also tighten */
  .ev-row { padding: 12pt 16pt !important; gap: 12pt !important; font-size: 9.5pt !important; }
  .ev-row .job-id { font-size: 16pt !important; }
  .ev-row .num, .ev-row .opp { font-size: 16pt !important; }
  .ev-row .outcome .ulwick { font-size: 11pt !important; }
  .vp-row { padding: 12pt 16pt !important; gap: 12pt !important; font-size: 9.5pt !important; }
  .vp-row .name { font-size: 12pt !important; }
  .vp-row .quote { font-size: 10pt !important; }

  /* Card-style components: avoid breaking inside a single card */
  .swipe-card, .script, .email-flow, .channel-card, .landing-variant, .phase-card,
  .creator-card, .comp-card, .funnel-card, .playbook-card,
  .ar-card, .dd-shot, .ws-card { page-break-inside: avoid !important; }

  /* Swipe-grid · 2-col in landscape so 10 cards = ~5 printed slides
     (cards break across slides as the grid flows · each card stays intact) */
  .swipe-grid { grid-template-columns: 1fr 1fr !important; gap: 10pt !important; }
  /* Swipe-card · drop the giant 4:5 ad-mock image area down to a small
     header strip · saves enormous ink + lets each card fit dense info.
     User clicks the source URL to see the actual ad anyway. */
  .swipe-card .ad-mock { aspect-ratio: auto !important; min-height: 60pt !important; max-height: 80pt !important; padding: 8pt !important; }
  .swipe-card .ad-mock::before { display: none !important; }
  .swipe-card .ad-headline { font-size: 11pt !important; line-height: 1.2 !important; }
  .swipe-card .ad-body { padding: 10pt 12pt 12pt !important; }
  .swipe-card .ad-copy { font-size: 9.5pt !important; }
  .swipe-card .ad-title { font-size: 12pt !important; }
  .swipe-card .ad-source { font-size: 8pt !important; padding: 6pt 8pt !important; }
  .swipe-card .ad-source-pattern { font-size: 9.5pt !important; }
  .swipe-card .ad-source-url { font-size: 7.5pt !important; }

  /* Hide imagery in print swipe cards by default · the source URL is the
     anchor · saves ink + paper time. To print with imagery, user can
     override this rule manually in browser print preview. */
  .swipe-card .ad-mock { background-image: none !important; background-color: #f5efde !important; }

  /* Audit / Demand / Tribe / Methodology · already use .engine-table so
     just inherit the table-tightening above */

  /* Hormozi core sections · Pass O / M / G · keep slide-distinct */
  #offer, #money-model, #lead-model { page-break-after: always !important; }
  #offer .body-lg { font-size: 11pt !important; }
  /* Value Equation 4-tile grid · keep on the same slide */
  #offer .container > div[style*="grid-template-columns:1fr 1fr"]:first-of-type { page-break-inside: avoid !important; }

  /* Strategic Context (§00) · keep its compact tile layout on one slide */
  #strategic { page-break-after: always !important; }
  .strat-ctx-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 10pt !important; }
  .strat-ctx-tile { padding: 8pt 12pt !important; }

  /* Long content sections (storyboard · funnel keywords) allow row-level breaks */
  .ev-table, .vp-table, .matrix-table, .dd-storyboard, .engine-table { page-break-inside: auto !important; }
  .ev-row, .vp-row, .matrix-row, .engine-table tbody tr { page-break-inside: avoid !important; }

  /* Flatten gradient backgrounds that ink-blast on paper */
  .position-primary { background: #fff !important; border: 1.5pt solid var(--moss-deep) !important; }
  .dd-hook { background: #fdf8e8 !important; }
  .dd-thesis { background: #f5f0d8 !important; border-left: 3pt solid var(--moss-deep) !important; }
  .ar-prompt-block, .dd-shot .shot-prompt { background: #f5efde !important; border-style: solid !important; }
  .axis-summary { background: #f5f0d8 !important; }

  /* Pills · solid bg */
  .ad-chip, .chip, .au-priority, .pb-theme, .ar-format, .dd-meta .dd-runtime,
  .engine-table .pill-priority, .engine-table .tier-chip { background: #f0e8d2 !important; color: #2a3328 !important; }

  /* Wordmark gradient → solid */
  .wordmark { background: none !important; -webkit-background-clip: initial !important; background-clip: initial !important; color: var(--ink-primary) !important; }

  /* Hairline · drop */
  .hairline { display: none !important; }

  /* Footer · compact · single line at bottom of last slide */
  footer { padding: 18pt 0 14pt !important; page-break-before: avoid !important; }
  footer .wordmark { font-size: 18pt !important; }
  footer .footer-meta { font-size: 8pt !important; }

  /* Persona grid · landscape lets us fit 2-up · keep each persona on one slide */
  .persona { grid-template-columns: 180pt 1fr !important; gap: 18pt !important; padding: 14pt 0 !important; page-break-inside: avoid !important; }
  .persona-avatar { aspect-ratio: 1 !important; }
  .persona-body .name { font-size: 20pt !important; }
  .persona-body .one-liner { font-size: 11pt !important; }
  .persona-fields { grid-template-columns: 100pt 1fr !important; gap: 6pt 14pt !important; }
  .persona-fields .pf-value { font-size: 9.5pt !important; padding-bottom: 8pt !important; }

  /* Scripts · scripts table · email cards · constrain to landscape */
  .script, .email-flow { page-break-inside: avoid !important; }
  .shot-row { padding: 6pt 0 !important; }
  .shot-detail { font-size: 9.5pt !important; }

  /* Channels grid · 2-up in landscape */
  .channel-grid { grid-template-columns: 1fr 1fr !important; gap: 10pt !important; }
  .matrix-row { padding: 8pt 14pt !important; font-size: 9pt !important; }

  /* Landing variants · 1 per slide · they're info-dense */
  .landing-variant { page-break-inside: avoid !important; page-break-after: always !important; }

  /* Phase cards (rollout) · 1 per slide */
  .phase-card { page-break-inside: avoid !important; padding: 18pt 22pt !important; }

  /* Creator briefs · 1 per slide */
  .creator-card { page-break-inside: avoid !important; page-break-after: always !important; }

  /* Competitive cards · 2-up landscape */
  .comp-grid { grid-template-columns: 1fr 1fr !important; gap: 10pt !important; }
  .comp-card { padding: 14pt 16pt !important; font-size: 9.5pt !important; }
  .comp-card .cp-name { font-size: 14pt !important; }
  .comp-card .cp-promise { font-size: 10pt !important; }
  .comp-card .cp-winlose { grid-template-columns: 1fr 1fr !important; gap: 8pt !important; }
  .comp-card .cp-win, .comp-card .cp-lose, .comp-card .cp-wedge, .comp-card .cp-punch { font-size: 9.5pt !important; padding: 8pt 10pt !important; }

  /* Playbook grid · 2-up landscape */
  .playbook-grid { grid-template-columns: 1fr 1fr !important; gap: 10pt !important; }
  .playbook-card { padding: 12pt 14pt !important; }
  .playbook-card .pb-name { font-size: 14pt !important; }

  /* Ad recreation grid · 2-up */
  .ar-grid { grid-template-columns: 1fr 1fr !important; gap: 10pt !important; }

  /* Hormozi sections inline-tighten · §01/§02/§03 */
  #offer > .container > div[style*="grid-template-columns:1fr 1fr"] {
    grid-template-columns: 1fr 1fr !important; gap: 10pt !important;
  }

  /* No-visibility audit chips · soften bg */
  .audit-card.no-visibility { background: #faf3df !important; }
}
`;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// v1.7.1 · Claude often wraps quoted lines in markdown `*emphasis*` even
// when the schema asks for plain text. The CSS already italicizes the
// container in several places (one-liner, first_message, ws-test, etc.)
// so the asterisks render literally and the user sees `*…*`. Strip a
// single wrapping pair before escape. Inner asterisks are left alone
// because they may be intentional (e.g. "5*-rated" emphasis).
const stripWrappingEmphasis = (s) => {
  const str = String(s ?? "").trim();
  if (str.length < 2) return str;
  if ((str.startsWith("*") && str.endsWith("*")) || (str.startsWith("_") && str.endsWith("_"))) {
    return str.slice(1, -1).trim();
  }
  return str;
};

// Convenience: strip wrapping emphasis THEN escape for HTML. Use this
// wherever the renderer is about to drop a string into a container that
// already has `font-style: italic` in the CSS.
const escEm = (s) => esc(stripWrappingEmphasis(s));

// v1.7.7 · Claude returns some fields as array OR string depending on
// the call (lives_online_at, aliases, tags, sources, key_facts, red_flags,
// etc.). This helper normalizes to a trimmed-non-empty string[]:
//   - Array: pass through, coerce to strings, trim, drop empties
//   - String: split on common separators (comma · semicolon · pipe · newline)
//   - null/undefined/other: empty array
// Fixes a v1.7.1 regression where renderPersonas crashed when Claude returned
// lives_online_at as an array: `(per.lives_online_at || "").split is not a function`
const toChipArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// ── Renderers ──
function renderCover(p, project_name) {
  const pc = p.project_context || {};
  return `<section class="cover" id="cover">
  <div class="container">
    <div class="cover-tag">
      <span class="doc-num">Phase 1 Strategy · Engine ${ENGINE_VERSION}</span>
      <span class="caption">Generated ${new Date().toISOString().split("T")[0]}</span>
    </div>
    <h1 class="display-xl" style="margin-bottom:32px">${esc(project_name || "Untitled Project")}</h1>
    <p class="body-lg" style="max-width:640px;color:var(--ink-secondary);margin-bottom:16px">
      ${esc(pc.sector || "")}
    </p>
    <p class="body-lg" style="max-width:640px;color:var(--ink-secondary)">
      ${esc(pc.audience || "")}
    </p>
    <div class="cover-meta">
      <a href="#evidence" class="cover-meta-item"><div class="label">Jobs</div><div class="value">${(p.mergedJobs || []).length}</div></a>
      <a href="#personas" class="cover-meta-item"><div class="label">Personas</div><div class="value">${(p.personas || []).length}</div></a>
      <a href="#swipe" class="cover-meta-item"><div class="label">Swipe ads</div><div class="value">${(p.swipeFile || []).length}</div></a>
      <a href="#scripts" class="cover-meta-item"><div class="label">Scripts</div><div class="value">${(p.scripts || []).length}</div></a>
    </div>
  </div>
</section>`;
}

// v1.7.1 · helper used by every renderer to emit a section-tag-row.
// Centralizes the "§ NN · Name" + "NN / TOTAL" pattern so renderers
// don't have to know their own section number — the dispatcher tells
// them via (n, total). Drops hard-coded "/ 19" denominators that
// shipped in v1.7.0 before this fix.
function sectionTag(name, n, total) {
  const nn = String(n).padStart(2, "0");
  const tt = String(total).padStart(2, "0");
  return `<div class="section-tag-row"><span class="section-name">§ ${nn} · ${esc(name)}</span><span class="section-number">${nn} / ${tt}</span></div>`;
}

function renderPositioning(p, n, total) {
  if (!p.positioning?.primary) return "";
  const pr = p.positioning.primary;
  const alts = p.positioning.alternatives || [];
  return `<section class="section" id="position">
  <div class="container">
    ${sectionTag("Positioning", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">The single sentence<br/>to claim.</h2>
    <div class="position-primary">
      <span class="tag">Primary</span>
      <div class="claim">${esc(pr.sentence)}</div>
      <div class="citation">Citation · Job ${pr.citation_job_id} · score <span class="score">${pr.citation_score}</span></div>
      <p class="rationale">${esc(pr.rationale || "")}</p>
    </div>
    ${alts.map(a => `<div class="position-alt"><div class="alt-tag">Alternative</div><div class="claim">${esc(a.sentence)}</div><div class="citation">Job ${a.citation_job_id} · score <span class="score">${a.citation_score}</span></div><p class="rationale">${esc(a.rationale || "")}</p></div>`).join("")}
  </div>
</section>`;
}

function renderEvidence(p, n, total) {
  if (!(p.mergedJobs || []).length) return "";
  const rows = p.mergedJobs.flatMap(j => (j.outcomes || []).map(o => ({ job: j.id, statement: o.statement, importance: o.importance, satisfaction: o.satisfaction, score: o.opportunity_score })))
    .sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
  return `<section class="section" id="evidence">
  <div class="container">
    ${sectionTag("Evidence", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">The outcomes<br/>behind the numbers.</h2>
    <div class="ev-table">
      <div class="ev-row head"><div>Job</div><div>Outcome (Ulwick format)</div><div>Importance</div><div>Satisfaction</div><div>Opp score</div></div>
      ${rows.map(r => `<div class="ev-row${(r.score||0)>=10?' underserved':''}"><div class="job-id">${String(r.job).padStart(2,"0")}</div><div class="outcome"><span class="ulwick">${esc(r.statement)}</span></div><div class="num">${r.importance ?? "—"}</div><div class="num">${r.satisfaction ?? "—"}</div><div class="opp">${(r.score ?? 0).toFixed ? r.score.toFixed(1) : r.score}</div></div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderValueProp(p, n, total) {
  const rows = p.valueProp?.comparisons || [];
  if (!rows.length) return "";
  return `<section class="section" id="vp">
  <div class="container">
    ${sectionTag("Value-prop comparison", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">Brand vs the named<br/>incumbents.</h2>
    <div class="vp-table">
      <div class="vp-row head"><div>Brand</div><div>Stated value prop</div><div>Prices for</div><div>Leaves unserved</div><div>Where brand wins</div></div>
      ${rows.map(r => `<div class="vp-row"><div class="name">${esc(r.competitor_name)}<span class="meta">${esc(r.source_url || "")}</span></div><div class="quote">"${esc(r.their_stated_value_prop || "")}"</div><div>${esc(r.outcome_they_price_for || "—")}</div><div>${esc(r.outcome_they_leave_unserved || "—")}</div><div>${esc(r.where_brand_wins || "—")}</div></div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderPersonas(p, n, total) {
  if (!(p.personas || []).length) return "";
  return `<section class="section" id="personas">
  <div class="container">
    ${sectionTag("Personas", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${p.personas.length} buyers.<br/>Each at a hinge.</h2>
    ${p.personas.map((per, i) => `<div class="persona">
      <div class="persona-avatar" style="background:linear-gradient(135deg,var(--moss-light),var(--moss-deep))">${esc((per.name || "?")[0])}</div>
      <div class="persona-body">
        <div class="number">Persona ${String(i+1).padStart(2,"0")} · ${esc(per.archetype || "")}</div>
        <div class="name">${esc(per.name || "")}, ${esc(per.age || "")}</div>
        <div class="one-liner">${escEm(per.one_liner || "")}</div>
        <div class="persona-fields">
          <div class="pf-label">Job to be done</div><div class="pf-value">${esc(per.job_to_be_done || "")}</div>
          <div class="pf-label">Underserved outcome</div><div class="pf-value">${esc(per.underserved_outcome || "")}</div>
          <div class="pf-label">Currently uses</div><div class="pf-value">${esc(per.currently_uses || "")}</div>
          <div class="pf-label">Trigger</div><div class="pf-value">${esc(per.trigger_moment || "")}</div>
          <div class="pf-label">Lives online at</div><div class="pf-value">${toChipArray(per.lives_online_at).map(h => `<span class="handle-chip">${esc(h)}</span>`).join("") || `<span style="color:var(--ink-muted);font-style:italic">—</span>`}</div>
          <div class="pf-label">Switch cost</div><div class="pf-value">${esc(per.switch_cost || "")}</div>
          <div class="pf-label">First message</div><div class="pf-value italic">${escEm(per.first_message || "")}</div>
        </div>
      </div>
    </div>`).join("")}
  </div>
</section>`;
}

function renderSwipe(p, n, total) {
  if (!(p.swipeFile || []).length) return "";
  // v1.9.0 · swipe cards now grounded in real running ads found via
  // web_search. Each card has source_ad_reference + an adapted brand
  // version. Reader gets a "Based on real ad from [brand]" footer
  // with the source URL so they can click through to see the original
  // pattern in the wild. Adapted_headline/body/cta replace the v1.8.x
  // headline/body/cta fields (we keep backward compat by falling back).
  return `<section class="section" id="swipe">
  <div class="container">
    ${sectionTag("Swipe file", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${p.swipeFile.length} ads.<br/>Each grounded in a real ad running today.</h2>
    <p class="engine-table-caption">Every card cites a real running ad found via web_search and produces an original brand-voice version of the same mechanic. The source URL points to where the original ad lives (Meta Ad Library · TikTok Creative Center · etc.) — click through to study the pattern before adapting.</p>
    <div class="swipe-grid">
      ${p.swipeFile.map(s => {
        const mockStyle = s.image_b64
          ? `style="background-image:url(data:image/png;base64,${s.image_b64});background-size:cover;background-position:center"`
          : "";
        // v1.9.0 schema · prefer adapted_* fields · fall back to legacy ones for backward compat with old cached runs
        const headline = s.adapted_headline || s.headline || "";
        const body = s.adapted_body || s.body || "";
        const cta = s.adapted_cta || s.cta || "";
        const ref = s.source_ad_reference || {};
        // v1.10.0 · Foreplay validator chips + Pass 8.4 vision block
        // Render validator row only when the Foreplay path enriched this card
        // with composite_score / running_duration_days / source_platform.
        const score = typeof ref.composite_score === "number" ? ref.composite_score : null;
        const verdictClass = score === null ? "" : score >= 8 ? "verdict-canonical" : score >= 6 ? "verdict-strong" : score >= 4 ? "verdict-moderate" : "verdict-weak";
        const verdictLabel = score === null ? "" : score >= 8 ? "canonical winner" : score >= 6 ? "strong signal" : score >= 4 ? "moderate signal" : "weak signal";
        const platform = ref.source_platform || "";
        const durationDays = ref.running_duration_days;
        const validatorChips = [];
        if (platform) validatorChips.push(`<span class="v-chip platform">${esc(platform)}</span>`);
        if (verdictClass) validatorChips.push(`<span class="v-chip ${verdictClass}">${esc(verdictLabel)} · ${score.toFixed(1)}</span>`);
        if (typeof durationDays === "number" && durationDays > 0) validatorChips.push(`<span class="v-chip duration">${durationDays}d running</span>`);
        const validatorHtml = validatorChips.length ? `<div class="ad-validator">${validatorChips.join("")}</div>` : "";

        // v1.10.0 · Pass 8.4 vision analysis block
        const va = s.visual_analysis || null;
        const hookPattern = va?.hook_pattern || "";
        const framing = va?.composition?.framing || "";
        const visionPrompt = va?.vision_grounded_prompt || "";
        const visionHtml = va && (hookPattern || framing || visionPrompt) ? `<div class="ad-vision">${hookPattern ? `<strong>Hook pattern:</strong> ${esc(hookPattern)}` : ""}${hookPattern && framing ? " · " : ""}${framing ? `<strong>Framing:</strong> ${esc(framing)}` : ""}${visionPrompt ? `<span class="v-prompt">${esc(visionPrompt)}</span>` : ""}</div>` : "";

        return `<div class="swipe-card"><div class="ad-mock" ${mockStyle}><div class="ad-format-tag">${esc(s.format || "")}</div><div class="ad-headline">${esc(headline)}</div></div><div class="ad-body"><div class="ad-meta"><span class="ad-chip persona">${esc(s.persona_name || "")}</span><span class="ad-chip">${esc(s.stage || "")}</span></div><div class="ad-id">${esc(s.id || "")}</div><div class="ad-title">${esc(s.title || "")}</div><p class="ad-copy">${esc(body)}</p>${ref.source_brand || ref.source_url ? `<div class="ad-source"><strong>Based on:</strong> ${esc(ref.source_brand || "real running ad")} · ${esc(ref.source_format || "")}${ref.source_pattern_summary ? `<br/><span class="ad-source-pattern">Mechanic: ${esc(ref.source_pattern_summary)}</span>` : ""}${ref.source_url ? `<br/><a href="${esc(ref.source_url)}" class="ad-source-url" target="_blank" rel="noopener">${esc(ref.source_url)}</a>` : ""}${validatorHtml}</div>` : ""}${visionHtml}<div class="ad-footer"><div><div class="label">CTA</div><div>${esc(cta)}</div></div><div><div class="label">Framework</div><div>${esc(s.framework || "")}</div></div></div></div></div>`;
      }).join("")}
    </div>
  </div>
</section>`;
}

// ── §05b · Ad Recreations (Pass 8.6 · v1.7.3) ──
// Spec: <vault>/05a - Pass 8.6 Ad Recreations Spec.md
function renderAdRecreations(p, n, total) {
  const ar = p.adRecreations;
  const recs = ar?.recreations || [];
  if (!recs.length) return "";
  const caveats = ar?.caveats || [];
  return `<section class="section" id="recreations">
  <div class="container">
    ${sectionTag("Ad recreations", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${recs.length} proven ads.<br/>In your voice. Ready to ship.</h2>
    <p class="body-lg" style="max-width:760px;color:var(--ink-secondary);margin-bottom:24px">Each card is a competitor ad observed running in market, rewritten in your brand voice and anchored to one of your personas + one underserved outcome. The image prompt is gpt-image-2-ready and brand-safe (no trademarked references).</p>
    <div class="ar-grid">
      ${recs.map(r => `<div class="ar-card">
        <div class="ar-head">
          <div>
            <div class="ar-id">${esc(r.id || "")}</div>
            <div class="ar-inspired">inspired by ${esc(r.source_brand || "competitor")}</div>
          </div>
          ${r.format ? `<span class="ar-format">${esc(r.format)}</span>` : ""}
        </div>
        <div class="ar-prompt-block">
          <span class="ar-prompt-lbl">Recreation prompt · copy into gpt-image-2 / Midjourney / Nano Banana</span>
          <div class="ar-prompt-text">${esc(r.image_prompt || "")}</div>
          <div class="ar-prompt-hint">Select-all to copy · prompt is brand-safe (no trademarked references)</div>
        </div>
        ${r.adapted_headline ? `<div class="ar-headline">${escEm(r.adapted_headline)}</div>` : ""}
        ${r.adapted_body ? `<p class="ar-body">${escEm(r.adapted_body)}</p>` : ""}
        ${r.adapted_cta ? `<div class="ar-cta">${esc(r.adapted_cta)}</div>` : ""}
        <div class="ar-anchors">
          ${r.persona_anchor ? `<div class="a-row"><span class="lbl">Persona</span><span>${esc(r.persona_anchor)}</span></div>` : ""}
          ${r.outcome_anchor ? `<div class="a-row"><span class="lbl">Outcome</span><span>${esc(r.outcome_anchor)}</span></div>` : ""}
        </div>
        ${r.why_it_works ? `<div class="ar-why"><strong>Why it works — the strategic insight to copy</strong>${esc(r.why_it_works)}</div>` : ""}
        <div class="ar-source">▸ source: ${esc(r.source_brand || "?")}${r.reference?.url ? ` · <a href="${esc(r.reference.url)}" target="_blank" rel="noopener noreferrer">view ad</a>` : ""}${r.reference?.active_since ? ` · running since ${esc(r.reference.active_since)}` : ""}${r.reference?.platform ? ` · ${esc(r.reference.platform)}` : ""}${r.hook_type ? ` · hook: ${esc(r.hook_type)}` : ""}</div>
      </div>`).join("")}
    </div>
    ${caveats.length ? `<div class="ar-caveats"><span class="lbl">Honest caveats</span><ul>${caveats.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
  </div>
</section>`;
}

// ── §05c · Ad Deep Dive (Pass 8.7 · v1.7.4 · Phase A MVP) ──
// Spec: <vault>/05b - Pass 8.7 Ad Deep Dive Spec.md
function renderAdDeepDive(p, n, total) {
  const dd = p.adDeepDive?.deep_dive;
  if (!dd) return "";
  const ha = dd.hook_anatomy || {};
  const cb = dd.copy_breakdown || {};
  const sb = dd.storyboard || {};
  const pb = dd.production_brief || {};
  const shots = sb.shots || [];
  return `<section class="section" id="deepdive">
  <div class="container">
    ${sectionTag("Ad deep dive", n, total)}
    <div class="dd-meta">
      <div class="dd-title">${esc(dd.title || "Untitled deep dive")}</div>
      <span class="dd-runtime">${esc(dd.runtime_sec ? `${dd.runtime_sec}s` : "")} · ${esc(dd.format || "4:5")}</span>
      <div class="dd-anchors">
        <strong>Inspired by</strong>${esc(dd.source_brand || "?")}${dd.source_summary ? ` · ${esc(dd.source_summary)}` : ""}<br/>
        <strong>For</strong>${esc(dd.persona_anchor || "?")} · <strong>On</strong>${esc(dd.outcome_anchor || "?")}
      </div>
    </div>

    <div class="dd-hook">
      <h3>Hook anatomy · the reverse-engineering</h3>
      <div class="dd-hook-grid">
        <div class="dd-hook-tile"><span class="lbl">Pattern</span><div class="val">${esc(ha.pattern || "?")}</div></div>
        <div class="dd-hook-tile"><span class="lbl">Schwartz level</span><div class="val">${esc(ha.schwartz_level || "?")}</div></div>
        <div class="dd-hook-tile"><span class="lbl">Fires at</span><div class="val">${esc(ha.fires_at || "?")}</div></div>
      </div>
      ${ha.mechanic ? `<div class="dd-mechanic">${escEm(ha.mechanic)}</div>` : ""}
      ${ha.why_it_blew_up ? `<div class="dd-why"><strong>Why it blew up</strong>${esc(ha.why_it_blew_up)}</div>` : ""}
      ${(ha.retention_devices || []).length ? `<div class="dd-retention">
        <span class="lbl">Retention devices</span>
        ${ha.retention_devices.map(r => `<div class="rd-row"><span class="at">${esc(r.at || "")}</span><span class="dev">${esc(r.device || "")}</span><span>${esc(r.text || "")}</span></div>`).join("")}
      </div>` : ""}
      ${(ha.schwartz_progression || []).length ? `<div class="dd-retention" style="margin-top:10px"><span class="lbl">Schwartz progression</span><div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-secondary)">${ha.schwartz_progression.map(esc).join(" · ")}</div></div>` : ""}
    </div>

    <div class="dd-arcs">
      <div class="dd-arc">
        <h4>On-screen text · the read-while-watching arc</h4>
        ${(cb.on_screen_text_arc || []).map(r => `<div class="arc-row"><span class="at">${esc(r.at || "")}</span><div><span class="text">${esc(r.text || "")}</span>${r.purpose ? `<span class="purpose">${esc(r.purpose)}</span>` : ""}</div></div>`).join("") || "<div style='font-size:11px;color:var(--ink-muted);font-style:italic'>No on-screen text in this concept</div>"}
      </div>
      <div class="dd-arc">
        <h4>Voiceover · what the viewer hears</h4>
        ${(cb.vo_arc || []).map(r => `<div class="arc-row"><span class="at">${esc(r.at || "")}</span><div><span class="text">${escEm(r.line || "")}</span>${r.emotion ? `<span class="emotion">${esc(r.emotion)}</span>` : ""}</div></div>`).join("") || "<div style='font-size:11px;color:var(--ink-muted);font-style:italic'>No VO in this concept</div>"}
      </div>
      <div class="dd-arc">
        <h4>Music · the emotional spine</h4>
        <div class="music-row">
          ${cb.music_arc?.intro ? `<div><span class="lbl">Intro</span>${esc(cb.music_arc.intro)}</div>` : ""}
          ${cb.music_arc?.build ? `<div style="margin-top:6px"><span class="lbl">Build</span>${esc(cb.music_arc.build)}</div>` : ""}
          ${cb.music_arc?.peak ? `<div style="margin-top:6px"><span class="lbl">Peak</span>${esc(cb.music_arc.peak)}</div>` : ""}
          ${cb.music_arc?.outro ? `<div style="margin-top:6px"><span class="lbl">Outro</span>${esc(cb.music_arc.outro)}</div>` : ""}
          ${cb.music_arc?.license_direction ? `<div class="license">${esc(cb.music_arc.license_direction)}</div>` : ""}
        </div>
      </div>
    </div>

    <div class="dd-storyboard">
      <h3>Storyboard · ${shots.length} shots · shot-by-shot production map</h3>
      ${shots.map(s => `<div class="dd-shot">
        <div class="shot-num">${String(s.n || "?").padStart(2, "0")}</div>
        <div class="shot-body">
          <span class="shot-time">${esc(s.t || "?")} · ${esc(String(s.duration_sec || "?"))}s</span>
          <div class="shot-camera">${esc(s.camera || "?")}${s.framing ? `<span class="frame">${esc(s.framing)}</span>` : ""}</div>
          ${s.action ? `<div class="shot-action">${esc(s.action)}</div>` : ""}
          <div class="shot-cues">
            ${s.on_screen_text ? `<div class="cue"><span class="lbl">On-screen</span><span class="val">${esc(s.on_screen_text)}</span></div>` : ""}
            ${s.vo ? `<div class="cue"><span class="lbl">VO</span><span class="val vo">${escEm(s.vo)}</span></div>` : ""}
            ${s.sfx ? `<div class="cue"><span class="lbl">SFX</span><span class="val">${esc(s.sfx)}</span></div>` : ""}
            ${s.music ? `<div class="cue"><span class="lbl">Music</span><span class="val">${esc(s.music)}</span></div>` : ""}
          </div>
          ${s.gpt_image_2_prompt ? `<div class="shot-prompt"><span class="lbl">Image prompt · paste into gpt-image-2 / Midjourney / Nano Banana</span><div class="val">${esc(s.gpt_image_2_prompt)}</div></div>` : ""}
          ${s.anchor_outcome ? `<div class="shot-anchor"><strong>Anchor</strong>${esc(s.anchor_outcome)}</div>` : ""}
          ${s.why_this_shot ? `<div class="shot-why">${escEm(s.why_this_shot)}</div>` : ""}
        </div>
      </div>`).join("")}
    </div>

    <div class="dd-prod">
      <h3>Production brief · ready to hand to a DP / UGC creator</h3>
      <div class="dd-prod-grid">
        ${pb.talent ? `<div class="dd-prod-block"><span class="lbl">Talent</span><div class="val">${esc(pb.talent.description || "")}${pb.talent.count ? ` · count: ${esc(String(pb.talent.count))}` : ""}</div>${(pb.talent.wardrobe_supplied || []).length ? `<ul>${pb.talent.wardrobe_supplied.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}${pb.talent.wardrobe_minimal ? `<div class="sub">${esc(pb.talent.wardrobe_minimal)}</div>` : ""}</div>` : ""}
        ${pb.location ? `<div class="dd-prod-block"><span class="lbl">Location</span><div class="val">${esc(pb.location.type || "?")}${pb.location.spec ? ` — ${esc(pb.location.spec)}` : ""}</div>${pb.location.alt ? `<div class="sub">Backup: ${esc(pb.location.alt)}</div>` : ""}</div>` : ""}
        ${(pb.props || []).length ? `<div class="dd-prod-block"><span class="lbl">Props</span><ul>${pb.props.map(p2 => `<li>${esc(p2)}</li>`).join("")}</ul></div>` : ""}
        ${pb.music_direction ? `<div class="dd-prod-block"><span class="lbl">Music direction</span><div class="val">${esc(pb.music_direction)}</div></div>` : ""}
        ${(pb.sfx_list || []).length ? `<div class="dd-prod-block"><span class="lbl">SFX list</span><ul>${pb.sfx_list.map(s2 => `<li>${esc(s2)}</li>`).join("")}</ul></div>` : ""}
        ${pb.estimated_cost_usd ? `<div class="dd-prod-block"><span class="lbl">Estimated cost</span><div class="val">UGC route: ${esc(pb.estimated_cost_usd.ugc_route || "?")}<br/>Studio route: ${esc(pb.estimated_cost_usd.studio_route || "?")}</div>${pb.estimated_cost_usd.notes ? `<div class="sub">${esc(pb.estimated_cost_usd.notes)}</div>` : ""}</div>` : ""}
        ${pb.timeline ? `<div class="dd-prod-block"><span class="lbl">Timeline</span><div class="val">Prep: ${esc(String(pb.timeline.prep_days || "?"))}d · Shoot: ${esc(String(pb.timeline.shoot_days || "?"))}d · Edit: ${esc(pb.timeline.edit_days || "?")}d<br/>Total calendar: ${esc(pb.timeline.total_calendar || "?")}</div></div>` : ""}
        ${pb.delivery_specs ? `<div class="dd-prod-block"><span class="lbl">Delivery specs</span><div class="val">Master: ${esc(pb.delivery_specs.master || "?")}</div>${(pb.delivery_specs.derivatives || []).length ? `<ul>${pb.delivery_specs.derivatives.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}</div>` : ""}
      </div>
    </div>

    ${dd.strategic_thesis ? `<div class="dd-thesis"><strong>Strategic thesis · why this is worth shooting</strong>${esc(dd.strategic_thesis)}</div>` : ""}
  </div>
</section>`;
}

function renderScripts(p, n, total) {
  if (!(p.scripts || []).length) return "";
  return `<section class="section" id="scripts">
  <div class="container">
    ${sectionTag("TikTok scripts", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${p.scripts.length} shot-by-shot scripts.</h2>
    ${p.scripts.map(s => `<div class="script">
      <div class="script-header">
        <div><div class="script-title">${esc(s.id || "")} · ${esc(s.title || "")}</div><div class="script-hook">Hook: "${esc(s.hook || "")}"</div></div>
        <div class="script-meta"><span class="chip persona">${esc(s.persona_name || "")}</span><span class="chip">${esc(s.format || "")}</span></div>
      </div>
      ${(s.shots || []).map(sh => `<div class="shot-row"><div class="shot-time">${esc(sh.time || "")}</div><div class="shot-cue">${esc(sh.cue || "")}</div><div class="shot-detail">${esc(sh.detail || "")}${sh.ost?`<span class="ost">${esc(sh.ost)}</span>`:""}${sh.vo?`<span class="vo">${esc(sh.vo)}</span>`:""}</div></div>`).join("")}
      <div class="script-notes">
        <div class="note"><div class="lbl">Sound</div><div class="val">${esc(s.sound_note || "")}</div></div>
        <div class="note"><div class="lbl">Brief</div><div class="val">${esc(s.creator_brief || "")}</div></div>
        <div class="note"><div class="lbl">KPI</div><div class="val">${esc(s.kpi || "")}</div></div>
      </div>
    </div>`).join("")}
  </div>
</section>`;
}

function renderEmails(p, n, total) {
  if (!(p.emailFlows?.flows || []).length) return "";
  return `<section class="section" id="email">
  <div class="container">
    ${sectionTag("Email flows", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${p.emailFlows.flows.length} flows.</h2>
    ${p.emailFlows.flows.map(f => `<div class="email-flow">
      <div class="email-flow-head"><div class="email-flow-name">${esc(f.name || "")}</div><div class="email-flow-trigger">${esc(f.trigger || "")}</div></div>
      <p class="email-flow-desc">${esc(f.description || "")}</p>
      ${(f.emails || []).map(e => `<div class="email-card"><div class="email-when">${esc(e.when || "")}</div><div class="email-subject">${esc(e.subject || "")}</div><div class="email-preview">${esc(e.preview || "")}</div><div class="email-body">${esc(e.body || "")}</div><a class="email-cta">${esc(e.cta_label || "Click")}</a></div>`).join("")}
    </div>`).join("")}
  </div>
</section>`;
}

function renderEntryWedge(p, n, total) {
  if (!(p.recommendations || []).length) return "";
  const top = p.recommendations.slice(0, 3);
  return `<section class="section" id="wedge">
  <div class="container">
    ${sectionTag("Entry wedge · top recommendations", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">Where to start.</h2>
    ${top.map((r, i) => `<div class="position-alt"><div class="alt-tag">Rank ${r.rank || i+1} · ${esc(r.strategy || "")}</div><div class="claim">${esc(r.target_job || "")}</div><div class="citation">Score <span class="score">${r.citation_score ?? ""}</span> · ${esc(r.estimated_market_signal || "")}/100</div><p class="rationale">${esc(r.rationale || "")}<br/><br/><strong>First move:</strong> ${esc(r.first_move || "")}<br/><strong>Belief shift:</strong> ${esc(r.belief_change_required || "")}<br/><strong>Risk:</strong> ${esc(r.risk || "")}</p></div>`).join("")}
  </div>
</section>`;
}

function renderChannels(p, n, total) {
  const ch = p.channelPlan?.channels || [];
  if (!ch.length) return "";
  return `<section class="section" id="channels">
  <div class="container">
    ${sectionTag("Channel plan", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">Where the money goes.</h2>
    <div class="channel-grid">
      ${ch.map(c => `<div class="channel-card">
        <div class="ch-head"><div class="ch-name">${esc(c.channel || "")}</div><div class="ch-budget">${c.budget_pct ?? 0}% of budget</div></div>
        <div class="ch-role">${esc(c.role || "")}</div>
        <div class="ch-row"><div class="lbl">KPI</div><div>${esc(c.primary_kpi || "")}</div></div>
        <div class="ch-row"><div class="lbl">First test</div><div>${esc(c.first_test || "")}</div></div>
        <div class="ch-row"><div class="lbl">Format</div><div>${esc(c.creative_format || "")}</div></div>
        <div class="ch-row"><div class="lbl">Audience</div><div>${esc(c.audience_hook || "")}</div></div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderMatrix(p, n, total) {
  const rows = p.channelPlan?.targeting_matrix || [];
  if (!rows.length) return "";
  return `<section class="section" id="matrix">
  <div class="container">
    ${sectionTag("Targeting matrix", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">Persona × channel grid.</h2>
    <div class="matrix-table">
      <div class="matrix-row head"><div>Persona</div><div>Channel</div><div>Interests / seeds / exclusions</div><div>Creative angle</div><div>Share</div></div>
      ${rows.map(r => `<div class="matrix-row">
        <div class="pname">${esc(r.persona_name || "")}</div>
        <div class="cname">${esc(r.channel || "")}</div>
        <div>
          ${(r.interest_targets || []).length ? `<div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-muted)">Interests</strong><div class="tags">${(r.interest_targets || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>` : ""}
          ${(r.lookalike_seeds || []).length ? `<div style="margin-top:6px"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-muted)">Seeds</strong><div class="tags">${(r.lookalike_seeds || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>` : ""}
          ${(r.exclusions || []).length ? `<div style="margin-top:6px"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-muted)">Exclude</strong><div class="tags">${(r.exclusions || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>` : ""}
        </div>
        <div>${esc(r.creative_angle || "")}</div>
        <div class="share">${r.spend_share_pct ?? 0}%</div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderLanding(p, n, total) {
  const vars = p.landing?.variants || [];
  if (!vars.length) return "";
  return `<section class="section" id="landing">
  <div class="container">
    ${sectionTag("Landing variants", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${vars.length} landing pages, one per persona.</h2>
    ${vars.map(v => `<div class="landing-variant">
      <div class="lp-head">
        <div><div class="lp-id">${esc(v.variant_id || "")} · ${esc(v.persona_name || "")}</div><div class="lp-slug">/${esc(v.url_slug || "")}</div></div>
      </div>
      <div class="lp-hero">
        <h3>${esc(v.hero_headline || "")}</h3>
        <p>${esc(v.hero_sub || "")}</p>
        <span class="lp-cta-pill">${esc(v.hero_cta || "")}</span>
      </div>
      <div class="lp-proof">${(v.proof_strip || []).map(pr => `<span>${esc(pr)}</span>`).join("")}</div>
      ${(v.sections || []).map(s => `<div class="lp-section"><div class="lbl">${esc(s.label || "")}</div><h4>${esc(s.headline || "")}</h4><p>${esc(s.body || "")}</p></div>`).join("")}
      <div class="lp-foot">
        <div><div class="lbl">Visual direction</div><div>${esc(v.visual_direction || "")}</div></div>
        <div><div class="lbl">Primary KPI</div><div>${esc(v.primary_kpi || "")}</div></div>
      </div>
    </div>`).join("")}
  </div>
</section>`;
}

function renderRollout(p, n, total) {
  const phases = p.rollout?.phases || [];
  if (!phases.length) return "";
  const cadence = p.rollout?.weekly_cadence || [];
  const kills = p.rollout?.kill_criteria || [];
  return `<section class="section" id="rollout">
  <div class="container">
    ${sectionTag("90-day rollout", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">90 days, three gates.</h2>
    ${phases.map((ph, i) => `<div class="phase-card">
      <span class="ph-tag">Phase ${i+1}</span>
      <div class="ph-head"><div class="ph-theme">${esc(ph.theme || ph.phase || "")}</div><div class="ph-budget">${ph.budget_pct ?? 0}% of budget</div></div>
      <p class="ph-obj">${esc(ph.objective || "")}</p>
      <div class="ph-grid">
        <div>
          <div class="lbl">Deliverables</div>
          <ul>${(ph.deliverables || []).map(d => `<li>· ${esc(d)}</li>`).join("")}</ul>
        </div>
        <div>
          <div class="lbl">Channels live</div>
          <ul>${(ph.channels_live || []).map(c => `<li>· ${esc(c)}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="ph-kpis">${(ph.kpis || []).map(k => `<div class="ph-kpi"><div class="m">${esc(k.metric || "")}</div><div class="t">${esc(k.target || "")}</div></div>`).join("")}</div>
      <div class="ph-gate"><strong>Gate to next phase</strong>${esc(ph.gate_to_next || "")}</div>
    </div>`).join("")}
    ${(cadence.length || kills.length) ? `<div class="cadence-grid">
      ${cadence.length ? `<div class="cadence-col"><div class="h">Weekly cadence</div><ul>${cadence.map(c => `<li>· ${esc(c)}</li>`).join("")}</ul></div>` : ""}
      ${kills.length ? `<div class="cadence-col"><div class="h">Kill criteria</div><ul>${kills.map(c => `<li>· ${esc(c)}</li>`).join("")}</ul></div>` : ""}
    </div>` : ""}
  </div>
</section>`;
}

function renderCreators(p, n, total) {
  const briefs = p.creators?.creator_briefs || [];
  if (!briefs.length) return "";
  return `<section class="section" id="creators">
  <div class="container">
    ${sectionTag("Creator outreach", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${briefs.length} paid-creator packets.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary);margin-bottom:24px">Archetypes + sourcing criteria, not handles. A human sourcer matches each to a verified account before outreach.</p>
    ${briefs.map(b => `<div class="creator-card">
      <span class="cr-tag">${esc(b.packet_id || "")}</span>
      <div class="cr-head">
        <div class="cr-arch">${esc(b.creator_archetype || "")}<span class="platform">${esc(b.platform || "")}</span></div>
        <div class="cr-persona">for ${esc(b.target_persona_name || "")}</div>
      </div>
      <p class="cr-fit">${esc(b.audience_fit || "")}</p>
      <div class="cr-concept">
        <div class="lbl">Content concept</div>
        <p>${esc(b.content_concept || "")}</p>
      </div>
      ${(b.deliverables || []).length ? `<div class="cr-deliv">${(b.deliverables || []).map(d => `<span class="chip">${esc(d)}</span>`).join("")}</div>` : ""}
      <div class="cr-grid">
        <div class="cr-block">
          <div class="lbl">Sourcing criteria</div>
          <ul>${(b.sourcing_criteria || []).map(s => `<li>· ${esc(s)}</li>`).join("")}</ul>
        </div>
        <div class="cr-block">
          <div class="lbl">Talking points</div>
          <ul>${(b.talking_points || []).map(s => `<li>· ${esc(s)}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="cr-dosdont">
        <div class="cr-do">
          <div class="lbl">Do</div>
          <ul>${(b.dos || []).map(s => `<li>· ${esc(s)}</li>`).join("")}</ul>
        </div>
        <div class="cr-dont">
          <div class="lbl">Don't</div>
          <ul>${(b.donts || []).map(s => `<li>· ${esc(s)}</li>`).join("")}</ul>
        </div>
      </div>
      ${b.outreach_dm ? `<div class="cr-dm"><span class="lbl">Outreach DM template</span>${esc(b.outreach_dm)}</div>` : ""}
      <div class="cr-foot">
        <div><div class="lbl">CTA</div><div class="val">${esc(b.cta || "")}</div></div>
        <div><div class="lbl">Comp range</div><div class="val">${esc(b.comp_range || "")}</div></div>
        <div><div class="lbl">Usage rights</div><div class="val">${esc(b.usage_rights || "")}</div></div>
      </div>
      ${b.success_metric ? `<p style="margin-top:12px;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:var(--ink-secondary)">Success: ${esc(b.success_metric)}</p>` : ""}
    </div>`).join("")}
  </div>
</section>`;
}

function renderCompetitive(p, n, total) {
  const rows = p.competitive?.competitive_matrix || [];
  const axis = p.competitive?.axis_summary;
  if (!rows.length && !axis) return "";
  return `<section class="section" id="competitive">
  <div class="container">
    ${sectionTag("Competitive teardown", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${rows.length} incumbents.<br/>Where to attack each one.</h2>
    ${rows.length ? `<div class="comp-grid">
      ${rows.map(c => `<div class="comp-card">
        <div class="cp-head">
          <div class="cp-name">${esc(c.competitor_name || "")}</div>
          <div class="cp-meta">
            ${c.category_position ? `<span class="chip">${esc(c.category_position)}</span>` : ""}
            ${c.price_anchor ? `<span class="chip price">${esc(c.price_anchor)}</span>` : ""}
          </div>
          ${c.primary_promise ? `<p class="cp-promise">${esc(c.primary_promise)}</p>` : ""}
        </div>
        ${c.creative_pattern ? `<div class="cp-creative"><strong>Creative pattern:</strong> ${esc(c.creative_pattern)}</div>` : ""}
        <div class="cp-winlose">
          ${c.where_we_win ? `<div class="cp-win"><strong>Where we win:</strong> ${esc(c.where_we_win)}</div>` : ""}
          ${c.where_we_lose ? `<div class="cp-lose"><strong>Where we lose:</strong> ${esc(c.where_we_lose)}</div>` : ""}
        </div>
        ${c.wedge_to_attack ? `<div class="cp-wedge"><strong>Wedge to attack:</strong> ${esc(c.wedge_to_attack)}</div>` : ""}
        ${c.first_punch ? `<div class="cp-punch"><strong>First punch · ship in 4 weeks:</strong> ${esc(c.first_punch)}</div>` : ""}
      </div>`).join("")}
    </div>` : ""}
    ${axis ? `<div class="axis-summary">
      <span class="as-tag">Strategic thesis</span>
      <div class="as-grid">
        <div class="as-axis"><div class="lbl">X axis</div><div class="val">${esc(axis.x_axis_label || "")}</div></div>
        <div class="as-axis"><div class="lbl">Y axis</div><div class="val">${esc(axis.y_axis_label || "")}</div></div>
      </div>
      ${axis.brand_position ? `<div class="as-position"><span class="lbl">Our position on the 2D map</span>${esc(axis.brand_position)}</div>` : ""}
      ${axis.open_quadrant ? `<div class="as-open"><span class="lbl">The open quadrant</span>${esc(axis.open_quadrant)}</div>` : ""}
      ${axis.summary_sentence ? `<p class="as-summary">${esc(axis.summary_sentence)}</p>` : ""}
    </div>` : ""}
  </div>
</section>`;
}

function renderBrandAudit(p, n, total) {
  // v1.8.1 · table layout per user feedback (#20). One row per surface ·
  // columns: Surface · Priority · Current state · What works · What breaks
  // · Recommended fix. Voice consistency + discoverability still render
  // beneath as a small 2-tile strip.
  const a = p.brandAudit;
  if (!a || (!a.areas?.length && !a.audit_summary)) return "";
  const areas = a.areas || [];
  const voice = a.voice_consistency || {};
  const disc = a.discoverability || {};
  return `<section class="section" id="audit">
  <div class="container">
    ${sectionTag("Brand audit", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${areas.length} surfaces.<br/>State of the brand today.</h2>
    ${a.audit_summary ? `<p class="engine-table-caption">${esc(a.audit_summary)}</p>` : ""}
    ${areas.length ? `<table class="engine-table">
      <thead><tr>
        <th style="width:14%">Surface</th>
        <th style="width:8%">Priority</th>
        <th style="width:24%">Current state</th>
        <th style="width:18%">What works</th>
        <th style="width:18%">What breaks</th>
        <th style="width:18%">Recommended fix</th>
      </tr></thead>
      <tbody>
        ${areas.map(area => {
          const noVis = area.data_status === "no_visibility";
          const pri = noVis ? "scrape" : (area.fix_priority || "");
          const priLbl = noVis ? "scrape first" : (area.fix_priority || "");
          return `<tr>
            <td data-label="Surface" class="cell-key">${esc(area.area_name || "")}</td>
            <td data-label="Priority">${pri ? `<span class="pill-priority ${esc(pri)}">${esc(priLbl)}</span>` : ""}</td>
            ${noVis
              ? `<td data-label="Status" colspan="4" class="cell-italic"><strong>No visibility · </strong>${esc(area.scrape_hint || "Re-run Pass 0 with a PDF or screenshot of this surface to get an actual audit.")}</td>`
              : `<td data-label="Current state">${esc(area.current_state || "—")}</td>
                 <td data-label="What works">${esc(area.what_works || "—")}</td>
                 <td data-label="What breaks">${esc(area.what_breaks || "—")}</td>
                 <td data-label="Recommended fix">${esc(area.recommended_fix || "—")}${area.ulwick_anchor_job_id ? ` <span class="cell-mono">· anchor Job ${esc(String(area.ulwick_anchor_job_id))}</span>` : ""}</td>`}
          </tr>`;
        }).join("")}
      </tbody>
    </table>` : ""}
    ${(Object.keys(voice).length || Object.keys(disc).length) ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px">
      ${Object.keys(voice).length ? `<div style="padding:16px 20px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px">
        <h4 style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:10px">Voice consistency</h4>
        ${typeof voice.score === "number" ? `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px"><span style="font-family:'DM Serif Display',serif;font-size:38px;line-height:1;color:var(--moss-deep)">${voice.score}</span><span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ink-muted)">/ 10</span></div>` : ""}
        ${voice.strongest_surface ? `<div style="font-size:12.5px;line-height:1.55"><strong>Strongest:</strong> ${esc(voice.strongest_surface)}</div>` : ""}
        ${voice.weakest_surface ? `<div style="font-size:12.5px;line-height:1.55"><strong>Weakest:</strong> ${esc(voice.weakest_surface)}</div>` : ""}
        ${voice.drift_notes ? `<div style="margin-top:8px;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:var(--ink-secondary)">${esc(voice.drift_notes)}</div>` : ""}
      </div>` : ""}
      ${Object.keys(disc).length ? `<div style="padding:16px 20px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.25);border-radius:10px">
        <h4 style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:10px">Discoverability</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          ${disc.branded_search ? `<div style="padding:8px 12px;background:var(--bg-warm);border-radius:5px"><div style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px">Branded</div><div style="font-family:'DM Serif Display',serif;font-size:15px">${esc(disc.branded_search)}</div></div>` : ""}
          ${disc.unbranded_search ? `<div style="padding:8px 12px;background:var(--bg-warm);border-radius:5px"><div style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px">Unbranded</div><div style="font-family:'DM Serif Display',serif;font-size:15px">${esc(disc.unbranded_search)}</div></div>` : ""}
        </div>
        ${disc.notes ? `<p style="font-size:12.5px;line-height:1.55;font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--ink-secondary)">${esc(disc.notes)}</p>` : ""}
      </div>` : ""}
    </div>` : ""}
  </div>
</section>`;
}

function renderDemandLandscape(p, n, total) {
  const d = p.demandLandscape;
  if (!d || (!d.funnel_stages?.length && !d.demand_summary)) return "";
  const stages = d.funnel_stages || [];
  const whitespace = d.white_space_keywords || [];
  const seasonal = d.seasonal_pulse || [];
  const temp = d.category_temperature || {};
  const tempLabel = (temp.label || "").toLowerCase();
  return `<section class="section" id="demand">
  <div class="container">
    ${sectionTag("Demand landscape", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">Where the demand is.<br/>And where it's growing.</h2>
    ${temp.label ? `<div class="dl-temp">
      <div class="temp-left"><div class="lbl">Category temperature</div><div class="val ${esc(tempLabel)}">${esc(temp.label)}</div></div>
      ${temp.evidence ? `<div class="temp-evidence">${esc(temp.evidence)}</div>` : ""}
    </div>` : ""}
    ${d.demand_summary ? `<p class="dl-summary">${esc(d.demand_summary)}</p>` : ""}
    ${stages.length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">Funnel keywords · TOFU → MOFU → BOFU</h3>
    <table class="engine-table">
      <thead><tr>
        <th style="width:10%">Stage</th>
        <th style="width:24%">Keyword</th>
        <th style="width:8%">Volume</th>
        <th style="width:8%">Comp</th>
        <th style="width:30%">Wedge angle</th>
        <th style="width:20%">Audience intent</th>
      </tr></thead>
      <tbody>
        ${stages.flatMap(s => (s.top_keywords || []).map((k, i) => `<tr>
          ${i === 0 ? `<td data-label="Stage" rowspan="${(s.top_keywords || []).length}" class="cell-key" style="vertical-align:top;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-deep)">${esc(s.stage || "")}</td>` : ""}
          <td data-label="Keyword" class="cell-mono" style="font-size:13px;font-family:'DM Serif Display',serif;letter-spacing:0">${esc(k.kw || "")}</td>
          <td data-label="Volume">${esc(k.volume_estimate || "?")}</td>
          <td data-label="Comp">${esc(k.competition || "?")}</td>
          <td data-label="Wedge angle" class="cell-italic">${esc(k.wedge || "—")}</td>
          ${i === 0 ? `<td data-label="Audience intent" rowspan="${(s.top_keywords || []).length}" class="cell-italic" style="vertical-align:top">${esc(s.audience_intent || "")}</td>` : ""}
        </tr>`)).join("")}
      </tbody>
    </table>` : ""}
    ${whitespace.length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">White-space keywords · low competition, high intent</h3>
    <table class="engine-table">
      <thead><tr>
        <th style="width:28%">Keyword</th>
        <th style="width:38%">Why it's white-space</th>
        <th style="width:34%">First 2-week test</th>
      </tr></thead>
      <tbody>
        ${whitespace.map(w => `<tr>
          <td data-label="Keyword" class="cell-key" style="font-size:14px">${esc(w.kw || "")}</td>
          <td data-label="Why">${esc(w.why || "—")}</td>
          <td data-label="First test" class="cell-italic">${esc(w.first_test || "—")}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
    ${seasonal.length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">Seasonal pulse · when demand spikes</h3>
    <table class="engine-table">
      <thead><tr>
        <th style="width:28%">Period</th>
        <th style="width:18%">Lift vs baseline</th>
        <th style="width:54%">Play to run</th>
      </tr></thead>
      <tbody>
        ${seasonal.map(s => `<tr>
          <td data-label="Period" class="cell-key" style="font-size:14px">${esc(s.period || "")}</td>
          <td data-label="Lift" class="cell-mono" style="font-size:12px;font-weight:600;color:var(--moss-deep)">${esc(s.lift || "")}</td>
          <td data-label="Play">${esc(s.play || "")}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
  </div>
</section>`;
}

function renderTribe(p, n, total) {
  // v1.8.1 · table layout per user feedback (#22) · one row per creator
  // with columns: Handle · Platform · Tier · Followers · For (persona) ·
  // Audience fit · Evidence. Unverified candidates get a second table
  // with brick-red header. Sourcing queries become their own table.
  const t = p.tribe;
  if (!t || (!t.creators?.length && !t.search_paths?.length && !t.tribe_summary)) return "";
  const creators = t.creators || [];
  const verified = creators.filter(c => c.verified !== false);
  const unverified = creators.filter(c => c.verified === false);
  const paths = t.search_paths || [];
  const caveats = t.honest_caveats || [];

  const tierClass = (tier) => {
    const s = (tier || "").toLowerCase();
    if (s.includes("tier 1") || s.includes("hero")) return "t1";
    if (s.includes("tier 2") || s.includes("ugc")) return "t2";
    if (s.includes("tier 3") || s.includes("spark")) return "t3";
    if (s.includes("aspir")) return "aspirational";
    return "";
  };

  const creatorRow = (c) => `<tr${c.verified === false ? ' style="background:rgba(188,71,73,0.04)"' : ""}>
    <td data-label="Handle" class="cell-key" style="font-size:14px;color:${c.verified === false ? "var(--brick)" : "var(--moss-deep)"}">${esc(c.handle || "")}${c.verified === false ? ' <span class="unverified-tag">· unverified</span>' : ""}</td>
    <td data-label="Platform" class="cell-mono">${esc(c.platform || "")}</td>
    <td data-label="Tier">${c.tier ? `<span class="tier-chip ${tierClass(c.tier)}">${esc(c.tier)}</span>` : ""}</td>
    <td data-label="Followers" class="cell-mono">${esc(c.follower_band || "")}</td>
    <td data-label="For (persona)">${esc(c.target_persona || "—")}</td>
    <td data-label="Audience fit" class="cell-italic">${esc(c.audience_fit || c.primary_content || "—")}</td>
    <td data-label="Evidence" class="cell-mono" style="font-size:10px">${esc(c.evidence || "")}</td>
  </tr>`;

  return `<section class="section" id="tribe">
  <div class="container">
    ${sectionTag("Tribe readout", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${verified.length} verified creators.<br/>${paths.length} sourcing leads.</h2>
    ${t.tribe_summary ? `<p class="engine-table-caption">${esc(t.tribe_summary)}</p>` : ""}
    ${caveats.length ? `<div style="padding:14px 18px;background:rgba(188,71,73,0.06);border-left:3px solid var(--brick);border-radius:0 6px 6px 0;font-size:13px;line-height:1.6;margin-bottom:24px"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#7a2c2e;display:block;margin-bottom:6px">Honest caveats</strong><ul style="margin:0;padding-left:18px;color:var(--ink-secondary)">${caveats.map(c => `<li style="margin-bottom:3px">${esc(c)}</li>`).join("")}</ul></div>` : ""}
    ${verified.length ? `<table class="engine-table">
      <thead><tr>
        <th style="width:16%">Handle</th>
        <th style="width:9%">Platform</th>
        <th style="width:11%">Tier</th>
        <th style="width:10%">Followers</th>
        <th style="width:14%">For (persona)</th>
        <th style="width:22%">Audience fit</th>
        <th style="width:18%">Evidence</th>
      </tr></thead>
      <tbody>${verified.map(creatorRow).join("")}</tbody>
    </table>` : ""}
    ${unverified.length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--brick);margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--brick)">Unverified candidates · check before outreach</h3>
    <table class="engine-table">
      <thead><tr>
        <th style="width:16%">Handle</th>
        <th style="width:9%">Platform</th>
        <th style="width:11%">Tier</th>
        <th style="width:10%">Followers</th>
        <th style="width:14%">For (persona)</th>
        <th style="width:22%">Audience fit</th>
        <th style="width:18%">Evidence</th>
      </tr></thead>
      <tbody>${unverified.map(creatorRow).join("")}</tbody>
    </table>` : ""}
    ${paths.length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">Sourcing queries · for the human matcher</h3>
    <p class="engine-table-caption">Engine couldn't verify a handle for these archetypes. Run these queries (or hand them to a sourcer) before adding to the outreach list.</p>
    <table class="engine-table">
      <thead><tr>
        <th style="width:14%">Platform</th>
        <th style="width:38%">Query</th>
        <th style="width:48%">Why this query</th>
      </tr></thead>
      <tbody>
        ${paths.map(p2 => `<tr>
          <td data-label="Platform" class="cell-mono" style="font-weight:600;color:var(--moss-deep)">${esc(p2.platform || "")}</td>
          <td data-label="Query" class="cell-mono" style="font-size:12px">${esc(p2.query || "")}</td>
          <td data-label="Why">${esc(p2.why || "")}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
  </div>
</section>`;
}

function renderMethodology(p, n, total) {
  const pc = p.project_context || {};
  // v1.7.1 · auto-derive version + pass-count from the build instead of
  // hard-coding. Pass D and Pass L are counted only if their outputs exist
  // on the payload (i.e. they actually fired this run).
  const hasD = !!p.diagnostic;
  const hasL = !!(p.appliedPlaybooks?.applied_playbooks?.length);
  const passCount = 18 + (hasD ? 1 : 0) + (hasL ? 1 : 0);
  // v1.8.1 · table layout per user feedback (#23)
  // Pass-output counts go into a 2-column table (Component · Count)
  // Pass 0 sources + red flags get their own row groups beneath.
  const stats = [
    { k: "Engine version", v: ENGINE_VERSION },
    { k: "Anthropic passes", v: passCount },
    { k: "Core JTBD jobs", v: (p.mergedJobs || []).length },
    { k: "Personas", v: (p.personas || []).length },
    { k: "Swipe-file ad concepts", v: (p.swipeFile || []).length },
    { k: "Ad recreations", v: p.adRecreations?.recreations?.length || 0 },
    { k: "Ad deep-dives", v: p.adDeepDive?.deep_dive ? 1 : 0 },
    { k: "TikTok/Reels scripts", v: (p.scripts || []).length },
    { k: "Email/SMS flows", v: (p.emailFlows?.flows || []).length },
    { k: "Channels in plan", v: (p.channelPlan?.channels || []).length },
    { k: "Landing variants", v: (p.landing?.variants || []).length },
    { k: "Rollout phases", v: (p.rollout?.phases || []).length },
    { k: "Creator packets", v: (p.creators?.creator_briefs || []).length },
    { k: "Competitive teardowns", v: (p.competitive?.competitive_matrix || []).length },
    { k: "Brand-audit surfaces", v: (p.brandAudit?.areas || []).length },
    { k: "Funnel stages", v: (p.demandLandscape?.funnel_stages || []).length },
    { k: "Verified creators (Tribe)", v: (p.tribe?.creators || []).filter(c => c.verified !== false).length },
    { k: "Strategic diagnostic (Pass D)", v: hasD ? "✓" : "—" },
    { k: "Library playbooks applied (Pass L)", v: p.appliedPlaybooks?.applied_playbooks?.length || 0 },
    { k: "Hormozi Grand Slam Offer (Pass O)", v: p.hormoziOffer?.offer ? "✓" : "—" },
    { k: "Hormozi Money Model (Pass M)", v: p.hormoziMoneyModel?.money_model?.stack?.length ? `✓ · ${p.hormoziMoneyModel.money_model.stack.length} offers stacked` : "—" },
    { k: "Hormozi Lead Model (Pass G)", v: p.hormoziLeadModel?.lead_model ? `✓ · ${p.hormoziLeadModel.lead_model.archetype || ""}` : "—" },
  ];
  return `<section class="section" id="method">
  <div class="container">
    ${sectionTag("Methodology", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">How this was made.</h2>
    <p class="engine-table-caption">Engine ${ENGINE_VERSION} · ${passCount} Anthropic passes · methodology fuses ODI/JTBD (Ulwick) + PM101 (Maturity/Sophistication/Awareness) + Hormozi $100M trilogy (Offers/Leads/Money Models) + Cialdini Persuasion Principles (when surfaced via Pass L vault).</p>
    <table class="engine-table" style="max-width:680px">
      <thead><tr>
        <th style="width:60%">Component</th>
        <th style="width:40%">Count / Status</th>
      </tr></thead>
      <tbody>
        ${stats.map(s => `<tr>
          <td data-label="Component" class="cell-key" style="font-size:13px">${esc(s.k)}</td>
          <td data-label="Count" class="cell-mono" style="font-size:13px;font-weight:600;color:var(--moss-deep)">${esc(String(s.v))}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ${(pc.sources || []).length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">Sources fed into Pass 0</h3>
    <table class="engine-table" style="max-width:680px">
      <thead><tr>
        <th style="width:6%">#</th>
        <th style="width:94%">Source</th>
      </tr></thead>
      <tbody>
        ${(pc.sources || []).map((s, i) => `<tr>
          <td data-label="#" class="cell-mono">${i + 1}</td>
          <td data-label="Source" class="cell-mono" style="font-size:12px">${esc(s)}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
    ${(pc.red_flags || []).length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--brick);margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--brick)">⚑ Red flags</h3>
    <table class="engine-table" style="max-width:680px">
      <thead><tr>
        <th style="width:6%">#</th>
        <th style="width:94%">Flag</th>
      </tr></thead>
      <tbody>
        ${(pc.red_flags || []).map((f, i) => `<tr>
          <td data-label="#" class="cell-mono" style="color:var(--brick)">${i + 1}</td>
          <td data-label="Flag" style="font-size:13px">${esc(f)}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
  </div>
</section>`;
}

function renderColophon(p, n, total) {
  // v1.8.1 · trimmed per user feedback (#24) · was 2 paragraphs of
  // "methodology recap + hypothesis disclaimer" · user said "the last
  // paragraph is enough" so we keep only the closing line.
  return `<section class="section" id="colophon">
  <div class="container">
    ${sectionTag("Colophon", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">The makers.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary);font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18px;line-height:1.55">This document is a starting position, not a finish line. Each section is a hypothesis to test against real attention, real spend, and real customers.</p>
  </div>
</section>`;
}

// ─────────────────────────────────────────────────────────────
// v1.8.0 · HORMOZI CORE RENDERERS (Phase A · MINIMAL STUB)
// §01 The Offer · §02 The Money Model · §03 The Lead Model
//
// Phase A ships stub renderers that surface the data structurally
// but don't have the polished design of Phase B. Each stub is
// functional · readable · prints reasonably under @media print.
// Phase B (next ship · ~3-4 days) replaces these with branded
// renderers featuring Value Equation visualization, money-flow
// diagram, Core Four 2×2 matrix, etc.
// ─────────────────────────────────────────────────────────────

function renderHormoziOffer(p, n, total) {
  const off = p.hormoziOffer?.offer;
  if (!off) return "";
  const ve = off.value_equation || {};
  const enh = off.enhancements || {};
  const sc = off.starving_crowd_check || {};
  return `<section class="section" id="offer">
  <div class="container">
    ${sectionTag("The Offer · Grand Slam", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${esc(off.name || "Grand Slam Offer")}.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-primary);font-style:italic;font-family:'Cormorant Garamond',serif;margin-bottom:32px">${escEm(off.one_line_pitch || "")}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px">
      <div style="padding:18px 22px;background:rgba(56,102,65,0.08);border-left:3px solid var(--moss-deep);border-radius:0 8px 8px 0">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:8px">↑ Dream Outcome (maximize)</div>
        <div style="font-size:14px;line-height:1.6">${esc(ve.dream_outcome || "")}</div>
      </div>
      <div style="padding:18px 22px;background:rgba(56,102,65,0.08);border-left:3px solid var(--moss-deep);border-radius:0 8px 8px 0">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:8px">↑ Perceived Likelihood (maximize)</div>
        <div style="font-size:14px;line-height:1.6">${esc(ve.perceived_likelihood || "")}</div>
      </div>
      <div style="padding:18px 22px;background:rgba(188,71,73,0.06);border-left:3px solid var(--brick);border-radius:0 8px 8px 0">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--brick);margin-bottom:8px">↓ Time Delay (minimize → 0)</div>
        <div style="font-size:14px;line-height:1.6">${esc(ve.time_delay || "")}</div>
      </div>
      <div style="padding:18px 22px;background:rgba(188,71,73,0.06);border-left:3px solid var(--brick);border-radius:0 8px 8px 0">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--brick);margin-bottom:8px">↓ Effort &amp; Sacrifice (minimize → 0)</div>
        <div style="font-size:14px;line-height:1.6">${esc(ve.effort_sacrifice || "")}</div>
      </div>
    </div>

    <div style="padding:18px 24px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:10px;margin-bottom:20px">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:6px">Value Equation Verdict · ${esc(ve.verdict || "?")}</div>
      <div style="font-size:13.5px;line-height:1.65;color:var(--ink-primary)">${esc(ve.rationale || "")}</div>
      ${ve.biggest_unlock ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(106,153,78,0.3);font-size:13px;line-height:1.55"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;color:var(--moss-mid)">Biggest unlock · weakest lever: ${esc(ve.weakest_lever || "?")}</strong><div style="margin-top:4px">${esc(ve.biggest_unlock)}</div></div>` : ""}
    </div>

    <div class="ar-prompt-block" style="margin-bottom:20px">
      <div class="lbl">Enhancement layers · per $100M Offers ch 11-16</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:10px">
        ${enh.scarcity ? `<div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)">Scarcity · ${esc(enh.scarcity.type || "")}</strong><div style="font-size:12px;line-height:1.5;margin-top:3px">${esc(enh.scarcity.spec || "")}</div></div>` : ""}
        ${enh.urgency ? `<div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)">Urgency · ${esc(enh.urgency.mechanism || "")}</strong><div style="font-size:12px;line-height:1.5;margin-top:3px">${esc(enh.urgency.spec || "")}</div></div>` : ""}
        ${enh.guarantee ? `<div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)">Guarantee · ${esc(enh.guarantee.type || "")}</strong><div style="font-size:12px;line-height:1.5;margin-top:3px">${esc(enh.guarantee.terms || "")}</div></div>` : ""}
        ${enh.naming?.final_offer_name ? `<div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)">Named · MAGIC</strong><div style="font-size:12px;line-height:1.5;margin-top:3px;font-family:'DM Serif Display',serif;font-size:14px">${esc(enh.naming.final_offer_name)}</div></div>` : ""}
      </div>
      ${(enh.bonuses || []).length ? `<div style="margin-top:14px"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:6px">Bonuses · each removes an objection</strong>${enh.bonuses.map(b => `<div style="padding:6px 0;border-bottom:1px solid rgba(106,153,78,0.15);font-size:12.5px"><strong>${esc(b.name || "")}</strong> ${b.anchored_value_usd ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--moss-mid)">${esc(b.anchored_value_usd)}</span>` : ""} · removes <em>${esc(b.removes_objection || "")}</em></div>`).join("")}</div>` : ""}
    </div>

    <div style="padding:14px 18px;background:var(--bg-warm);border-radius:7px;margin-bottom:20px">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);margin-bottom:8px">Starving Crowd check · per $100M Offers ch 4</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;font-size:12px;line-height:1.55">
        <div><strong>Pain</strong><br>${esc(sc.massive_pain || "?")}</div>
        <div><strong>Power</strong><br>${esc(sc.purchasing_power || "?")}</div>
        <div><strong>Target</strong><br>${esc(sc.easy_to_target || "?")}</div>
        <div><strong>Growth</strong><br>${esc(sc.growing || "?")}</div>
      </div>
      <div style="margin-top:10px;font-size:13px;font-family:'DM Serif Display',serif">Verdict: <span style="color:${sc.verdict === "starving" ? "var(--moss-deep)" : sc.verdict === "sated" ? "var(--brick)" : "var(--ink-secondary)"}">${esc(sc.verdict || "?")}</span></div>
    </div>

    <div style="font-size:11px;color:var(--ink-muted);font-family:'IBM Plex Mono',monospace">
      Anchored to ${esc(off.persona_anchor || "?")} · outcome: ${esc(off.outcome_anchor || "?")}
    </div>
  </div>
</section>`;
}

function renderHormoziMoneyModel(p, n, total) {
  const mm = p.hormoziMoneyModel?.money_model;
  if (!mm) return "";
  const cfa = mm.cfa_analysis || {};
  return `<section class="section" id="money-model">
  <div class="container">
    ${sectionTag("The Money Model", n, total)}
    <h2 class="display-lg" style="margin-bottom:8px">${esc(mm.archetype || "Money Model")}.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary);margin-bottom:24px">${esc(mm.summary || "")}</p>

    <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:24px">
      ${(mm.stack || []).map((s, i) => `<div style="display:grid;grid-template-columns:60px 1fr;gap:18px;padding:20px 22px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:10px">
        <div style="font-family:'DM Serif Display',serif;font-size:42px;color:var(--moss-mid);line-height:1">${String(s.position || i+1).padStart(2,"0")}</div>
        <div>
          <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:8px;flex-wrap:wrap">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);background:rgba(56,102,65,0.1);padding:3px 9px;border-radius:4px">${esc(s.category || "")}</span>
            <span style="font-family:'DM Serif Display',serif;font-size:17px">${esc(s.type || "")}</span>
          </div>
          <div style="font-size:13.5px;line-height:1.6;margin-bottom:10px">${esc(s.specifics || "")}</div>
          ${s.economics ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;padding:10px 12px;background:var(--bg-warm);border-radius:6px;font-size:12px;line-height:1.5">
            <div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-muted)">Price</strong><br>${esc(s.economics.price_usd || "?")}</div>
            <div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-muted)">Take rate</strong><br>${esc(s.economics.expected_take_rate || "?")}</div>
            <div><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-muted)">Margin</strong><br>${esc(s.economics.margin_pct || "?")}</div>
          </div>
          ${s.economics.expected_take_rate_basis || s.economics.margin_basis ? `<div style="margin-top:6px;padding:8px 12px;background:rgba(200,164,92,0.08);border-left:2px solid #c8a45c;border-radius:0 4px 4px 0;font-size:11px;line-height:1.5;color:var(--ink-secondary);font-family:'Cormorant Garamond',serif;font-style:italic">${s.economics.expected_take_rate_basis ? `<div><strong style="font-family:'IBM Plex Mono',monospace;font-style:normal;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#7a5e1e">Take-rate basis:</strong> ${esc(s.economics.expected_take_rate_basis)}</div>` : ""}${s.economics.margin_basis ? `<div style="${s.economics.expected_take_rate_basis ? "margin-top:4px" : ""}"><strong style="font-family:'IBM Plex Mono',monospace;font-style:normal;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#7a5e1e">Margin basis:</strong> ${esc(s.economics.margin_basis)}</div>` : ""}</div>` : ""}` : ""}
          ${s.first_test ? `<div style="margin-top:8px;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12.5px;color:var(--ink-secondary)">First test: ${esc(s.first_test)}</div>` : ""}
          ${s.target_persona ? `<div style="margin-top:6px;font-size:11px;color:var(--ink-muted);font-family:'IBM Plex Mono',monospace">Anchor: ${esc(s.target_persona)} · ${esc(s.target_outcome || "")}</div>` : ""}
        </div>
      </div>`).join("")}
    </div>

    <div style="padding:18px 24px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:10px;margin-bottom:20px">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:10px">CFA · Client-Funded Acquisition · ${esc(cfa.cfa_status || "?")}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;font-size:13px;line-height:1.55">
        <div><strong>CAC target</strong><br>${esc(cfa.cac_target_usd || "?")}</div>
        <div><strong>First offer net</strong><br>${esc(cfa.first_offer_revenue_usd || "?")}</div>
        <div><strong>Cumulative LTV</strong><br>${esc(cfa.cumulative_ltv_usd || "?")}</div>
        <div><strong>LTV : CAC</strong><br>${esc(cfa.ltv_cac_ratio || "?")}</div>
      </div>
      ${cfa.lever_to_pull ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(106,153,78,0.3);font-size:13px;line-height:1.6;font-family:'Cormorant Garamond',serif;font-style:italic">Next lever to pull: ${esc(cfa.lever_to_pull)}</div>` : ""}
    </div>

    <div style="font-size:11px;color:var(--ink-muted);font-family:'IBM Plex Mono',monospace">
      Anchored to ${esc(mm.persona_anchor || "?")} · outcome: ${esc(mm.outcome_anchor || "?")}
    </div>
  </div>
</section>`;
}

function renderHormoziLeadModel(p, n, total) {
  const lm = p.hormoziLeadModel?.lead_model;
  if (!lm) return "";
  return `<section class="section" id="lead-model">
  <div class="container">
    ${sectionTag("The Lead Model", n, total)}
    <h2 class="display-lg" style="margin-bottom:8px">${esc(lm.archetype || "Lead Model")}.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary);margin-bottom:24px">${esc(lm.summary || "")}</p>

    <div style="margin-bottom:24px">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">Core Four · primary channels</div>
      ${(lm.core_four_selection || []).map(c => `<div style="padding:18px 22px;background:var(--bg-base);border:1px solid rgba(106,153,78,0.3);border-radius:10px;margin-bottom:12px">
        <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:8px;flex-wrap:wrap">
          <span style="font-family:'DM Serif Display',serif;font-size:18px">${esc(c.type || "")}</span>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);background:var(--bg-warm);padding:3px 9px;border-radius:4px">${esc(c.platform || "")}</span>
          ${c.budget_or_time_per_week ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ink-muted)">${esc(c.budget_or_time_per_week)}</span>` : ""}
        </div>
        <div style="font-size:13px;line-height:1.6;margin-bottom:10px">${esc(c.rationale || "")}</div>
        ${(c.first_30_days || []).length ? `<div style="margin-bottom:8px"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)">First 30 days</strong><ul style="margin:4px 0 0 18px;font-size:12px;line-height:1.55">${c.first_30_days.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>` : ""}
        ${c.skill_or_volume_gap ? `<div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12.5px;color:var(--ink-secondary)">Gap to close: ${esc(c.skill_or_volume_gap)}</div>` : ""}
      </div>`).join("")}
    </div>

    ${(lm.lead_getters || []).length ? `<div style="margin-bottom:24px">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">Lead Getters · scale-stage amplifiers</div>
      ${lm.lead_getters.map(g => `<div style="padding:14px 18px;background:var(--bg-warm);border-radius:7px;margin-bottom:10px;font-size:12.5px;line-height:1.55">
        <div style="font-family:'DM Serif Display',serif;font-size:15px;margin-bottom:4px">${esc(g.type || "")}</div>
        <div><strong>Activate:</strong> ${esc(g.when_to_activate || "?")}</div>
        <div><strong>Comp:</strong> ${esc(g.comp_structure || "?")}</div>
        <div><strong>KPI:</strong> ${esc(g.first_kpi || "?")}</div>
        ${g.specifics ? `<div style="margin-top:6px;font-family:'Cormorant Garamond',serif;font-style:italic">${esc(g.specifics)}</div>` : ""}
        ${g.relationship_spend_monthly_usd ? `<div style="margin-top:8px;padding:8px 12px;background:rgba(56,102,65,0.08);border-left:3px solid var(--moss-deep);border-radius:0 4px 4px 0"><strong style="color:var(--moss-deep)">Relationship spend / month:</strong> ${esc(g.relationship_spend_monthly_usd)}</div>` : ""}
        ${g.first_quarter_relationship_calendar ? `<div style="margin-top:6px;padding:8px 12px;background:var(--bg-base);border-radius:4px;font-size:12px;font-family:'Cormorant Garamond',serif;font-style:italic;line-height:1.55"><strong style="font-family:'IBM Plex Mono',monospace;font-style:normal;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:4px">First quarter relationship calendar</strong>${esc(g.first_quarter_relationship_calendar)}</div>` : ""}
      </div>`).join("")}
    </div>` : ""}

    ${(lm.lead_magnets || []).length ? `<div style="margin-bottom:20px">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-deep);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--moss-deep)">Lead Magnets · 3 types × 4 formats</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
        ${lm.lead_magnets.map(m => `<div style="padding:16px 20px;background:linear-gradient(135deg,rgba(56,102,65,0.06),rgba(167,201,87,0.08));border:1px dashed rgba(56,102,65,0.45);border-radius:8px">
          <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:2px 7px;background:rgba(56,102,65,0.15);color:var(--moss-deep);border-radius:3px">${esc(m.type || "")}</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:2px 7px;background:var(--bg-warm);color:var(--ink-secondary);border-radius:3px">${esc(m.format || "")}</span>
          </div>
          <div style="font-family:'DM Serif Display',serif;font-size:17px;line-height:1.2;margin-bottom:6px">${esc(m.title || "")}</div>
          <div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:13px;color:var(--ink-secondary);margin-bottom:10px">${esc(m.promise || "")}</div>
          <div style="font-size:12px;line-height:1.55;margin-bottom:8px"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)">Delivery</strong>: ${esc(m.delivery_mechanism || "")}</div>
          <div style="font-size:12px;line-height:1.55;margin-bottom:8px"><strong style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--moss-mid)">Solves</strong>: ${esc(m.narrow_problem_solved || "")}</div>
          ${m.first_test ? `<div style="font-size:11.5px;line-height:1.5;color:var(--ink-secondary);padding-top:8px;border-top:1px solid rgba(106,153,78,0.2);font-family:'Cormorant Garamond',serif;font-style:italic">First test: ${esc(m.first_test)}</div>` : ""}
        </div>`).join("")}
      </div>
    </div>` : ""}

    <div style="font-size:11px;color:var(--ink-muted);font-family:'IBM Plex Mono',monospace">
      Anchored to ${esc(lm.persona_anchor || "?")} · outcome: ${esc(lm.outcome_anchor || "?")}
    </div>
  </div>
</section>`;
}

// ── §00 Strategic Context (Pass D · v1.7.0) ──
// Note: signature is (p, totalSections, n) to match buildSectionMap dispatch.
// Defaults n to 0 because §00 is conventionally rendered as "00 / TOTAL".
function renderStrategicContext(p, totalSections, n = 0) {
  const d = p.diagnostic;
  if (!d) return "";
  const bm = d.business_model || {};
  const mat = d.market_maturity || {};
  const soph = d.market_sophistication || {};
  const journey = d.emotional_journey || {};
  const arch = d.recommended_archetype || {};
  const warn = p.diagnostic?._override_warning || (bm.is_supported === false ? `This project classifies as ${bm.primary} which isn't yet supported (coming in phase ${bm.phase_target}). You've consciously overridden to generate a DTC-shaped doc anyway. Read with the fit gap in mind: ICPs may read like consumer personas, channel mix may skew DTC, etc. Use as starting scaffolding, not a finished SaaS/Services/etc. plan.` : "");
  const warnTriggered = bm.is_supported === false;

  return `<section class="section" id="strategic">
  <div class="container">
    ${sectionTag("Strategic Context", n, totalSections)}
    <h2 class="display-lg" style="margin-bottom:16px">The diagnostic.<br/>Four axes, before any creative.</h2>
    ${warnTriggered ? `<div class="strat-ctx-warning"><strong>⚠ Override · fit gap acknowledged</strong>${esc(warn)}</div>` : ""}
    <div class="strat-ctx-bm"><strong>Business model</strong>${esc(bm.primary || "")} · confidence ${typeof bm.confidence === "number" ? Math.round(bm.confidence * 100) + "%" : "—"}${bm.evidence ? ` · ${esc(bm.evidence)}` : ""}</div>
    <div class="strat-ctx-grid">
      <div class="strat-ctx-tile">
        <div class="lbl">Market Maturity</div>
        <div class="stage">Stage ${esc(String(mat.stage || "?"))}</div>
        <div class="stage-label">${esc(mat.stage_label || "")}</div>
        <p class="rationale">${esc(mat.positioning_implication || mat.rationale || "")}</p>
      </div>
      <div class="strat-ctx-tile">
        <div class="lbl">Market Sophistication</div>
        <div class="stage">Stage ${esc(String(soph.stage || "?"))}</div>
        <div class="stage-label">${esc(soph.stage_label || "")}</div>
        <p class="rationale">${esc(soph.messaging_approach || soph.rationale || "")}</p>
      </div>
      <div class="strat-ctx-tile">
        <div class="lbl">Awareness Distribution</div>
        <div class="stage" style="font-size:14px;line-height:1.5;color:var(--ink-primary)">
          ${(() => {
            const aw = d.awareness_distribution || {};
            const labels = { unaware: "Unaware", problem_aware: "Problem", outcome_aware: "Outcome", use_case_aware: "Use Case", product_category_aware: "Category", product_aware: "Product", most_aware: "Most" };
            return Object.entries(labels).map(([k, lbl]) => `${lbl}: ${Math.round((aw[k] || 0) * 100)}%`).join(" · ");
          })()}
        </div>
      </div>
    </div>
    <div class="strat-ctx-journey">
      <div class="from-state">
        <div class="lbl">From</div>
        <div class="val">${esc(journey.from_state || "?")}</div>
        <div class="paradigm">${esc(journey.from_paradigm || "")} paradigm</div>
      </div>
      <div class="arrow">→</div>
      <div class="to-state">
        <div class="lbl">To</div>
        <div class="val">${esc(journey.to_state || "?")}</div>
        <div class="paradigm">${esc(journey.to_paradigm || "")} paradigm</div>
      </div>
    </div>
    <div class="strat-ctx-archetype">
      <div class="archetype-pill">${esc(arch.primary || "")}</div>
      <p class="archetype-rationale">${esc(arch.rationale || "")}${arch.alternative ? ` · alternative: ${esc(arch.alternative)}` : ""}</p>
    </div>
  </div>
</section>`;
}

// ── §-near-end · Applied Playbooks (Pass L · v1.7.0) ──
function renderAppliedPlaybooks(p, totalSections, sectionNum) {
  const books = p.appliedPlaybooks?.applied_playbooks || [];
  if (!books.length) return "";
  return `<section class="section" id="playbooks">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ ${String(sectionNum).padStart(2,"0")} · Applied Playbooks</span><span class="section-number">${String(sectionNum).padStart(2,"0")} / ${totalSections}</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">${books.length} playbooks from your library.<br/>Each anchored to a persona + outcome.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary);margin-bottom:24px">Selected from your Obsidian concept vault, ranked by archetype priors, applied to this brand's diagnostic + positioning + personas. Every card cites a real persona AND a real Ulwick outcome · no fabrication.</p>
    <div class="playbook-grid">
      ${books.map((b) => `<div class="playbook-card">
        <div class="pb-head">
          <div class="pb-name">${esc(b.name || "")}</div>
          ${b.theme ? `<span class="pb-theme">${esc(b.theme)}</span>` : ""}
        </div>
        ${b.why_it_applies ? `<p class="pb-why">${esc(b.why_it_applies)}</p>` : ""}
        <div class="pb-anchors">
          ${b.anchored_to_persona ? `<div class="a-row"><span class="lbl">Persona</span>${esc(b.anchored_to_persona)}</div>` : ""}
          ${b.anchored_to_outcome ? `<div class="a-row"><span class="lbl">Outcome</span>${esc(b.anchored_to_outcome)}</div>` : ""}
        </div>
        ${b.first_move ? `<div class="pb-first"><strong>First move · ships in 2 weeks</strong>${esc(b.first_move)}</div>` : ""}
        <div class="pb-foot">
          ${b.owner ? `<div><span class="lbl">Owner</span>${esc(b.owner)}</div>` : ""}
          ${b.kpi ? `<div><span class="lbl">KPI</span>${esc(b.kpi)}</div>` : ""}
          ${b.success_signal ? `<div><span class="lbl">Success</span>${esc(b.success_signal)}</div>` : ""}
        </div>
        ${(b.references || []).length ? `<p class="pb-source">${esc(b.references[0])}</p>` : ""}
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// v1.9.1 · section_id → display label · used by the PE-deck agenda
// (contents) slide. Keep in sync with the sectionTag() names each
// renderer emits.
const SECTION_LABELS = {
  strategic_context: "Strategic Context",
  offer: "The Offer · Grand Slam",
  money_model: "The Money Model",
  lead_model: "The Lead Model",
  positioning: "Positioning",
  evidence: "Evidence",
  value_prop: "Value-prop comparison",
  personas: "Personas",
  swipe_file: "Swipe file",
  ad_recreations: "Ad recreations",
  ad_deep_dive: "Ad deep dive",
  scripts: "TikTok scripts",
  email_flows: "Email flows",
  sms_sequences: "SMS sequences",
  partner_referrals: "Partner referrals",
  trust_stack_audit: "Trust-stack audit",
  gbp_audit: "GBP audit",
  customer_quote_wall: "Customer quote wall",
  entry_wedge: "Entry wedge",
  channels: "Channel plan",
  matrix: "Targeting matrix",
  landing: "Landing variants",
  rollout: "90-day rollout",
  creators: "Creator outreach",
  competitive: "Competitive teardown",
  brand_audit: "Brand audit",
  demand: "Demand landscape",
  tribe: "Tribe readout",
  applied_playbooks: "Applied playbooks",
  methodology: "Methodology",
  colophon: "Colophon",
};

// v1.9.1 · PE-firm agenda / contents slide. Renders right after the
// cover. Lists every section that actually rendered (survivors) with
// its gapless sequential number. Two-column layout for long decks.
function renderTableOfContents(survivors, offset, projectName) {
  if (!survivors.length) return "";
  const items = survivors.map((sid, i) => ({
    num: String(i + offset).padStart(2, "0"),
    label: SECTION_LABELS[sid] || sid.replace(/_/g, " "),
  }));
  return `<section class="section toc-slide" id="contents">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">Agenda</span><span class="section-number">${esc(projectName)} · Phase 1 Strategy</span></div>
    <h2 class="display-lg" style="margin-bottom:28px">Contents.</h2>
    <div class="toc-grid">
      ${items.map(it => `<div class="toc-row"><span class="toc-num">${it.num}</span><span class="toc-label">${esc(it.label)}</span></div>`).join("")}
    </div>
  </div>
</section>`;
}

// ── Section ID → renderer dispatch (v1.7.0 · refined v1.7.1) ──
// Section order is driven by `diagnostic.business_model.doc_sections`
// from the registry. Every renderer receives (payload, n, total) and
// emits its own § NN · NAME / NN / TOTAL tag via `sectionTag()`.
// Unknown section IDs are skipped with console.warn.
function buildSectionMap(payload, totalSections) {
  const t = totalSections;
  return {
    strategic_context: (n) => renderStrategicContext(payload, t, n),
    // v1.8.0 · Hormozi Core · 3 new universal top-of-doc sections
    offer:             (n) => renderHormoziOffer(payload, n, t),
    money_model:       (n) => renderHormoziMoneyModel(payload, n, t),
    lead_model:        (n) => renderHormoziLeadModel(payload, n, t),
    positioning:       (n) => renderPositioning(payload, n, t),
    evidence:          (n) => renderEvidence(payload, n, t),
    value_prop:        (n) => renderValueProp(payload, n, t),
    personas:          (n) => renderPersonas(payload, n, t),
    swipe_file:        (n) => renderSwipe(payload, n, t),
    ad_recreations:    (n) => renderAdRecreations(payload, n, t),
    ad_deep_dive:      (n) => renderAdDeepDive(payload, n, t),
    scripts:           (n) => renderScripts(payload, n, t),
    email_flows:       (n) => renderEmails(payload, n, t),
    entry_wedge:       (n) => renderEntryWedge(payload, n, t),
    channels:          (n) => renderChannels(payload, n, t),
    matrix:            (n) => renderMatrix(payload, n, t),
    landing:           (n) => renderLanding(payload, n, t),
    rollout:           (n) => renderRollout(payload, n, t),
    creators:          (n) => renderCreators(payload, n, t),
    competitive:       (n) => renderCompetitive(payload, n, t),
    brand_audit:       (n) => renderBrandAudit(payload, n, t),
    demand:            (n) => renderDemandLandscape(payload, n, t),
    tribe:             (n) => renderTribe(payload, n, t),
    applied_playbooks: (n) => renderAppliedPlaybooks(payload, t, n),
    methodology:       (n) => renderMethodology(payload, n, t),
    colophon:          (n) => renderColophon(payload, n, t),
  };
}

// ── Main entry ──
export const TOTAL_SECTIONS = 21; // DTC archetype default. Other archetypes override via diagnostic.business_model.doc_sections.length
// v1.7.1 · single source of truth for the version stamp · used by cover,
// methodology, and footer. Bump this in one place per release.
export const ENGINE_VERSION = "v1.10.0";

export function composeStrategyDoc(payload) {
  const project_name = payload.project_name || payload.project_context?.sector || "Strategy Doc";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${esc(project_name)} — Phase 1 Strategy</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<style>${TOKENS}</style>
</head>
<body>
<nav class="top">
  <div class="container">
    <a href="#cover" class="wordmark">${esc(project_name.split(/\s/)[0] || "BRAND")}</a>
    <div class="nav-links">
      <a href="#strategic">Strategic</a><a href="#offer">Offer</a><a href="#money-model">Money</a><a href="#lead-model">Leads</a><a href="#position">Position</a><a href="#evidence">Evidence</a><a href="#vp">Value Prop</a><a href="#personas">Personas</a><a href="#swipe">Swipe</a><a href="#recreations">Recreations</a><a href="#deepdive">Deep Dive</a><a href="#scripts">Scripts</a><a href="#email">Email</a><a href="#wedge">Wedge</a><a href="#channels">Channels</a><a href="#matrix">Matrix</a><a href="#landing">Landing</a><a href="#rollout">Rollout</a><a href="#creators">Creators</a><a href="#competitive">Competitive</a><a href="#audit">Audit</a><a href="#demand">Demand</a><a href="#tribe">Tribe</a><a href="#playbooks">Playbooks</a><a href="#method">Method</a>
    </div>
  </div>
</nav>
${(() => {
  // v1.7.0 · section order driven by diagnostic.business_model.doc_sections.
  // Falls back to a default order if no diagnostic is present.
  const defaultOrder = [
    "offer","money_model","lead_model",
    "positioning","evidence","value_prop","personas","swipe_file","ad_recreations","ad_deep_dive","scripts","email_flows",
    "entry_wedge","channels","matrix","landing","rollout","creators","competitive",
    "brand_audit","demand","tribe","methodology","colophon",
  ];
  const order = payload.diagnostic?.business_model?.doc_sections || defaultOrder;
  const offset = payload.diagnostic ? 0 : 1;

  // v1.9.1 · TWO-PASS render for gapless numbering + accurate agenda.
  // PASS 1 · probe which sections actually render (non-empty). Sections
  // that drop silently (partial_support pending sections · empty data)
  // no longer leave numbering gaps. PASS 2 · render survivors with
  // sequential gapless numbers + a total that reflects only what ships.
  const errorCallout = (sid, n, total, e) => {
    const nn = String(n).padStart(2, "0");
    const tt = String(total).padStart(2, "0");
    console.error(`[compose-strategy] renderer "${sid}" threw at §${nn}:`, e);
    return `<section class="section" id="${esc(sid)}-error">
  <div class="container">
    <div class="section-tag-row"><span class="section-name" style="color:#bc4749">§ ${nn} · ${esc(sid)} · render error</span><span class="section-number">${nn} / ${tt}</span></div>
    <div style="padding:18px 22px;background:rgba(188,71,73,0.08);border:1px dashed #bc4749;border-radius:8px;font-family:'IBM Plex Mono',monospace;font-size:12px;line-height:1.6;color:#7a2c2e">
      <strong style="display:block;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:8px">Section render error · section_id=${esc(sid)}</strong>
      ${esc(e?.message || String(e))}
      <div style="margin-top:10px;color:var(--ink-muted);font-style:italic">The rest of the deck still rendered. Check browser console for full stack trace.</div>
    </div>
  </div>
</section>`;
  };

  // PASS 1 · probe emptiness (number + total irrelevant here)
  const probeMap = buildSectionMap(payload, order.length);
  const survivors = order.filter((sid) => {
    const fn = probeMap[sid];
    if (!fn) { console.warn(`[compose-strategy] unknown section id: ${sid}`); return false; }
    try { const h = fn(0); return !!(h && h.trim().length); }
    catch { return true; /* keep · pass 2 shows the error callout */ }
  });

  // PASS 2 · render survivors with gapless sequential numbers
  const total = survivors.length;
  const sectionMap = buildSectionMap(payload, total);
  const toc = renderTableOfContents(survivors, offset, project_name);
  let n = offset;
  const body = survivors.map((sid) => {
    const cur = n; n++;
    const fn = sectionMap[sid];
    try { return fn(cur); }
    catch (e) { return errorCallout(sid, cur, total, e); }
  }).join("\n");

  return renderCover(payload, project_name)
    + `\n<div class="container"><div class="hairline"></div></div>\n`
    + toc
    + body;
})()}
<footer><div class="container"><div class="wordmark" style="font-size:48px">${esc(project_name.split(/\s/)[0] || "BRAND")}</div><p class="footer-meta" style="margin-top:12px">Generated by Alchemical Growth Engine ${ENGINE_VERSION} · Mode 1 Earth</p></div></footer>
</body>
</html>`;
}

// v1.9.1 · LEGACY · kept for the resume edge-case + any caller that
// still wants the raw .html. NOT used by the main flow anymore — the
// engine is PDF-deck-only as of v1.9.1.
export function downloadStrategyDoc(html, filename = "strategy.html") {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// v1.9.1 · PRIMARY OUTPUT · print the composed strategy doc straight to
// the browser's PDF engine via a hidden iframe. No .html file ever
// touches disk. The doc's own inlined <style> (including the PE-deck
// @media print block · A4 landscape · page-per-section) governs the
// printed layout — printing the iframe's contentWindow applies the
// iframe document's @page + @media print rules, NOT the parent React
// app's. Auto-cleanup after the print dialog resolves.
//
// onReady(ok, reason) callback lets the caller log success/failure.
export function printStrategyDoc(html, { onReady } = {}) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const fire = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        onReady?.(true);
      } catch (e) {
        onReady?.(false, e.message);
      }
      // Remove the iframe after the print dialog has had time to open.
      // (The dialog is modal · removal won't interrupt an in-progress
      // save. 60s covers slow "Save as PDF" navigation.)
      setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 60000);
    };

    // Print once the iframe doc + its webfonts/images have loaded.
    // onload alone sometimes fires before fonts settle · add a short
    // settle delay. Fallback timer in case onload never fires.
    iframe.onload = () => setTimeout(fire, 700);
    setTimeout(fire, 2500); // hard fallback
    return true;
  } catch (e) {
    onReady?.(false, e.message);
    return false;
  }
}
