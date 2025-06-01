import { GoogleGenerativeAI } from '@google/generative-ai';

// تهيئة الواجهة البرمجية
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const modelName = 'gemini-1.5-flash';

// واجهة لراوي مستخرج من السند
export interface ExtractedNarrator {
  name: string;
  order: number;
  narrationType?: string;
  possibleVariations?: string[];
  matchedNarratorId?: number;
  matchedNarratorName?: string;
  isConfirmed?: boolean;
}

/**
 * تحليل سند الحديث واستخراج الرواة منه باستخدام نموذج Gemini 1.5 Flash
 * ويتم تعديل الترتيب بحيث يظهر الصحابي أولًا (رقم 1)
 * @param isnad - نص السند المراد تحليله
 * @returns مصفوفة من الرواة المستخرجين من السند
 */
export async function analyzeIsnad(isnad: string): Promise<ExtractedNarrator[]> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // إنشاء نص التعليمات مع نموذج للمخرجات بصيغة JSON
    const prompt = `
      أنت خبير في تحليل أسانيد الحديث النبوي الشريف.
      قم بتحليل سند الحديث التالي واستخراج أسماء الرواة وترتيبهم في السند:
      
      ${isnad}
      
      يرجى تقديم المخرجات بتنسيق JSON كالتالي:
      [
        {
          "name": "اسم الراوي كاملا",
          "order": رقم ترتيب الراوي في السند (1 للأول وهكذا),
          "narrationType": "صيغة الرواية (مثل: حدثنا، أخبرنا، عن، قال...)"
        }
      ]
      
      ملاحظات مهمة:
      1. استخرج اسم الراوي كاملًا كما ورد في النص مع إزالة أي علامات ترقيم أو كلمات إضافية
      2. الأمر يبدأ بمن تلقى الحديث أولًا (الراوي الأقرب للمحدث) وينتهي بالصحابي (آخر راوٍ في السند)
      3. تجاهل المحدث نفسه مثل البخاري أو مسلم في أول السند
      4. أضف صيغة الرواية (حدثنا، أخبرنا، عن، ...) إن وجدت
      5. تأكد من أن المخرجات بصيغة JSON صالحة تمامًا
      
      أعد النتائج فقط بصيغة JSON بدون تعليقات إضافية.
    `;

    // إرسال الطلب إلى نموذج Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // استخراج مصفوفة JSON من النص المُرجع
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('لم يتم العثور على نتائج JSON في استجابة النموذج');
    }
    
    // تحليل JSON
    const originalNarrators = JSON.parse(jsonMatch[0]) as ExtractedNarrator[];
    
    // عكس ترتيب الرواة (لجعل الصحابي في البداية)
    const reversedNarrators = [...originalNarrators].reverse();
    
    // إعادة تعيين أرقام الترتيب
    return reversedNarrators.map((narrator, index) => ({
      ...narrator,
      order: index + 1
    }));
  } catch (error) {
    console.error('Error analyzing isnad with Gemini:', error);
    throw new Error('فشل في تحليل السند: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
  }
}

/**
 * توليد استعلامات بحث متعددة لاسم الراوي لتحسين نتائج البحث
 */
export function generateSearchQueries(narrator: ExtractedNarrator): string[] {
  const name = narrator.name;
  const queries = [name];
  
  // إضافة استعلامات مختلفة لتحسين البحث
  const parts = name.trim().split(' ');
  if (parts.length > 1) {
    // إضافة الجزء الأول والأخير من الاسم
    queries.push(parts[0] + ' ' + parts[parts.length - 1]);
    
    // إضافة جزء "ابن/بن" للبحث إن وجد
    const ibnIndex = parts.findIndex(part => part === 'بن' || part === 'ابن');
    if (ibnIndex > 0 && ibnIndex < parts.length - 1) {
      queries.push(parts[ibnIndex - 1] + ' بن ' + parts[ibnIndex + 1]);
    }
  }
  
  return queries;
}