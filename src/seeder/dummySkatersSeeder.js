import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Skater } from "../modules/skater/skater.model.js";
import { BaseAuth } from "../modules/auth/baseAuth.model.js";
import { District } from "../modules/district/district.model.js";

const COUNT = 50;
const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Ananya", "Aadhya", "Diya", "Myra", "Sara", "Anika",
  "Ira", "Navya", "Kiara", "Pari",
];
const LAST_NAMES = [
  "Kumar", "Sharma", "Reddy", "Patel", "Gowda", "Nair", "Shetty", "Rao",
  "Iyer", "Hegde", "Desai", "Joshi", "Mehta", "Pillai", "Bhat",
];
const GENDERS = ["male", "female", "other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const CITIES = [
  "Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi",
  "Kalaburagi", "Ballari", "Davangere", "Shivamogga", "Tumakuru",
];

const phoneForIndex = (i) => `9${String(900000000 + i).slice(-9)}`;

async function seedDummySkaters() {
  await connectDB();

  const districts = await District.find({}).select("_id name").lean();
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= COUNT; i += 1) {
    const phone = phoneForIndex(i);
    const email = `dummy.skater${i}@example.com`;

    const existing = await BaseAuth.findOne({
      $or: [{ phone }, { email }],
    })
      .select("_id phone email")
      .lean();

    if (existing) {
      skipped += 1;
      console.log(`ℹ️ Skip ${i}: phone/email already exists (${phone})`);
      continue;
    }

    const first = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const last = LAST_NAMES[(i - 1) % LAST_NAMES.length];
    const city = CITIES[(i - 1) % CITIES.length];
    const gender = GENDERS[(i - 1) % GENDERS.length];
    const district =
      districts.length > 0 ? districts[(i - 1) % districts.length]._id : undefined;

    // Ages roughly 8–18
    const ageYears = 8 + ((i - 1) % 11);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - ageYears);
    dob.setMonth((i - 1) % 12);
    dob.setDate(1 + ((i - 1) % 28));

    const skater = await new Skater({
      fullName: `${first} ${last}`,
      phone,
      email,
      address: `${100 + i}, Dummy Street, ${city}, Karnataka`,
      gender,
      district,
      dob,
      bloodGroup: BLOOD_GROUPS[(i - 1) % BLOOD_GROUPS.length],
      school: `${city} Public School`,
      grade: String(3 + ((i - 1) % 10)),
      parent: `Parent of ${first}`,
      verify: false,
      clubStatus: "apply",
    }).save();

    created += 1;
    console.log(`✅ [${created}] ${skater.fullName} — ${skater.krsaId} (${phone})`);
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seedDummySkaters().catch(async (err) => {
  console.error("❌ Dummy skater seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
