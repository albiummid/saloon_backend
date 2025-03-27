import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { serverConfigs, serverENV } from "../env-config";

cloudinary.config({
    cloud_name: serverENV.CLOUDINARY_CLOUD_NAME,
    api_key: serverENV.CLOUDINARY_API_KEY,
    api_secret: serverENV.CLOUDINARY_API_SECRET,
});

export const destroyImage = async (publicId: string) =>
    cloudinary.uploader.destroy(publicId);

export const uploadImage = async (imagePath: string, folderName = "Photos") => {
    let data = await cloudinary.uploader.upload(imagePath, {
        folder: `${folderName}-${serverConfigs.app.name}`,
    });
    removeFile(imagePath);
    return data;
};

export const uploadImageBuffer = async (buffer: Buffer, originalFilename: string, folderName = "Photos") => {
    // Create a data URI from the buffer for Cloudinary to process
    const fileType = originalFilename.split('.').pop()?.toLowerCase();
    const dataURI = `data:image/${fileType};base64,${buffer.toString('base64')}`;
    
    // Upload the buffer to Cloudinary
    const data = await cloudinary.uploader.upload(dataURI, {
        folder: `${folderName}-${serverConfigs.app.name}`,
        filename_override: originalFilename,
    });
    
    return data;
};

export const removeFile = (filePath: string) => {
    // Check if the file exists
    if (fs.existsSync(filePath)) {
        // File exists, proceed to delete it
        fs.unlinkSync(filePath);
    } else {
        // File does not exist
        console.log("File doesn't exists with path " + filePath);
    }
};
