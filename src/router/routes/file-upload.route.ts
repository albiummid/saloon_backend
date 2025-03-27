import { Router } from "express";
import multer from "multer";
import path from "path";
import { destroyImage, uploadImageBuffer } from "../../libraries/cloudinary";
import { handleAsyncHttp } from "../../middleware/controller";

export const fileUploadRouter = Router();

// Use memory storage for multer to avoid writing to disk
const storage = multer.memoryStorage();

// Initialize upload variable with multer
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allowed file extensions
    const filetypes = /jpeg|jpg|png|gif|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Error: File upload only supports the following filetypes - " +
            filetypes,
        ),
      );
    }
  },
});

fileUploadRouter.post(
  "/upload",
  upload.fields([
    { name: "multiple", maxCount: 10 },
    { name: "single", maxCount: 1 },
  ]),
  handleAsyncHttp(async (req, res) => {
    console.info("Starting file upload process...");

    const multiple = (req.files as Record<string, Express.Multer.File[]>)?.multiple;
    const single = (req.files as Record<string, Express.Multer.File[]>)?.single?.[0];

    if (!multiple && !single) {
      console.error("No files provided for upload");
      return res.error("No files provided for upload");
    }

    let uploads: { multiple: any[]; single: any } = {
      multiple: [],
      single: {},
    };

    if (multiple?.length) {
      console.info(`Processing ${multiple.length} multiple files...`);
      try {
        for (let file of multiple) {
          console.info(`Uploading file: ${file.originalname}`);
          const { public_id, secure_url } = await uploadImageBuffer(
            file.buffer,
            file.originalname
          );
          uploads.multiple.push({
            publicId: public_id,
            secureURL: secure_url,
          });
        }
      } catch (error) {
        console.error("Error uploading multiple files:", error);
        return res.error("Failed to upload multiple files");
      }
    }

    if (single) {
      console.info(`Processing single file: ${single.originalname}`);
      try {
        const { public_id, secure_url } = await uploadImageBuffer(
          single.buffer,
          single.originalname,
          "service_images"
        );
        console.info(`Single file uploaded with ID: ${public_id}`);
        uploads = {
          ...uploads,
          single: {
            publicId: public_id,
            secureURL: secure_url,
          },
        };
      } catch (error) {
        console.error("Error uploading single file:", error);
        return res.error("Failed to upload single file");
      }
    }

    console.info("File upload process completed successfully");
    res.success("Files uploaded...", {
      multiple: multiple?.length > 0 ? uploads.multiple : undefined,
      single: single ? uploads.single : undefined,
    });
  }),
);
fileUploadRouter.post(
  "/destroy",
  handleAsyncHttp(async (req, res) => {
    const { multiple, single } = req.body;
    if (multiple?.length) {
      for (let upload of multiple) {
        const { publicId } = upload;
        await destroyImage(publicId);
      }
    }
    if (single) {
      const { publicId } = single;
      await destroyImage(publicId);
    }
    res.success("Images destroyed.");
  }),
);
