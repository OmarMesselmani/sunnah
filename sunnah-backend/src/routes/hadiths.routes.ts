import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// إعداد multer لتحميل الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)){
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // قبول ملفات EPUB فقط إذا أردنا إضافة تلك الميزة في المستقبل
    if (file.mimetype === 'application/epub+zip' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50 ميجابايت كحد أقصى
});

// الحصول على قائمة الأحاديث
router.get('/', async (req, res) => {
  try {
    const { 
      sourceId, 
      bookId, 
      chapterId, 
      musnadSahabiId,
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const where: any = {};
    
    // إضافة الفلاتر إذا تم توفيرها
    if (sourceId) where.sourceId = parseInt(sourceId as string);
    if (bookId) where.bookId = parseInt(bookId as string);
    if (chapterId) where.chapterId = parseInt(chapterId as string);
    if (musnadSahabiId) where.musnadSahabiId = parseInt(musnadSahabiId as string);
    
    // البحث في السند والمتن
    if (search) {
      where.OR = [
        { sanad: { contains: search as string } },
        { matn: { contains: search as string } }
      ];
    }
    
    const hadiths = await prisma.hadith.findMany({
      where,
      include: {
        source: true,
        narrators: {
          include: {
            narrator: true
          },
          orderBy: {
            orderInChain: 'asc'
          }
        }
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { id: 'asc' }
    });
    
    const total = await prisma.hadith.count({ where });
    
    res.json({
      hadiths,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching hadiths:', error);
    res.status(500).json({ error: 'فشل في استرجاع الأحاديث', message: (error as Error).message });
  }
});

// إضافة حديث جديد
router.post('/', async (req, res) => {
  try {
    const { sourceId, bookId, chapterId, hadithNumber, sanad, matn, narrators, musnadSahabiId } = req.body;
    
    if (!sourceId || !sanad || !matn) {
      return res.status(400).json({ error: 'يجب توفير معرف المصدر والسند والمتن' });
    }
    
    // إنشاء الحديث
    const hadith = await prisma.hadith.create({
      data: {
        sourceId,
        bookId,
        chapterId,
        hadithNumber: hadithNumber || '',
        sanad,
        matn,
        musnadSahabiId
      }
    });
    
    // إضافة الرواة إذا تم توفيرهم
    if (narrators && Array.isArray(narrators) && narrators.length > 0) {
      const narratorRelations = narrators.map(n => ({
        hadithId: hadith.id,
        narratorId: n.narratorId,
        orderInChain: n.orderInChain,
        narrationType: n.narrationType || null
      }));
      
      await prisma.hadithNarrator.createMany({
        data: narratorRelations
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'تم إضافة الحديث بنجاح',
      hadithId: hadith.id 
    });
  } catch (error) {
    console.error('Error creating hadith:', error);
    res.status(500).json({ error: 'فشل في إضافة الحديث', message: (error as Error).message });
  }
});

// استيراد مجموعة من الأحاديث
router.post('/batch', async (req, res) => {
  try {
    const { hadiths } = req.body;
    
    if (!Array.isArray(hadiths) || hadiths.length === 0) {
      return res.status(400).json({ error: 'يجب توفير مصفوفة غير فارغة من الأحاديث' });
    }
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    
    // معالجة كل حديث على حدة
    for (const hadith of hadiths) {
      try {
        // التحقق من وجود البيانات الأساسية
        if (!hadith.sourceId || !hadith.matn) {
          failed++;
          errors.push(`حديث بدون معرف المصدر أو المتن: ${hadith.hadithNumber || 'غير معروف'}`);
          continue;
        }
        
        // إضافة الحديث
        await prisma.hadith.create({
          data: {
            sourceId: hadith.sourceId,
            bookId: hadith.bookId,
            chapterId: hadith.chapterId,
            hadithNumber: hadith.hadithNumber || '',
            sanad: hadith.sanad || '',
            matn: hadith.matn,
            musnadSahabiId: hadith.musnadSahabiId
          }
        });
        
        success++;
      } catch (error) {
        failed++;
        errors.push(`حديث رقم ${hadith.hadithNumber || 'غير معروف'}: ${(error as Error).message}`);
      }
    }
    
    return res.status(200).json({ 
      success, 
      failed, 
      total: hadiths.length,
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (error) {
    console.error('Error importing hadiths batch:', error);
    res.status(500).json({ 
      error: 'فشل استيراد مجموعة الأحاديث', 
      message: (error as Error).message 
    });
  }
});

// الحصول على حديث محدد
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const hadith = await prisma.hadith.findUnique({
      where: { id: parseInt(id) },
      include: {
        source: true,
        narrators: {
          include: {
            narrator: true
          },
          orderBy: {
            orderInChain: 'asc'
          }
        }
      }
    });
    
    if (!hadith) {
      return res.status(404).json({ error: 'الحديث غير موجود' });
    }
    
    res.json(hadith);
  } catch (error) {
    console.error('Error fetching hadith:', error);
    res.status(500).json({ error: 'فشل في استرجاع الحديث', message: (error as Error).message });
  }
});

// حذف حديث
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // حذف علاقات الرواة أولاً
    await prisma.hadithNarrator.deleteMany({
      where: { hadithId: parseInt(id) }
    });
    
    // ثم حذف الحديث
    await prisma.hadith.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true, message: 'تم حذف الحديث بنجاح' });
  } catch (error) {
    console.error('Error deleting hadith:', error);
    res.status(500).json({ error: 'فشل في حذف الحديث', message: (error as Error).message });
  }
});

export default router;