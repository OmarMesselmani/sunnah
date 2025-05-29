import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// تحميل متغيرات البيئة
dotenv.config();

// إنشاء تطبيق Express
const app = express();
const prisma = new PrismaClient();

// الإعدادات الوسطية
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// نقطة نهاية للتحقق من عمل الخادم
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'خادم السنة يعمل بنجاح' });
});

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
      orderBy: { fullName: 'asc' }
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
    res.status(500).json({ error: 'حدث خطأ في جلب الرواة' });
  }
});

// الحصول على راوي محدد
app.get('/api/narrators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const narrator = await prisma.narrator.findUnique({
      where: { id: Number(id) },
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
    
    if (!narrator) {
      return res.status(404).json({ error: 'لم يتم العثور على الراوي' });
    }
    
    res.json(narrator);
  } catch (error) {
    console.error('Error fetching narrator:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب بيانات الراوي' });
  }
});

// الحصول على أحاديث راوي محدد
app.get('/api/narrators/:id/hadiths', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const hadiths = await prisma.hadith.findMany({
      where: {
        narrators: {
          some: {
            narratorId: Number(id)
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
            narratorId: Number(id)
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
    
    const teachers = await prisma.narratorRelation.findMany({
      where: { narratorId: Number(id) },
      include: {
        teacher: true
      },
      orderBy: {
        relationCount: 'desc'
      }
    });
    
    const students = await prisma.narratorRelation.findMany({
      where: { teacherId: Number(id) },
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
        musnadSahabi: true,
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
        musnadSahabi: true,
        narrators: {
          include: {
            narrator: true
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

// إضافة حديث جديد
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
      narrators 
    } = req.body;
    
    const hadith = await prisma.hadith.create({
      data: {
        sourceId,
        bookId,
        chapterId,
        hadithNumber,
        sanad,
        matn,
        musnadSahabiId,
        narrators: {
          create: narrators
        }
      },
      include: {
        source: true,
        book: true,
        chapter: true,
        musnadSahabi: true,
        narrators: {
          include: {
            narrator: true
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

// بدء الخادم
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 خادم السنة يعمل على المنفذ ${PORT}`);
  console.log(`📚 API متاح على: http://localhost:${PORT}/api`);
});

// التعامل مع إيقاف الخادم بشكل نظيف
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});