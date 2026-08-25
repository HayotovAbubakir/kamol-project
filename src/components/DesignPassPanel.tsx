'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  designPassClaimKey,
  displayPassText,
  formatDesignPassMonth,
  readDesignPassClaims,
  writeDesignPassClaim,
  type DesignPassProfile,
} from '@/lib/designPass';
import { useAppSettings } from '@/context/AppSettingsContext';
import { cn } from '@/lib/utils';

interface DesignPassPanelProps {
  designPass: DesignPassProfile;
  compact?: boolean;
}

export function DesignPassPanel({ designPass, compact = false }: DesignPassPanelProps) {
  const { t, locale } = useAppSettings();
  const reduced = useReducedMotion();
  const [claims, setClaims] = useState<string[]>(() => readDesignPassClaims());

  const claimKeys = useMemo(
    () => new Set(claims),
    [claims],
  );

  const handleClaim = useCallback(
    (tierId: string) => {
      const key = designPassClaimKey(designPass.seasonId, tierId);
      writeDesignPassClaim(key);
      setClaims(readDesignPassClaims());
    },
    [designPass.seasonId],
  );

  const seasonTotal = designPass.monthlyBreakdown.reduce((sum, row) => sum + row.points, 0);

  return (
    <section
      className={cn(
        'design-pass-panel overflow-hidden rounded-2xl border shadow-sm',
        compact ? 'p-4' : 'p-5 sm:p-6',
      )}
      style={{
        borderColor: `${designPass.seasonAccent}44`,
        background: `linear-gradient(145deg, rgb(var(--app-card)) 0%, ${designPass.seasonAccent}08 100%)`,
      }}
    >
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-app-muted">
            {t('designPass.brand')}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-app-text sm:text-2xl">
            {displayPassText(designPass.seasonName, designPass.seasonNameKey, locale, t)}
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            {displayPassText(designPass.seasonTheme, designPass.seasonThemeKey, locale, t)}
          </p>
          {compact && (
            <Link href="/worker/design-pass" className="mt-2 inline-block text-xs font-semibold text-app-accent hover:underline">
              {t('designPass.brand')} →
            </Link>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <StatPill label={t('designPass.seasonPoints')} value={designPass.seasonPoints} accent={designPass.seasonAccent} />
          <StatPill label={t('designPass.lifetimePoints')} value={designPass.lifetimePoints} />
          <StatPill
            label={t('designPass.daysLeft')}
            value={designPass.daysRemaining}
            suffix={t('designPass.daysUnit')}
          />
        </div>
      </header>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-app-muted">
          <span>
            {designPass.nextTier
              ? t('designPass.progressToTier').replace('{tier}', String(designPass.nextTier))
              : t('designPass.maxTierReached')}
          </span>
          <span>
            {t('designPass.tierProgress')
              .replace('{current}', String(designPass.currentTier))
              .replace('{max}', String(designPass.maxTier))}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-app-border/30">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${designPass.seasonAccent}, ${designPass.seasonAccent}cc)` }}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${designPass.progressToNextTier}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        {designPass.nextTierPoints !== null && (
          <p className="mt-2 text-xs text-app-muted">
            {t('designPass.pointsToNext')
              .replace('{points}', String(Math.max(0, designPass.nextTierPoints - designPass.seasonPoints)))}
          </p>
        )}
      </div>

      {!compact && (
        <div className="mb-5 rounded-xl border border-app-border/60 bg-app-bg/40 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-muted">
            {t('designPass.monthlyBreakdown')}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
            {designPass.monthlyBreakdown.map((row) => (
              <div
                key={row.month}
                className="rounded-lg border border-app-border/50 bg-app-card/80 px-3 py-2 text-center"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-app-muted">
                  {formatDesignPassMonth(row.month, locale)}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-app-text">{row.points}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-right text-xs text-app-muted">
            {t('designPass.seasonTotalVerified').replace('{points}', String(seasonTotal))}
          </p>
        </div>
      )}

      <div className="relative">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-muted">
          {t('designPass.rewardTrack')}
        </p>
        <div className="design-pass-track overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3 px-1">
            {designPass.tiers.map((tier) => {
              const claimKey = designPassClaimKey(designPass.seasonId, tier.id);
              const claimed = claimKeys.has(claimKey);
              const canClaim = tier.unlocked && !claimed;

              return (
                <div
                  key={tier.id}
                  className={cn(
                    'design-pass-tier relative w-[8.5rem] shrink-0 rounded-xl border p-3 transition',
                    tier.unlocked
                      ? 'border-app-accent/40 bg-app-card/90 shadow-sm'
                      : 'border-app-border/50 bg-app-bg/30 opacity-75',
                  )}
                >
                  <div
                    className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-base font-semibold"
                    style={{
                      background: tier.unlocked ? `${designPass.seasonAccent}22` : 'rgb(var(--app-card-soft))',
                      color: tier.unlocked ? designPass.seasonAccent : 'rgb(var(--app-muted))',
                    }}
                  >
                    {tier.icon}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-app-muted">
                    {t('designPass.tierLabel').replace('{n}', String(tier.tier))}
                  </p>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-semibold leading-tight text-app-text">
                    {displayPassText(tier.label, tier.labelKey, locale, t)}
                  </p>
                  <p className="mt-1 text-[10px] tabular-nums text-app-muted">{tier.pointsRequired} bp</p>

                  {tier.unlocked ? (
                    canClaim ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(tier.id)}
                        className="mt-3 w-full rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white transition active:scale-[0.98]"
                        style={{ background: designPass.seasonAccent }}
                      >
                        {t('designPass.claim')}
                      </button>
                    ) : (
                      <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-wide text-app-accent">
                        {claimed ? t('designPass.claimed') : t('designPass.unlocked')}
                      </p>
                    )
                  ) : (
                    <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-wide text-app-muted">
                      {t('designPass.locked')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatPill({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border border-app-border/50 bg-app-card/80 px-3 py-2 text-center"
      style={accent ? { borderColor: `${accent}44` } : undefined}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-app-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-app-text">
        {value}
        {suffix ? <span className="ml-0.5 text-xs font-medium text-app-muted">{suffix}</span> : null}
      </p>
    </div>
  );
}
