/**
 * LI-Intel · Part 1: Scrape Posts
 *
 * Fetches enabled profiles from the LI Profiles table, scrapes their recent
 * posts via Apify (supreme_coder~linkedin-post), and inserts/updates them
 * in LI Posts with status PENDING for downstream Part 2 engager scraping.
 *
 * Vendored into the engine at engine/li-intel/scrape-posts.js on v1.7.5.
 *
 * Usage:
 *   cd C:/Users/harri/Documents/Marketing Bot/odi-research-tool
 *   node engine/li-intel/scrape-posts.js
 *   (or via npm: npm run li-intel:posts)
 *
 * Env vars required (in .env.local):
 *   AIRTABLE_API_KEY, AIRTABLE_BASE_ID, APIFY_TOKEN
 */

const {
  findEnabledProfiles,
  findByField,
  createRecord,
  updateRecord,
} = require('./lib/airtable');
const { runActor } = require('./lib/apify');

async function scrapePosts() {
  console.log('[LI-Intel · Part 1] Fetching enabled profiles...');

  const profileRecords = await findEnabledProfiles();
  if (!profileRecords.length) {
    console.log('[LI-Intel · Part 1] No enabled profiles found.');
    return { scraped: 0, inserted: 0, updated: 0 };
  }
  console.log(`[LI-Intel · Part 1] Found ${profileRecords.length} enabled profile(s).`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalScraped = 0;

  for (const profileRec of profileRecords) {
    const profileUrl = profileRec.get('Profile URL');
    if (!profileUrl) continue;

    console.log(`[LI-Intel · Part 1] Scraping posts for: ${profileUrl}`);

    let items;
    try {
      items = await runActor('supreme_coder~linkedin-post', {
        deepScrape: true,
        limitPerSource: 3,
        rawData: false,
        urls: [profileUrl],
      });
    } catch (err) {
      console.error(`[LI-Intel · Part 1] Apify error for ${profileUrl}: ${err.message}`);
      continue;
    }

    if (!Array.isArray(items) || items.length === 0) {
      console.log(`[LI-Intel · Part 1] No posts returned for ${profileUrl}`);
      continue;
    }

    // Filter out reposts
    const posts = items.filter((it) => it.post_type !== 'repost');
    console.log(`[LI-Intel · Part 1] ${posts.length} non-repost(s) found (${items.length} total).`);
    totalScraped += posts.length;

    for (const post of posts) {
      const postUrl = post.url;
      if (!postUrl) continue;

      const postId = post.urn ? post.urn.split(':').pop() : null;
      const postedAt = post.postedAtTimestamp
        ? new Date(post.postedAtTimestamp).toISOString()
        : null;

      const existing = await findByField('posts', 'Post URL', postUrl);

      const writeFields = {
        'Post Text': post.text || null,
        'Posted At': postedAt,
        'Post ID': postId,
      };

      if (existing) {
        try {
          await updateRecord('posts', existing.id, writeFields);
          totalUpdated++;
        } catch (err) {
          console.error(`[LI-Intel · Part 1] Update failed for ${postUrl}: ${err.message}`);
        }
      } else {
        try {
          await createRecord('posts', {
            'Post URL': postUrl,
            'Profile': [profileRec.id], // linked record to LI Profiles
            ...writeFields,
            'Status': 'PENDING',
          });
          totalInserted++;
        } catch (err) {
          console.error(`[LI-Intel · Part 1] Insert failed for ${postUrl}: ${err.message}`);
        }
      }
    }
  }

  const result = { scraped: totalScraped, inserted: totalInserted, updated: totalUpdated };
  console.log('[LI-Intel · Part 1] Done.', result);
  return result;
}

if (require.main === module) {
  scrapePosts()
    .then((r) => {
      console.log('[LI-Intel · Part 1] Complete:', JSON.stringify(r));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[LI-Intel · Part 1] Fatal:', err);
      process.exit(1);
    });
}

module.exports = { scrapePosts };
