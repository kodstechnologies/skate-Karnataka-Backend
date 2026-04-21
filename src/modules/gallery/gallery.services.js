import { addMediaREpositories, displayAllMediaBasedOnSkaterRepositories } from "./gallery.repositories.js";

export const displayAllMediaBasedOnSkaterService = async(skaterID) =>{
    return await displayAllMediaBasedOnSkaterRepositories(skaterId);
}

export const addMediaService = async(data) =>{
await addMediaREpositories(data)
}