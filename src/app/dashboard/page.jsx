import Link from "next/link";
import Image from "next/image";
import { Cinzel, Source_Sans_3 } from "next/font/google";

import CharacterOverview from "@/components/character-overview";
import StaminaTimer from "@/components/stamina-timer";
import GameNav from "@/components/game-nav";
import OnboardingPanel from "@/components/onboarding-panel";
import { loadDashboardPageData } from "./dashboard-data";
import { requirePageUser } from "@/lib/page-auth";
import styles from "./page.module.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default async function DashboardPage() {
  const user = await requirePageUser();
  const {
    activeCharacter,
    shouldShowOnboardingPanel,
    onboardingModel,
    equippedItems,
    staminaMeta,
    hpMeta,
    levelProgress,
    logEntries,
    compactLogEntries,
    dashboardGoals,
    dashboardDecision,
    maxResources,
    hpPercent,
    staminaPercent,
    resourceGuidance,
    characterAvatarImage,
  } = await loadDashboardPageData(user.id);
  const effectiveCharacter = activeCharacter;

  return (
    <div className={`${styles.pageShell} ${bodyFont.className}`}>
      <main className={styles.main}>
        <GameNav />
        <section className={styles.heroCard}>
          <header className={styles.heroIntro}>
            <p className={styles.kicker}>Adventurer Command Center</p>
            <h1 className={`${styles.title} ${headingFont.className}`}>Dashboard</h1>
            <p className={styles.lead}>
              You are logged in as <strong>{user.email}</strong>. Keep the momentum
              going and push your character forward.
            </p>
          </header>
          {shouldShowOnboardingPanel ? <OnboardingPanel model={onboardingModel} /> : null}

          {effectiveCharacter ? (
            <>
              {dashboardDecision ? (
                <section
                  className={`${styles.decisionBanner} ${
                    dashboardDecision.tone === "danger"
                      ? styles.decisionBannerDanger
                      : dashboardDecision.tone === "warn"
                        ? styles.decisionBannerWarn
                        : styles.decisionBannerOk
                  }`}
                >
                  <div>
                    <p className={styles.decisionEyebrow}>Right now</p>
                    <h2 className={styles.decisionTitle}>{dashboardDecision.title}</h2>
                    <p className={styles.decisionSummary}>{dashboardDecision.summary}</p>
                    {dashboardDecision.hint ? (
                      <p className={styles.decisionHint}>{dashboardDecision.hint}</p>
                    ) : null}
                  </div>
                  {dashboardDecision.action ? (
                    <Link
                      href={dashboardDecision.action.href}
                      className={styles.decisionAction}
                    >
                      {dashboardDecision.action.label}
                    </Link>
                  ) : null}
                </section>
              ) : null}

              <div className={styles.panelGrid}>
              <section className={styles.panel}>
                {characterAvatarImage ? (
                  <div className={styles.characterPortraitWrap}>
                    <Image
                      src={characterAvatarImage}
                      alt={`${effectiveCharacter.name} portrait`}
                      width={220}
                      height={220}
                      className={styles.characterPortrait}
                      priority
                    />
                  </div>
                ) : null}
                <h2>Current status</h2>
                <p className={styles.muted}>
                  Active character loaded automatically on login.
                </p>
                <div className={styles.resourceMeters}>
                  <article className={styles.resourceCard}>
                    <div className={styles.resourceTop}>
                      <p className={styles.resourceLabel}>
                        HP{" "}
                        <StaminaTimer
                          key={hpMeta?.nextHpAt ?? "hp-full-inline-dashboard"}
                          resourceMeta={hpMeta}
                          resourceLabel="HP"
                          showDepletedNotice
                          variant="inline"
                          className={styles.resourceLabelMeta}
                        />
                      </p>
                      <p className={styles.resourceValue}>
                        {effectiveCharacter.hp}/{maxResources.maxHp}
                      </p>
                    </div>
                    <div className={styles.goalTrack} aria-hidden="true">
                      <span
                        className={`${styles.goalFill} ${styles.hpFill}`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                    <p className={styles.resourceNote}>{resourceGuidance?.hp}</p>
                  </article>

                  <article className={styles.resourceCard}>
                    <div className={styles.resourceTop}>
                      <p className={styles.resourceLabel}>
                        Stamina{" "}
                        <StaminaTimer
                          key={staminaMeta?.nextStaminaAt ?? "stamina-full-inline-dashboard"}
                          staminaMeta={staminaMeta}
                          resourceLabel="Stamina"
                          variant="inline"
                          className={styles.resourceLabelMeta}
                        />
                      </p>
                      <p className={styles.resourceValue}>
                        {effectiveCharacter.stamina}/{maxResources.maxStamina}
                      </p>
                    </div>
                    <div className={styles.goalTrack} aria-hidden="true">
                      <span
                        className={`${styles.goalFill} ${styles.energyFill}`}
                        style={{ width: `${staminaPercent}%` }}
                      />
                    </div>
                    <p className={styles.resourceNote}>{resourceGuidance?.stamina}</p>
                  </article>

                  <article className={styles.resourceCard}>
                    <div className={styles.resourceTop}>
                      <p className={styles.resourceLabel}>Heat</p>
                      <p className={styles.resourceValue}>{effectiveCharacter.heat}</p>
                    </div>
                    <div className={styles.goalTrack} aria-hidden="true">
                      <span
                        className={`${styles.goalFill} ${styles.heatFill}`}
                        style={{ width: `${Math.min(100, (Number(effectiveCharacter.heat) || 0))}%` }}
                      />
                    </div>
                    <p className={styles.resourceNote}>{resourceGuidance?.heat}</p>
                  </article>
                </div>
                <p className={styles.progression}>
                  <strong>Progression:</strong> Level {levelProgress.level} | XP{" "}
                  {levelProgress.xp} | Next level at{" "}
                  {levelProgress.nextLevelXpTarget} XP (
                  {levelProgress.xpToNextLevel} remaining)
                </p>
                <hr className={styles.sectionDivider} />
                <h3 className={styles.panelSubheading}>Character overview</h3>
                <CharacterOverview
                  character={effectiveCharacter}
                  showResources={false}
                  equippedItems={equippedItems}
                />
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeadingRow}>
                  <div>
                    <h2>Recent action log</h2>
                    <p className={styles.panelNote}>
                      Activity runs show outcome labels. Economy, inventory, and onboarding entries show category tags.
                    </p>
                  </div>
                  <Link className={styles.inlineLink} href="/account#log">
                    Open full log
                  </Link>
                </div>
                {logEntries.length === 0 ? (
                  <p>No actions logged yet.</p>
                ) : (
                  <ul className={styles.logList}>
                    {compactLogEntries.map((entry) => (
                      <li className={styles.logItem} key={entry.id}>
                        <p className={styles.logTopLine}>
                          <strong>{entry.activityName}</strong>
                        </p>
                        <p
                          className={`${styles.logStatus} ${
                            entry.isSuccess
                              ? styles.logStatusSuccess
                              : entry.isFail
                                ? styles.logStatusFail
                                : styles.logStatusNeutral
                          }`}
                        >
                          {entry.status}
                        </p>
                        <p className={styles.logMetaLine}>{entry.time}</p>
                        {entry.rollLine ? (
                          <p className={styles.logDetail}>{entry.rollLine}</p>
                        ) : null}
                        {entry.detailLine ? (
                          <p className={styles.logDetail}>{entry.detailLine}</p>
                        ) : null}
                        {entry.deltaLine ? (
                          <p className={styles.logDetail}>{entry.deltaLine}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={`${styles.panel} ${styles.panelWide}`}>
                <h2>Goals & milestones</h2>
                <p className={styles.muted}>
                  Track your short-term targets and keep progression clear.
                </p>
                <ul className={styles.goalGrid}>
                  {dashboardGoals.map((goal) => (
                    <li className={styles.goalCard} key={goal.id}>
                      <p className={styles.goalLabel}>{goal.label}</p>
                      <p className={styles.goalValue}>{goal.value}</p>
                      <p className={styles.goalHint}>{goal.hint}</p>
                      <div className={styles.goalTrack} aria-hidden="true">
                        <span
                          className={styles.goalFill}
                          style={{ width: `${goal.progressPercent}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              </div>
            </>
          ) : (
            <section className={`${styles.panel} ${styles.emptyState}`}>
              <h2>No active character yet</h2>
              <p>
                You need to create your first character before you can use the core
                game loop.
              </p>
              <Link className={styles.primaryAction} href="/character/create">
                Create character
              </Link>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
