import { checkAdmin } from "./checkAdmin.js";
import { seedSuperAdmins } from "./superAdminSeeder.js";
import { seedDefaultState } from "./stateSeeder.js";
import { seedSidebar } from "../seeders/sidebar.seeder.js";


async function seeder() {
    try {
        await checkAdmin()
        await seedSuperAdmins()
        await seedDefaultState()
        await seedSidebar()
        console.log("seeder execute sucessafully")
    } catch (error) {
        console.log("seeder execute error : ", error)
    }
}
export {
    seeder
}