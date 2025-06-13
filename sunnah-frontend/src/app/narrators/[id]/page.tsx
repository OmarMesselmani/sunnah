// File: sunnah-frontend/src/app/narrators/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // إضافة استيراد useRouter
import Link from 'next/link';
import { 
  User, 
  Calendar, 
  Book, 
  Users, 
  ChevronLeft,
  Scroll,
  Link as LinkIcon,
  Hash,
  ExternalLink,
  Clock,
  Trash2, // إضافة أيقونة الحذف
  AlertTriangle // إضافة أيقونة التنبيه
} from 'lucide-react';
// أضف deleteNarrator إلى قائمة الاستيراد
import { getNarratorById, getNarratorHadiths, getNarratorRelations, isValidUUID, deleteNarrator } from '@/lib/api';

// تعريف الواجهة الجديدة هنا
interface NarratorDeathYear {
  id: string; // أو number إذا كان ID من قاعدة البيانات رقمًا
  year?: number | null;
  deathDescription?: string | null;
  source?: string;
}

interface Narrator {
  id: string;
  fullName: string;
  kunyah?: string;
  laqab?: string;
  generation: string;
  deathYear?: string | number | null; // للتوافق مع النظام القديم
  deathYears?: NarratorDeathYear[];   // استخدام الواجهة المحدثة
  biography?: string;
  _count?: {
    narratedHadiths: number;
    musnadHadiths: number;
    teachersRelation: number;
    studentsRelation: number;
  };
}

interface Hadith {
  id: number;
  hadithNumber: string;
  matn: string;
  source: {
    name: string;
  };
  book?: {
    name: string;
  };
  chapter?: {
    name: string;
  };
}

interface Relation {
  id: string; // Changed from number to string for UUID
  name: string;
  relation_count: number;
}

