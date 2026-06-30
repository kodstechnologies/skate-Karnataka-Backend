import { checkAdmin } from "./checkAdmin.js";
import { seedSuperAdmins } from "./superAdminSeeder.js";


async function seeder() {
    try {
        await checkAdmin()
        await seedSuperAdmins()
        console.log("seeder execute sucessafully")
    } catch (error) {
        console.log("seeder execute error : ", error)
    }
}
export {
    seeder
}