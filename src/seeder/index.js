import { checkAdmin } from "./checkAdmin.js";
import { seedSuperAdmins } from "./superAdminSeeder.js";
import { seedSidebar } from "../seeders/sidebar.seeder.js";


async function seeder() {
    try {
        await checkAdmin()
        await seedSuperAdmins()
        await seedSidebar()
        console.log("seeder execute sucessafully")
    } catch (error) {
        console.log("seeder execute error : ", error)
    }
}
export {
    seeder
}