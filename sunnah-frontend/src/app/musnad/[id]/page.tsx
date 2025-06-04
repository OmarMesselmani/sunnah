'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ChevronLeft, 
  User, 
  Book, 
  BookOpen, 
  ExternalLink, 
  Hash, 
  Calendar, 
  Clock, 
  Scroll,
  AlertTriangle
} from 'lucide-react';
import { getNarratorById, getNarratorMusnad } from '@/lib/api';
// استيراد الأنواع المتاحة فقط من API
import type { 
  Narrator, 
  Hadith as APIHadith, 
  NarratorDeathYear
} from '@/lib/api';

// تعريف الواجهات الناقصة محلياً
interface Source {
  id: string | number;
  name: string;
  shortName: string;
}

interface Book {
  id: string | number;
  name: string;
}

interface Chapter {
  id: string | number;
  name: string;
}

interface HadithNarrator {
  id: string | number;
  orderInChain: number;
  hadithId: string | number;
  narratorId: string | number;
  narrator: Narrator;
}

// واجهة Hadith المحلية تحتوي على جميع الحقول التي نستخدمها بما فيها grade
interface Hadith extends Omit<APIHadith, 'id' | 'source' | 'book' | 'chapter' | 'narrators'> {
  id: string | number;
  hadithNumber: string;
  matn: string;
  chain: string;
  grade?: string;  // إضافة حقل grade
  explanation?: string;
  sourceId: string | number;
  source: Source;
  bookId?: string | number;
  book?: Book;
  chapterId?: string | number;
  chapter?: Chapter;
  narrators: HadithNarrator[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MusnadResponse {
  hadiths: Hadith[];
  pagination: Pagination;
}

// محول البيانات
const adaptNarrator = (apiNarrator: any): Narrator => {
  return {
    ...apiNarrator,
    deathYears: apiNarrator.deathYears?.map((dy: any) => ({
      ...dy,
      id: dy.id.toString() // تحويل ID من number إلى string
    }))
  };
};

// محول البيانات للأحاديث
const adaptHadiths = (apiHadiths: any[]): Hadith[] => {
  return apiHadiths.map(hadith => ({
    ...hadith,
    id: hadith.id.toString()
  }));
};

// الألوان حسب طبقة الراوي
const getGenerationColor = (generation: string) => {
  if (generation.includes('صحابي') || generation.includes('صحابية')) {
    return 'bg-green-900/30 text-green-400';
  } else if (generation.includes('الطبقة الأولى')) {
    return 'bg-green-900/30 text-green-400';
  } else if (generation.includes('تابعي') || generation.includes('الطبقة')) {
    return 'bg-purple-900/30 text-purple-400';
  } else {
    return 'bg-blue-900/30 text-blue-400';
  }
};

export default function NarratorMusnadPage() {
  const { id } = useParams();
  const [narrator, setNarrator] = useState<Narrator | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // جلب معلومات الراوي
        const narratorData = await getNarratorById(id as string);
        setNarrator(adaptNarrator(narratorData));
        
        // جلب أحاديث المسند
        const musnadResponse = await getNarratorMusnad(id as string, { page, limit: 10 });
        // تطبيق الواجهة المحلية على الاستجابة
        setHadiths(adaptHadiths(musnadResponse.hadiths || []));
        setTotalPages(musnadResponse.pagination?.pages || 1);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching musnad data:', error);
        setError('حدث خطأ أثناء تحميل بيانات المسند');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, page]);

