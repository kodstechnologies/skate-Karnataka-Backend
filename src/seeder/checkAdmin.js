// seed/admin.seed.js
import {
    ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME,
    ADMIN_PHONE_NO,
    ADMIN_EMAIL,
} from "../config/envConfig.js";
import { Admin } from "../modules/auth/model/admin.model.js";


async function checkAdmin() {
    try {
        const existingAdmin = await Admin.findOne({
            phone: ADMIN_PHONE_NO,
        });

        if (!existingAdmin) {
            await Admin.create({
                firstName: ADMIN_FIRST_NAME,
                lastName: ADMIN_LAST_NAME,
                email: ADMIN_EMAIL,
                phone: ADMIN_PHONE_NO,
                permissions: ["ALL"],
            });

            console.log(`✅ Admin seeded successfully: ${ADMIN_PHONE_NO}`);
        } else {
            console.log(`ℹ️ Admin already exists: ${ADMIN_PHONE_NO}`);
        }
    } catch (error) {
        console.error("❌ Admin seed failed:", error.message);
    }
}

export { checkAdmin };
