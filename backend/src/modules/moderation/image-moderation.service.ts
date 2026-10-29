import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { join, resolve, sep } from 'path';

export interface ImageModerationResult {
  // False whenever the check didn't actually run (disabled, unreachable,
  // errored) — callers should treat an unchecked image as trusted rather
  // than penalizing donors for our own infrastructure gaps.
  checked: boolean;
  looksLikeClothing: boolean;
  labels: string[];
}

const CLOTHING_KEYWORDS = [
  'clothing',
  'clothes',
  'apparel',
  'garment',
  'fashion',
  'shirt',
  't-shirt',
  'jacket',
  'coat',
  'outerwear',
  'dress',
  'gown',
  'pants',
  'trousers',
  'jeans',
  'denim',
  'skirt',
  'shorts',
  'sweater',
  'sweatshirt',
  'hoodie',
  'suit',
  'uniform',
  'blouse',
  'scarf',
  'shawl',
  'glove',
  'sock',
  'hat',
  'cap',
  'shoe',
  'footwear',
  'boot',
  'sneaker',
  'sandal',
  'sleeve',
  'textile',
  'wool',
  'knitwear',
];

const NEUTRAL_RESULT: ImageModerationResult = {
  checked: false,
  looksLikeClothing: true,
  labels: [],
};

@Injectable()
export class ImageModerationService {
  private readonly logger = new Logger(ImageModerationService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), this.config.get<string>('uploads.dir') ?? 'uploads');
  }

  async checkClothingImage(imagePath: string): Promise<ImageModerationResult> {
    const enabled = this.config.get<boolean>('vision.enabled');
    const apiKey = this.config.get<string>('vision.apiKey');
    if (!enabled || !apiKey) return NEUTRAL_RESULT;

    try {
      const filename = imagePath.replace(/^\/?uploads\//, '');
      // Defense in depth: CreateDonationDto already restricts `images` to
      // our own generated filenames, but this method takes a raw string
      // regardless of caller, so re-check here that the resolved path can't
      // escape the uploads directory (e.g. via "../../etc/passwd").
      const resolvedPath = resolve(this.uploadDir, filename);
      if (resolvedPath !== this.uploadDir && !resolvedPath.startsWith(this.uploadDir + sep)) {
        this.logger.warn(`Rejected out-of-bounds image path: ${imagePath}`);
        return NEUTRAL_RESULT;
      }
      const buffer = await readFile(resolvedPath);
      const base64 = buffer.toString('base64');

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64 },
                features: [{ type: 'LABEL_DETECTION', maxResults: 10 }],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(`Vision API responded with ${response.status}`);
        return NEUTRAL_RESULT;
      }

      const body = (await response.json()) as {
        responses?: Array<{ labelAnnotations?: Array<{ description: string; score: number }> }>;
      };
      const annotations = body.responses?.[0]?.labelAnnotations ?? [];
      const labels = annotations.map((a) => a.description);
      const looksLikeClothing = annotations.some(
        (a) =>
          a.score >= 0.5 &&
          CLOTHING_KEYWORDS.some((kw) => a.description.toLowerCase().includes(kw)),
      );

      return { checked: true, looksLikeClothing, labels };
    } catch (err) {
      this.logger.warn(`Image moderation check failed: ${(err as Error).message}`);
      return NEUTRAL_RESULT;
    }
  }
}
