import sourceData from '@/data/hadith-sources.json';

// التأكد من الهيكل الصحيح للبيانات
console.log('Source data structure:', JSON.stringify(sourceData).slice(0, 100) + '...');

export type HadithBook = {
  id: number;
  name: string;
  startHadith: number;
  endHadith: number;
};

export type HadithSource = {
  id: number;
  name: string;
  books: HadithBook[];
};

// دالة لتحويل البيانات من الهيكل الحالي إلى الهيكل المطلوب
function transformSourceData(data: any): HadithBook[] {
  // تحقق من وجود البيانات
  if (!data || !data.bukhari_books) {
    console.error('Invalid source data structure:', data);
    return [];
  }
  
  // إذا كانت البيانات موجودة بالفعل في الشكل المتوقع
  if (Array.isArray(data.bukhari_books)) {
    // تحقق من أن كل عنصر في المصفوفة يحتوي على الخصائص المطلوبة
    if (data.bukhari_books.length > 0 && 
        'id' in data.bukhari_books[0] && 
        'name' in data.bukhari_books[0] &&
        'startHadith' in data.bukhari_books[0] &&
        'endHadith' in data.bukhari_books[0]) {
      return data.bukhari_books;
    }
  }
  
  // في حال عدم وجود البيانات بالشكل الصحيح
  console.error('Source data does not match expected format:', data);
  return [];
}

// استخدام الدالة
const bukhariBooks = transformSourceData(sourceData);

export const hadithSources: HadithSource[] = [
  {
    id: 1,
    name: "صحيح البخاري",
    books: bukhariBooks
  },
  {
    id: 2,
    name: "صحيح مسلم",
    books: []
  }
];

/**
 * البحث عن الكتاب بناءً على رقم الحديث والمصدر
 */
export function findBookByHadithNumber(sourceId: number, hadithNumber: string): HadithBook | null {
  const numericHadithNumber = parseInt(hadithNumber, 10);
  if (isNaN(numericHadithNumber)) return null;

  const source = hadithSources.find(s => s.id === sourceId);
  if (!source) return null;

  return source.books.find(
    book => numericHadithNumber >= book.startHadith && numericHadithNumber <= book.endHadith
  ) || null;
}

/**
 * الحصول على قائمة الكتب لمصدر محدد
 */
export function getBooksBySourceId(sourceId: number): HadithBook[] {
  const source = hadithSources.find(s => s.id === sourceId);
  return source ? source.books : [];
}