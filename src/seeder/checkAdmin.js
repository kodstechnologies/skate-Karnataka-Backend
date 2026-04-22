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


async function checkAdmin() {
  try {
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
      });

      console.log(`✅ Admin seeded successfully: ${ADMIN_EMAIL}`);
    } else {
      console.log(`ℹ️ Admin already exists: ${existingAdmin.email || existingAdmin.phone}`);
    }
  } catch (error) {
    console.error("❌ Admin seed failed:", error.message);
  }
}

export { checkAdmin };
