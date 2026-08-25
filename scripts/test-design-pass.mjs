/**
 * Design Pass logic smoke tests.
 * Run: npx tsx scripts/test-design-pass.mjs
 */

import {
  buildDesignPassProfile,
  collectEarnedSeasonRewards,
  DESIGN_PASS_TIER_THRESHOLDS,
  getSeasonBounds,
  getSeasonId,
  getSeasonPoints,
  getSeasonTemplate,
  getSeasonMonthlyBreakdown,
} from '../src/lib/designPass.ts';
import { generateEternalPerk } from '../src/lib/rewardCatalog.ts';
import { unlockedEternalPerkCount } from '../src/lib/workerGamification.ts';

const workerId = 'worker-1';
const now = new Date('2026-08-15T12:00:00Z');

const entries = [
  { id: '1', workerId, projectId: 'p1', points: 5, type: 'completion', createdAt: '2026-08-01T10:00:00Z' },
  { id: '2', workerId, projectId: 'p2', points: 4, type: 'completion', createdAt: '2026-08-10T10:00:00Z' },
  { id: '3', workerId, projectId: 'p3', points: 3, type: 'completion', createdAt: '2026-07-20T10:00:00Z' },
  { id: '4', workerId, projectId: 'p4', points: 10, type: 'completion', createdAt: '2026-06-01T10:00:00Z' },
  { id: '5', workerId: 'other', projectId: 'p5', points: 99, type: 'completion', createdAt: '2026-08-05T10:00:00Z' },
];

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  OK ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}`);
  }
}

console.log('Design Pass tests\n');

const seasonId = getSeasonId(now);
assert('season id for Aug 2026 is monthly', seasonId === '2026-08');

const bounds = getSeasonBounds(seasonId);
assert('season bounds exist', !!bounds);
assert('Aug is inside its own month bounds', bounds && now >= bounds.start && now <= bounds.end);
assert('season is one month (Aug 1–31)', bounds && bounds.start.getMonth() === 7 && bounds.end.getMonth() === 7);

const seasonPoints = getSeasonPoints(workerId, entries, seasonId);
assert('season points sum August entries only (9 = 5+4)', seasonPoints === 9);

const breakdown = getSeasonMonthlyBreakdown(workerId, entries, seasonId);
assert('breakdown has 1 month', breakdown.length === 1);
assert('August points = 9', breakdown.find((r) => r.month === '2026-08')?.points === 9);
assert('breakdown sum equals season points', breakdown.reduce((s, r) => s + r.points, 0) === seasonPoints);

const profile = buildDesignPassProfile(workerId, entries, 22, now);
assert('profile season matches', profile.seasonId === '2026-08');
assert('lifetime points attached', profile.lifetimePoints === 22);
assert('tier 0 at 9 points (need 15 for tier 1)', profile.currentTier === 0);
assert('next tier is 1', profile.nextTier === 1);
assert('10 tiers defined', profile.tiers.length === 10);
assert('tiers monotonic thresholds', profile.tiers.every((t, i) => t.pointsRequired === DESIGN_PASS_TIER_THRESHOLDS[i]));

const highEntries = [
  ...entries,
  { id: '6', workerId, projectId: 'p6', points: 500, type: 'completion', createdAt: '2026-08-12T10:00:00Z' },
];
const maxProfile = buildDesignPassProfile(workerId, highEntries, 522, now);
assert('max tier at 500+ season points', maxProfile.currentTier === 10);
assert('no next tier at max', maxProfile.nextTier === null);
assert('progress 100 at max', maxProfile.progressToNextTier === 100);
assert('master frame unlocked', !!maxProfile.activeSeasonFrameClass);

const template2026Jan = getSeasonTemplate('2026-01');
const template2026Sep = getSeasonTemplate('2026-09');
assert('each month has its own season id', template2026Jan.id === '2026-01' && template2026Sep.id === '2026-09');
assert('adjacent months use different names or features',
  template2026Jan.name.uz !== getSeasonTemplate('2026-02').name.uz
  || template2026Jan.tiers.find((t) => t.feature)?.feature !== getSeasonTemplate('2026-02').tiers.find((t) => t.feature)?.feature,
);
assert('same month next year is a different pass', template2026Jan.name.uz !== getSeasonTemplate('2027-01').name.uz);

const featureIds = new Set();
const names = new Set();
let monthsUnique = true;
for (let i = 0; i < 36; i += 1) {
  const year = 2026 + Math.floor(i / 12);
  const month = String((i % 12) + 1).padStart(2, '0');
  const template = getSeasonTemplate(`${year}-${month}`);
  const feats = template.tiers.map((tier) => tier.feature).filter(Boolean);
  for (const feat of feats) {
    if (featureIds.has(feat)) monthsUnique = false;
    featureIds.add(feat);
  }
  names.add(template.name.uz);
}
assert('36 months produce unique feature ids', monthsUnique && featureIds.size >= 36);
assert('most monthly names differ', names.size >= 30);

const julyFeature = getSeasonTemplate('2026-07').tiers.find((tier) => tier.feature)?.feature;
const persistEntries = [
  { id: 'j1', workerId, projectId: 'pj', points: 80, type: 'completion', createdAt: '2026-07-10T10:00:00Z' },
  { id: 'a1', workerId, projectId: 'pa', points: 9, type: 'completion', createdAt: '2026-08-05T10:00:00Z' },
];
const earned = collectEarnedSeasonRewards(workerId, persistEntries, now);
assert('july feature stays on account in august', !!julyFeature && earned.features.includes(julyFeature));
assert('august with 9 pts has no current-season feature yet', buildDesignPassProfile(workerId, persistEntries, 89, now).activeSeasonFeatures.length === 0);
assert('account features still include prior month', buildDesignPassProfile(workerId, persistEntries, 89, now).accountFeatures.includes(julyFeature));

const eternalA = generateEternalPerk(0);
const eternalB = generateEternalPerk(1);
assert('eternal perks have different names', eternalA.label.uz !== eternalB.label.uz);
assert('eternal perks have different feature ids', eternalA.feature !== eternalB.feature);
const eternalFeats = new Set(Array.from({ length: 80 }, (_, i) => generateEternalPerk(i).feature));
assert('80 eternal perks are unique', eternalFeats.size === 80);
assert('next eternal perk exists after last static tier', unlockedEternalPerkCount(2479) === 0);
assert('first eternal perk unlocks at 2480', unlockedEternalPerkCount(2480) === 1);
assert('eternal track keeps growing', unlockedEternalPerkCount(2480 + 280 * 12) === 13);

const tierUnlock = buildDesignPassProfile(workerId, [
  { id: 'x', workerId, projectId: 'p', points: 40, type: 'completion', createdAt: '2026-08-01T10:00:00Z' },
], 40, now);
assert('tier 2 unlocked at 40 pts', tierUnlock.currentTier === 2);
assert('first two tiers unlocked', tierUnlock.tiers.filter((t) => t.unlocked).length === 2);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
