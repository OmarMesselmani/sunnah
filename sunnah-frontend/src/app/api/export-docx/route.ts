// filepath: c:/Users/GAMER1/Desktop/sunnah/sunnah-frontend/src/app/api/export-docx/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from 'docx';
import { convert } from 'html-to-text';

export async function GET() {
  console.log('🧪 تم الوصول إلى مسار API عبر GET');
  return NextResponse.json({ 
    message: 'Export DOCX API is working with docx library', 
    method: 'Use POST with htmlContent and fileName',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 API Route: تم استلام طلب تصدير Word');
    
    const body = await req.json();
    console.log('📦 محتوى الطلب:', { 
      hasHtmlContent: !!body.htmlContent, 
      fileName: body.fileName,
      htmlLength: body.htmlContent?.length 
    });

    const { htmlContent, fileName } = body;

    if (!htmlContent || !fileName) {
      console.error('❌ بيانات ناقصة:', { htmlContent: !!htmlContent, fileName: !!fileName });
      return NextResponse.json({ error: 'Missing htmlContent or fileName' }, { status: 400 });
    }

    console.log('⚙️ بدء عملية تحويل HTML إلى نص...');
    
    // تحويل HTML إلى نص عادي مع خيارات مبسطة
    const plainText = convert(htmlContent, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
        { selector: 'a', format: 'skip' }, // تجاهل الروابط
        { selector: 'img', format: 'skip' }, // تجاهل الصور
      ]
    });

    console.log('📝 تم تحويل HTML إلى نص، الطول:', plainText.length);

    // تقسيم النص إلى أسطر وتنظيفها
    const lines = plainText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    console.log('📄 عدد الأسطر:', lines.length);

    // إنشاء فقرات الوثيقة
    const paragraphs = lines.map(line => {
      // تحديد نوع الفقرة بناءً على المحتوى
      if (line.startsWith('مسند ')) {
        // عنوان رئيسي
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 32, // 16pt
              font: 'Arial',
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200, after: 200 },
        });
      } else if (line.includes('صحيح البخاري') || line.includes('صحيح مسلم') || line.includes('كتاب')) {
        // معلومات المصدر
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 24, // 12pt
              font: 'Arial',
              color: '0066CC',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100, after: 100 },
        });
      } else if (line.startsWith('الترجمة:') || line.startsWith('اللقب:')) {
        // معلومات الراوي
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              italics: true,
              size: 22, // 11pt
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 100 },
        });
      } else if (line.includes('الدرجة:')) {
        // درجة الحديث
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 20, // 10pt
              font: 'Arial',
              color: line.includes('صحيح') ? '008000' : line.includes('ضعيف') ? 'CC0000' : 'FF8800',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 50, after: 100 },
        });
      } else {
        // فقرة عادية (متن الحديث أو السند)
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 150 },
          indent: { right: 200 }, // إزاحة بسيطة للمتن
        });
      }
    });

    console.log('📑 تم إنشاء', paragraphs.length, 'فقرة');

    // إنشاء وثيقة Word
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,    // 1 inch
              right: 720,  // 1 inch
              bottom: 720, // 1 inch
              left: 720,   // 1 inch
            },
          },
        },
        children: paragraphs,
      }],
    });

    console.log('📄 تم إنشاء وثيقة Word بنجاح');

    // تحويل إلى Buffer
    const buffer = await Packer.toBuffer(doc);
    
    console.log('✅ تم إنشاء ملف DOCX بنجاح، الحجم:', buffer.length, 'بايت');

    if (buffer.length === 0) {
      throw new Error('تم إنتاج ملف فارغ');
    }

    // ترميز اسم الملف لتجنب مشاكل الأحرف العربية
    const encodedFileName = encodeURIComponent(fileName + '.docx');
    
    console.log('📁 اسم الملف المُرمز:', encodedFileName);

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    // استخدام التنسيق المدعوم دولياً للأسماء العربية
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);

    return new NextResponse(buffer, { status: 200, headers });

  } catch (error: any) {
    console.error('❌ خطأ تفصيلي في API Route:', error);
    return NextResponse.json({ 
      error: 'Failed to generate DOCX file', 
      details: error.message,
      errorName: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}