  // عرض سنوات الوفاة للراوي
  const renderDeathYears = (narrator: Narrator) => {
    if (!narrator.deathYears || narrator.deathYears.length === 0) {
      // التوافق مع النظام القديم
      if (narrator.deathYear) {
        return (
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar size={18} />
            <span className="font-semibold">سنة الوفاة:</span> 
            <span>{narrator.deathYear} هـ</span>
          </div>
        );
      }
      return null;
    }

    if (narrator.deathYears.length === 1) {
      return (
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar size={18} />
          <span className="font-semibold">سنة الوفاة:</span> 
          <span>{narrator.deathYears[0].year} هـ</span>
        </div>
      );
    }

    return (
      <div className="text-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={18} />
          <span className="font-semibold">سنوات الوفاة المحتملة:</span>
        </div>
        <div className="mr-6 space-y-1">
          {narrator.deathYears.map((deathYear) => (
            <div key={deathYear.id} className="flex items-center gap-2 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-500"></span>
              <span>{deathYear.year} هـ</span>
              {deathYear.source && (
                <span className="text-gray-500 text-xs">({deathYear.source})</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
            <p className="mt-4 text-gray-400">جارٍ تحميل المسند...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !narrator) {
    return (
      <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-red-400 mb-2">حدث خطأ</h1>
            <p className="text-gray-400 mb-6">{error || 'لم يتم العثور على الراوي'}</p>
            <Link
              href="/narrators"
              className="inline-flex items-center gap-2 px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
              العودة لقائمة الرواة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4">
        {/* زر العودة */}
        <Link
          href={`/narrators/${narrator.id}`}
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
        >
          <ChevronLeft size={20} />
          العودة لصفحة الراوي
        </Link>

        {/* معلومات الراوي */}
        <div className="bg-gray-800 rounded-lg shadow-md p-8 mb-8 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">
                مسند {narrator.fullName}
              </h1>
              
              <div className="space-y-2 mb-4">
                {narrator.kunyah && (
                  <p className="text-gray-300">
                    <span className="font-semibold">الكنية:</span> {narrator.kunyah}
                  </p>
                )}
                {narrator.laqab && (
                  <p className="text-gray-300">
                    <span className="font-semibold">اللقب:</span> {narrator.laqab}
                  </p>
                )}
                
                {/* عرض سنوات الوفاة */}
                {renderDeathYears(narrator)}
              </div>

              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getGenerationColor(narrator.generation)}`}>
                {narrator.generation}
              </span>
            </div>

            {/* الإحصائيات */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-400">
                  {narrator._count?.narratedHadiths || 0}
                </div>
                <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                  <Book size={16} />
                  حديث يرويه
                </div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {narrator._count?.musnadHadiths || 0}
                </div>
                <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                  <Scroll size={16} />
                  في مسنده
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* قائمة الأحاديث في المسند */}
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-white border-b border-gray-700 pb-4">
              <Scroll className="text-blue-400" size={24} />
              الأحاديث التي يرويها {narrator.fullName} عن النبي صلى الله عليه وسلم مباشرة
            </h2>

            {hadiths.length === 0 ? (
              <div className="text-center py-12">
                <Book className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-lg text-gray-400">لا توجد أحاديث مسندة مسجلة لهذا الراوي</p>
                <p className="text-sm text-gray-500 mt-2">قد يكون الراوي غير صحابي، أو لم يتم تسجيل أحاديثه بعد</p>
              </div>
            ) : (
              <>
                <div className="space-y-8">
                  {hadiths.map((hadith, index) => (
                    <div 
                      key={hadith.id} 
                      className="border border-gray-700 rounded-lg p-6 hover:bg-gray-700/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Hash size={16} />
                            {hadith.hadithNumber}
                          </span>
                          <span className="font-semibold text-blue-400">
                            {hadith.source.name}
                          </span>
                          {hadith.book?.name && (
                            <span>• {hadith.book.name}</span>
                          )}
                        </div>
                        <Link 
                          href={`/hadiths/${hadith.id}`}
                          className="text-gray-500 hover:text-blue-400 transition-colors"
                        >
                          <ExternalLink size={18} />
                        </Link>
                      </div>
                      
                      {hadith.chapter?.name && (
                        <p className="text-sm text-gray-400 mb-3">
                          <span className="font-semibold">الباب:</span> {hadith.chapter.name}
                        </p>
                      )}
                      
                      {/* متن الحديث */}
                      <p className="text-gray-200 leading-relaxed mb-6 rtl border-r-4 border-gray-700 pr-4 py-2">
                        {hadith.matn}
                      </p>
                      
                      {/* السند */}
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">السند:</h4>
                        <p className="text-gray-400 text-sm">{hadith.chain}</p>
                      </div>
                      
                      {/* درجة الحديث إن وجدت */}
                      {hadith.grade && (
                        <div className="mt-3 text-sm">
                          <span className="font-semibold text-gray-300">الدرجة: </span>
                          <span className={hadith.grade.includes('صحيح') ? 'text-green-400' : hadith.grade.includes('ضعيف') ? 'text-red-400' : 'text-yellow-400'}>
                            {hadith.grade}
                          </span>
                        </div>
                      )}
                      
                      <div className="mt-4 text-right">
                        <Link
                          href={`/hadiths/${hadith.id}`}
                          className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                        >
                          عرض التفاصيل الكاملة
                          <ChevronLeft size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ترقيم الصفحات */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <span className="px-4 py-2 text-gray-300">
                      صفحة {page} من {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}