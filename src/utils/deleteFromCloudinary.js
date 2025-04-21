import {vs as cloudinary} from 'cloudinary'
import { ApiErrors } from './ApiErrors';

const deleteFromCloudinary=async(fileUrl)=>{
    if(!fileUrl) return;
    try{
        const parts=fileUrl.split('/')
        const fileName=parts[parts.length-1]
        const publicId=fileName.split('.')[0]
        const folderName=parts[parts.length-2]
        const fullPublicId=`${folderName}/${publicId}`
        await cloudinary.uploader.destroy(fullPublicId)
    }catch(error){
        throw new ApiErrors(400, "Error Deleting image from Cloudinary")
    }
}
export default deleteFromCloudinary