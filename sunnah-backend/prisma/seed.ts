/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء إضافة البيانات التجريبية...');

  // إضافة المصادر
  const bukhari = await prisma.source.create({
    data: {
      name: 'صحيح البخاري',
      author: 'الإمام البخاري',
      fullName: 'الجامع المسند الصحيح المختصر من أمور رسول الله صلى الله عليه وسلم وسننه وأيامه'
    }
  });

  const muslim = await prisma.source.create({
    data: {
      name: 'صحيح مسلم',
      author: 'الإمام مسلم',
      fullName: 'المسند الصحيح المختصر بنقل العدل عن العدل إلى رسول الله صلى الله عليه وسلم'
    }
  });

  // إضافة بعض الرواة
  const abuHurayrah = await prisma.narrator.create({
    data: {
      fullName: 'عبد الرحمن بن صخر الدوسي',
      kunyah: 'أبو هريرة',
      generation: 'صحابي',
      deathYear: "59",
      biography: 'صحابي جليل، أكثر الصحابة رواية للحديث'
    }
  });

  const abdullahIbnUmar = await prisma.narrator.create({
    data: {
      fullName: 'عبد الله بن عمر بن الخطاب',
      kunyah: 'أبو عبد الرحمن',
      generation: 'صحابي',
      deathYear: "73",
      biography: 'صحابي جليل، من المكثرين في الرواية'
    }
  });

  const malik = await prisma.narrator.create({
    data: {
      fullName: 'مالك بن أنس',
      kunyah: 'أبو عبد الله',
      laqab: 'إمام دار الهجرة',
      generation: 'تابع التابعين',
      deathYear: "179",
      biography: 'إمام دار الهجرة، صاحب المذهب المالكي'
    }
  });

  const ibnShihab = await prisma.narrator.create({
    data: {
      fullName: 'محمد بن مسلم بن شهاب الزهري',
      kunyah: 'أبو بكر',
      laqab: 'الزهري',
      generation: 'تابعي',
      deathYear: "124",
      biography: 'من كبار التابعين وأئمة الحديث'
    }
  });

  const abdullahIbnYusuf = await prisma.narrator.create({
    data: {
      fullName: 'عبد الله بن يوسف التنيسي',
      generation: 'تابع التابعين',
      deathYear: "218",
      biography: 'من شيوخ البخاري'
    }
  });

  // إضافة كتاب وباب
  const kitabAlIman = await prisma.book.create({
    data: {
      sourceId: bukhari.id,
      name: 'كتاب الإيمان',
      bookNumber: 2
    }
  });

  const babAlIman = await prisma.chapter.create({
    data: {
      bookId: kitabAlIman.id,
      name: 'باب الإيمان وقول النبي صلى الله عليه وسلم بني الإسلام على خمس',
      chapterNumber: 1
    }
  });

  // إضافة حديث تجريبي
  const hadith1 = await prisma.hadith.create({
    data: {
      sourceId: bukhari.id,
      bookId: kitabAlIman.id,
      chapterId: babAlIman.id,
      hadithNumber: '8',
      sanad: 'حدثنا عبد الله بن يوسف قال أخبرنا مالك عن ابن شهاب عن أبي هريرة رضي الله عنه',
      matn: 'أن رسول الله صلى الله عليه وسلم قال: "المسلم من سلم المسلمون من لسانه ويده، والمهاجر من هجر ما نهى الله عنه"',
      musnadSahabiId: abuHurayrah.id
    }
  });

  // ربط الرواة بالحديث
  await prisma.hadithNarrator.createMany({
    data: [
      {
        hadithId: hadith1.id,
        narratorId: abdullahIbnYusuf.id,
        orderInChain: 1,
        narrationType: 'حدثنا'
      },
      {
        hadithId: hadith1.id,
        narratorId: malik.id,
        orderInChain: 2,
        narrationType: 'أخبرنا'
      },
      {
        hadithId: hadith1.id,
        narratorId: ibnShihab.id,
        orderInChain: 3,
        narrationType: 'عن'
      },
      {
        hadithId: hadith1.id,
        narratorId: abuHurayrah.id,
        orderInChain: 4,
        narrationType: 'عن'
      }
    ]
  });

  // إضافة علاقات بين الرواة
  await prisma.narratorRelation.createMany({
    data: [
      {
        narratorId: malik.id,
        teacherId: ibnShihab.id,
        relationCount: 5
      },
      {
        narratorId: ibnShihab.id,
        teacherId: abuHurayrah.id,
        relationCount: 10
      },
      {
        narratorId: abdullahIbnYusuf.id,
        teacherId: malik.id,
        relationCount: 3
      }
    ]
  });

  console.log('✅ تمت إضافة البيانات التجريبية بنجاح!');
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إضافة البيانات:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
