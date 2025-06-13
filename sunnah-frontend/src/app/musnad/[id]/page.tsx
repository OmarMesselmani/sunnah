'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation'; // useSearchParams للحصول على رقم الصفحة
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
  AlertTriangle,
  Loader2
} from 'lucide-react';
// استيراد الدوال والواجهات اللازمة من lib/api
import { 
  getNarratorById, 
  getNarratorMusnad, // دالة جلب المسند الجديدة
  isValidUUID,
  type Narrator,      // استخدام الواجهات من lib/api
  type Hadith,
  type MusnadResponse, // استخدام الواجهات من lib/api
  type PaginationInfo, // استخدام الواجهات من lib/api
  type NarratorDeathYear // استخدام الواجهات من lib/api
} from '@/lib/api';

// الألوان حسب طبقة الراوي (تبقى كما هي)
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
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [narrator, setNarrator] = useState<Narrator | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    const fetchData = async () => {
      if (!id) {
        setError('معرف الراوي مفقود');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      let narratorData: Narrator | null = null;

      try {
        if (!isValidUUID(id)) {
          throw new Error('معرف الراوي غير صالح');
        }
        
        console.log('🔍 جلب معلومات الراوي:', id);
        narratorData = await getNarratorById(id);
        setNarrator(narratorData);
        console.log('✅ تم جلب معلومات الراوي:', narratorData);
        
      } catch (err: any) {
        console.error('❌ خطأ في جلب معلومات الراوي:', err);
        if (err.message?.includes('404') || err.response?.status === 404 || err.message?.toLowerCase().includes('not found')) {
          setError('الراوي غير موجود'); // رسالة خطأ أكثر تحديداً
        } else if (err.message?.includes('معرف الراوي غير صالح')) {
          setError('معرف الراوي غير صالح');
        } else {
          setError(err.message || 'حدث خطأ أثناء تحميل معلومات الراوي');
        }
        setLoading(false);
        return; // التوقف إذا لم يتم العثور على الراوي أو كان المعرف غير صالح
      }

      // إذا تم العثور على الراوي، يتم المتابعة لجلب المسند
      if (narratorData) {
        try {
          console.log('📚 جلب أحاديث المسند للصفحة:', currentPage);
          const musnadResponse = await getNarratorMusnad(id, { page: currentPage, limit: 10 });
          console.log('📊 استجابة المسند:', musnadResponse);
          
          if (musnadResponse && musnadResponse.hadiths) {
            setHadiths(musnadResponse.hadiths);
            setPagination(musnadResponse.pagination);
            if (musnadResponse.hadiths.length === 0 && musnadResponse.pagination.total === 0) {
              console.log('ℹ️ الراوي موجود ولكن لا توجد أحاديث في مسنده');
            }
            // console.log(`✅ تم جلب ${musnadResponse.hadiths.length} حديث`); // يمكنك إبقاء هذا السطر أو حذفه
          } else {
            console.log('⚠️ لا توجد أحاديث في الاستجابة للمسند');
            setHadiths([]);
            setPagination(prev => ({ ...prev, total: 0, pages: 1, page: currentPage }));
          }
        } catch (err: any) {
          console.error('❌ خطأ في جلب أحاديث المسند:', err); // الخطأ العام
          // تسجيل استجابة الخادم التفصيلية إذا كانت موجودة
          if (err.response) {
            console.error('Server response for musnad error:', {
              status: err.response.status,
              data: err.response.data,
              headers: err.response.headers,
            });
          }

          if (err.response?.status === 404) {
            // التحقق من رسالة الخطأ المحددة من الخادم إذا كانت 404
            if (err.response.data?.error === 'الراوي غير موجود') {
              setError('الخادم أفاد بأن الراوي المحدد للمسند غير موجود.'); 
            } else {
              // رسالة الخطأ التي تظهر لك الآن
              setError(`لا يمكن تحميل مسند الراوي (خطأ ${err.response.status}). قد يكون المسند فارغًا أو حدث خطأ آخر في الخادم.`);
            }
          } else if (err.message?.includes('Network Error')) {
            setError('خطأ في الشبكة. يرجى التحقق من اتصالك بالخادم.');
          } else {
            setError(err.message || 'حدث خطأ غير معروف أثناء تحميل أحاديث المسند');
          }
        }
      }
      setLoading(false);
    };
    
    fetchData();
  }, [id, searchParams]);

  // دالة عرض سنوات الوفاة للراوي
  const renderDeathYears = (currentNarrator: Narrator) => {
    if (!currentNarrator.deathYears || currentNarrator.deathYears.length === 0) {
      if (currentNarrator.deathYear) {
        const deathYearDisplay = typeof currentNarrator.deathYear === 'number' 
          ? `${currentNarrator.deathYear} هـ` 
          : currentNarrator.deathYear;
        return (
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar size={18} />
            <span className="font-semibold">سنة الوفاة:</span> 
            <span>{deathYearDisplay}</span>
          </div>
        );
      }
      return null;
    }

    if (currentNarrator.deathYears.length === 1) {
      const deathYear = currentNarrator.deathYears[0];
      const displayValue = deathYear.year ? `${deathYear.year} هـ` : deathYear.deathDescription || 'غير محدد';
      return (
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar size={18} />
          <span className="font-semibold">سنة الوفاة:</span> 
          <span>{displayValue}</span>
          {deathYear.source && <span className="text-xs text-gray-500">({deathYear.source})</span>}
        </div>
      );
    }

    return (
      <div className="text-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={18} />
          <span className="font-semibold">سنوات/أحوال الوفاة المحتملة:</span>
        </div>
        <div className="mr-6 space-y-1">
          {currentNarrator.deathYears.map((deathYear) => {
            const displayValue = deathYear.year ? `${deathYear.year} هـ` : deathYear.deathDescription || 'غير محدد';
            return (
              <div key={deathYear.id} className="flex items-center gap-2 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${deathYear.isPrimary ? 'bg-emerald-400' : 'bg-gray-500'}`}></span>
                <span>{displayValue}</span>
                {deathYear.source && (
                  <span className="text-gray-500 text-xs">({deathYear.source})</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <Loader2 className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mb-4" />
            <p className="text-gray-400">جارٍ تحميل المسند...</p>
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
                {renderDeathYears(narrator)}
              </div>

              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getGenerationColor(narrator.generation)}`}>
                {narrator.generation}
              </span>
            </div>

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
                  {pagination.total} {/* استخدام pagination.total */}
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
                      
                      <p className="text-gray-200 leading-relaxed mb-6 rtl border-r-4 border-gray-700 pr-4 py-2">
                        {hadith.matn}
                      </p>
                      
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">السند:</h4>
                        <p className="text-gray-400 text-sm">{hadith.chain || hadith.sanad}</p>
                      </div>
                      
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

                {/* ترقيم الصفحات - استخدام useRouter للتنقل */}
                {pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Link
                      href={`/musnad/${id}?page=${Math.max(1, pagination.page - 1)}`}
                      passHref
                      legacyBehavior>
                      <a className={`px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        السابق
                      </a>
                    </Link>
                    <span className="px-4 py-2 text-gray-300">
                      صفحة {pagination.page} من {pagination.pages}
                    </span>
                    <Link
                      href={`/musnad/${id}?page=${Math.min(pagination.pages, pagination.page + 1)}`}
                      passHref
                      legacyBehavior>
                      <a className={`px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 ${pagination.page === pagination.pages ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        التالي
                      </a>
                    </Link>
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