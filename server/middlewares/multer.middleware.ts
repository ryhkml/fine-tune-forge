import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { cwd } from "node:process";

import { diskStorage } from "multer";

import * as multer from "multer";

const storageEngine = diskStorage({
    destination: join(cwd(), "DATADOC_OCR"),
    filename: (_, file, cb) => {
        switch(file.mimetype) {
            case "image/gif":
                cb(null, randomUUID() + ".gif");
                break;
            case "image/jpeg":
                cb(null, randomUUID() + ".jpeg");
                break;
            case "image/png":
                cb(null, randomUUID() + ".png");
                break;
            case "image/webp":
                cb(null, randomUUID() + ".webp");
                break;
            default:
                cb(null, randomUUID());
                break;
        }
    }
});

export const imageOCRUpload = multer({
    storage: storageEngine,
    limits: {
        fileSize: 19 * 1024 * 1024
    },
    fileFilter: (_, file, cb) => {
        const filetypes = [
            "image/gif",
            "image/jpeg",
            "image/png",
            "image/webp"
        ];
        if (!filetypes.includes(file.mimetype)) {
            cb(new Error("Invalid file type"));
        } else {
            cb(null, true);
        }
    }
})
.array("files", 15);