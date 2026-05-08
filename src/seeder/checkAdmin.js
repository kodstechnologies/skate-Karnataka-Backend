// seed/admin.seed.js
import {
  ADMIN_ADDRESS,
  ADMIN_EMAIL,
  ADMIN_FIRST_NAME,
  ADMIN_LAST_NAME,
  ADMIN_PASSWORD,
  ADMIN_PHONE_NO,
} from "../config/envConfig.js";
import { Admin } from "../modules/admin/admin.model.js";
import { BaseAuth } from "../modules/auth/baseAuth.model.js";

const ADMIN_PREFIX = "AD";
const ROLE_PREFIX_MAP = {
  Skater: "S",
  Parent: "P",
  School: "SC",
  Academy: "A",
  State: "ST",
  Official: "O",
  Admin: "AD",
  Guest: "G",
  Club: "CL",
  District: "D",
  skater: "S",
  parent: "P",
  school: "SC",
  academy: "A",
  state: "ST",
  official: "O",
  admin: "AD",
  guest: "G",
  club: "CL",
  district: "D",
};

const generateAdminKrsaId = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `KRSA${random}${ADMIN_PREFIX}`;
};

const generateKrsaIdByRole = (role) => {
  const random = Math.floor(100000 + Math.random() * 900000);
  const prefix = ROLE_PREFIX_MAP[role] || "U";
  return `KRSA${random}${prefix}`;
};

const getUniqueAdminKrsaId = async () => {
  let attempts = 0;

  while (attempts < 20) {
    const candidate = generateAdminKrsaId();
    const exists = await BaseAuth.exists({ krsaId: candidate });

    if (!exists) {
      return candidate;
    }

    attempts += 1;
  }

  throw new Error("Failed to generate unique admin KRSA ID");
};

const backfillMissingAdminKrsaIds = async () => {
  const adminsWithoutKrsaId = await Admin.find({
    $or: [{ krsaId: { $exists: false } }, { krsaId: null }, { krsaId: "" }],
  }).select("_id krsaId");

  for (const admin of adminsWithoutKrsaId) {
    const generatedKrsaId = await getUniqueAdminKrsaId();
    // Use collection update to bypass immutable schema guard for legacy null values.
    await BaseAuth.collection.updateOne(
      { _id: admin._id, $or: [{ krsaId: { $exists: false } }, { krsaId: null }, { krsaId: "" }] },
      { $set: { krsaId: generatedKrsaId } }
    );
  }
};

const getUniqueKrsaIdByRole = async (role) => {
  let attempts = 0;
  while (attempts < 20) {
    const candidate = generateKrsaIdByRole(role);
    const exists = await BaseAuth.exists({ krsaId: candidate });
    if (!exists) return candidate;
    attempts += 1;
  }
  throw new Error("Failed to generate unique KRSA ID");
};

const backfillMissingBaseAuthKrsaIds = async () => {
  const usersWithoutKrsaId = await BaseAuth.find({
    $or: [{ krsaId: { $exists: false } }, { krsaId: null }, { krsaId: "" }],
  }).select("_id role krsaId");

  for (const user of usersWithoutKrsaId) {
    const generatedKrsaId = await getUniqueKrsaIdByRole(user.role);
    await BaseAuth.collection.updateOne(
      { _id: user._id, $or: [{ krsaId: { $exists: false } }, { krsaId: null }, { krsaId: "" }] },
      { $set: { krsaId: generatedKrsaId } }
    );
  }
};


async function checkAdmin() {
  try {
    // Always repair legacy rows, even when seed env vars are absent.
    await backfillMissingBaseAuthKrsaIds();
    await backfillMissingAdminKrsaIds();

    if (!ADMIN_EMAIL || !ADMIN_PHONE_NO || !ADMIN_PASSWORD) {
      console.log("ℹ️ Admin seed skipped: missing ADMIN_EMAIL/ADMIN_PHONE_NO/ADMIN_PASSWORD");
      return;
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ phone: ADMIN_PHONE_NO }, { email: ADMIN_EMAIL }],
    });

    if (!existingAdmin) {
      await Admin.create({
        fullName: `${ADMIN_FIRST_NAME || ""} ${ADMIN_LAST_NAME || ""}`.trim() || "Admin",
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE_NO,
        address: ADMIN_ADDRESS || "",
        password: ADMIN_PASSWORD,
        krsaId: await getUniqueAdminKrsaId(),
      });

      console.log(`✅ Admin seeded successfully: ${ADMIN_EMAIL}`);
    } else {
      if (!existingAdmin.krsaId) {
        const generatedKrsaId = await getUniqueAdminKrsaId();
        await BaseAuth.collection.updateOne(
          { _id: existingAdmin._id, $or: [{ krsaId: { $exists: false } }, { krsaId: null }, { krsaId: "" }] },
          { $set: { krsaId: generatedKrsaId } }
        );
      }
      console.log(`ℹ️ Admin already exists: ${existingAdmin.email || existingAdmin.phone}`);
    }
  } catch (error) {
    console.error("❌ Admin seed failed:", error.message);
  }
}

export { checkAdmin };
