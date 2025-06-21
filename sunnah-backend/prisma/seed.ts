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

  // إضافة حديث مرفوع
  const hadith1 = await prisma.hadith.create({
    data: {
      sourceId: bukhari.id,
      bookId: kitabAlIman.id,
      chapterId: babAlIman.id,
      hadithNumber: '8',
      sanad: 'حدثنا عبد الله بن يوسف قال أخبرنا مالك عن ابن شهاب عن أبي هريرة رضي الله عنه',
      matn: 'أن رسول الله صلى الله عليه وسلم قال: "المسلم من سلم المسلمون من لسانه ويده، والمهاجر من هجر ما نهى الله عنه"',
      musnadSahabiId: abuHurayrah.id,
      hadithType: 'marfu' // حديث مرفوع
    }
  });

  // إضافة حديث موقوف
  const hadith2 = await prisma.hadith.create({
    data: {
      sourceId: bukhari.id,
      bookId: kitabAlIman.id,
      chapterId: babAlIman.id,
      hadithNumber: '9',
      sanad: 'حدثنا عبد الله بن يوسف قال أخبرنا مالك عن ابن شهاب عن عبد الله بن عمر',
      matn: 'قال عبد الله بن عمر: "أفضل الأعمال الصلاة على وقتها والبر بالوالدين"',
      musnadSahabiId: abdullahIbnUmar.id,
      hadithType: 'mawquf' // حديث موقوف
    }
  });

  // إضافة حديث مقطوع
  const hadith3 = await prisma.hadith.create({
    data: {
      sourceId: bukhari.id,
      bookId: kitabAlIman.id,
      chapterId: babAlIman.id,
      hadithNumber: '10',
      sanad: 'حدثنا عبد الله بن يوسف قال أخبرنا مالك عن ابن شهاب',
      matn: 'قال ابن شهاب: "العلم خير من المال، العلم يحرسك وأنت تحرس المال"',
      musnadSahabiId: null, // لا يوجد صحابي للحديث المقطوع
      hadithType: 'maqtu' // حديث مقطوع
    }
  });

  // إضافة المزيد من الأحاديث المرفوعة لأبي هريرة
  const hadith4 = await prisma.hadith.create({
    data: {
      sourceId: bukhari.id,
      bookId: kitabAlIman.id,
      chapterId: babAlIman.id,
      hadithNumber: '11',
      sanad: 'حدثنا عبد الله بن يوسف قال أخبرنا مالك عن ابن شهاب عن أبي هريرة رضي الله عنه',
      matn: 'أن رسول الله صلى الله عليه وسلم قال: "الإيمان بضع وسبعون شعبة، أعلاها لا إله إلا الله، وأدناها إماطة الأذى عن الطريق"',
      musnadSahabiId: abuHurayrah.id,
      hadithType: 'marfu'
    }
  });

  const hadith5 = await prisma.hadith.create({
    data: {
      sourceId: bukhari.id,
      bookId: kitabAlIman.id,
      chapterId: babAlIman.id,
      hadithNumber: '12',
      sanad: 'حدثنا عبد الله بن يوسف قال أخبرنا مالك عن ابن شهاب عن أبي هريرة رضي الله عنه',
      matn: 'أن رسول الله صلى الله عليه وسلم قال: "كل أمتي يدخلون الجنة إلا من أبى"، قيل: ومن يأبى يا رسول الله؟ قال: "من أطاعني دخل الجنة، ومن عصاني فقد أبى"',
      musnadSahabiId: abuHurayrah.id,
      hadithType: 'marfu'
    }
  });

  // إضافة المزيد من الموقوفات لعبد الله بن عمر
  const hadith6 = await prisma.hadith.create({
    data: {
      sourceId: bukhari.id,
      bookId: kitabAlIman.id,
      chapterId: babAlIman.id,
      hadithNumber: '13',
      sanad: 'حدثنا عبد الله بن يوسف قال أخبرنا مالك عن نافع عن عبد الله بن عمر',
      matn: 'قال عبد الله بن عمر: "كنت أكره أن أنام وفي قلبي شيء على أحد من المسلمين"',
      musnadSahabiId: abdullahIbnUmar.id,
      hadithType: 'mawquf'
    }
  });

  // ربط الرواة بالأحاديث
  await prisma.hadithNarrator.createMany({
    data: [
      // الحديث الأول (مرفوع)
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
      },
      // الحديث الثاني (موقوف)
      {
        hadithId: hadith2.id,
        narratorId: abdullahIbnYusuf.id,
        orderInChain: 1,
        narrationType: 'حدثنا'
      },
      {
        hadithId: hadith2.id,
        narratorId: malik.id,
        orderInChain: 2,
        narrationType: 'أخبرنا'
      },
      {
        hadithId: hadith2.id,
        narratorId: ibnShihab.id,
        orderInChain: 3,
        narrationType: 'عن'
      },
      {
        hadithId: hadith2.id,
        narratorId: abdullahIbnUmar.id,
        orderInChain: 4,
        narrationType: 'عن'
      },
      // الحديث الثالث (مقطوع)
      {
        hadithId: hadith3.id,
        narratorId: abdullahIbnYusuf.id,
        orderInChain: 1,
        narrationType: 'حدثنا'
      },
      {
        hadithId: hadith3.id,
        narratorId: malik.id,
        orderInChain: 2,
        narrationType: 'أخبرنا'
      },
      {
        hadithId: hadith3.id,
        narratorId: ibnShihab.id,
        orderInChain: 3,
        narrationType: 'عن'
      },
      // الحديث الرابع (مرفوع)
      {
        hadithId: hadith4.id,
        narratorId: abdullahIbnYusuf.id,
        orderInChain: 1,
        narrationType: 'حدثنا'
      },
      {
        hadithId: hadith4.id,
        narratorId: malik.id,
        orderInChain: 2,
        narrationType: 'أخبرنا'
      },
      {
        hadithId: hadith4.id,
        narratorId: ibnShihab.id,
        orderInChain: 3,
        narrationType: 'عن'
      },
      {
        hadithId: hadith4.id,
        narratorId: abuHurayrah.id,
        orderInChain: 4,
        narrationType: 'عن'
      },
      // الحديث الخامس (مرفوع)
      {
        hadithId: hadith5.id,
        narratorId: abdullahIbnYusuf.id,
        orderInChain: 1,
        narrationType: 'حدثنا'
      },
      {
        hadithId: hadith5.id,
        narratorId: malik.id,
        orderInChain: 2,
        narrationType: 'أخبرنا'
      },
      {
        hadithId: hadith5.id,
        narratorId: ibnShihab.id,
        orderInChain: 3,
        narrationType: 'عن'
      },
      {
        hadithId: hadith5.id,
        narratorId: abuHurayrah.id,
        orderInChain: 4,
        narrationType: 'عن'
      },
      // الحديث السادس (موقوف)
      {
        hadithId: hadith6.id,
        narratorId: abdullahIbnYusuf.id,
        orderInChain: 1,
        narrationType: 'حدثنا'
      },
      {
        hadithId: hadith6.id,
        narratorId: malik.id,
        orderInChain: 2,
        narrationType: 'أخبرنا'
      },
      {
        hadithId: hadith6.id,
        narratorId: abdullahIbnUmar.id,
        orderInChain: 3,
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
  console.log('📊 تم إضافة:');
  console.log('  - 5 رواة');
  console.log('  - 6 أحاديث (3 مرفوعة، 2 موقوفة، 1 مقطوعة)');
  console.log('  - مصدران (البخاري ومسلم)');
  console.log('  - كتاب وباب');
}

main()
  .catch((e) => {
    console.error('❌ خطأ في إضافة البيانات:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
