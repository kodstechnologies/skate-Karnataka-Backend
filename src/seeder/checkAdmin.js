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

const ADMIN_PREFIX = "AD";

const generateAdminKrsaId = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `KRSA${random}${ADMIN_PREFIX}`;
};

const getUniqueAdminKrsaId = async () => {
  let attempts = 0;

  while (attempts < 20) {
    const candidate = generateAdminKrsaId();
    const exists = await Admin.exists({ krsaId: candidate });

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
    admin.krsaId = await getUniqueAdminKrsaId();
    await admin.save();
  }
};


async function checkAdmin() {
  try {
    if (!ADMIN_EMAIL || !ADMIN_PHONE_NO || !ADMIN_PASSWORD) {
      console.log("ℹ️ Admin seed skipped: missing ADMIN_EMAIL/ADMIN_PHONE_NO/ADMIN_PASSWORD");
      return;
    }

    await backfillMissingAdminKrsaIds();

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
        existingAdmin.krsaId = await getUniqueAdminKrsaId();
        await existingAdmin.save();
      }
      console.log(`ℹ️ Admin already exists: ${existingAdmin.email || existingAdmin.phone}`);
    }
  } catch (error) {
    console.error("❌ Admin seed failed:", error.message);
  }
}

export { checkAdmin };
