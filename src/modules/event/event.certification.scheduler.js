import { runDailyMissingClubCertificationJob } from "./event.repositories.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const msUntilNextRun = () => {
  const now = new Date();
  const next = new Date(now);

  // 14:15 = 2:15 PM
  next.setHours(14, 20, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

export const startCertificationScheduler = () => {
  const run = async () => {
    try {
      console.log(
        `[${new Date().toLocaleString()}] Running certification job...`
      );

      await runDailyMissingClubCertificationJob();

      console.log(
        `[${new Date().toLocaleString()}] Certification job completed`
      );
    } catch (err) {
      console.error(
        "Daily missing-club certification job failed:",
        err?.message || err
      );
    }
  };

  const delay = msUntilNextRun();

  console.log(
    `Certification scheduler started. Next run at 14:15.`
  );

  setTimeout(() => {
    run();
    setInterval(run, DAY_MS);
  }, delay);
};