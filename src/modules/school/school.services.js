import { afterLoginSchoolFormRepositories } from "./school.repositories.js";

const afterLoginFormSchoolService = async (data, id) => {
    await afterLoginSchoolFormRepositories(data, id);

}

export {
    afterLoginFormSchoolService,
}