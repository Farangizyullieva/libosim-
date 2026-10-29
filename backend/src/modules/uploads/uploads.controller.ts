import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags } from '@nestjs/swagger';
import { successRes } from '../../common/helpers/success-res';

const UPLOAD_DIR = join(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// Extension is derived from this map, never from the client-supplied
// filename — an attacker can name a file "photo.html" while sending a
// spoofed `image/png` Content-Type, so trusting their extension would let
// them get an .html/.svg/.php file served back from our own origin.
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? '5', 10);

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  // Each request writes up to 8 files to disk and (indirectly, via
  // donation creation) can trigger a paid Vision API call — cap it well
  // below the global default so it can't be used to fill disk or run up
  // API costs.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('images')
  @UseInterceptors(
    FilesInterceptor('files', 8, {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${MIME_EXTENSIONS[file.mimetype]}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!MIME_EXTENSIONS[file.mimetype]) {
          cb(new BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFiles() files: Array<{ filename: string }>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were uploaded');
    }
    const urls = files.map((f) => `/uploads/${f.filename}`);
    return successRes({ urls }, 'Uploaded successfully', 201);
  }
}
