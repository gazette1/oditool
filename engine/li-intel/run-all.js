/**
 * LI-Intel · full pipeline orchestrator.
 *
 * Runs Part 1 (scrape posts) then Part 2+3 (scrape engagers + enrich)
 * sequentially. Vendored into the engine on v1.7.5.
 *
 * Usage:
 *   cd C:/Users/harri/Documents/Marketing Bot/odi-research-tool
 *   node engine/li-intel/run-all.js
 *   (or via npm: npm run li-intel)
 *
 * Cron pattern (every 6 hours · slash-star escaped because block-comment):
 *   0  STAR/6 STAR STAR STAR  cd /path/to/repo && node engine/li-intel/run-all.js >> logs/li-intel.log 2>&1
 *   (real cron line uses literal asterisks · this comment uses STAR placeholders
 *    because '* / 6' inside a /\* ... \*\/ block would close the comment early)
 *
 * Env vars required (in .env.local):
 *   AIRTABLE_API_KEY, AIRTABLE_BASE_ID, APIFY_TOKEN
 *
 * Optional Airtable table-name overrides (defaults shown):
 *   AIRTABLE_TABLE_LI_PROFILES=LI Profiles
 *   AIRTABLE_TABLE_LI_POSTS=LI Posts
 *   AIRTABLE_TABLE_LI_ENGAGERS=LI Engagers
 *   AIRTABLE_TABLE_LI_ENGAGEMENTS=LI Engagements
 */

const { scrapePosts } = require('./scrape-posts');
const { scrapeEngagers } = require('./scrape-engagers');

async function main() {
  const start = Date.now();
  console.log('='.repeat(60));
  console.log(`LI-Intel pipeline started at ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  console.log('\n--- Step 1: Scrape Posts ---\n');
  const postsResult = await scrapePosts();

  console.log('\n--- Step 2: Scrape Engagers & Enrich ---\n');
  const engagersResult = await scrapeEngagers();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('LI-Intel pipeline complete.');
  console.log(`  Posts scraped: ${postsResult.scraped} (${postsResult.inserted} new, ${postsResult.updated} updated)`);
  console.log(`  Engagers found: ${engagersResult.engagers} across ${engagersResult.posts} post(s)`);
  console.log(`  Profiles enriched: ${engagersResult.enriched}`);
  console.log(`  Elapsed: ${elapsed}s`);
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('LI-Intel pipeline failed:', err);
    process.exit(1);
  });
