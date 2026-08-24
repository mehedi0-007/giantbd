import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export function DocumentUploadInterceptor(fieldName = 'file') {
  return FileInterceptor(fieldName, {
    storage: diskStorage({
      destination: './uploads',

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
