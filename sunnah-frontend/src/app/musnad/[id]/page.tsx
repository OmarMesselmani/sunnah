'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  User, 
  Book, 
  BookOpen, 
  ExternalLink, 
  Hash, 
  Scroll,
  AlertTriangle,
  Loader2,
  Printer,
  FileText
} from 'lucide-react';
import { 
  getNarratorById, 
  isValidUUID,
  fetchNarratorMusnad,
  fetchNarratorMawquf,
  fetchNarratorMaqtu,
  fetchNarratorHadithStats,
  type Narrator,
  type Hadith,
  type PaginationInfo
} from '@/lib/api';

import { saveAs } from 'file-saver';

// إضافة interface للإحصائيات
interface HadithStats {
  marfu: number;
  mawquf: number;
  maqtu: number;
  total: number;
}

export default function NarratorMusnadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [narrator, setNarrator] = useState<Narrator | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [hadithStats, setHadithStats] = useState<HadithStats>({
    marfu: 0,
    mawquf: 0,
    maqtu: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [activeTab, setActiveTab] = useState<'marfu' | 'mawquf' | 'maqtu'>('marfu');

  // دالة لجلب البيانات حسب النوع
  const fetchHadithsByType = async (type: 'marfu' | 'mawquf' | 'maqtu', page: number = 1) => {
    setLoadingTab(true);
    setError('');
    
    try {
      let response;
      switch (type) {
        case 'marfu':
          response = await fetchNarratorMusnad(id, page, 10);
          break;
        case 'mawquf':
          response = await fetchNarratorMawquf(id, page, 10);
          break;
        case 'maqtu':
          response = await fetchNarratorMaqtu(id, page, 10);
          break;
        default:
          throw new Error('نوع الحديث غير صالح');
      }

      if (response && response.hadiths) {
        setHadiths(response.hadiths);
        setPagination(response.pagination);
      } else {
        setHadiths([]);
        setPagination(prev => ({ ...prev, total: 0, pages: 1, page }));
      }
    } catch (err: any) {
      console.error(`❌ خطأ في جلب ${type}:`, err);
      setError(err.message || `حدث خطأ أثناء تحميل ${type}`);
      setHadiths([]);
    } finally {
      setLoadingTab(false);
    }
  };

  // تحديث URL عند تغيير التبويب
  const handleTabChange = (newTab: 'marfu' | 'mawquf' | 'maqtu') => {
    setActiveTab(newTab);
    // تحديث URL بدون إعادة تحميل الصفحة
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', newTab);
    newUrl.searchParams.delete('page'); // إعادة تعيين الصفحة عند تغيير التبويب
    router.replace(newUrl.toString());
    
    // جلب البيانات للتبويب الجديد
    fetchHadithsByType(newTab, 1);
  };

  // تحديث URL عند تغيير الصفحة
  const handlePageChange = (newPage: number) => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('page', newPage.toString());
    router.replace(newUrl.toString());
    
    fetchHadithsByType(activeTab, newPage);
  };

  useEffect(() => {
    const currentTab = (searchParams.get('tab') as 'marfu' | 'mawquf' | 'maqtu') || 'marfu';
    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    const fetchInitialData = async () => {
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
          setError('الراوي غير موجود'); 
        } else if (err.message?.includes('معرف الراوي غير صالح')) {
          setError('معرف الراوي غير صالح');
        } else {
          setError(err.message || 'حدث خطأ أثناء تحميل معلومات الراوي');
        }
        setLoading(false);
        return; 
      }

      // جلب إحصائيات الأحاديث
      if (narratorData) {
        try {
          console.log('📊 جلب إحصائيات الأحاديث');
          const stats = await fetchNarratorHadithStats(id);
          setHadithStats(stats);
          console.log('✅ تم جلب الإحصائيات:', stats);
        } catch (err: any) {
          console.error('❌ خطأ في جلب الإحصائيات:', err);
          // لا نوقف العملية إذا فشلت الإحصائيات
        }

        // تعيين التبويب النشط
        setActiveTab(currentTab);
        
        // جلب بيانات التبويب النشط
        await fetchHadithsByType(currentTab, currentPage);
      }
      
      setLoading(false);
    };
    
    fetchInitialData();
  }, [id]); // فقط عند تغيير ID

  // Helper function to get generation color
  const getGenerationColor = (generation: string | undefined) => {
    if (!generation) return 'bg-gray-600 text-gray-100';
    if (generation.includes('صحابي')) return 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30';
    if (generation.includes('تابعي')) return 'bg-sky-500/20 text-sky-300 border border-sky-400/30';
    if (generation.includes('تبع تابعي')) return 'bg-teal-500/20 text-teal-300 border border-teal-400/30';
    return 'bg-purple-500/20 text-purple-300 border border-purple-400/30';
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportWord = async () => {
    if (!narrator) return;

    console.log('🔄 بدء عملية تصدير Word...');

    // اختبار مسار API أولاً
    try {
      console.log('🧪 اختبار مسار API...');
      const testResponse = await fetch('/api/export-docx', { method: 'GET' });
      const testData = await testResponse.text();
      console.log('📋 اختبار API:', { status: testResponse.status, data: testData });
    } catch (testError) {
      console.error('❌ فشل اختبار API:', testError);
      alert('فشل في الوصول إلى مسار API. تأكد من تشغيل الخادم بشكل صحيح.');
      return;
    }

    const narratorInfoElement = document.getElementById('narrator-info-exportable');
    let activeTabContentElement;
    if (activeTab === 'marfu') {
      activeTabContentElement = document.getElementById('marfu-content');
    } else if (activeTab === 'mawquf') {
      activeTabContentElement = document.getElementById('mawquf-content');
    } else {
      activeTabContentElement = document.getElementById('maqtu-content');
    }

    if (!narratorInfoElement || !activeTabContentElement) {
      console.error("❌ لم يتم العثور على العناصر للتصدير");
      alert("حدث خطأ أثناء محاولة تصدير الملف. لم يتم العثور على المحتوى.");
      return;
    }

    const narratorInfoHtml = narratorInfoElement.innerHTML;
    const activeTabHtml = activeTabContentElement.innerHTML;
    
    const cleanHtml = (html: string) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.querySelectorAll('.external-link-icon-no-export, .no-print').forEach(el => el.remove());
      return tempDiv.innerHTML;
    };

    const combinedHtml = `
      <div style="direction: rtl; font-family: Arial, sans-serif;">
        ${cleanHtml(narratorInfoHtml)}
        <hr style="margin: 20px 0;" />
        ${cleanHtml(activeTabHtml)}
      </div>
    `;
    
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; direction: rtl; margin: 20px; }
          h1, h2, h3, h4, h5, h6 { color: #333; }
          p { line-height: 1.6; color: #555; }
          .hadith-card-exportable { border: 1px solid #e0e0e0; margin-bottom: 15px; padding: 15px; border-radius: 4px; page-break-inside: avoid; }
          .hadith-meta-exportable { font-size: 0.9em; color: #777; margin-bottom: 10px; }
          .hadith-matn-exportable { margin-bottom: 10px; }
          .hadith-sanad-exportable { font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        ${combinedHtml}
      </body>
      </html>
    `;

    const fileName = `مسند_${narrator.fullName.replace(/\s+/g, '_')}_${activeTab}`;
    
    console.log('📤 إرسال طلب إلى API...', {
      fileName,
      htmlLength: fullHtml.length,
      url: '/api/export-docx'
    });

    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          htmlContent: fullHtml, 
          fileName: fileName
        }),
      });

      console.log('📡 استجابة الخادم:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ رد الخادم:', errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorText;
        } catch {
          errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log('✅ تم استلام الملف بنجاح، الحجم:', blob.size, 'بايت');
      
      saveAs(blob, `${fileName}.docx`);
      console.log('💾 تم حفظ الملف بنجاح');

    } catch (e: any) {
      console.error("❌ خطأ في تصدير Word:", e);
      alert(`حدث خطأ أثناء تصدير الملف إلى Word: ${e.message}`);
    }
  };

  // دالة لعرض الأحاديث
  const renderHadiths = () => {
    if (loadingTab) {
      return (
        <div className="text-center py-12">
          <Loader2 className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-4" />
          <p className="text-gray-400">جارٍ تحميل الأحاديث...</p>
        </div>
      );
    }

    if (hadiths.length === 0) {
      const tabLabels = {
        marfu: 'مرفوعة',
        mawquf: 'موقوفة', 
        maqtu: 'مقطوعة'
      };

      return (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-lg text-gray-400">لا توجد أحاديث {tabLabels[activeTab]} مسجلة لهذا الراوي</p>
          <p className="text-sm text-gray-500 mt-2">
            {activeTab === 'marfu' && 'قد يكون الراوي غير صحابي، أو لم يتم تسجيل أحاديثه بعد'}
            {activeTab === 'mawquf' && 'لم يتم تسجيل أقوال موقوفة على هذا الراوي بعد'}
            {activeTab === 'maqtu' && 'لم يتم تسجيل آثار مقطوعة عن هذا الراوي بعد'}
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-8">
          {hadiths.map((hadith, index) => (
            <div 
              key={hadith.id} 
              className="border border-gray-700 rounded-lg p-6 hover:bg-gray-700/30 transition-all hadith-card-exportable"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  {/* يمكن إضافة معلومات إضافية هنا */}
                </div>
              </div>
              
              {hadith.chapter?.name && (
                <p className="text-sm text-gray-400 mb-3 hadith-meta-exportable">
                  <span className="font-semibold">الباب:</span> {hadith.chapter.name}
                </p>
              )}
              
              {/* إضافة الترقيم هنا أمام متن الحديث */}
              <div className="text-gray-200 leading-relaxed mb-6 rtl border-r-4 border-gray-700 pr-4 py-2 hadith-matn-exportable">
                <span className="font-bold text-blue-400 ml-2 text-lg">
                  {index + 1})
                </span>
                {hadith.matn}
              </div>
              
              {/* معلومات المصدر تحت المتن وفوق السند */}
              <div className="mb-4 hadith-meta-exportable">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="font-semibold text-blue-400">
                    {hadith.source.name}
                  </span>
                  <span className="flex items-center gap-1">
                    ({hadith.hadithNumber})
                  </span>
                  {hadith.book?.name && (
                    <span>{hadith.book.name}</span>
                  )}
                </div>
              </div>
              
              <div className="mt-4 hadith-sanad-exportable">
                <p className="text-gray-400 text-sm">{hadith.chain || hadith.sanad}</p>
              </div>
              
              {hadith.grade && (
                <div className="mt-3 text-sm hadith-meta-exportable">
                  <span className="font-semibold text-gray-300">الدرجة: </span>
                  <span className={hadith.grade.includes('صحيح') ? 'text-green-400' : hadith.grade.includes('ضعيف') ? 'text-red-400' : 'text-yellow-400'}>
                    {hadith.grade}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8 no-print">
            <button
              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className={`px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              السابق
            </button>
            <span className="px-4 py-2 text-gray-300">
              صفحة {pagination.page} من {pagination.pages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(pagination.pages, pagination.page + 1))}
              disabled={pagination.page === pagination.pages}
              className={`px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 ${pagination.page === pagination.pages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              التالي
            </button>
          </div>
        )}
      </>
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
    <>
      {/* Global styles for printing */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background-color: #fff !important;
            color: #000 !important;
            font-family: 'Arial', sans-serif;
          }
          .no-print {
            display: none !important;
          }
          .external-link-icon-no-export {
            display: none !important;
          }
          #narrator-info-exportable, #narrator-info-exportable *,
          #marfu-content, #marfu-content *,
          #mawquf-content, #mawquf-content *,
          #maqtu-content, #maqtu-content * {
            background-color: #fff !important;
            color: #000 !important;
            border-color: #ccc !important;
          }
          #narrator-info-exportable a, 
          #marfu-content a,
          #mawquf-content a,
          #maqtu-content a {
            color: #000 !important;
            text-decoration: none !important;
          }
          #narrator-info-exportable a[href]:after,
          #marfu-content a[href]:after,
          #mawquf-content a[href]:after,
          #maqtu-content a[href]:after {
            content: "" !important;
          }
          .hadith-card-exportable {
            page-break-inside: avoid;
            border: 1px solid #ddd !important;
            margin-bottom: 1rem;
            padding: 1rem;
          }
          .tabs-buttons-container {
              display: none !important;
          }
          .tab-content-panel:not(.active) {
              display: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <Link
              href={`/narrators/${narrator?.id}`}
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 no-print"
            >
              <ChevronLeft size={20} />
              العودة لصفحة الراوي
            </Link>
            {/* أزرار الطباعة والتصدير */}
            {narrator && !loading && !error && (
              <div className="flex gap-3 no-print">
                <button
                  onClick={handlePrintPdf}
                  title="طباعة الصفحة (PDF)"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm"
                >
                  <Printer size={18} />
                  طباعة (PDF)
                </button>
                <button
                  onClick={handleExportWord}
                  title="تصدير المحتوى (Word)"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm"
                >
                  <FileText size={18} />
                  تصدير (Word)
                </button>
              </div>
            )}
          </div>
          
          {/* Narrator Info Box */}
          <div id="narrator-info-exportable" className="bg-gray-800 rounded-lg shadow-md p-8 mb-8 border border-gray-700">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-3">
                  مسند {narrator?.fullName}
                </h1>
                
                <div className="space-y-2 mb-4">
                  {narrator?.biography && (
                    <div className="text-gray-300">
                      <span className="font-semibold">الترجمة:</span>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{narrator.biography}</p>
                    </div>
                  )}
                  {narrator?.laqab && (
                    <p className="text-gray-300">
                      <span className="font-semibold">اللقب:</span> {narrator.laqab}
                    </p>
                  )}
                </div>

                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getGenerationColor(narrator?.generation)} no-print`}>
                  {narrator?.generation}
                </span>
              </div>

              {/* إحصائيات محدثة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400">
                    {hadithStats.marfu}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <Scroll size={16} />
                    مرفوع
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {hadithStats.mawquf}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <Book size={16} />
                    موقوف
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">
                    {hadithStats.maqtu}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <BookOpen size={16} />
                    مقطوع
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {hadithStats.total}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <Hash size={16} />
                    الإجمالي
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs Section */}
          <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
            <div className="p-6">
              {/* Tab Buttons */}
              <div className="mb-6 flex border-b border-gray-700 tabs-buttons-container no-print">
                <button 
                  onClick={() => handleTabChange('marfu')} 
                  className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'marfu' ? 'border-b-2 border-blue-400 text-blue-300' : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'}`}
                >
                  الأحاديث المرفوعة
                  {hadithStats.marfu > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {hadithStats.marfu}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => handleTabChange('mawquf')} 
                  className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'mawquf' ? 'border-b-2 border-blue-400 text-blue-300' : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'}`}
                >
                  الموقوفات
                  {hadithStats.mawquf > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {hadithStats.mawquf}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => handleTabChange('maqtu')} 
                  className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'maqtu' ? 'border-b-2 border-blue-400 text-blue-300' : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'}`}
                >
                  المقطوعات
                  {hadithStats.maqtu > 0 && (
                    <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {hadithStats.maqtu}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div>
                {/* Content for all tabs */}
                <div id={`${activeTab}-content`} className={`tab-content-panel active`}>
                  {renderHadiths()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}