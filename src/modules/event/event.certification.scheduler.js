import { runDailyMissingClubCertificationJob } from "./event.repositories.js";

const CERTIFICATION_JOB_HOUR = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

const msUntilNextHour = (hour) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
};

export const startCertificationScheduler = () => {
  const run = () => {
    runDailyMissingClubCertificationJob().catch((err) => {
      console.error(
        "Daily missing-club certification job failed:",
        err?.message || err
      );
    });
  };

  setTimeout(() => {
    run();
    setInterval(run, DAY_MS);
  }, msUntilNextHour(CERTIFICATION_JOB_HOUR));

  console.log("Certification scheduler started (runs daily at 10:00)");
};
