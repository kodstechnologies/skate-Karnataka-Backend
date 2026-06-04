import { runDailyMissingClubCertificationJob } from "./event.repositories.js";
import { runDailyAutoGenerateEventCertificatesJob } from "../certificate/certificate.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const msUntilNextRun = () => {
  const now = new Date();
  const next = new Date(now);

  // 14:15 = 2:15 PM
  next.setHours(12, 18, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

export const startCertificationScheduler = () => {
  const run = async () => {
    try {
      console.log(
        `[${new Date().toLocaleString()}] Running certification scheduler...`
      );

      await runDailyAutoGenerateEventCertificatesJob();
      await runDailyMissingClubCertificationJob();

      console.log(
        `[${new Date().toLocaleString()}] Certification scheduler completed`
      );
    } catch (err) {
      console.error(
        "Certification scheduler failed:",
        err?.message || err
      );
    }
  };

  const delay = msUntilNextRun();

  console.log(
    `Certification scheduler started (auto certificates + missing-club certification).`
  );

  setTimeout(() => {
    run();
    setInterval(run, DAY_MS);
  }, delay);
};