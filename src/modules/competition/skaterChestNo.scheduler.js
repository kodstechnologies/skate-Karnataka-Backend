import { generateChestNumbersForExpiredEvents } from "./skaterChestNo.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily run at 13:17 (1:17 PM) server local time — only time chest numbers are auto-generated. */
const SCHEDULE_HOUR = 10;
const SCHEDULE_MINUTE = 23;

const msUntilNextScheduledRun = () => {
  const now = new Date();
  const next = new Date(now);

  next.setHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

export const startSkaterChestNoScheduler = () => {
  const run = async () => {
    try {
      console.log(
        `[${new Date().toLocaleString()}] Running skater chest number generation at ${SCHEDULE_HOUR}:${String(SCHEDULE_MINUTE).padStart(2, "0")}...`
      );

      const result = await generateChestNumbersForExpiredEvents();

      console.log(
        `[${new Date().toLocaleString()}] Chest number generation finished. Events processed: ${result.processedEventsCount ?? 0}`
      );
    } catch (err) {
      console.error(
        "Skater chest number generation job failed:",
        err?.message || err
      );
    }
  };

  const dailyDelay = msUntilNextScheduledRun();

  console.log(
    `Skater chest number scheduler started (runs only at ${SCHEDULE_HOUR}:${String(SCHEDULE_MINUTE).padStart(2, "0")} daily).`
  );

  setTimeout(() => {
    run();
    setInterval(run, DAY_MS);
  }, dailyDelay);
};
