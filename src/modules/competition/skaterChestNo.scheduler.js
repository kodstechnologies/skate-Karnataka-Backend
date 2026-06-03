import { generateChestNumbersForExpiredEvents } from "./skaterChestNo.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const msUntil1AM = () => {
  const now = new Date();
  const next = new Date(now);

  // Set time to 1:00 AM
  next.setHours(17, 39, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
};

export const startSkaterChestNoScheduler = () => {
  const run = async () => {
    try {
      console.log(
        `[${new Date().toLocaleString()}] Running daily skater chest number generation job...`
      );

      await generateChestNumbersForExpiredEvents();

      console.log(
        `[${new Date().toLocaleString()}] Daily skater chest number generation completed.`
      );
    } catch (err) {
      console.error(
        "Daily skater chest number generation job failed:",
        err?.message || err
      );
    }
  };

  const delay = msUntil1AM();

  console.log(
    `Skater chest number generation scheduler started (will run daily at 1:00 AM).`
  );

  setTimeout(() => {
    run();
    setInterval(run, DAY_MS);
  }, delay);
};
