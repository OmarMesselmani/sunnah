import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// دالة للتحقق من صحة UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// interface للإحصائيات
interface HadithStats {
  marfu: number;
  mawquf: number;
  maqtu: number;
  total: number;
}

// جلب جميع الرواة مع البحث والفلترة
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      generation,
      sortBy = 'fullName',
      sortOrder = 'asc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // بناء شروط البحث
    const where: any = {};
    
    if (search) {
      where.OR = [
        { fullName: { contains: search as string } },
        { kunyah: { contains: search as string } },
        { laqab: { contains: search as string } }
      ];
    }
    
    if (generation) {
      where.generation = generation as string;
    }

    // بناء ترتيب النتائج
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    const narrators = await prisma.narrator.findMany({
      where,
      include: {
        _count: {
          select: {
            narratedHadiths: true,
            musnadHadiths: true
          }
        }
      },
      orderBy,
      skip: offset,
      take: parseInt(limit as string)
    });

    const total = await prisma.narrator.count({ where });
    const pages = Math.ceil(total / parseInt(limit as string));

    res.json({
      narrators,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('خطأ في جلب الرواة:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

// جلب راوي بمعرفه
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }

    const narrator = await prisma.narrator.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            narratedHadiths: true,
            musnadHadiths: true,
            studentsRelation: true,
            teachersRelation: true
          }
        },
        deathYears: true
      }
    });

    if (!narrator) {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }

    res.json(narrator);
  } catch (error) {
    console.error('خطأ في جلب الراوي:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

// جلب الأحاديث المرفوعة للراوي (المسند)
router.get('/:id/musnad', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }

    const narrator = await prisma.narrator.findUnique({
      where: { id }
    });

    if (!narrator) {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }

    // جلب الأحاديث المرفوعة فقط
    const hadiths = await prisma.hadith.findMany({
      where: {
        musnadSahabiId: id,
        hadithType: 'marfu' // إضافة فلتر النوع
      },
      include: {
        source: true,
        book: true,
        chapter: true,
        narrators: {
          include: {
            narrator: true
          },
          orderBy: {
            orderInChain: 'asc'
          }
        }
      },
      orderBy: {
        hadithNumber: 'asc'
      },
      skip: offset,
      take: parseInt(limit as string)
    });

    const total = await prisma.hadith.count({
      where: {
        musnadSahabiId: id,
        hadithType: 'marfu'
      }
    });

    const pages = Math.ceil(total / parseInt(limit as string));

    res.json({
      hadiths,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('خطأ في جلب مسند الراوي:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

// جلب الأحاديث الموقوفة للراوي
router.get('/:id/mawquf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }

    const narrator = await prisma.narrator.findUnique({
      where: { id }
    });

    if (!narrator) {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }

    const hadiths = await prisma.hadith.findMany({
      where: {
        musnadSahabiId: id,
        hadithType: 'mawquf'
      },
      include: {
        source: true,
        book: true,
        chapter: true,
        narrators: {
          include: {
            narrator: true
          },
          orderBy: {
            orderInChain: 'asc'
          }
        }
      },
      orderBy: {
        hadithNumber: 'asc'
      },
      skip: offset,
      take: parseInt(limit as string)
    });

    const total = await prisma.hadith.count({
      where: {
        musnadSahabiId: id,
        hadithType: 'mawquf'
      }
    });

    const pages = Math.ceil(total / parseInt(limit as string));

    res.json({
      hadiths,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('خطأ في جلب الموقوفات:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

// جلب الأحاديث المقطوعة للراوي
router.get('/:id/maqtu', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }

    const narrator = await prisma.narrator.findUnique({
      where: { id }
    });

    if (!narrator) {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }

    // للمقطوعات، قد لا يكون لها musnadSahabiId محدد
    // لذا نبحث في الرواة المرتبطين بالحديث
    const hadiths = await prisma.hadith.findMany({
      where: {
        hadithType: 'maqtu',
        OR: [
          { musnadSahabiId: id },
          {
            narrators: {
              some: {
                narratorId: id
              }
            }
          }
        ]
      },
      include: {
        source: true,
        book: true,
        chapter: true,
        narrators: {
          include: {
            narrator: true
          },
          orderBy: {
            orderInChain: 'asc'
          }
        }
      },
      orderBy: {
        hadithNumber: 'asc'
      },
      skip: offset,
      take: parseInt(limit as string)
    });

    const total = await prisma.hadith.count({
      where: {
        hadithType: 'maqtu',
        OR: [
          { musnadSahabiId: id },
          {
            narrators: {
              some: {
                narratorId: id
              }
            }
          }
        ]
      }
    });

    const pages = Math.ceil(total / parseInt(limit as string));

    res.json({
      hadiths,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('خطأ في جلب المقطوعات:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

// جلب إحصائيات أنواع الأحاديث للراوي
router.get('/:id/hadith-stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }

    const narrator = await prisma.narrator.findUnique({
      where: { id }
    });

    if (!narrator) {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }

    // حساب المرفوعات
    const marfuCount = await prisma.hadith.count({
      where: {
        musnadSahabiId: id,
        hadithType: 'marfu'
      }
    });

    // حساب الموقوفات
    const mawqufCount = await prisma.hadith.count({
      where: {
        musnadSahabiId: id,
        hadithType: 'mawquf'
      }
    });

    // حساب المقطوعات
    const maqtuCount = await prisma.hadith.count({
      where: {
        hadithType: 'maqtu',
        OR: [
          { musnadSahabiId: id },
          {
            narrators: {
              some: {
                narratorId: id
              }
            }
          }
        ]
      }
    });

    res.json({
      marfu: marfuCount,
      mawquf: mawqufCount,
      maqtu: maqtuCount,
      total: marfuCount + mawqufCount + maqtuCount
    });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات الأحاديث:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

// إنشاء راوي جديد
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fullName, kunyah, laqab, generation, biography, deathYears } = req.body;

    if (!fullName || !generation) {
      return res.status(400).json({ error: 'الاسم الكامل والطبقة مطلوبان' });
    }

    const narratorData: any = {
      fullName,
      generation,
    };

    if (kunyah) narratorData.kunyah = kunyah;
    if (laqab) narratorData.laqab = laqab;
    if (biography) narratorData.biography = biography;

    // إنشاء الراوي مع سنوات الوفاة إذا وجدت
    if (deathYears && deathYears.length > 0) {
      narratorData.deathYears = {
        create: deathYears.map((deathYear: any, index: number) => ({
          year: deathYear.year ? parseInt(deathYear.year) : null,
          deathDescription: deathYear.deathDescription || null,
          isPrimary: index === 0 // أول سنة تكون primary
        }))
      };
    }

    const narrator = await prisma.narrator.create({
      data: narratorData,
      include: {
        deathYears: true
      }
    });

    res.status(201).json({ narrator });
  } catch (error) {
    console.error('خطأ في إنشاء الراوي:', error);
    res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
});

export default router;