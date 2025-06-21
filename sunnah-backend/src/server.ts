import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// تحميل متغيرات البيئة
dotenv.config();

// إنشاء تطبيق Express
const app = express();
const prisma = new PrismaClient();

// اختبار الاتصال بقاعدة البيانات عند بدء الخادم
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    
    // اختبار استعلام بسيط
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ قاعدة البيانات تعمل بشكل صحيح');
  } catch (error) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error);
    console.error('تأكد من:');
    console.error('1. تشغيل MySQL');
    console.error('2. صحة متغير DATABASE_URL في ملف .env');
    console.error('3. وجود قاعدة البيانات');
    process.exit(1);
  }
}

// الإعدادات الوسطية
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Middleware لتسجيل الطلبات
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 البيانات المستلمة:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// نقطة نهاية للتحقق من عمل الخادم
app.get('/api/health', async (req, res) => {
  try {
    // اختبار الاتصال بقاعدة البيانات
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      message: 'خادم السنة يعمل بنجاح',
      database: 'متصل',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('خطأ في فحص الصحة:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'مشكلة في الاتصال بقاعدة البيانات',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============ نقاط نهاية الرواة ============

// الحصول على جميع الرواة
app.get('/api/narrators', async (req, res) => {
  try {
    const { generation, search, page = 1, limit = 20 } = req.query;
    
    const where: any = {};
    
    if (generation) {
      where.generation = generation;
    }
    
    if (search) {
      where.OR = [
        { fullName: { contains: search as string } },
        { kunyah: { contains: search as string } },
        { laqab: { contains: search as string } }
      ];
    }
    
    const narrators = await prisma.narrator.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { fullName: 'asc' },
      include: {
        deathYears: {
          orderBy: [
            { isPrimary: 'desc' },
            { year: 'asc' }
          ]
        },
        _count: {
          select: {
            narratedHadiths: true,
            musnadHadiths: true,
            teachersRelation: true,
            studentsRelation: true
          }
        }
      }
    });
    
    const total = await prisma.narrator.count({ where });
    
    res.json({
      narrators,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching narrators:', error);
    res.status(500).json({ 
      error: 'حدث خطأ في جلب الرواة',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'خطأ غير معروف') : undefined
    });
  }
});

// إضافة راوي جديد
app.post('/api/narrators', async (req, res) => {
  try {
    console.log('📝 استلام طلب إضافة راوي');
    console.log('📦 البيانات:', req.body);

    const { 
      fullName, 
      kunyas, 
      deathYears = [], 
      generation, 
      translation,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!fullName || !generation) {
      console.log('❌ بيانات مفقودة:', { fullName: !!fullName, generation: !!generation });
      return res.status(400).json({ 
        error: 'الاسم الكامل والطبقة مطلوبان',
        received: { fullName: !!fullName, generation: !!generation }
      });
    }

    // معالجة سنوات الوفاة
    interface ProcessedDeathYearInput {
      year?: string | number;
      description?: string;
      isPrimary?: boolean;
    }

    const processedDeathYears = deathYears
      .map((input: ProcessedDeathYearInput, index: number) => {
        const yearStr = input.year ? String(input.year).trim() : null;
        const descriptionStr = input.description ? String(input.description).trim() : null;
        
        let numericYear: number | null = null;
        if (yearStr && /^\d+$/.test(yearStr)) {
          numericYear = parseInt(yearStr, 10);
          if (isNaN(numericYear) || numericYear <= 0 || numericYear >= 2000) {
            numericYear = null;
          }
        }

        if (numericYear !== null) {
          return {
            year: numericYear,
            deathDescription: null,
            isPrimary: input.isPrimary !== undefined ? input.isPrimary : index === 0,
          };
        } else if (descriptionStr && descriptionStr.length > 0) {
          return {
            year: null,
            deathDescription: descriptionStr,
            isPrimary: input.isPrimary !== undefined ? input.isPrimary : index === 0,
          };
        }
        return null;
      })
      .filter(Boolean);

    console.log('🔄 معالجة البيانات:', {
      fullName: fullName.trim(),
      kunyah: kunyas?.trim() || null,
      deathYears: processedDeathYears,
      generation: generation.trim()
    });

    // التحقق من عدم وجود راوي بنفس الاسم
    const existingNarrator = await prisma.narrator.findFirst({
      where: {
        fullName: fullName.trim()
      }
    });

    if (existingNarrator) {
      console.log('⚠️ راوي موجود بالفعل:', existingNarrator.id);
      return res.status(409).json({ 
        error: 'يوجد راوي بنفس هذا الاسم مسبقاً',
        existingNarrator: {
          id: existingNarrator.id,
          fullName: existingNarrator.fullName
        }
      });
    }

    // استخدام Transaction لضمان سلامة البيانات
    const result = await prisma.$transaction(async (tx: any) => {
      // إنشاء الراوي
      const narrator = await tx.narrator.create({
        data: {
          fullName: fullName.trim(),
          kunyah: kunyas?.trim() || null,
          deathYear: processedDeathYears.length > 0 
            ? (processedDeathYears[0]?.year?.toString() || processedDeathYears[0]?.deathDescription || null) 
            : null,
          generation: generation.trim(),
          biography: translation?.trim() || null,
        }
      });

      if (processedDeathYears.length > 0) {
        await tx.narratorDeathYear.createMany({
          data: (processedDeathYears as Array<{year: number | null, deathDescription: string | null, isPrimary: boolean}>).map(dy => ({
            narratorId: narrator.id,
            year: dy.year,
            deathDescription: dy.deathDescription,
            isPrimary: dy.isPrimary
          }))
        });
      }

      return await tx.narrator.findUnique({
        where: { id: narrator.id },
        include: {
          deathYears: {
            orderBy: [
              { isPrimary: 'desc' },
              { year: 'asc' },
              { deathDescription: 'asc' }
            ]
          },
          _count: {
            select: {
              narratedHadiths: true,
              musnadHadiths: true,
              teachersRelation: true,
              studentsRelation: true
            }
          }
        }
      });
    });

    console.log('✅ تم إنشاء الراوي بنجاح:', result?.id);

    res.status(201).json({
      success: true,
      message: 'تم إضافة الراوي بنجاح',
      narrator: result
    });

  } catch (error: any) {
    console.error('❌ خطأ في إضافة الراوي:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'يوجد راوي بنفس هذا الاسم مسبقاً' 
      });
    }
    
    if (error.code === 'P1001') {
      return res.status(500).json({ 
        error: 'فشل الاتصال بقاعدة البيانات. تأكد من تشغيل MySQL',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: 'حدث خطأ داخلي في الخادم',
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// الحصول على راوي محدد
app.get('/api/narrators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }
    
    const narrator = await prisma.narrator.findUnique({
      where: { id },
      include: {
        deathYears: {
          orderBy: [
            { isPrimary: 'desc' },
            { year: 'asc' }
          ]
        },
        _count: {
          select: {
            narratedHadiths: true,
            musnadHadiths: true,
            teachersRelation: true,
            studentsRelation: true
          }
        }
      }
    });
    
    if (!narrator) {
      return res.status(404).json({ error: 'لم يتم العثور على الراوي' });
    }
    
    res.json(narrator);
  } catch (error) {
    console.error('Error fetching narrator:', error);
    res.status(500).json({ 
      error: 'حدث خطأ في جلب بيانات الراوي',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'خطأ غير معروف') : undefined
    });
  }
});

// جلب الأحاديث المرفوعة للراوي (المسند) - محدث ليجلب المرفوع فقط
app.get('/api/narrators/:id/musnad', async (req, res) => {
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

    console.log(`📚 جلب مسند الراوي: ${narrator.fullName} (ID: ${id})`);

    // جلب الأحاديث المرفوعة فقط
    const hadiths = await prisma.hadith.findMany({
      where: {
        musnadSahabiId: id,
        hadithType: 'marfu' // فلتر المرفوع فقط
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            author: true
          }
        },
        book: {
          select: {
            id: true,
            name: true,
            bookNumber: true
          }
        },
        chapter: {
          select: {
            id: true,
            name: true,
            chapterNumber: true
          }
        },
        narrators: {
          include: {
            narrator: {
              include: {
                deathYears: {
                  orderBy: [
                    { isPrimary: 'desc' },
                    { year: 'asc' }
                  ]
                }
              }
            }
          },
          orderBy: {
            orderInChain: 'asc'
          }
        },
        manualReviews: {
          orderBy: {
            reviewedAt: 'desc'
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

    console.log(`📊 تم جلب ${hadiths.length} حديث مرفوع من أصل ${total} للراوي ${narrator.fullName}`);

    // تحويل البيانات لتتناسب مع الواجهة الأمامية
    const transformedHadiths = hadiths.map(hadith => ({
      ...hadith,
      chain: hadith.sanad,
      grade: undefined,
      explanation: undefined
    }));

    res.json({
      hadiths: transformedHadiths,
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

// جلب الأحاديث الموقوفة للراوي - جديد
app.get('/api/narrators/:id/mawquf', async (req, res) => {
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

    const transformedHadiths = hadiths.map(hadith => ({
      ...hadith,
      chain: hadith.sanad,
      grade: undefined,
      explanation: undefined
    }));

    res.json({
      hadiths: transformedHadiths,
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

// جلب الأحاديث المقطوعة للراوي - جديد
app.get('/api/narrators/:id/maqtu', async (req, res) => {
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

    // للمقطوعات، نبحث في الرواة المرتبطين بالحديث أيضاً
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

    const transformedHadiths = hadiths.map(hadith => ({
      ...hadith,
      chain: hadith.sanad,
      grade: undefined,
      explanation: undefined
    }));

    res.json({
      hadiths: transformedHadiths,
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

// جلب إحصائيات أنواع الأحاديث للراوي - جديد
app.get('/api/narrators/:id/hadith-stats', async (req, res) => {
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

// باقي endpoints الرواة (تحديث، حذف، علاقات، إلخ.)
app.put('/api/narrators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fullName, 
      kunyas, 
      deathYears = [], 
      generation, 
      translation 
    } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }

    interface ValidDeathYear {
      year: number;
      isPrimary: boolean;
    }

    const validDeathYears = deathYears
      .filter((year: any) => year && String(year).trim())
      .map((year: any, index: number) => {
        const yearNum = parseInt(String(year).trim(), 10);
        if (isNaN(yearNum) || yearNum <= 0 || yearNum >= 2000) {
          return null;
        }
        return {
          year: yearNum,
          isPrimary: index === 0
        };
      })
      .filter(Boolean);

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedNarrator = await tx.narrator.update({
        where: { id },
        data: {
          fullName: fullName?.trim(),
          kunyah: kunyas?.trim() || null,
          deathYear: validDeathYears.length > 0 ? (validDeathYears[0] as ValidDeathYear).year : null,
          generation: generation?.trim(),
          biography: translation?.trim() || null
        }
      });

      await tx.narratorDeathYear.deleteMany({
        where: { narratorId: id }
      });

      if (validDeathYears.length > 0) {
        await tx.narratorDeathYear.createMany({
          data: (validDeathYears as ValidDeathYear[]).map((dy: ValidDeathYear) => ({
            narratorId: id,
            year: dy.year,
            isPrimary: dy.isPrimary
          }))
        });
      }

      return await tx.narrator.findUnique({
        where: { id },
        include: {
          deathYears: {
            orderBy: [
              { isPrimary: 'desc' },
              { year: 'asc' }
            ]
          },
          _count: {
            select: {
              narratedHadiths: true,
              musnadHadiths: true,
              teachersRelation: true,
              studentsRelation: true
            }
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث الراوي بنجاح',
      narrator: result
    });

  } catch (error: any) {
    console.error('Error updating narrator:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }
    
    res.status(500).json({ error: 'حدث خطأ في تحديث الراوي' });
  }
});

app.delete('/api/narrators/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }

    const existingNarrator = await prisma.narrator.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            narratedHadiths: true,
            musnadHadiths: true,
            teachersRelation: true,
            studentsRelation: true
          }
        }
      }
    });

    if (!existingNarrator) {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }

    const hadithCount = await prisma.hadithNarrator.count({
      where: { narratorId: id }
    });

    if (hadithCount > 0) {
      return res.status(409).json({ 
        error: `لا يمكن حذف الراوي لأنه مرتبط بـ ${hadithCount} حديث. يجب حذف الأحاديث أولاً أو إزالة الراوي منها.` 
      });
    }

    const musnadCount = await prisma.hadith.count({
      where: { musnadSahabiId: id }
    });

    if (musnadCount > 0) {
      return res.status(409).json({ 
        error: `لا يمكن حذف الراوي لأنه صاحب مسند يحتوي على ${musnadCount} حديث. يجب حذف الأحاديث أولاً أو تغيير صاحب المسند.` 
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.narratorDeathYear.deleteMany({
        where: { narratorId: id }
      });

      await tx.narratorRelation.deleteMany({
        where: { 
          OR: [
            { narratorId: id },
            { teacherId: id }
          ]
        }
      });

      await tx.narrator.delete({
        where: { id }
      });
    });

    console.log(`✅ تم حذف الراوي "${existingNarrator.fullName}" (ID: ${id}) بنجاح`);

    res.json({
      success: true,
      message: `تم حذف الراوي "${existingNarrator.fullName}" بنجاح`
    });

  } catch (error: any) {
    console.error('❌ خطأ في حذف الراوي:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'الراوي غير موجود' });
    }
    
    if (error.code === 'P2003') {
      return res.status(409).json({ 
        error: 'لا يمكن حذف الراوي لوجود بيانات مرتبطة به. يجب حذف البيانات المرتبطة أولاً.' 
      });
    }
    
    res.status(500).json({ 
      error: 'حدث خطأ داخلي أثناء حذف الراوي',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// الحصول على أحاديث راوي محدد
app.get('/api/narrators/:id/hadiths', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }
    
    const hadiths = await prisma.hadith.findMany({
      where: {
        narrators: {
          some: {
            narratorId: id
          }
        }
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
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });
    
    const total = await prisma.hadith.count({
      where: {
        narrators: {
          some: {
            narratorId: id
          }
        }
      }
    });
    
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
    console.error('Error fetching narrator hadiths:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب أحاديث الراوي' });
  }
});

// الحصول على علاقات الراوي
app.get('/api/narrators/:id/relations', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'معرف الراوي غير صالح' });
    }
    
    const teachers = await prisma.narratorRelation.findMany({
      where: { narratorId: id },
      include: {
        teacher: true
      },
      orderBy: {
        relationCount: 'desc'
      }
    });
    
    const students = await prisma.narratorRelation.findMany({
      where: { teacherId: id },
      include: {
        narrator: true
      },
      orderBy: {
        relationCount: 'desc'
      }
    });
    
    res.json({
      teachers: teachers.map((rel: any) => ({
        id: rel.teacher.id,
        name: rel.teacher.fullName,
        relation_count: rel.relationCount
      })),
      students: students.map((rel: any) => ({
        id: rel.narrator.id,
        name: rel.narrator.fullName,
        relation_count: rel.relationCount
      }))
    });
  } catch (error) {
    console.error('Error fetching narrator relations:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب علاقات الراوي' });
  }
});

// البحث عن الرواة بالاسم
app.get('/api/narrators/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'يرجى توفير معيار بحث صالح' });
    }
    
    const narrators = await prisma.narrator.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { kunyah: { contains: query } },
          { laqab: { contains: query } }
        ]
      },
      include: {
        deathYears: {
          orderBy: [
            { isPrimary: 'desc' },
            { year: 'asc' }
          ]
        }
      },
      take: 10,
      orderBy: { fullName: 'asc' }
    });
    
    res.json(narrators);
  } catch (error) {
    console.error('Error searching narrators:', error);
    res.status(500).json({ error: 'حدث خطأ في البحث عن الرواة' });
  }
});

// ============ نقاط نهاية الأحاديث ============

// البحث في الأحاديث
app.get('/api/hadiths/search', async (req, res) => {
  try {
    const { query, searchIn = 'all', source, page = 1, limit = 20 } = req.query;
    
    let where: any = {};
    
    if (source) {
      where.source = { name: source };
    }
    
    if (query) {
      switch (searchIn) {
        case 'matn':
          where.matn = { contains: query as string };
          break;
        case 'narrator':
          where.narrators = {
            some: {
              narrator: {
                OR: [
                  { fullName: { contains: query as string } },
                  { kunyah: { contains: query as string } }
                ]
              }
            }
          };
          break;
        case 'sahabi':
          where.musnadSahabi = {
            OR: [
              { fullName: { contains: query as string } },
              { kunyah: { contains: query as string } }
            ]
          };
          break;
        default:
          where.OR = [
            { matn: { contains: query as string } },
            { sanad: { contains: query as string } },
            {
              narrators: {
                some: {
                  narrator: {
                    fullName: { contains: query as string }
                  }
                }
              }
            }
          ];
      }
    }
    
    const hadiths = await prisma.hadith.findMany({
      where,
      include: {
        source: true,
        book: true,
        chapter: true,
        musnadSahabi: {
          include: {
            deathYears: {
              orderBy: [
                { isPrimary: 'desc' },
                { year: 'asc' }
              ]
            }
          }
        },
        narrators: {
          include: {
            narrator: {
              include: {
                deathYears: {
                  orderBy: [
                    { isPrimary: 'desc' },
                    { year: 'asc' }
                  ]
                }
              }
            }
          },
          orderBy: {
            orderInChain: 'asc'
          }
        }
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
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
    console.error('Error searching hadiths:', error);
    res.status(500).json({ error: 'حدث خطأ في البحث' });
  }
});

// الحصول على حديث محدد
app.get('/api/hadiths/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const hadith = await prisma.hadith.findUnique({
      where: { id: Number(id) },
      include: {
        source: true,
        book: true,
        chapter: true,
        musnadSahabi: {
          include: {
            deathYears: {
              orderBy: [
                { isPrimary: 'desc' },
                { year: 'asc' }
              ]
            }
          }
        },
        narrators: {
          include: {
            narrator: {
              include: {
                deathYears: {
                  orderBy: [
                    { isPrimary: 'desc' },
                    { year: 'asc' }
                  ]
                }
              }
            }
          },
          orderBy: {
            orderInChain: 'asc'
          }
        },
        manualReviews: {
          orderBy: {
            reviewedAt: 'desc'
          }
        }
      }
    });
    
    if (!hadith) {
      return res.status(404).json({ error: 'لم يتم العثور على الحديث' });
    }
    
    res.json(hadith);
  } catch (error) {
    console.error('Error fetching hadith:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الحديث' });
  }
});

// إضافة حديث جديد - محدث ليدعم hadithType
app.post('/api/hadiths', async (req, res) => {
  try {
    const { 
      sourceId, 
      bookId, 
      chapterId, 
      hadithNumber, 
      sanad, 
      matn, 
      musnadSahabiId,
      narrators,
      hadithType = 'marfu' // القيمة الافتراضية
    } = req.body;
    
    if (musnadSahabiId && !isValidUUID(musnadSahabiId)) {
      return res.status(400).json({ error: 'معرف الصحابي غير صالح' });
    }
    
    if (narrators && Array.isArray(narrators)) {
      for (const narrator of narrators) {
        if (narrator.narratorId && !isValidUUID(narrator.narratorId)) {
          return res.status(400).json({ error: 'معرف راوي غير صالح' });
        }
      }
    }
    
    const hadith = await prisma.hadith.create({
      data: {
        sourceId,
        bookId,
        chapterId,
        hadithNumber,
        sanad,
        matn,
        musnadSahabiId,
        hadithType, // إضافة نوع الحديث
        narrators: {
          create: narrators
        }
      },
      include: {
        source: true,
        book: true,
        chapter: true,
        musnadSahabi: {
          include: {
            deathYears: {
              orderBy: [
                { isPrimary: 'desc' },
                { year: 'asc' }
              ]
            }
          }
        },
        narrators: {
          include: {
            narrator: {
              include: {
                deathYears: {
                  orderBy: [
                    { isPrimary: 'desc' },
                    { year: 'asc' }
                  ]
                }
              }
            }
          }
        }
      }
    });
    
    res.status(201).json(hadith);
  } catch (error) {
    console.error('Error creating hadith:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة الحديث' });
  }
});

