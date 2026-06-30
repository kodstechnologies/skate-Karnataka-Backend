// seed/superAdmin.seed.js
import crypto from "crypto";
import { promisify } from "util";
import { ADMIN_PASSWORD } from "../config/envConfig.js";
import { Admin } from "../modules/admin/admin.model.js";
import { BaseAuth } from "../modules/auth/baseAuth.model.js";

const scryptAsync = promisify(crypto.scrypt);

// Mirrors the scrypt hashing used by Admin.model so a converted account's
// password is verifiable the same way as a natively-created admin.
const hashPassword = async (plainPassword) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(plainPassword, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

// Emails that should have super-admin (admin) access to the web portal.
// Login is via email OTP, so the password below only satisfies the schema.
const SUPER_ADMIN_EMAILS = [
  "skatekarnataka@gmail.com",
  "skaterkarnataka@gmail.com",
  "ms.madhusudhan001@gmail.com",
  "ashok.kodstech@gmail.com",
  "balsangram1@gmail.com",
  "nagarajbm425@gmail.com",
];

const ADMIN_PREFIX = "AD";
const DEFAULT_PASSWORD = "ChangeMe@123";

const generateAdminKrsaId = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `KRSA${random}${ADMIN_PREFIX}`;
};

const getUniqueAdminKrsaId = async () => {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const candidate = generateAdminKrsaId();
    const exists = await BaseAuth.exists({ krsaId: candidate });
    if (!exists) return candidate;
  }
  throw new Error("Failed to generate unique admin KRSA ID");
};

// phone is required + unique on BaseAuth and must match /^[6-9]\d{9}$/.
// These are placeholders so accounts can be created from email alone; they
// can be updated later from the admin profile.
const generatePlaceholderPhone = () => {
  const firstDigit = 6 + Math.floor(Math.random() * 4); // 6-9
  const rest = Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, "0");
  return `${firstDigit}${rest}`;
};

const getUniquePhone = async () => {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const candidate = generatePlaceholderPhone();
    const exists = await BaseAuth.exists({ phone: candidate });
    if (!exists) return candidate;
  }
  throw new Error("Failed to generate unique placeholder phone");
};

const deriveFullName = (email) => {
  const local = String(email).split("@")[0] || "Admin";
  const cleaned = local.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
  const name = cleaned || local;
  return name.length < 3 ? `${name} Admin`.trim() : name;
};

async function seedSuperAdmins() {
  try {
    for (const rawEmail of SUPER_ADMIN_EMAILS) {
      const email = String(rawEmail).trim().toLowerCase();

      const existing = await BaseAuth.findOne({ email }).select("_id role email password krsaId");
      if (existing) {
        if (String(existing.role).toLowerCase() === "admin") {
          console.log(`ℹ️ Super admin already exists: ${email}`);
          continue;
        }

        // Upgrade an existing non-admin account (e.g. Skater) to admin.
        // Done via the raw collection because `role` is the discriminator key
        // and Admin requires a password the original role may not have.
        const update = { role: "admin" };
        if (!existing.password) {
          update.password = await hashPassword(ADMIN_PASSWORD || DEFAULT_PASSWORD);
        }
        if (!existing.krsaId) {
          update.krsaId = await getUniqueAdminKrsaId();
        }

        await BaseAuth.collection.updateOne({ _id: existing._id }, { $set: update });
        console.log(`✅ Super admin upgraded from "${existing.role}" → admin: ${email}`);
        continue;
      }

      await Admin.create({
        fullName: deriveFullName(email),
        email,
        phone: await getUniquePhone(),
        password: ADMIN_PASSWORD || DEFAULT_PASSWORD,
        krsaId: await getUniqueAdminKrsaId(),
      });

      console.log(`✅ Super admin seeded: ${email}`);
    }
  } catch (error) {
    console.error("❌ Super admin seed failed:", error.message);
  }
}

export { seedSuperAdmins, SUPER_ADMIN_EMAILS };
