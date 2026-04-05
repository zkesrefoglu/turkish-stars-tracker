/**
 * sync-athlete-images.js
 *
 * Scans public/athletes/ for image files, matches them to athlete slugs,
 * and updates the database with the correct URLs.
 *
 * Naming convention:
 *   {slug}-team.{ext}      -> photo_url
 *   {slug}-national.{ext}  -> national_photo_url
 *   {slug}-action.{ext}    -> action_photo_url
 *   {slug}-logo.{ext}      -> team_logo_url
 *
 * Runs automatically as part of the Vercel build.
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ATHLETES_DIR = resolve(__dirname, '..', 'public', 'athletes');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[sync-athlete-images] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Skipping image sync.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Image type suffixes -> database columns
const IMAGE_TYPES = {
  'team':     'photo_url',
  'national': 'national_photo_url',
  'action':   'action_photo_url',
  'logo':     'team_logo_url',
};

// Supported extensions
const VALID_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']);

async function main() {
  console.log('[sync-athlete-images] Scanning', ATHLETES_DIR);

  let files;
  try {
    files = readdirSync(ATHLETES_DIR);
  } catch (err) {
    console.warn('[sync-athlete-images] Could not read athletes directory:', err.message);
    process.exit(0);
  }

  // Parse files into { slug -> { photo_url, national_photo_url, ... } }
  const imageMap = {};

  for (const file of files) {
    // Match pattern: {slug}-{type}.{ext}
    // slug can contain hyphens, so we match the LAST hyphen-separated segment before the extension
    const match = file.match(/^(.+)-(team|national|action|logo)\.(\w+)$/);
    if (!match) continue;

    const [, slug, type, ext] = match;
    if (!VALID_EXTENSIONS.has(ext.toLowerCase())) continue;

    const column = IMAGE_TYPES[type];
    if (!column) continue;

    if (!imageMap[slug]) imageMap[slug] = {};
    imageMap[slug][column] = `/athletes/${file}`;
  }

  const slugs = Object.keys(imageMap);
  if (slugs.length === 0) {
    console.log('[sync-athlete-images] No athlete images found.');
    return;
  }

  console.log(`[sync-athlete-images] Found images for ${slugs.length} athletes`);

  // Fetch current DB state for these slugs
  const { data: athletes, error: fetchError } = await supabase
    .from('athlete_profiles')
    .select('id, slug, photo_url, national_photo_url, action_photo_url, team_logo_url')
    .in('slug', slugs);

  if (fetchError) {
    console.error('[sync-athlete-images] Error fetching athletes:', fetchError.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const athlete of athletes) {
    const newImages = imageMap[athlete.slug];
    if (!newImages) continue;

    // Only update columns that are different from current DB values
    const changes = {};
    for (const [column, url] of Object.entries(newImages)) {
      if (athlete[column] !== url) {
        changes[column] = url;
      }
    }

    if (Object.keys(changes).length === 0) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('athlete_profiles')
      .update(changes)
      .eq('id', athlete.id);

    if (updateError) {
      console.error(`[sync-athlete-images] Error updating ${athlete.slug}:`, updateError.message);
    } else {
      console.log(`[sync-athlete-images] Updated ${athlete.slug}:`, Object.keys(changes).join(', '));
      updated++;
    }
  }

  // Log slugs with images but no DB record
  const dbSlugs = new Set(athletes.map(a => a.slug));
  const orphans = slugs.filter(s => !dbSlugs.has(s));
  if (orphans.length > 0) {
    console.log(`[sync-athlete-images] Images found but no DB record for: ${orphans.join(', ')}`);
  }

  console.log(`[sync-athlete-images] Done. Updated: ${updated}, Already current: ${skipped}, No DB record: ${orphans.length}`);
}

main().catch(err => {
  console.error('[sync-athlete-images] Fatal error:', err);
  process.exit(1);
});
