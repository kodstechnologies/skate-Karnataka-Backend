import { Gallery } from "./gallery.model.js"

export const displayAllMediaBasedOnSkaterRepositories= async(skaterID) =>{
    const skater = await Skater.findById(skaterID);
    
    return await Gallery.findOne()
}

export const addMediaREpositories = async(data) =>{

}