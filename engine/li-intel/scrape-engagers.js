/**
 * LI-Intel · Part 2+3: Scrape Engagers & Enrich Profiles
 *
 * Phase A (Part 2): Pull PENDING posts from LI Posts, scrape reactions and
 *   comments via Apify (harvestapi~linkedin-post-reactions +
 *   harvestapi~linkedin-post-comments), merge and deduplicate engagers
 *   per post.
 * Phase B (Part 3): Enrich new engagers via Apify
 *   (apimaestro~linkedin-profile-detail), write to LI Engagers and
 *   LI Engagements.
 *
 * Vendored into the engine at engine/li-intel/scrape-engagers.js on v1.7.5.
 *
 * Engagements are deduped via a `(Engager URL, Post URL Ref)` composite
 * check, which is cheap on Airtable because both are denormalized
 * plain-text columns alongside the linked records.
 *
 * Usage:
 *   cd C:/Users/harri/Documents/Marketing Bot/odi-research-tool
 *   node engine/li-intel/scrape-engagers.js
 *   (or via npm: npm run li-intel:engagers)
 *
 * Eligibility for processing a post:
 *   (a) Post is older than 48 hours (so reactions have had time to land)
 *   OR (b) Post is younger than ~21 days (500h) so still actively engaging
 */

const {
  base,
  TABLES,
  findByField,
  findPostsByStatus,
  createRecord,
  updateRecord,
  getRecordById,
  escapeFormula,
  withRetry,
} = require('./lib/airtable');
const { runActor } = require('./lib/apify');

// ---------------------------------------------------------------------------
// Phase A: Get engagers from reactions + comments
// ---------------------------------------------------------------------------

async function fetchPendingPosts() {
  const records = await findPostsByStatus('PENDING');

  const now = Date.now();
  const HOURS_48 = 48 * 60 * 60 * 1000;
  const HOURS_500 = 500 * 60 * 60 * 1000;

  return records.filter((rec) => {
    // Airtable stamps every record with createdTime in _rawJson.
    const createdAtRaw = rec.get('Created At') || rec._rawJson.createdTime;
    const createdAt = new Date(createdAtRaw).getTime();
    const postedAtRaw = rec.get('Posted At');
    const postedAt = postedAtRaw ? new Date(postedAtRaw).getTime() : 0;
    return (now - createdAt) >= HOURS_48 || (postedAt && (now - postedAt) <= HOURS_500);
  });
}

function deduplicateEngagers(reactions, comments, parentProfileUrl, postUrl) {
  const profileMap = new Map();

  function addEngager(profileUrl, name, headline, urn, engagementType, engagementValue) {
    if (!profileUrl) return;
    if (!profileMap.has(profileUrl)) {
      profileMap.set(profileUrl, {
        parent: parentProfileUrl,
        post_url: postUrl,
        contact: { name, headline, profileUrl, urn },
        engagements: [],
      });
    }
    profileMap.get(profileUrl).engagements.push({
      type: engagementType,
      value: engagementValue || '',
    });
  }

  // Reactions
  for (const item of reactions) {
    if (item.reactionType && item.actor) {
      addEngager(
        item.actor.linkedinUrl,
        item.actor.name,
        item.actor.position,
        item.actor.id,
        'reaction',
        item.reactionType
      );
    }
  }

  // Comments (new format: top-level commentary)
  for (const item of comments) {
    if (item.commentary && item.actor) {
      addEngager(
        item.actor.linkedinUrl,
        item.actor.name,
        item.actor.position,
        item.actor.id,
        'comment',
        item.commentary
      );

      if (Array.isArray(item.replies)) {
        for (const reply of item.replies) {
          if (reply.actor) {
            addEngager(
              reply.actor.linkedinUrl,
              reply.actor.name,
              reply.actor.position,
              reply.actor.id,
              'comment_reply',
              reply.commentary || ''
            );
          }
        }
      }
    }

    // Old format: nested comments[]
    if (Array.isArray(item.comments)) {
      for (const comment of item.comments) {
        if (comment.author) {
          addEngager(
            comment.author.linkedinUrl || comment.author.url,
            comment.author.name,
            comment.author.headline,
            comment.author.id,
            'comment',
            comment.text || ''
          );
        }
      }
    }
  }

  return profileMap;
}

