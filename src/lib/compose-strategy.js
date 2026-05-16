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
.ev-row{display:grid;grid-template-columns:60px 1fr 80px 80px 90px;gap:16px;padding:18px 24px;border-bottom:1px solid rgba(106,153,78,.25);align-items:start;font-size:12px}
.ev-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.ev-row .job-id{font-family:"DM Serif Display",serif;font-size:20px;color:var(--moss-mid)}
.ev-row .num,.ev-row .opp{font-family:"DM Serif Display",serif;font-size:20px}
.ev-row .opp{font-size:22px;font-weight:500}
.ev-row.underserved .opp{color:#bc4749}
.ev-row .anchor-quote{grid-column:2/-1;margin-top:8px;padding:8px 12px;background:var(--bg-card);border-left:2px solid var(--moss-deep);border-radius:0 4px 4px 0;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px}
.ev-row .outcome .ulwick{display:block;margin-top:6px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary)}
@media (max-width:720px){.ev-row,.ev-row.head{grid-template-columns:1fr;gap:6px}.ev-row.head{display:none}}
.vp-row{display:grid;grid-template-columns:140px 1.8fr 1fr 1fr 1.4fr;gap:16px;padding:20px 24px;border-bottom:1px solid rgba(106,153,78,.25);align-items:start;font-size:12px;line-height:1.55}
.vp-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.vp-row.brand{background:rgba(56,102,65,.08);border-left:3px solid var(--moss-deep)}
.vp-row .name{font-family:"DM Serif Display",serif;font-size:17px;line-height:1.2}
.vp-row .name .meta{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:500;letter-spacing:0.22em;color:var(--ink-muted);margin-top:4px}
.vp-row .quote{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;line-height:1.5}
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
.comp-card .cp-creative{font-size:11.5px;line-height:1.55;color:var(--ink-secondary)}
.comp-card .cp-creative strong{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-muted);display:block;margin-bottom:3px}
.comp-card .cp-winlose{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.comp-card .cp-win,.comp-card .cp-lose{padding:10px 12px;border-radius:6px;font-size:11.5px;line-height:1.55}
.comp-card .cp-win{background:rgba(34,197,94,0.08);border-left:3px solid #386641}
.comp-card .cp-lose{background:rgba(239,68,68,0.06);border-left:3px solid #bc4749}
.comp-card .cp-win .lbl,.comp-card .cp-lose .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:4px;display:block}
.comp-card .cp-win .lbl{color:#2a4a30}
.comp-card .cp-lose .lbl{color:#7a2c2e}
.comp-card .cp-wedge{padding:12px 14px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-left:3px solid var(--moss-deep);border-radius:0 6px 6px 0;font-size:12.5px;line-height:1.6}
.comp-card .cp-wedge strong{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--moss-mid);display:block;margin-bottom:4px}
.comp-card .cp-punch{padding:10px 12px;border:1px dashed rgba(106,153,78,0.5);border-radius:6px;font-size:11.5px;line-height:1.55;color:var(--ink-primary)}
.comp-card .cp-punch strong{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);display:block;margin-bottom:3px}
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
          <div class="pf-label">Lives online at</div><div class="pf-value">${(per.lives_online_at || "").split(",").map(h => h.trim()).filter(Boolean).map(h => `<span class="handle-chip">${esc(h)}</span>`).join("")}</div>
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
  return `<section class="section" id="swipe">
  <div class="container">
    ${sectionTag("Swipe file", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${p.swipeFile.length} ad concepts.</h2>
    <div class="swipe-grid">
      ${p.swipeFile.map(s => {
        // Engine v1.6.8 · if image_b64 was generated by Pass 8.5
        // (gpt-image-1), inline as bg-image. Otherwise fall back to
        // the gradient mock.
        const mockStyle = s.image_b64
          ? `style="background-image:url(data:image/png;base64,${s.image_b64});background-size:cover;background-position:center"`
          : "";
        return `<div class="swipe-card"><div class="ad-mock" ${mockStyle}><div class="ad-format-tag">${esc(s.format || "")}</div><div class="ad-headline">${esc(s.headline || "")}</div></div><div class="ad-body"><div class="ad-meta"><span class="ad-chip persona">${esc(s.persona_name || "")}</span><span class="ad-chip">${esc(s.stage || "")}</span></div><div class="ad-id">${esc(s.id || "")}</div><div class="ad-title">${esc(s.title || "")}</div><p class="ad-copy">${esc(s.body || "")}</p><div class="ad-footer"><div><div class="label">CTA</div><div>${esc(s.cta || "")}</div></div><div><div class="label">Framework</div><div>${esc(s.framework || "")}</div></div></div></div></div>`;
      }).join("")}
    </div>
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
        ${c.creative_pattern ? `<div class="cp-creative"><strong>Creative pattern</strong>${esc(c.creative_pattern)}</div>` : ""}
        <div class="cp-winlose">
          ${c.where_we_win ? `<div class="cp-win"><span class="lbl">Where we win</span>${esc(c.where_we_win)}</div>` : ""}
          ${c.where_we_lose ? `<div class="cp-lose"><span class="lbl">Where we lose</span>${esc(c.where_we_lose)}</div>` : ""}
        </div>
        ${c.wedge_to_attack ? `<div class="cp-wedge"><strong>Wedge to attack</strong>${esc(c.wedge_to_attack)}</div>` : ""}
        ${c.first_punch ? `<div class="cp-punch"><strong>First punch · ship in 4 weeks</strong>${esc(c.first_punch)}</div>` : ""}
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
  const a = p.brandAudit;
  if (!a || (!a.areas?.length && !a.audit_summary)) return "";
  const areas = a.areas || [];
  const voice = a.voice_consistency || {};
  const disc = a.discoverability || {};
  return `<section class="section" id="audit">
  <div class="container">
    ${sectionTag("Brand audit", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${areas.length} surfaces.<br/>State of the brand today.</h2>
    ${a.audit_summary ? `<p class="audit-summary">${esc(a.audit_summary)}</p>` : ""}
    ${areas.length ? `<div class="audit-grid">
      ${areas.map(area => `<div class="audit-card">
        <div class="au-head">
          <div class="au-name">${esc(area.area_name || "")}</div>
          ${area.fix_priority ? `<span class="au-priority ${esc(area.fix_priority)}">${esc(area.fix_priority)}</span>` : ""}
        </div>
        ${area.current_state ? `<div class="au-current"><strong>Current state</strong>${esc(area.current_state)}</div>` : ""}
        <div class="au-split">
          ${area.what_works ? `<div class="au-works"><span class="lbl">What works</span>${esc(area.what_works)}</div>` : ""}
          ${area.what_breaks ? `<div class="au-breaks"><span class="lbl">What breaks</span>${esc(area.what_breaks)}</div>` : ""}
        </div>
        ${area.recommended_fix ? `<div class="au-fix"><strong>Recommended fix${area.ulwick_anchor_job_id ? `<span class="anchor">· anchor Job ${area.ulwick_anchor_job_id}</span>` : ""}</strong>${esc(area.recommended_fix)}</div>` : ""}
      </div>`).join("")}
    </div>` : ""}
    ${(Object.keys(voice).length || Object.keys(disc).length) ? `<div class="audit-bottom">
      ${Object.keys(voice).length ? `<div class="audit-voice">
        <h4>Voice consistency</h4>
        ${typeof voice.score === "number" ? `<div class="voice-score"><span class="num">${voice.score}</span><span class="out">/ 10</span></div>` : ""}
        ${voice.strongest_surface ? `<div class="voice-row"><span class="lbl">Strongest</span>${esc(voice.strongest_surface)}</div>` : ""}
        ${voice.weakest_surface ? `<div class="voice-row"><span class="lbl">Weakest</span>${esc(voice.weakest_surface)}</div>` : ""}
        ${voice.drift_notes ? `<div class="voice-row" style="margin-top:8px;font-style:italic;font-family:'Cormorant Garamond',serif;font-size:13px;color:var(--ink-secondary)">${esc(voice.drift_notes)}</div>` : ""}
      </div>` : ""}
      ${Object.keys(disc).length ? `<div class="audit-discover">
        <h4>Discoverability</h4>
        <div class="dscore">
          ${disc.branded_search ? `<div class="pill ${esc(disc.branded_search)}"><span class="lbl">Branded</span><span class="val">${esc(disc.branded_search)}</span></div>` : ""}
          ${disc.unbranded_search ? `<div class="pill ${esc(disc.unbranded_search)}"><span class="lbl">Unbranded</span><span class="val">${esc(disc.unbranded_search)}</span></div>` : ""}
        </div>
        ${disc.notes ? `<p class="dnotes">${esc(disc.notes)}</p>` : ""}
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
    ${stages.length ? `<div class="funnel-grid">
      ${stages.map(s => `<div class="funnel-card">
        <div class="fn-stage">${esc(s.stage || "")}</div>
        ${s.audience_intent ? `<p class="fn-intent">${esc(s.audience_intent)}</p>` : ""}
        ${(s.top_keywords || []).length ? `<div><div class="fn-block-lbl">Top keywords</div><div class="fn-kw-list">${(s.top_keywords || []).map(k => `<div class="fn-kw"><span class="kw-text">${esc(k.kw || "")}</span><span class="kw-meta"><span>vol <span class="v ${esc((k.volume_estimate || "").toLowerCase())}">${esc(k.volume_estimate || "?")}</span></span><span>comp <span class="c ${esc((k.competition || "").toLowerCase())}">${esc(k.competition || "?")}</span></span></span>${k.wedge ? `<span class="kw-wedge">${esc(k.wedge)}</span>` : ""}</div>`).join("")}</div></div>` : ""}
        ${(s.question_patterns || []).length ? `<div><div class="fn-block-lbl">Question patterns</div><div class="fn-questions">${(s.question_patterns || []).map(q => `<span class="q">${esc(q)}</span>`).join("")}</div></div>` : ""}
      </div>`).join("")}
    </div>` : ""}
    ${whitespace.length ? `<div class="whitespace-block">
      <h4>White-space keywords · low competition, high intent</h4>
      <div class="whitespace-grid">
        ${whitespace.map(w => `<div class="ws-card">
          <span class="ws-kw">${esc(w.kw || "")}</span>
          ${w.why ? `<p class="ws-why">${esc(w.why)}</p>` : ""}
          ${w.first_test ? `<p class="ws-test"><strong>First test · 2 weeks</strong>${esc(w.first_test)}</p>` : ""}
        </div>`).join("")}
      </div>
    </div>` : ""}
    ${seasonal.length ? `<div class="seasonal-block">
      <h4>Seasonal pulse</h4>
      <div class="seasonal-list">
        ${seasonal.map(s => `<div class="seasonal-row">
          <div class="period">${esc(s.period || "")}</div>
          <div class="lift">${esc(s.lift || "")}</div>
          <div class="play">${esc(s.play || "")}</div>
        </div>`).join("")}
      </div>
    </div>` : ""}
  </div>
</section>`;
}

function renderTribe(p, n, total) {
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

  const renderCard = (c) => `<div class="tribe-card${c.verified === false ? " unverified" : ""}">
    <div class="tc-head">
      <div class="tc-handle">${esc(c.handle || "")}</div>
      ${c.tier ? `<span class="tc-tier ${tierClass(c.tier)}">${esc(c.tier)}</span>` : ""}
    </div>
    <div class="tc-meta">
      ${c.platform ? `<span class="chip">${esc(c.platform)}</span>` : ""}
      ${c.follower_band ? `<span class="chip">${esc(c.follower_band)}</span>` : ""}
      ${c.target_persona ? `<span class="chip">for ${esc(c.target_persona)}</span>` : ""}
      ${c.outreach_priority ? `<span class="chip priority ${esc((c.outreach_priority || "").toLowerCase())}">${esc(c.outreach_priority)} priority</span>` : ""}
    </div>
    ${c.primary_content ? `<div class="tc-content"><strong>Primary content</strong>${esc(c.primary_content)}</div>` : ""}
    ${c.audience_fit ? `<p class="tc-fit">${esc(c.audience_fit)}</p>` : ""}
    ${c.evidence ? `<p class="tc-evidence">${esc(c.evidence)}</p>` : ""}
  </div>`;

  return `<section class="section" id="tribe">
  <div class="container">
    ${sectionTag("Tribe readout", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">${verified.length} verified creators.<br/>${paths.length} sourcing leads.</h2>
    ${t.tribe_summary ? `<p class="tribe-summary">${esc(t.tribe_summary)}</p>` : ""}
    ${caveats.length ? `<div class="tribe-caveats"><span class="lbl">Honest caveats</span><ul>${caveats.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
    ${verified.length ? `<div class="tribe-grid">
      ${verified.map(renderCard).join("")}
    </div>` : ""}
    ${unverified.length ? `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--brick);margin-bottom:14px">Unverified candidates · check before outreach</h3>
    <div class="tribe-grid">
      ${unverified.map(renderCard).join("")}
    </div>` : ""}
    ${paths.length ? `<div class="search-paths">
      <h4>Sourcing queries · for the human matcher</h4>
      <p class="sp-intro">Engine couldn't verify a handle for these archetypes. Run these queries (or hand them to a sourcer) before adding to the outreach list.</p>
      <div class="sp-grid">
        ${paths.map(p => `<div class="sp-row">
          <div class="platform">${esc(p.platform || "")}</div>
          <div class="query">${esc(p.query || "")}</div>
          <div class="why">${esc(p.why || "")}</div>
        </div>`).join("")}
      </div>
    </div>` : ""}
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
  return `<section class="section" id="method">
  <div class="container">
    ${sectionTag("Methodology", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">How this was made.</h2>
    <p class="body-lg" style="max-width:720px;margin-bottom:24px">Engine ${ENGINE_VERSION} · ${passCount} Anthropic passes · ${(p.mergedJobs || []).length} core jobs · ${(p.personas || []).length} personas · ${(p.swipeFile || []).length} swipe concepts · ${(p.scripts || []).length} scripts · ${(p.emailFlows?.flows || []).length} email flows · ${(p.channelPlan?.channels || []).length} channels · ${(p.landing?.variants || []).length} landing variants · ${(p.rollout?.phases || []).length} rollout phases · ${(p.creators?.creator_briefs || []).length} creator packets · ${(p.competitive?.competitive_matrix || []).length} competitive teardowns · ${(p.brandAudit?.areas || []).length} audit surfaces · ${(p.demandLandscape?.funnel_stages || []).length} funnel stages · ${(p.tribe?.creators || []).filter(c => c.verified !== false).length} verified creators${hasD ? ` · 1 strategic diagnostic` : ""}${hasL ? ` · ${p.appliedPlaybooks.applied_playbooks.length} library playbooks applied` : ""}.</p>
    <p class="body-lg" style="max-width:720px">Sources fed into Pass 0:</p>
    <ul style="margin-top:8px;color:var(--ink-secondary)">${(pc.sources || []).map(s => `<li>· ${esc(s)}</li>`).join("")}</ul>
    ${(pc.red_flags || []).length ? `<p class="body-lg" style="margin-top:24px;color:#bc4749">⚑ Red flags: ${pc.red_flags.map(esc).join(" · ")}</p>` : ""}
  </div>
</section>`;
}

function renderColophon(p, n, total) {
  return `<section class="section" id="colophon">
  <div class="container">
    ${sectionTag("Colophon", n, total)}
    <h2 class="display-lg" style="margin-bottom:16px">The makers.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary)">Generated by the Alchemical Growth Engine — a Mode 1 Earth ODI tool. The methodology fuses Tony Ulwick's Outcome-Driven Innovation with Eugene Schwartz's five awareness levels, validated against live search behavior and competitive value-prop language.</p>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary);margin-top:16px">This document is a starting position, not a finish line. Each section is a hypothesis to test against real attention, real spend, and real customers.</p>
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

// ── Section ID → renderer dispatch (v1.7.0 · refined v1.7.1) ──
// Section order is driven by `diagnostic.business_model.doc_sections`
// from the registry. Every renderer receives (payload, n, total) and
// emits its own § NN · NAME / NN / TOTAL tag via `sectionTag()`.
// Unknown section IDs are skipped with console.warn.
function buildSectionMap(payload, totalSections) {
  const t = totalSections;
  return {
    strategic_context: (n) => renderStrategicContext(payload, t, n),
    positioning:       (n) => renderPositioning(payload, n, t),
    evidence:          (n) => renderEvidence(payload, n, t),
    value_prop:        (n) => renderValueProp(payload, n, t),
    personas:          (n) => renderPersonas(payload, n, t),
    swipe_file:        (n) => renderSwipe(payload, n, t),
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
export const ENGINE_VERSION = "v1.7.1";

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
      <a href="#strategic">Strategic</a><a href="#position">Position</a><a href="#evidence">Evidence</a><a href="#vp">Value Prop</a><a href="#personas">Personas</a><a href="#swipe">Swipe</a><a href="#scripts">Scripts</a><a href="#email">Email</a><a href="#wedge">Wedge</a><a href="#channels">Channels</a><a href="#matrix">Matrix</a><a href="#landing">Landing</a><a href="#rollout">Rollout</a><a href="#creators">Creators</a><a href="#competitive">Competitive</a><a href="#audit">Audit</a><a href="#demand">Demand</a><a href="#tribe">Tribe</a><a href="#playbooks">Playbooks</a><a href="#method">Method</a>
    </div>
  </div>
</nav>
${renderCover(payload, project_name)}
<div class="container"><div class="hairline"></div></div>
${(() => {
  // v1.7.0 · section order driven by diagnostic.business_model.doc_sections.
  // Falls back to a default order if no diagnostic is present (preserves
  // v1.6.x behavior for any caller not yet wired to Pass D).
  const defaultOrder = [
    "positioning","evidence","value_prop","personas","swipe_file","scripts","email_flows",
    "entry_wedge","channels","matrix","landing","rollout","creators","competitive",
    "brand_audit","demand","tribe","methodology","colophon",
  ];
  const order = payload.diagnostic?.business_model?.doc_sections || defaultOrder;
  const total = order.length;
  const sectionMap = buildSectionMap(payload, total);
  // 0-based numbering · §00 Strategic Context through §20 Colophon (DTC).
  // When no diagnostic is passed, defaultOrder begins at positioning so the
  // first section receives n=0 = "§ 00 · Positioning" which still reads
  // naturally even without the Strategic Context preface. We bias the
  // default-order case by +1 so positioning gets §01 when running pre-Pass D.
  const offset = payload.diagnostic ? 0 : 1;
  return order.map((sid, idx) => {
    const n = idx + offset;
    const fn = sectionMap[sid];
    if (!fn) { console.warn(`[compose-strategy] unknown section id: ${sid}`); return ""; }
    return fn(n);
  }).join("\n");
})()}
<footer><div class="container"><div class="wordmark" style="font-size:48px">${esc(project_name.split(/\s/)[0] || "BRAND")}</div><p class="footer-meta" style="margin-top:12px">Generated by Alchemical Growth Engine ${ENGINE_VERSION} · Mode 1 Earth</p></div></footer>
</body>
</html>`;
}

export function downloadStrategyDoc(html, filename = "strategy.html") {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