export default function NarratorDetailPage() {
  const params = useParams();
  const router = useRouter(); // إضافة router للتنقل بعد الحذف
  const narratorId = params.id as string;
  
  const [narrator, setNarrator] = useState<Narrator | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [teachers, setTeachers] = useState<Relation[]>([]);
  const [students, setStudents] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hadiths' | 'relations'>('hadiths');
  const [hadithsPage, setHadithsPage] = useState(1);
  const [totalHadithsPages, setTotalHadithsPages] = useState(1);
  const [error, setError] = useState<string>('');
  
  // إضافة حالات جديدة لمربع حوار التأكيد والحذف
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (narratorId) {
      // Validate UUID format before making requests
      if (!isValidUUID(narratorId)) {
        setError('معرف الراوي غير صالح');
        setLoading(false);
        return;
      }
      
      loadNarratorData();
    }
  }, [narratorId]);

  useEffect(() => {
    if (narratorId && activeTab === 'hadiths' && isValidUUID(narratorId)) {
      loadHadiths();
    }
  }, [hadithsPage, narratorId, activeTab]); // Added narratorId and activeTab to dependencies

  const loadNarratorData = async () => {
    if (!narratorId || !isValidUUID(narratorId)) { // Added check for narratorId
        setError('معرف الراوي غير صالح');
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      setError('');
      
      // Load narrator details
      const narratorData = await getNarratorById(narratorId);
      setNarrator(narratorData);
      
      // Load relations
      const relationsData = await getNarratorRelations(narratorId);
      setTeachers(relationsData.teachers || []);
      setStudents(relationsData.students || []);
      
      // Load first page of hadiths
      await loadHadiths(); // Call loadHadiths after narratorData is set
      
    } catch (error: any) {
      console.error('Error loading narrator:', error);
      if (error.message === 'Invalid narrator ID format') {
        setError('معرف الراوي غير صالح');
      } else {
        setError('حدث خطأ في تحميل بيانات الراوي');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHadiths = async () => {
    if (!narratorId || !isValidUUID(narratorId)) return; // Added check for narratorId
    try {
      // setError(''); // Optionally reset error specific to hadiths loading
      const hadithsData = await getNarratorHadiths(narratorId, {
        page: hadithsPage,
        limit: 5
      });
      setHadiths(hadithsData.hadiths || []);
      setTotalHadithsPages(hadithsData.pagination?.pages || 1);
    } catch (error) {
      console.error('Error loading hadiths:', error);
      // setError('حدث خطأ في تحميل الأحاديث'); // Optionally set error specific to hadiths
    }
  };

  const getGenerationColor = (generation: string) => {
    switch (generation) {
      case 'صحابي':
        return 'bg-emerald-900/30 text-emerald-400';
      case 'تابعي':
        return 'bg-blue-900/30 text-blue-400';
      case 'تابع التابعين':
        return 'bg-purple-900/30 text-purple-400';
      default:
        return 'bg-gray-800/50 text-gray-300';
    }
  };

  // تعديل دالة renderDeathYears لتعمل بدون خاصية isPrimary
  const renderDeathYears = (narrator: Narrator) => {
    // أولاً، تحقق من deathYears الجديدة
    if (narrator.deathYears && narrator.deathYears.length > 0) {
      // الآن لن نبحث عن سنة وفاة أساسية، سنقوم بعرض جميع سنوات الوفاة بالتساوي
      
      const displayValue = (dy: NarratorDeathYear) => {
        if (dy.year) return `${dy.year} هـ`;
        if (dy.deathDescription) return dy.deathDescription;
        return 'غير محدد';
      };

      // إذا كانت هناك سنة وفاة واحدة فقط
      if (narrator.deathYears.length === 1) {
        const singleEntry = narrator.deathYears[0];
        return (
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar size={18} />
            <span className="font-semibold">الوفاة:</span> 
            <span>{displayValue(singleEntry)}</span>
            {singleEntry.source && (
              <span className="text-gray-500 text-xs">({singleEntry.source})</span>
            )}
          </div>
        );
      }

      // إذا كانت هناك عدة سنوات وفاة
      return (
        <div className="text-gray-300">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} />
            <span className="font-semibold">سنوات/أحوال الوفاة المحتملة:</span>
          </div>
          <div className="mr-6 space-y-1">
            {/* عرض كل سنوات الوفاة بنفس التنسيق (دون تمييز سنة أساسية) */}
            {narrator.deathYears.map((deathYear) => (
              <div key={deathYear.id} className="flex items-center gap-2 text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-500"></span>
                <span>{displayValue(deathYear)}</span>
                {deathYear.source && (
                  <span className="text-gray-500 text-xs">({deathYear.source})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // التوافق مع النظام القديم إذا كان deathYear موجودًا (قد يكون رقمًا أو نصًا)
    if (narrator.deathYear !== null && narrator.deathYear !== undefined) {
      return (
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar size={18} />
          <span className="font-semibold">الوفاة:</span> 
          <span>
            {typeof narrator.deathYear === 'number' 
              ? `${narrator.deathYear} هـ` 
              : narrator.deathYear // عرض النص كما هو
            }
          </span>
        </div>
      );
    }

    return null; // لا توجد معلومات وفاة لعرضها
  };

  // إضافة دالة لحذف الراوي
  const handleDeleteNarrator = async () => {
    if (!narratorId || !narrator) return;
    
    try {
      setDeleting(true);
      setDeleteError(null);
      
      console.log(`🗑️ محاولة حذف الراوي: ${narrator.fullName} (ID: ${narratorId})`);
      
      const result = await deleteNarrator(narratorId);
      
      console.log('📝 نتيجة عملية الحذف:', result);
      
      if (result.success) {
        console.log('✅ تمت عملية الحذف بنجاح');
        // إغلاق مربع الحوار
        setShowDeleteConfirm(false);
        // عرض رسالة نجاح مؤقتة
        alert(`تم حذف الراوي "${narrator.fullName}" بنجاح`);
        // الانتقال إلى صفحة الرواة
        router.push('/narrators?deleted=true');
      } else {
        console.log('❌ فشلت عملية الحذف:', result.message);
        setDeleteError(result.message);
        setShowDeleteConfirm(false);
      }
    } catch (error: any) {
      console.error('💥 خطأ غير متوقع أثناء الحذف:', error);
      setDeleteError(`خطأ غير متوقع: ${error.message || 'خطأ غير معروف'}`);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // مربع حوار تأكيد الحذف
  const DeleteConfirmDialog = () => {
    if (!showDeleteConfirm) return null;
    
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700 shadow-xl">
          <div className="flex items-start mb-4">
            <AlertTriangle className="text-red-500 mt-1 mr-2 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-xl font-bold text-white mb-2">تأكيد حذف الراوي</h3>
              <p className="text-gray-300 mb-3">
                هل أنت متأكد من رغبتك في حذف الراوي{' '}
                <span className="font-bold text-white">{narrator?.fullName}</span>؟
              </p>
              <div className="bg-red-900/30 border border-red-700 rounded p-3 text-sm text-red-300 mb-4">
                <p className="font-medium mb-2">⚠️ تحذير:</p>
                <ul className="text-xs space-y-1">
                  <li>• سيتم حذف الراوي نهائياً من قاعدة البيانات</li>
                  <li>• سيتم حذف جميع علاقاته مع الرواة الآخرين</li>
                  <li>• سيتم حذف معلومات سنوات الوفاة</li>
                  <li>• لا يمكن التراجع عن هذا الإجراء</li>
                </ul>
              </div>
              
              {/* عرض إحصائيات الراوي */}
              {narrator?._count && (
                <div className="bg-gray-700/50 rounded p-3 text-sm text-gray-300 mb-4">
                  <p className="font-medium mb-2">📊 إحصائيات الراوي:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>أحاديث يرويها: {narrator._count.narratedHadiths}</div>
                    <div>أحاديث في مسنده: {narrator._count.musnadHadiths}</div>
                    <div>شيوخه: {narrator._count.teachersRelation}</div>
                    <div>تلاميذه: {narrator._count.studentsRelation}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleDeleteNarrator}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  تأكيد الحذف
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <p className="mt-4 text-gray-400">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (error || !narrator) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <User className="mx-auto text-gray-500 mb-4" size={64} />
          <p className="text-gray-400 text-xl mb-4">
            {error || 'لم يتم العثور على الراوي'}
          </p>
          <Link
            href="/narrators"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ChevronLeft size={20} />
            العودة لقائمة الرواة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4">
        {/* مربع حوار تأكيد الحذف */}
        <DeleteConfirmDialog />
      
        {/* رسالة خطأ الحذف */}
        {deleteError && (
          <div className="bg-red-900/60 border border-red-700 text-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertTriangle size={20} />
            <span>{deleteError}</span>
          </div>
        )}
        
        {/* زر العودة */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/narrators"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ChevronLeft size={20} />
            العودة لقائمة الرواة
          </Link>
          
          {/* زر حذف الراوي - إضافة جديدة */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg border border-red-600/30 transition-all"
            aria-label="حذف الراوي"
            title="حذف الراوي"
          >
            <Trash2 size={18} />
            حذف الراوي
          </button>
        </div>

        {/* الخانة العليا - معلومات الراوي الأساسية */}
        <div className="bg-gray-800 rounded-lg shadow-md p-8 mb-8 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">
                {narrator.fullName}
              </h1>
              
              {/* إضافة زر المسند هنا مباشرة تحت اسم الراوي */}
              {narrator._count && narrator._count.musnadHadiths > 0 && (
                <Link
                  href={`/musnad/${narrator.id}`}
                  className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Scroll size={16} />
                  عرض المسند ({narrator._count.musnadHadiths} حديث)
                </Link>
              )}
              
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

            {/* تعديل الإحصائيات - إضافة التحقق من وجود narrator._count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-400">
                  {(narrator._count && narrator._count.narratedHadiths) || 0}
                </div>
                <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                  <Book size={16} />
                  حديث يرويه
                </div>
              </div>
              
              {/* عرض مربع المسند فقط إذا كان له أحاديث في المسند */}
              {narrator._count && narrator._count.musnadHadiths > 0 && (
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {narrator._count.musnadHadiths}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <Scroll size={16} />
                    في مسنده
                  </div>
                </div>
              )}
              
              {/* إذا لم يكن للراوي مسند، سنعرض شيء آخر في المكان الثاني */}
              {(!narrator._count || !narrator._count.musnadHadiths) && (
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {narrator.generation === 'صحابي' ? 'صحابي' : (narrator.generation || '-')}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <User size={16} />
                    الطبقة
                  </div>
                </div>
              )}
              
              <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">
                  {(narrator._count && narrator._count.teachersRelation) || 0}
                </div>
                <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                  <Users size={16} />
                  شيخ
                </div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-400">
                  {(narrator._count && narrator._count.studentsRelation) || 0}
                </div>
                <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                  <Users size={16} />
                  تلميذ
                </div>
              </div>
            </div>
          </div>

          {/* نبذة عن الراوي إذا وجدت */}
          {narrator.biography && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="font-semibold text-lg mb-2 text-white">نبذة عن الراوي</h3>
              <p className="text-gray-300 leading-relaxed">{narrator.biography}</p>
            </div>
          )}
          
          {/* قسم الشيوخ والتلاميذ - منقول إلى الخانة العليا */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="grid md:grid-cols-2 gap-8">
              {/* الشيوخ */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <Users className="text-purple-400" size={24} />
                  الشيوخ الذين روى عنهم
                </h3>
                {teachers.length === 0 ? (
                  <p className="text-gray-400">لا يوجد شيوخ مسجلون</p>
                ) : (
                  <div className="space-y-3">
                    {teachers.map((teacher) => (
                      <Link
                        key={teacher.id}
                        href={`/narrators/${teacher.id}`}
                        className="flex items-center justify-between p-3 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <span className="font-medium text-white">{teacher.name}</span>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          {teacher.relation_count}
                          <LinkIcon size={14} />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* التلاميذ */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <Users className="text-orange-400" size={24} />
                  التلاميذ الذين رووا عنه
                </h3>
                {students.length === 0 ? (
                  <p className="text-gray-400">لا يوجد تلاميذ مسجلون</p>
                ) : (
                  <div className="space-y-3">
                    {students.map((student) => (
                      <Link
                        key={student.id}
                        href={`/narrators/${student.id}`}
                        className="flex items-center justify-between p-3 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <span className="font-medium text-white">{student.name}</span>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          {student.relation_count}
                          <LinkIcon size={14} />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* الخانة السفلية - الأحاديث فقط */}
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <Book className="text-emerald-400" size={24} />
              الأحاديث التي رواها
            </h2>
            
            {hadiths.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                لا توجد أحاديث مسجلة لهذا الراوي
              </p>
            ) : (
              <>
                <div className="space-y-6">
                  {hadiths.map((hadith) => (
                    <Link
                      key={hadith.id}
                      href={`/hadiths/${hadith.id}`}
                      className="block border border-gray-700 rounded-lg p-6 hover:bg-gray-700 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
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
                        <ExternalLink 
                          size={18} 
                          className="text-gray-500 group-hover:text-blue-400 transition-colors"
                        />
                      </div>
                      
                      {hadith.chapter?.name && (
                        <p className="text-sm text-gray-400 mb-3">
                          <span className="font-semibold">الباب:</span> {hadith.chapter.name}
                        </p>
                      )}
                      
                      <p className="text-gray-300 leading-relaxed line-clamp-3 group-hover:text-white">
                        {hadith.matn}
                      </p>
                      
                      <p className="text-sm text-blue-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        اضغط لعرض تفاصيل الحديث الكامل ←
                      </p>
                    </Link>
                  ))}
                </div>

                {/* ترقيم الصفحات */}
                {totalHadithsPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setHadithsPage(Math.max(1, hadithsPage - 1))}
                      disabled={hadithsPage === 1}
                      className="px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <span className="px-4 py-2 text-gray-300">
                      صفحة {hadithsPage} من {totalHadithsPages}
                    </span>
                    <button
                      onClick={() => setHadithsPage(Math.min(totalHadithsPages, hadithsPage + 1))}
                      disabled={hadithsPage === totalHadithsPages}
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