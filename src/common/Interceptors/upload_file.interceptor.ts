import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function DocumentUploadInterceptor(fieldName = 'file') {
  return FileInterceptor(fieldName, {
    storage: diskStorage({
      destination: uploadsDir,
      filename: (_req, file, callback) => {
        const filename = `${randomUUID()}${extname(file.originalname)}`;
        callback(null, filename);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
}

export function UserFileUploadInterceptor() {
  return FileFieldsInterceptor(
    [
      { name: 'image', maxCount: 1 },
      { name: 'signature', maxCount: 1 },
    ],
    {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, callback) => {
          const filename = `${randomUUID()}${extname(file.originalname)}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    },
  );
}
