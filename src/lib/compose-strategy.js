// src/lib/compose-strategy.js
//
// Engine v1.6 — Strategy Doc Composer.
// Takes the full set of pass outputs + Pass 0 context and returns a
// self-contained HTML document matching the v5 strategy-doc template.
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
  --pillow-pink: #F9D6D2; --siraj-salmon: #F7B5A4; --rosy-brown: #D7B7AA; --smile-yellow: #F6D38D;
  --bg-base: #FFFFFF; --bg-warm: #FBF7F4; --bg-card: #FCEEEB;
  --ink-primary: #2C2422; --ink-secondary: #7A6964; --ink-muted: #B5A8A2;
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
.section-name{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown)}
.section-number{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.wordmark{font-family:"DM Serif Display",serif;font-weight:400;font-size:28px;letter-spacing:0.04em;background:linear-gradient(110deg,var(--siraj-salmon),var(--pillow-pink),var(--smile-yellow));-webkit-background-clip:text;background-clip:text;color:transparent}
nav.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(20px);border-bottom:1px solid rgba(215,183,170,.3)}
nav.top .container{height:64px;display:flex;align-items:center;justify-content:space-between}
.cover{padding:120px 0 96px;background:radial-gradient(ellipse at 80% 20%,rgba(246,211,141,.25),transparent 50%),radial-gradient(ellipse at 20% 80%,rgba(247,181,164,.18),transparent 50%),var(--bg-base)}
.cover-tag{display:flex;align-items:center;gap:16px;margin-bottom:32px;flex-wrap:wrap}
.cover-tag .doc-num{padding:6px 14px;border:1px solid var(--rosy-brown);border-radius:999px;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-secondary)}
.cover-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:64px;padding-top:32px;border-top:1px solid rgba(215,183,170,.4)}
@media (max-width:720px){.cover-meta{grid-template-columns:1fr 1fr}}
.cover-meta-item .label{font-size:9px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:8px}
.cover-meta-item .value{font-family:"DM Serif Display",serif;font-size:20px;line-height:1.2}
.position-primary{background:linear-gradient(135deg,var(--bg-card),var(--bg-base));border:2px solid var(--siraj-salmon);border-radius:16px;padding:56px 40px;margin-top:32px;position:relative}
.position-primary .tag{position:absolute;top:-12px;left:32px;background:var(--siraj-salmon);color:var(--ink-primary);padding:4px 12px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.position-primary .claim{font-family:"DM Serif Display",serif;font-size:clamp(28px,4.5vw,44px);line-height:1.1;letter-spacing:-0.015em;margin-bottom:24px}
.citation{display:inline-flex;align-items:center;gap:12px;padding:8px 16px;background:rgba(247,181,164,.15);border-radius:6px;font-size:12px}
.citation .score{font-family:"DM Serif Display",serif;font-size:18px;color:var(--rosy-brown)}
.position-primary .rationale{margin-top:24px;font-size:14px;line-height:1.65;max-width:680px}
.position-alt{background:var(--bg-base);border:1px solid rgba(215,183,170,.4);border-radius:12px;padding:32px;margin-top:16px}
.position-alt .alt-tag{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:12px}
.position-alt .claim{font-family:"DM Serif Display",serif;font-size:24px;line-height:1.2;margin-bottom:16px}
.position-alt .citation{background:var(--bg-warm);padding:6px 12px;font-size:11px;color:var(--ink-secondary)}
.position-alt .citation .score{font-size:16px}
.position-alt .rationale{margin-top:16px;font-size:13px;line-height:1.6;color:var(--ink-secondary)}
.ev-table,.vp-table{margin-top:32px;background:var(--bg-base);border-radius:12px;overflow:hidden;border:1px solid rgba(215,183,170,.3)}
.ev-row{display:grid;grid-template-columns:60px 1fr 80px 80px 90px;gap:16px;padding:18px 24px;border-bottom:1px solid rgba(215,183,170,.25);align-items:start;font-size:12px}
.ev-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.ev-row .job-id{font-family:"DM Serif Display",serif;font-size:20px;color:var(--rosy-brown)}
.ev-row .num,.ev-row .opp{font-family:"DM Serif Display",serif;font-size:20px}
.ev-row .opp{font-size:22px;font-weight:500}
.ev-row.underserved .opp{color:#B85C5C}
.ev-row .anchor-quote{grid-column:2/-1;margin-top:8px;padding:8px 12px;background:var(--bg-card);border-left:2px solid var(--siraj-salmon);border-radius:0 4px 4px 0;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px}
.ev-row .outcome .ulwick{display:block;margin-top:6px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary)}
@media (max-width:720px){.ev-row,.ev-row.head{grid-template-columns:1fr;gap:6px}.ev-row.head{display:none}}
.vp-row{display:grid;grid-template-columns:140px 1.8fr 1fr 1fr 1.4fr;gap:16px;padding:20px 24px;border-bottom:1px solid rgba(215,183,170,.25);align-items:start;font-size:12px;line-height:1.55}
.vp-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.vp-row.brand{background:rgba(247,181,164,.08);border-left:3px solid var(--siraj-salmon)}
.vp-row .name{font-family:"DM Serif Display",serif;font-size:17px;line-height:1.2}
.vp-row .name .meta{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:500;letter-spacing:0.22em;color:var(--ink-muted);margin-top:4px}
.vp-row .quote{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;line-height:1.5}
@media (max-width:720px){.vp-row,.vp-row.head{grid-template-columns:1fr;gap:6px}.vp-row.head{display:none}}
.persona{display:grid;grid-template-columns:280px 1fr;gap:48px;padding:40px 0;border-top:1px solid rgba(215,183,170,.4)}
.persona:last-of-type{border-bottom:1px solid rgba(215,183,170,.4)}
@media (max-width:720px){.persona{grid-template-columns:1fr;gap:24px}}
.persona-avatar{aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:"DM Serif Display",serif;font-size:80px;color:rgba(44,36,34,.7)}
.persona-body .number{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);margin-bottom:8px}
.persona-body .name{font-family:"DM Serif Display",serif;font-size:32px;line-height:1.1;margin-bottom:4px}
.persona-body .one-liner{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:17px;color:var(--ink-secondary);margin-bottom:24px}
.persona-fields{display:grid;grid-template-columns:140px 1fr;gap:12px 24px;margin-top:16px}
.persona-fields .pf-label{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);padding-top:4px}
.persona-fields .pf-value{font-size:13px;line-height:1.65;padding-bottom:14px;border-bottom:1px solid rgba(215,183,170,.25)}
.swipe-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:32px}
@media (max-width:720px){.swipe-grid{grid-template-columns:1fr}}
.swipe-card{background:var(--bg-base);border:1px solid rgba(215,183,170,.3);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.swipe-card .ad-mock{aspect-ratio:4/5;display:flex;align-items:flex-end;padding:24px;position:relative;background:linear-gradient(135deg,var(--pillow-pink),var(--siraj-salmon))}
.swipe-card .ad-mock::before{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(44,36,34,.55) 100%)}
.swipe-card .ad-format-tag{position:absolute;top:14px;left:14px;z-index:2;font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:3px 8px;background:rgba(255,255,255,.85);color:var(--ink-primary);border-radius:3px}
.swipe-card .ad-headline{position:relative;z-index:2;font-family:"DM Serif Display",serif;color:#FFF;font-size:20px;line-height:1.15;text-shadow:0 2px 8px rgba(44,36,34,.4)}
.swipe-card .ad-body{padding:20px 24px 24px;display:flex;flex-direction:column;flex:1}
.swipe-card .ad-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.swipe-card .ad-chip{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;padding:3px 8px;border-radius:3px;background:var(--bg-warm);color:var(--ink-secondary)}
.swipe-card .ad-chip.persona{background:rgba(247,181,164,.2);color:#8B3F2C}
.swipe-card .ad-id{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px}
.swipe-card .ad-title{font-family:"DM Serif Display",serif;font-size:18px;line-height:1.25;margin-bottom:12px}
.swipe-card .ad-copy{font-size:12.5px;line-height:1.65;margin-bottom:14px}
.swipe-card .ad-footer{margin-top:auto;padding-top:14px;border-top:1px solid rgba(215,183,170,.3);display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px}
.swipe-card .ad-footer .label{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:2px}
.script{background:var(--bg-base);border-radius:12px;padding:32px;margin-bottom:24px;border:1px solid rgba(215,183,170,.3)}
.script-header{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:16px;border-bottom:1px solid rgba(215,183,170,.3);margin-bottom:20px;gap:16px;flex-wrap:wrap}
.script-title{font-family:"DM Serif Display",serif;font-size:22px;line-height:1.2}
.script-meta{display:flex;gap:6px;flex-wrap:wrap}
.script-meta .chip{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;padding:4px 10px;background:rgba(44,36,34,.85);color:#FBF7F4;border-radius:4px}
.script-meta .chip.persona{background:rgba(247,181,164,.25);color:#8B3F2C}
.script-hook{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:17px;color:var(--ink-secondary);margin-bottom:20px}
.shot-row{display:grid;grid-template-columns:64px 80px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid rgba(215,183,170,.2)}
.shot-row:last-child{border-bottom:0}
.shot-time{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--rosy-brown);letter-spacing:0.08em}
.shot-cue{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);padding-top:2px}
.shot-detail{font-size:13px;line-height:1.55}
.shot-detail .ost,.shot-detail .vo{display:block;margin-top:6px;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary)}
.script-notes{margin-top:16px;padding-top:16px;border-top:1px solid rgba(215,183,170,.3);display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
@media (max-width:720px){.script-notes{grid-template-columns:1fr}}
.script-notes .note .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);margin-bottom:4px}
.script-notes .note .val{font-size:11px;line-height:1.5}
.email-flow{background:var(--bg-base);border-radius:12px;padding:32px;margin-bottom:24px;border:1px solid rgba(215,183,170,.3)}
.email-flow-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.email-flow-name{font-family:"DM Serif Display",serif;font-size:24px}
.email-flow-trigger{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);padding:6px 12px;background:var(--bg-card);border-radius:4px}
.email-flow-desc{font-size:13px;line-height:1.65;color:var(--ink-secondary);margin-bottom:24px}
.email-card{background:var(--bg-warm);border-left:3px solid var(--siraj-salmon);border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:14px}
.email-card .email-when{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);margin-bottom:6px}
.email-card .email-subject{font-family:"DM Serif Display",serif;font-size:18px;margin-bottom:4px;line-height:1.25}
.email-card .email-preview{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary);margin-bottom:14px}
.email-card .email-body{font-size:13px;line-height:1.75;white-space:pre-line}
.email-card .email-cta{display:inline-block;margin-top:14px;padding:8px 16px;background:var(--ink-primary);color:var(--bg-base);font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.channel-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:24px}
@media (max-width:720px){.channel-grid{grid-template-columns:1fr}}
.channel-card{background:var(--bg-base);border:1px solid rgba(215,183,170,.3);border-radius:10px;padding:20px 22px}
.channel-card .ch-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:12px}
.channel-card .ch-name{font-family:"DM Serif Display",serif;font-size:18px;line-height:1.2}
.channel-card .ch-budget{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--rosy-brown);background:var(--bg-card);padding:3px 8px;border-radius:4px;white-space:nowrap}
.channel-card .ch-role{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:13px;color:var(--ink-secondary);margin-bottom:12px}
.channel-card .ch-row{display:grid;grid-template-columns:80px 1fr;gap:10px;padding:6px 0;border-top:1px solid rgba(215,183,170,.2);font-size:12px;line-height:1.5}
.channel-card .ch-row .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);padding-top:2px}
.matrix-table{margin-top:24px;background:var(--bg-base);border:1px solid rgba(215,183,170,.3);border-radius:12px;overflow:hidden}
.matrix-row{display:grid;grid-template-columns:120px 110px 1.4fr 1fr 90px;gap:14px;padding:16px 22px;border-bottom:1px solid rgba(215,183,170,.25);font-size:12px;line-height:1.5;align-items:start}
.matrix-row.head{background:var(--bg-warm);font-family:"IBM Plex Mono",monospace;font-weight:600;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted)}
.matrix-row .pname{font-family:"DM Serif Display",serif;font-size:14px;line-height:1.2}
.matrix-row .cname{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.12em;color:var(--rosy-brown)}
.matrix-row .share{font-family:"DM Serif Display",serif;font-size:18px;color:var(--rosy-brown);text-align:right}
.matrix-row .tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.matrix-row .tags .tag{font-family:"IBM Plex Mono",monospace;font-size:9px;background:var(--bg-warm);padding:2px 6px;border-radius:3px;color:var(--ink-secondary)}
@media (max-width:720px){.matrix-row,.matrix-row.head{grid-template-columns:1fr;gap:6px}.matrix-row.head{display:none}}
.landing-variant{background:var(--bg-base);border:1px solid rgba(215,183,170,.3);border-radius:12px;padding:32px;margin-bottom:20px}
.landing-variant .lp-head{display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.landing-variant .lp-id{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;color:var(--rosy-brown)}
.landing-variant .lp-slug{font-family:"IBM Plex Mono",monospace;font-size:10px;color:var(--ink-muted)}
.landing-variant .lp-hero{padding:24px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:10px;margin-bottom:16px}
.landing-variant .lp-hero h3{font-family:"DM Serif Display",serif;font-size:26px;line-height:1.15;margin-bottom:8px}
.landing-variant .lp-hero p{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:15px;color:var(--ink-secondary);margin-bottom:14px}
.landing-variant .lp-cta-pill{display:inline-block;padding:8px 16px;background:var(--ink-primary);color:var(--bg-base);font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.landing-variant .lp-proof{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.landing-variant .lp-proof span{font-family:"IBM Plex Mono",monospace;font-size:9px;background:rgba(247,181,164,.15);color:var(--ink-secondary);padding:4px 10px;border-radius:3px;letter-spacing:0.08em}
.landing-variant .lp-section{padding:12px 0;border-top:1px solid rgba(215,183,170,.25)}
.landing-variant .lp-section .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px}
.landing-variant .lp-section h4{font-family:"DM Serif Display",serif;font-size:17px;margin-bottom:6px;line-height:1.25}
.landing-variant .lp-section p{font-size:12.5px;line-height:1.6}
.landing-variant .lp-foot{margin-top:18px;padding-top:14px;border-top:1px solid rgba(215,183,170,.3);display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:11px}
.landing-variant .lp-foot .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);margin-bottom:3px}
.phase-card{background:var(--bg-base);border:1px solid rgba(215,183,170,.3);border-radius:12px;padding:32px;margin-bottom:20px;position:relative}
.phase-card .ph-tag{position:absolute;top:-12px;left:24px;background:var(--siraj-salmon);color:var(--ink-primary);padding:4px 12px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.phase-card .ph-head{display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:10px;margin-top:8px}
.phase-card .ph-theme{font-family:"DM Serif Display",serif;font-size:24px;line-height:1.2}
.phase-card .ph-budget{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--rosy-brown);background:var(--bg-card);padding:4px 10px;border-radius:4px}
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
.phase-card .ph-gate{padding:12px 16px;background:rgba(247,181,164,.12);border-left:3px solid var(--siraj-salmon);border-radius:0 6px 6px 0;font-size:12.5px;line-height:1.55}
.phase-card .ph-gate strong{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);display:block;margin-bottom:4px}
.cadence-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
@media (max-width:720px){.cadence-grid{grid-template-columns:1fr}}
.cadence-col{background:var(--bg-base);border:1px solid rgba(215,183,170,.3);border-radius:12px;padding:24px}
.cadence-col .h{font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);margin-bottom:14px}
.cadence-col ul{margin-left:0;list-style:none}
.cadence-col li{padding:8px 0;border-bottom:1px solid rgba(215,183,170,.25);font-size:12.5px;line-height:1.55}
.cadence-col li:last-child{border-bottom:0}
.creator-card{background:var(--bg-base);border:1px solid rgba(215,183,170,.3);border-radius:12px;padding:32px;margin-bottom:20px;position:relative}
.creator-card .cr-tag{position:absolute;top:-12px;left:24px;background:var(--smile-yellow);color:var(--ink-primary);padding:4px 12px;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;border-radius:4px}
.creator-card .cr-head{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:baseline;margin-top:8px;margin-bottom:14px}
.creator-card .cr-arch{font-family:"DM Serif Display",serif;font-size:22px;line-height:1.2}
.creator-card .cr-arch .platform{display:block;font-family:"IBM Plex Mono",monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;color:var(--rosy-brown);margin-top:6px}
.creator-card .cr-persona{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;color:var(--rosy-brown);background:rgba(247,181,164,.15);padding:4px 10px;border-radius:4px;white-space:nowrap}
.creator-card .cr-fit{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:14px;color:var(--ink-secondary);margin-bottom:18px;line-height:1.6}
.creator-card .cr-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
@media (max-width:720px){.creator-card .cr-grid{grid-template-columns:1fr}}
.creator-card .cr-block .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px}
.creator-card .cr-block p,.creator-card .cr-block ul{font-size:12.5px;line-height:1.65}
.creator-card .cr-block ul{margin-left:0;list-style:none}
.creator-card .cr-block li{padding:3px 0;border-bottom:1px solid rgba(215,183,170,.2)}
.creator-card .cr-block li:last-child{border-bottom:0}
.creator-card .cr-concept{padding:16px 20px;background:linear-gradient(135deg,var(--bg-card),var(--bg-warm));border-radius:10px;margin-bottom:18px}
.creator-card .cr-concept .lbl{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px}
.creator-card .cr-concept p{font-size:13.5px;line-height:1.65}
.creator-card .cr-deliv{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.creator-card .cr-deliv .chip{font-family:"IBM Plex Mono",monospace;font-size:10px;background:var(--bg-warm);color:var(--ink-secondary);padding:5px 10px;border-radius:4px;border:1px solid rgba(215,183,170,.3)}
.creator-card .cr-dosdont{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
@media (max-width:720px){.creator-card .cr-dosdont{grid-template-columns:1fr}}
.creator-card .cr-do,.creator-card .cr-dont{padding:12px 14px;border-radius:8px}
.creator-card .cr-do{background:rgba(34,197,94,.06);border-left:3px solid #22c55e}
.creator-card .cr-dont{background:rgba(239,68,68,.06);border-left:3px solid #ef4444}
.creator-card .cr-do .lbl{color:#15803d}
.creator-card .cr-dont .lbl{color:#991b1b}
.creator-card .cr-dm{padding:18px 22px;background:var(--bg-warm);border-left:3px solid var(--siraj-salmon);border-radius:0 8px 8px 0;font-family:"Cormorant Garamond",serif;font-size:14px;line-height:1.7;color:var(--ink-primary);white-space:pre-line;margin-bottom:14px}
.creator-card .cr-dm .lbl{display:block;font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);margin-bottom:8px}
.creator-card .cr-foot{padding-top:14px;border-top:1px solid rgba(215,183,170,.3);display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
@media (max-width:720px){.creator-card .cr-foot{grid-template-columns:1fr}}
.creator-card .cr-foot .lbl{font-family:"IBM Plex Mono",monospace;font-size:8px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--rosy-brown);margin-bottom:4px}
.creator-card .cr-foot .val{font-size:11.5px;line-height:1.5}
footer{padding:80px 0 56px;background:var(--bg-base);border-top:1px solid rgba(215,183,170,.4);text-align:center}
.footer-meta{font-size:11px;color:var(--ink-muted);letter-spacing:0.18em;text-transform:uppercase;font-family:"IBM Plex Mono",monospace}
`;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ── Renderers ──
function renderCover(p, project_name) {
  const pc = p.project_context || {};
  return `<section class="cover" id="cover">
  <div class="container">
    <div class="cover-tag">
      <span class="doc-num">Phase 1 Strategy · Engine v1.6.2</span>
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
      <div class="cover-meta-item"><div class="label">Jobs</div><div class="value">${(p.mergedJobs || []).length}</div></div>
      <div class="cover-meta-item"><div class="label">Personas</div><div class="value">${(p.personas || []).length}</div></div>
      <div class="cover-meta-item"><div class="label">Swipe ads</div><div class="value">${(p.swipeFile || []).length}</div></div>
      <div class="cover-meta-item"><div class="label">Scripts</div><div class="value">${(p.scripts || []).length}</div></div>
    </div>
  </div>
</section>`;
}

function renderPositioning(p) {
  if (!p.positioning?.primary) return "";
  const pr = p.positioning.primary;
  const alts = p.positioning.alternatives || [];
  return `<section class="section" id="position">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 01 · Positioning</span><span class="section-number">01 / 15</span></div>
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

function renderEvidence(p) {
  if (!(p.mergedJobs || []).length) return "";
  const rows = p.mergedJobs.flatMap(j => (j.outcomes || []).map(o => ({ job: j.id, statement: o.statement, importance: o.importance, satisfaction: o.satisfaction, score: o.opportunity_score })))
    .sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
  return `<section class="section" id="evidence">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 02 · Evidence</span><span class="section-number">02 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">The outcomes<br/>behind the numbers.</h2>
    <div class="ev-table">
      <div class="ev-row head"><div>Job</div><div>Outcome (Ulwick format)</div><div>Importance</div><div>Satisfaction</div><div>Opp score</div></div>
      ${rows.map(r => `<div class="ev-row${(r.score||0)>=10?' underserved':''}"><div class="job-id">${String(r.job).padStart(2,"0")}</div><div class="outcome"><span class="ulwick">${esc(r.statement)}</span></div><div class="num">${r.importance ?? "—"}</div><div class="num">${r.satisfaction ?? "—"}</div><div class="opp">${(r.score ?? 0).toFixed ? r.score.toFixed(1) : r.score}</div></div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderValueProp(p) {
  const rows = p.valueProp?.comparisons || [];
  if (!rows.length) return "";
  return `<section class="section" id="vp">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 03 · Value-prop comparison</span><span class="section-number">03 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">Brand vs the named<br/>incumbents.</h2>
    <div class="vp-table">
      <div class="vp-row head"><div>Brand</div><div>Stated value prop</div><div>Prices for</div><div>Leaves unserved</div><div>Where brand wins</div></div>
      ${rows.map(r => `<div class="vp-row"><div class="name">${esc(r.competitor_name)}<span class="meta">${esc(r.source_url || "")}</span></div><div class="quote">"${esc(r.their_stated_value_prop || "")}"</div><div>${esc(r.outcome_they_price_for || "—")}</div><div>${esc(r.outcome_they_leave_unserved || "—")}</div><div>${esc(r.where_brand_wins || "—")}</div></div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderPersonas(p) {
  if (!(p.personas || []).length) return "";
  return `<section class="section" id="personas">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 04 · Personas</span><span class="section-number">04 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">${p.personas.length} buyers.<br/>Each at a hinge.</h2>
    ${p.personas.map((per, i) => `<div class="persona">
      <div class="persona-avatar" style="background:linear-gradient(135deg,var(--pillow-pink),var(--siraj-salmon))">${esc((per.name || "?")[0])}</div>
      <div class="persona-body">
        <div class="number">Persona ${String(i+1).padStart(2,"0")} · ${esc(per.archetype || "")}</div>
        <div class="name">${esc(per.name || "")}, ${esc(per.age || "")}</div>
        <div class="one-liner">${esc(per.one_liner || "")}</div>
        <div class="persona-fields">
          <div class="pf-label">Job to be done</div><div class="pf-value">${esc(per.job_to_be_done || "")}</div>
          <div class="pf-label">Underserved outcome</div><div class="pf-value">${esc(per.underserved_outcome || "")}</div>
          <div class="pf-label">Currently uses</div><div class="pf-value">${esc(per.currently_uses || "")}</div>
          <div class="pf-label">Trigger</div><div class="pf-value">${esc(per.trigger_moment || "")}</div>
          <div class="pf-label">Lives online at</div><div class="pf-value">${esc(per.lives_online_at || "")}</div>
          <div class="pf-label">Switch cost</div><div class="pf-value">${esc(per.switch_cost || "")}</div>
          <div class="pf-label">First message</div><div class="pf-value italic">${esc(per.first_message || "")}</div>
        </div>
      </div>
    </div>`).join("")}
  </div>
</section>`;
}

function renderSwipe(p) {
  if (!(p.swipeFile || []).length) return "";
  return `<section class="section" id="swipe">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 05 · Swipe file</span><span class="section-number">05 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">${p.swipeFile.length} ad concepts.</h2>
    <div class="swipe-grid">
      ${p.swipeFile.map(s => `<div class="swipe-card"><div class="ad-mock"><div class="ad-format-tag">${esc(s.format || "")}</div><div class="ad-headline">${esc(s.headline || "")}</div></div><div class="ad-body"><div class="ad-meta"><span class="ad-chip persona">${esc(s.persona_name || "")}</span><span class="ad-chip">${esc(s.stage || "")}</span></div><div class="ad-id">${esc(s.id || "")}</div><div class="ad-title">${esc(s.title || "")}</div><p class="ad-copy">${esc(s.body || "")}</p><div class="ad-footer"><div><div class="label">CTA</div><div>${esc(s.cta || "")}</div></div><div><div class="label">Framework</div><div>${esc(s.framework || "")}</div></div></div></div></div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderScripts(p) {
  if (!(p.scripts || []).length) return "";
  return `<section class="section" id="scripts">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 06 · TikTok scripts</span><span class="section-number">06 / 15</span></div>
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

function renderEmails(p) {
  if (!(p.emailFlows?.flows || []).length) return "";
  return `<section class="section" id="email">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 07 · Email flows</span><span class="section-number">07 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">${p.emailFlows.flows.length} flows.</h2>
    ${p.emailFlows.flows.map(f => `<div class="email-flow">
      <div class="email-flow-head"><div class="email-flow-name">${esc(f.name || "")}</div><div class="email-flow-trigger">${esc(f.trigger || "")}</div></div>
      <p class="email-flow-desc">${esc(f.description || "")}</p>
      ${(f.emails || []).map(e => `<div class="email-card"><div class="email-when">${esc(e.when || "")}</div><div class="email-subject">${esc(e.subject || "")}</div><div class="email-preview">${esc(e.preview || "")}</div><div class="email-body">${esc(e.body || "")}</div><a class="email-cta">${esc(e.cta_label || "Click")}</a></div>`).join("")}
    </div>`).join("")}
  </div>
</section>`;
}

function renderEntryWedge(p) {
  if (!(p.recommendations || []).length) return "";
  const top = p.recommendations.slice(0, 3);
  return `<section class="section" id="wedge">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 08 · Entry wedge · top recommendations</span><span class="section-number">08 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">Where to start.</h2>
    ${top.map((r, i) => `<div class="position-alt"><div class="alt-tag">Rank ${r.rank || i+1} · ${esc(r.strategy || "")}</div><div class="claim">${esc(r.target_job || "")}</div><div class="citation">Score <span class="score">${r.citation_score ?? ""}</span> · ${esc(r.estimated_market_signal || "")}/100</div><p class="rationale">${esc(r.rationale || "")}<br/><br/><strong>First move:</strong> ${esc(r.first_move || "")}<br/><strong>Belief shift:</strong> ${esc(r.belief_change_required || "")}<br/><strong>Risk:</strong> ${esc(r.risk || "")}</p></div>`).join("")}
  </div>
</section>`;
}

function renderChannels(p) {
  const ch = p.channelPlan?.channels || [];
  if (!ch.length) return "";
  return `<section class="section" id="channels">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 09 · Channel plan</span><span class="section-number">09 / 15</span></div>
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

function renderMatrix(p) {
  const rows = p.channelPlan?.targeting_matrix || [];
  if (!rows.length) return "";
  return `<section class="section" id="matrix">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 10 · Targeting matrix</span><span class="section-number">10 / 15</span></div>
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

function renderLanding(p) {
  const vars = p.landing?.variants || [];
  if (!vars.length) return "";
  return `<section class="section" id="landing">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 11 · Landing variants</span><span class="section-number">11 / 15</span></div>
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

function renderRollout(p) {
  const phases = p.rollout?.phases || [];
  if (!phases.length) return "";
  const cadence = p.rollout?.weekly_cadence || [];
  const kills = p.rollout?.kill_criteria || [];
  return `<section class="section" id="rollout">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 12 · 90-day rollout</span><span class="section-number">12 / 15</span></div>
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

function renderCreators(p) {
  const briefs = p.creators?.creator_briefs || [];
  if (!briefs.length) return "";
  return `<section class="section" id="creators">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 13 · Creator outreach</span><span class="section-number">13 / 15</span></div>
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

function renderMethodology(p) {
  const pc = p.project_context || {};
  return `<section class="section" id="method">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 14 · Methodology</span><span class="section-number">14 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">How this was made.</h2>
    <p class="body-lg" style="max-width:720px;margin-bottom:24px">Engine v1.6.2 · 14 Anthropic passes · ${(p.mergedJobs || []).length} core jobs · ${(p.personas || []).length} personas · ${(p.swipeFile || []).length} swipe concepts · ${(p.scripts || []).length} scripts · ${(p.emailFlows?.flows || []).length} email flows · ${(p.channelPlan?.channels || []).length} channels · ${(p.landing?.variants || []).length} landing variants · ${(p.rollout?.phases || []).length} rollout phases · ${(p.creators?.creator_briefs || []).length} creator packets.</p>
    <p class="body-lg" style="max-width:720px">Sources fed into Pass 0:</p>
    <ul style="margin-top:8px;color:var(--ink-secondary)">${(pc.sources || []).map(s => `<li>· ${esc(s)}</li>`).join("")}</ul>
    ${(pc.red_flags || []).length ? `<p class="body-lg" style="margin-top:24px;color:#B85C5C">⚑ Red flags: ${pc.red_flags.map(esc).join(" · ")}</p>` : ""}
  </div>
</section>`;
}

function renderColophon(p) {
  return `<section class="section" id="colophon">
  <div class="container">
    <div class="section-tag-row"><span class="section-name">§ 15 · Colophon</span><span class="section-number">15 / 15</span></div>
    <h2 class="display-lg" style="margin-bottom:16px">The makers.</h2>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary)">Generated by the Alchemical Growth Engine — a Mode 1 Earth ODI tool. The methodology fuses Tony Ulwick's Outcome-Driven Innovation with Eugene Schwartz's five awareness levels, validated against live search behavior and competitive value-prop language.</p>
    <p class="body-lg" style="max-width:720px;color:var(--ink-secondary);margin-top:16px">This document is a starting position, not a finish line. Each section is a hypothesis to test against real attention, real spend, and real customers.</p>
  </div>
</section>`;
}

// ── Main entry ──
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
    <div style="display:flex;gap:24px;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-secondary)">
      <a href="#position">Position</a><a href="#evidence">Evidence</a><a href="#vp">Value Prop</a><a href="#personas">Personas</a><a href="#swipe">Swipe</a><a href="#scripts">Scripts</a><a href="#email">Email</a><a href="#wedge">Wedge</a><a href="#channels">Channels</a><a href="#matrix">Matrix</a><a href="#landing">Landing</a><a href="#rollout">Rollout</a><a href="#creators">Creators</a><a href="#method">Method</a>
    </div>
  </div>
</nav>
${renderCover(payload, project_name)}
<div class="container"><div class="hairline"></div></div>
${renderPositioning(payload)}
${renderEvidence(payload)}
${renderValueProp(payload)}
${renderPersonas(payload)}
${renderSwipe(payload)}
${renderScripts(payload)}
${renderEmails(payload)}
${renderEntryWedge(payload)}
${renderChannels(payload)}
${renderMatrix(payload)}
${renderLanding(payload)}
${renderRollout(payload)}
${renderCreators(payload)}
${renderMethodology(payload)}
${renderColophon(payload)}
<footer><div class="container"><div class="wordmark" style="font-size:48px">${esc(project_name.split(/\s/)[0] || "BRAND")}</div><p class="footer-meta" style="margin-top:12px">Generated by Alchemical Growth Engine v1.6.2 · Mode 1 Earth</p></div></footer>
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
