import { Router } from 'express';
import { upload } from '../utils/upload';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const uploadRoutes = Router();

uploadRoutes.use(authenticate);

// Upload single image
uploadRoutes.post('/image', upload.single('image'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    next(error);
  }
});

// Upload multiple images
uploadRoutes.post('/images', upload.array('images', 10), async (req: AuthRequest, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const uploadedFiles = files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size
    }));

    res.json({
      success: true,
      data: uploadedFiles
    });
  } catch (error) {
    next(error);
  }
});