// ---------------------------------------------------------------------------
// Phase B: Enrich and save
// ---------------------------------------------------------------------------

async function engagementExists(engagerUrl, postUrl) {
  const records = await withRetry(() =>
    base(TABLES.engagements)
      .select({
        filterByFormula:
          `AND({Engager URL} = "${escapeFormula(engagerUrl)}", ` +
          `{Post URL Ref} = "${escapeFormula(postUrl)}")`,
        maxRecords: 1,
      })
      .firstPage()
  );
  return records.length > 0;
}

async function enrichAndSave(engagerMap, parentRecordId, postRec) {
  let enriched = 0;
  let skipped = 0;
  let engagementsSaved = 0;

  const postUrl = postRec.get('Post URL');
  const postText = postRec.get('Post Text') || null;
  const monitoredLink = postRec.get('Profile'); // array of linked record IDs

  for (const [, engager] of engagerMap) {
    const { contact, engagements } = engager;
    const urn = contact.urn;

    // Dedup by URN within this parent profile (1:1 with the Supabase behavior).
    let existing = null;
    if (urn) {
      existing = await withRetry(() =>
        base(TABLES.engagers)
          .select({
            filterByFormula: `AND({URN} = "${escapeFormula(urn)}", ` +
              (parentRecordId
                ? `FIND("${escapeFormula(parentRecordId)}", ARRAYJOIN({Parent Profile})))`
                : `TRUE())`),
            maxRecords: 1,
          })
          .firstPage()
      ).then((rows) => rows[0] || null);
    }

    let engagerRecordId = existing ? existing.id : null;
    let engagerProfileUrl = existing ? existing.get('Profile URL') : null;

    if (!existing) {
      console.log(`  Enriching: ${contact.name || urn}`);
      try {
        const items = await runActor('apimaestro~linkedin-profile-detail', {
          includeEmail: true,
          username: urn,
        });
        const profile = Array.isArray(items) && items.length > 0 ? items[0] : null;
        if (!profile) {
          console.warn(`  No enrichment data for ${urn}, skipping.`);
          skipped++;
          continue;
        }

        const basicInfo = profile.basic_info || {};
        const locationFull = basicInfo.location
          ? (typeof basicInfo.location === 'string'
              ? basicInfo.location
              : basicInfo.location.full || '')
          : '';

        const fields = {
          'Profile URL': basicInfo.profile_url || contact.profileUrl,
          'First Name': basicInfo.first_name || null,
          'Last Name': basicInfo.last_name || null,
          'Full Name': basicInfo.fullname || contact.name || null,
          'Headline': basicInfo.headline || contact.headline || null,
          'Company Name': basicInfo.current_company || null,
          'Company LinkedIn URL': basicInfo.current_company_url || null,
          'Location': locationFull || null,
          'Connections': basicInfo.connection_count || null,
          'Followers': basicInfo.follower_count || null,
          'About': basicInfo.about || null,
          'Public Identifier': basicInfo.public_identifier || null,
          'URN': basicInfo.urn || urn,
          // JSON blobs stored as strings — Airtable doesn't have a native JSON type.
          'Skills': basicInfo.top_skills ? JSON.stringify(basicInfo.top_skills) : null,
          'Experience': profile.experience ? JSON.stringify(profile.experience) : null,
          'Education': profile.education ? JSON.stringify(profile.education) : null,
          'Parent Profile': parentRecordId ? [parentRecordId] : undefined,
          'Engagement Type': engagements[0]?.type || null,
          'Engagement Value': engagements[0]?.value || null,
          'Last Enriched At': new Date().toISOString(),
        };

        const newRec = await createRecord('engagers', fields);
        engagerRecordId = newRec.id;
        engagerProfileUrl = fields['Profile URL'];
        enriched++;
      } catch (err) {
        console.error(`  Enrichment error for ${urn}: ${err.message}`);
        skipped++;
        continue;
      }
    } else {
      skipped++;
    }

    if (engagerRecordId && engagerProfileUrl) {
      // Dedup engagement on (engager URL, post URL)
      const alreadyExists = await engagementExists(engagerProfileUrl, postUrl);
      if (alreadyExists) continue;

      try {
        await createRecord('engagements', {
          'Engager': [engagerRecordId],
          'Post': [postRec.id],
          'Engager URL': engagerProfileUrl, // denormalized for cheap dedup
          'Post URL Ref': postUrl,          // denormalized for cheap dedup
          'Post Text': postText,
          'Monitored Profile': monitoredLink,
          'Engagement Type': engagements[0]?.type || 'like',
          'Engagement Value': engagements[0]?.value || null,
          'Engaged At': new Date().toISOString(),
        });
        engagementsSaved++;
      } catch (err) {
        console.error(`  Engagement save failed: ${err.message}`);
      }
    }
  }

  return { enriched, skipped, engagementsSaved };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function scrapeEngagers() {
  console.log('[LI-Intel · Part 2+3] Fetching PENDING posts...');

  const posts = await fetchPendingPosts();
  if (posts.length === 0) {
    console.log('[LI-Intel · Part 2+3] No qualifying posts found.');
    return { posts: 0, engagers: 0, enriched: 0 };
  }
  console.log(`[LI-Intel · Part 2+3] ${posts.length} post(s) to process.`);

  let totalEngagers = 0;
  let totalEnriched = 0;

  for (const postRec of posts) {
    const postUrl = postRec.get('Post URL');
    const monitoredLink = postRec.get('Profile');
    const parentRecordId = Array.isArray(monitoredLink) ? monitoredLink[0] : null;

    console.log(`\n[LI-Intel · Part 2] Processing: ${postUrl}`);

    await updateRecord('posts', postRec.id, { 'Status': 'PROCESSING' });

    let reactions = [];
    let comments = [];

    const [rRes, cRes] = await Promise.allSettled([
      runActor('harvestapi~linkedin-post-reactions', {
        maxItems: 20,
        posts: [postUrl],
      }),
      runActor('harvestapi~linkedin-post-comments', {
        maxItems: 20,
        posts: [postUrl],
      }),
    ]);

    if (rRes.status === 'fulfilled') {
      reactions = Array.isArray(rRes.value) ? rRes.value : [];
      console.log(`  Reactions: ${reactions.length}`);
    } else {
      console.warn(`  Reactions failed: ${rRes.reason?.message}`);
    }

    if (cRes.status === 'fulfilled') {
      comments = Array.isArray(cRes.value) ? cRes.value : [];
      console.log(`  Comments: ${comments.length}`);
    } else {
      console.warn(`  Comments failed: ${cRes.reason?.message}`);
    }

    // Resolve parent profile URL for the dedupe map.
    let parentProfileUrl = null;
    if (parentRecordId) {
      try {
        const parentRec = await getRecordById('profiles', parentRecordId);
        parentProfileUrl = parentRec.get('Profile URL');
      } catch (err) {
        console.warn(`  Could not resolve parent profile: ${err.message}`);
      }
    }

    const engagerMap = deduplicateEngagers(reactions, comments, parentProfileUrl, postUrl);
    console.log(`  Unique engagers: ${engagerMap.size}`);
    totalEngagers += engagerMap.size;

    if (engagerMap.size > 0) {
      console.log('[LI-Intel · Part 3] Enriching and saving...');
      const result = await enrichAndSave(engagerMap, parentRecordId, postRec);
      totalEnriched += result.enriched;
      console.log(
        `  Enriched: ${result.enriched}, Skipped: ${result.skipped}, Engagements: ${result.engagementsSaved}`
      );
    }

    await updateRecord('posts', postRec.id, { 'Status': 'PROCESSED - 1' });
    console.log(`  Post marked PROCESSED - 1`);
  }

  const result = { posts: posts.length, engagers: totalEngagers, enriched: totalEnriched };
  console.log('\n[LI-Intel · Part 2+3] Done.', result);
  return result;
}

if (require.main === module) {
  scrapeEngagers()
    .then((r) => {
      console.log('[LI-Intel · Part 2+3] Complete:', JSON.stringify(r));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[LI-Intel · Part 2+3] Fatal:', err);
      process.exit(1);
    });
}

module.exports = { scrapeEngagers };
