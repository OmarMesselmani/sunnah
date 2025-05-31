// Gemma 2 Local API Service via Ollama
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface ExtractedNarrator {
  name: string;
  order: number;
  narrationType?: string;
  possibleVariations?: string[];
  matchedNarratorId?: number;
  matchedNarratorName?: string;
  isConfirmed?: boolean;
}

export async function analyzeIsnad(isnad: string): Promise<ExtractedNarrator[]> {
  const prompt = `أنت خبير في علم الحديث والرجال. حلل السند التالي واستخرج الرواة:

السند: "${isnad}"

استخرج:
1. اسم كل راوي كاملاً
2. ترتيبه في السلسلة
3. صيغة الرواية (حدثنا، أخبرنا، عن، قال)
4. الكنية أو اللقب إن وجد

قدم النتيجة كـ JSON فقط بهذا الشكل:
{
  "narrators": [
    {
      "name": "الاسم الكامل",
      "order": 1,
      "narrationType": "حدثنا",
      "possibleVariations": ["الكنية", "اللقب"]
    }
  ]
}`;

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemma2', // أو 'gemma2:2b' حسب النموذج المثبت
        prompt: prompt,
        stream: false,
        temperature: 0.1,
        system: "أنت مساعد متخصص في تحليل أسانيد الأحاديث النبوية. أجب بـ JSON فقط."
      }),
    });

    if (!response.ok) {
      console.error('Ollama response not ok:', response.status);
      throw new Error('Failed to connect to Ollama');
    }

    const data: OllamaResponse = await response.json();
    
    // استخراج JSON من الرد
    let jsonStr = data.response;
    
    // محاولة إيجاد JSON في النص
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    try {
      const parsed = JSON.parse(jsonStr);
      return parsed.narrators || [];
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', jsonStr);
      // محاولة استخراج الأسماء يدوياً كخطة بديلة
      return extractNarratorsManually(isnad);
    }
  } catch (error) {
    console.error('Error calling Ollama:', error);
    throw new Error('تأكد من تشغيل Ollama على المنفذ 11434');
  }
}

// دالة بديلة لاستخراج الرواة يدوياً
function extractNarratorsManually(isnad: string): ExtractedNarrator[] {
  const narrators: ExtractedNarrator[] = [];
  
  // الكلمات المفتاحية للرواية
  const narrationKeywords = [
    'حدثنا', 'حدثني', 'أخبرنا', 'أخبرني', 
    'عن', 'قال', 'سمعت', 'أنبأنا', 'نا', 'ثنا'
  ];
  
  // تقسيم السند بناءً على كلمات الرواية
  let parts = [isnad];
  narrationKeywords.forEach(keyword => {
    const newParts: string[] = [];
    parts.forEach(part => {
      const splits = part.split(new RegExp(`(${keyword})\\s+`, 'g'));
      newParts.push(...splits);
    });
    parts = newParts;
  });
  
  let currentNarrationType = '';
  let order = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    
    if (narrationKeywords.includes(part)) {
      currentNarrationType = part;
    } else if (part && !narrationKeywords.includes(part)) {
      // استخراج اسم الراوي
      const name = part
        .replace(/^(ال)/, '') // إزالة "ال" من البداية
        .replace(/[،,.:].*$/, '') // إزالة ما بعد الفاصلة
        .trim();
        
      if (name && name.length > 2) {
        order++;
        narrators.push({
          name: name,
          order: order,
          narrationType: currentNarrationType || undefined,
          possibleVariations: []
        });
      }
    }
  }
  
  return narrators;
}

// دالة مساعدة للبحث عن الراوي في قاعدة البيانات
export function generateSearchQueries(narrator: ExtractedNarrator): string[] {
  const queries = [narrator.name];
  
  if (narrator.possibleVariations) {
    queries.push(...narrator.possibleVariations);
  }
  
  // إضافة أجزاء من الاسم للبحث
  const nameParts = narrator.name.split(' ');
  if (nameParts.length > 2) {
    // البحث بأول كلمتين
    queries.push(nameParts.slice(0, 2).join(' '));
    // البحث بآخر كلمتين
    queries.push(nameParts.slice(-2).join(' '));
    // البحث بالاسم الأول واللقب
    if (nameParts.length > 3) {
      queries.push(`${nameParts[0]} ${nameParts[nameParts.length - 1]}`);
    }
  }
  
  // إزالة التكرارات والقيم الفارغة
  return [...new Set(queries.filter(q => q && q.trim()))];
}

// دالة اختبار الاتصال بـ Ollama
export async function testOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      const hasGemma = data.models?.some((model: any) => 
        model.name.toLowerCase().includes('gemma')
      );
      if (!hasGemma) {
        console.warn('Gemma model not found. Run: ollama pull gemma2');
      }
      return hasGemma;
    }
    return false;
  } catch (error) {
    console.error('Cannot connect to Ollama:', error);
    return false;
  }
}