// استيراد مجموعة من الأحاديث - محدث ليدعم hadithType
app.post('/api/hadiths/batch', async (req, res) => {
  try {
    const { hadiths } = req.body;
    
    if (!Array.isArray(hadiths) || hadiths.length === 0) {
      return res.status(400).json({ error: 'يجب توفير مصفوفة غير فارغة من الأحاديث' });
    }
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const createdHadiths: any[] = [];
    
    for (const hadith of hadiths) {
      try {
        if (!hadith.sourceId || !hadith.matn) {
          failed++;
          errors.push(`حديث بدون معرف المصدر أو المتن: ${hadith.hadithNumber || 'غير معروف'}`);
          continue;
        }
        
        if (hadith.musnadSahabiId && !isValidUUID(hadith.musnadSahabiId)) {
          failed++;
          errors.push(`معرف صحابي غير صالح في حديث: ${hadith.hadithNumber || 'غير معروف'}`);
          continue;
        }
        
        const createdHadith = await prisma.hadith.create({
          data: {
            sourceId: Number(hadith.sourceId),
            bookId: hadith.bookId ? Number(hadith.bookId) : undefined,
            chapterId: hadith.chapterId ? Number(hadith.chapterId) : undefined,
            hadithNumber: hadith.hadithNumber || '',
            sanad: hadith.sanad || '',
            matn: hadith.matn,
            musnadSahabiId: hadith.musnadSahabiId || undefined,
            hadithType: hadith.hadithType || 'marfu' // إضافة نوع الحديث مع قيمة افتراضية
          }
        });
        
        if (hadith.narrators && Array.isArray(hadith.narrators) && hadith.narrators.length > 0) {
          interface NarratorConnection {
            narratorId: string;
            orderInChain: number;
            narrationType: string | null;
          }

          let validNarrators = true;
          for (const n of hadith.narrators) {
            if (n.narratorId && !isValidUUID(n.narratorId)) {
              validNarrators = false;
              break;
            }
          }
          
          if (validNarrators) {
            const narratorConnections = hadith.narrators.map((n: any) => ({
              narratorId: n.narratorId,
              orderInChain: n.orderInChain || 0,
              narrationType: n.narrationType || null
            }));
            
            await prisma.hadithNarrator.createMany({
              data: narratorConnections.map((nc: NarratorConnection) => ({
                ...nc,
                hadithId: createdHadith.id
              }))
            });
          }
        }
        
        createdHadiths.push(createdHadith);
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
      hadiths: createdHadiths,
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

// Middleware للتعامل مع الأخطاء العامة
app.use((error: any, req: any, res: any, next: any) => {
  console.error('💥 خطأ غير متوقع:', error);
  res.status(500).json({
    error: 'حدث خطأ داخلي في الخادم',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// معالجة الطرق غير الموجودة
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'الطريق غير موجود',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/narrators',
      'POST /api/narrators',
      'GET /api/narrators/:id',
      'PUT /api/narrators/:id',
      'DELETE /api/narrators/:id',
      'GET /api/narrators/:id/hadiths',
      'GET /api/narrators/:id/musnad', // مرفوع
      'GET /api/narrators/:id/mawquf', // جديد - موقوف
      'GET /api/narrators/:id/maqtu',  // جديد - مقطوع
      'GET /api/narrators/:id/hadith-stats', // جديد - إحصائيات
      'GET /api/narrators/:id/relations',
      'GET /api/narrators/search',
      'GET /api/hadiths/search',
      'GET /api/hadiths/:id',
      'POST /api/hadiths',
      'POST /api/hadiths/batch'
    ]
  });
});

// بدء الخادم
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await testDatabaseConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 خادم السنة يعمل على المنفذ ${PORT}`);
      console.log(`📚 API متاح على: http://localhost:${PORT}/api`);
      console.log(`🔗 فحص الصحة: http://localhost:${PORT}/api/health`);
      console.log(`📊 نقاط النهاية المتاحة:`);
      console.log(`   • GET  /api/health - فحص حالة الخادم`);
      console.log(`   • GET  /api/narrators - جلب الرواة`);
      console.log(`   • POST /api/narrators - إضافة راوي جديد`);
      console.log(`   • GET  /api/narrators/:id - تفاصيل راوي محدد`);
      console.log(`   • PUT  /api/narrators/:id - تحديث راوي`);
      console.log(`   • DELETE /api/narrators/:id - حذف راوي`);
      console.log(`   • GET  /api/narrators/:id/hadiths - أحاديث راوي محدد`);
      console.log(`   • GET  /api/narrators/:id/musnad - مسند الراوي (مرفوع)`);
      console.log(`   • GET  /api/narrators/:id/mawquf - موقوفات الراوي`); // جديد
      console.log(`   • GET  /api/narrators/:id/maqtu - مقطوعات الراوي`);   // جديد
      console.log(`   • GET  /api/narrators/:id/hadith-stats - إحصائيات الأحاديث`); // جديد
      console.log(`   • GET  /api/narrators/:id/relations - علاقات راوي محدد`);
      console.log(`   • GET  /api/narrators/search - البحث عن رواة`);
      console.log(`   • GET  /api/hadiths/search - البحث في الأحاديث`);
      console.log(`   • GET  /api/hadiths/:id - تفاصيل حديث محدد`);
      console.log(`   • POST /api/hadiths - إضافة حديث جديد`);
      console.log(`   • POST /api/hadiths/batch - استيراد مجموعة أحاديث`);
    });
  } catch (error) {
    console.error('❌ فشل في بدء الخادم:', error);
    process.exit(1);
  }
}

startServer();