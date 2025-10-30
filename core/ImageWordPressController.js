const multer = require("multer");
const sharp = require("sharp");
const FormData = require("form-data");
const axios = require("axios");

class ImageWordPressController {
    constructor(model, config) {
        this.model = model;
        this.config = config;

        // Multer: accept single/multiple files
        this.upload = multer({ storage: multer.memoryStorage() }).array("files", 20);
        this.uploadSingle = multer({ storage: multer.memoryStorage() }).single("file");
    }

    runMulterMiddleware = (req, res, isSingle = false) => {
        return new Promise((resolve, reject) => {
            const uploader = isSingle ? this.uploadSingle : this.upload;
            uploader(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    hasRootAccess(user) {
        return this.config.rootAccessRoles?.includes(user?.role);
    }

    /**
     * Upload a single image to WordPress Media Library (converted to WebP)
     */
    uploadImage = async (req, res) => {
        try {
            await this.runMulterMiddleware(req, res, true);
            if (!req.file) return res.status(400).json({ message: "No file uploaded" });

            const createdBy = req?.user?._id;
            let fileName = req.file.originalname.replace(/\.[^/.]+$/, ""); // remove ext
            fileName = `${fileName}.webp`; // force webp filename

            // Convert to WebP
            const buffer = await sharp(req.file.buffer)
                .webp({ quality: this.config.quality?.sharpQuality || 80 })
                .toBuffer();

            const form = new FormData();
            form.append("file", buffer, { filename: fileName, contentType: "image/webp" });

            const uploadRes = await axios.post(
                `${this.config.wordpress.baseUrl}/wp-json/wp/v2/media`,
                form,
                {
                    headers: {
                        Authorization: "Basic " + Buffer.from(
                            `${this.config.wordpress.username}:${this.config.wordpress.appPassword}`
                        ).toString("base64"),
                        ...form.getHeaders()
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            const result = uploadRes.data;

            const imageData = new this.model({
                url: result.source_url,
                providerId: result.id,
                alt: result.alt_text || fileName,
                name: fileName,
                createdBy
            });

            await imageData.save();

            return res.status(200).json({
                message: "Image uploaded successfully (WebP)",
                data: imageData
            });

        } catch (error) {
            console.error("Upload Error:", error?.response?.data || error.message);
            return res.status(400).json({
                message: "Image upload failed",
                data: error?.response?.data || error.message
            });
        }
    };

    /**
     * Upload multiple images (bulk, converted to WebP)
     */
    uploadBulkImages = async (req, res) => {
        try {
            await this.runMulterMiddleware(req, res, false);
            const files = req.files;
            if (!files || files.length === 0) {
                return res.status(400).json({ message: "No files uploaded" });
            }

            const createdBy = req?.user?._id;
            const results = [];

            for (const file of files) {
                try {
                    let fileName = file.originalname.replace(/\.[^/.]+$/, "");
                    fileName = `${fileName}.webp`;

                    // Convert to WebP
                    const buffer = await sharp(file.buffer)
                        .webp({ quality: this.config.quality?.sharpQuality || 80 })
                        .toBuffer();

                    const form = new FormData();
                    form.append("file", buffer, { filename: fileName, contentType: "image/webp" });

                    const uploadRes = await axios.post(
                        `${this.config.wordpress.baseUrl}/wp-json/wp/v2/media`,
                        form,
                        {
                            headers: {
                                Authorization: "Basic " + Buffer.from(
                                    `${this.config.wordpress.username}:${this.config.wordpress.appPassword}`
                                ).toString("base64"),
                                ...form.getHeaders()
                            },
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity
                        }
                    );

                    const result = uploadRes.data;

                    const imageData = new this.model({
                        url: result.source_url,
                        providerId: result.id,
                        alt: result.alt_text || fileName,
                        name: fileName,
                        createdBy
                    });

                    await imageData.save();
                    results.push({ success: true, data: imageData });

                } catch (err) {
                    results.push({
                        success: false,
                        error: err?.response?.data || err.message
                    });
                }
            }

            return res.status(207).json({
                message: "Bulk upload completed (WebP)",
                successCount: results.filter(r => r.success).length,
                failureCount: results.filter(r => !r.success).length,
                results
            });

        } catch (error) {
            console.error("Bulk Upload Error:", error);
            return res.status(500).json({
                message: "Bulk upload failed",
                error: error.message
            });
        }
    };

    /**
     * Delete an image from WordPress + MongoDB
     */
    deleteImage = async (req, res) => {
        try {
            const userId = req?.user?._id;
            const id = req.params.id;

            const query = this.hasRootAccess(req.user)
                ? { providerId: id }
                : { providerId: id, createdBy: userId };

            const imageDoc = await this.model.findOneAndDelete(query);
            if (!imageDoc) {
                return res.status(404).json({ message: "Image not found or access denied." });
            }

            const deleteRes = await axios.delete(
                `${this.config.wordpress.baseUrl}/wp-json/wp/v2/media/${id}?force=true`,
                {
                    headers: {
                        Authorization: "Basic " + Buffer.from(
                            `${this.config.wordpress.username}:${this.config.wordpress.appPassword}`
                        ).toString("base64")
                    }
                }
            );

            if (!deleteRes.data?.deleted) throw new Error("WordPress deletion failed");

            return res.status(200).json({
                message: "Image deleted successfully",
                data: deleteRes.data
            });

        } catch (error) {
            return res.status(400).json({
                message: "Image deletion failed",
                data: error?.response?.data || error.message
            });
        }
    };
}

module.exports = ImageWordPressController;
