import { GoogleGenerativeAI } from '@google/generative-ai';

// تهيئة الواجهة البرمجية
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const modelName = 'gemini-1.5-flash';

// واجهة لراوي مستخرج من السند
export interface ExtractedNarrator {
  name: string;
  order: number; // This will be order within its specific path, Sahabi-first
  narrationType?: string;
  matchedNarratorId?: string;
  matchedNarratorName?: string;
  isConfirmed?: boolean;
  generation?: string;
  // New property to mark duplicates for styling
  isDuplicateAcrossPaths?: boolean; 
}

// Represents a single path of narration as returned by Gemini (Muhaddith-first)
// and then processed (Sahabi-first)
export interface NarrationPath {
  pathName: string; // e.g., "الطريق الأول", "الطريق الثاني"
  narrators: ExtractedNarrator[]; // Sahabi-first ordered narrators for this path
}

// The overall result from analyzeIsnad
export interface AnalyzedIsnadWithPaths {
  paths: NarrationPath[];
}

// Interface for the direct response from Gemini
interface GeminiMultiPathResponse {
  // Each path is Muhaddith-first as extracted by Gemini
  paths: Array<{
    pathName: string; 
    narrators: Array<{ name: string; order: number; narrationType?: string; }>;
  }>;
}

/**
 * تحليل سند الحديث واستخراج الرواة منه باستخدام نموذج Gemini 1.5 Flash
 * ويتم تعديل الترتيب بحيث يظهر الصحابي أولًا (رقم 1)
 * @param isnad - نص السند المراد تحليله
 * @returns مصفوفة من الرواة المستخرجين من السند
 */
export async function analyzeIsnad(isnad: string): Promise<AnalyzedIsnadWithPaths> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = `
أنت خبير في تحليل أسانيد الحديث النبوي الشريف.
قم بتحليل سند الحديث التالي واستخراج أسماء الرواة وترتيبهم وصيغة الرواية لكل راوٍ في كل طريق من طرق السند.

السند:
${isnad}

تعليمات:
1.  إذا كان للسند أكثر من طريق (عادةً يُشار إليه بحرف "ح" أو ما شابه)، قم بتحليل كل طريق بشكل مستقل.
2.  لكل طريق، قم بتسميته (مثال: "الطريق الأول"، "الطريق الثاني"، وهكذا).
3.  لكل راوٍ في كل طريق، استخرج اسمه كاملاً، ورقم ترتيبه داخل ذلك الطريق (يبدأ من 1 للراوي الأقرب للمحدث في ذلك الطريق)، وصيغة الرواية (مثل: حدثنا، أخبرنا، عن).
4.  تجاهل المحدث نفسه (مثل البخاري أو مسلم) إذا كان في بداية السند.
5.  تأكد من أن المخرجات بصيغة JSON صالحة تمامًا.

المخرجات يجب أن تكون بتنسيق JSON كالتالي:
{
  "paths": [
    {
      "pathName": "الطريق الأول",
      "narrators": [ 
        // الرواة في هذا الطريق، مرتبون من الأقرب للمحدث (order: 1) وحتى الصحابي (order الأكبر)
        { "name": "اسم الراوي الأول في الطريق الأول", "order": 1, "narrationType": "صيغة" },
        { "name": "اسم الراوي الثاني في الطريق الأول", "order": 2, "narrationType": "صيغة" },
        // ... حتى الصحابي في الطريق الأول
      ]
    },
    {
      "pathName": "الطريق الثاني",
      "narrators": [
        { "name": "اسم الراوي الأول في الطريق الثاني", "order": 1, "narrationType": "صيغة" },
        // ... حتى الصحابي في الطريق الثاني
      ]
    }
    // ... يمكن أن يكون هناك المزيد من الطرق
    // إذا كان السند بطريق واحد فقط، يجب أن تكون هناك مصفوفة "paths" تحتوي على عنصر واحد فقط.
  ]
}

ملاحظات مهمة:
-   الرواة داخل كل مصفوفة "narrators" لكل طريق يجب أن يكونوا مرتبين من الأقرب للمحدث (order: 1) إلى الصحابي (order الأكبر في نهاية المصفوفة).
-   أعد النتائج فقط بصيغة JSON بدون تعليقات إضافية.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch || !jsonMatch[0]) {
      // Fallback for old single array format if the object isn't found
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch && arrayMatch[0]) {
        console.warn("Gemini returned an array, attempting to parse as a single path (Muhaddith-first).");
        const muhaddithFirstNarrators = JSON.parse(arrayMatch[0]) as Array<{ name: string; order: number; narrationType?: string; }>;
        const sahabiFirstNarrators = [...muhaddithFirstNarrators].reverse().map((narrator, index) => ({
          ...narrator,
          order: index + 1,
          isDuplicateAcrossPaths: false // Default for single path
        }));
        return {
          paths: [{ pathName: "الطريق الوحيد", narrators: sahabiFirstNarrators }]
        };
      }
      throw new Error('لم يتم العثور على نتائج JSON صالحة في استجابة النموذج');
    }
    
    const geminiResponse = JSON.parse(jsonMatch[0]) as GeminiMultiPathResponse;

    if (!geminiResponse.paths || !Array.isArray(geminiResponse.paths) || geminiResponse.paths.length === 0) {
      console.error("Invalid or empty paths array from Gemini:", geminiResponse);
      throw new Error('لم يتم إرجاع أي طرق للسند من النموذج.');
    }

    const processedPaths: NarrationPath[] = geminiResponse.paths.map(path => {
      if (!path.narrators || !Array.isArray(path.narrators)) {
        console.error("Invalid narrators array in path:", path);
        // Return an empty narrators array for this path or throw error
        return { pathName: path.pathName || "طريق غير صالح", narrators: [] }; 
      }
      // Reverse to Sahabi-first and re-assign order within this path
      const sahabiFirstNarrators = [...path.narrators].reverse().map((narrator, index) => ({
        ...narrator,
        order: index + 1, // Order is now Sahabi-first within this path
        isDuplicateAcrossPaths: false // Initialize, will be set later
      }));
      return {
        pathName: path.pathName || "طريق بدون اسم",
        narrators: sahabiFirstNarrators
      };
    });
    
    // Identify duplicates across paths (based on narrator name for simplicity)
    // This is a basic check. More sophisticated checks might involve matchedNarratorId later.
    if (processedPaths.length > 1) {
      const allNarratorNames = new Map<string, number>(); // name -> count
      processedPaths.forEach(path => {
        path.narrators.forEach(narrator => {
          allNarratorNames.set(narrator.name, (allNarratorNames.get(narrator.name) || 0) + 1);
        });
      });

      processedPaths.forEach(path => {
        path.narrators.forEach(narrator => {
          if ((allNarratorNames.get(narrator.name) || 0) > 1) {
            narrator.isDuplicateAcrossPaths = true;
          }
        });
      });
    }

    return { paths: processedPaths };

  } catch (error) {
    console.error('Error analyzing isnad with Gemini:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Candidate was blocked due to SAFETY")) {
        throw new Error('فشل تحليل السند: تم حظر المحتوى بواسطة مرشحات الأمان.');
    }
    if (errorMessage.includes("JSON")) {
        throw new Error('فشل تحليل السند: خطأ في تنسيق JSON من النموذج. ' + errorMessage);
    }
    throw new Error('فشل في تحليل السند: ' + errorMessage);
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