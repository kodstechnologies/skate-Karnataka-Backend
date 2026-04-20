import { afterLoginParentFormRepositories } from "./parent.repositories.js";

const afterLoginFormParentService = async (data, id) => {
    await afterLoginParentFormRepositories(data, id);

}



export {
    afterLoginFormParentService,
}