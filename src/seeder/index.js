import { checkAdmin } from "./checkAdmin.js";


async function seeder() {
    try {
        await checkAdmin()
        console.log("seeder execute sucessafully")
    } catch (error) {
        console.log("seeder execute error : ", error)
    }
}
export {
    seeder
}