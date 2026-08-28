import { BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Whitelist of allowed MIME types and file extensions
const ALLOWED_DOCUMENT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
]);

const sanitizeAndFilterFile = (
  allowedMimes: string[],
  _req: any,
  file: any,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ext = extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return callback(
      new BadRequestException(
        `File extension '${ext}' is not allowed. Supported formats: .jpg, .jpeg, .png, .webp, .pdf`,
      ),
      false,
    );
  }

  if (!allowedMimes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        `File MIME type '${file.mimetype}' is not permitted.`,
      ),
      false,
    );
  }

  callback(null, true);
};

export function DocumentUploadInterceptor(fieldName = 'file') {
  return FileInterceptor(fieldName, {
    storage: diskStorage({
      destination: uploadsDir,
      filename: (_req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        const filename = `${randomUUID()}${ext}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      sanitizeAndFilterFile(ALLOWED_DOCUMENT_MIMES, req, file, callback);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
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
          const ext = extname(file.originalname).toLowerCase();
          const filename = `${randomUUID()}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        sanitizeAndFilterFile(ALLOWED_IMAGE_MIMES, req, file, callback);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    },
  );
}
