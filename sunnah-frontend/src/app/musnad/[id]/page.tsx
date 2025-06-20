'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
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
  type Narrator,
  type Hadith,
  type PaginationInfo
} from '@/lib/api';

import { saveAs } from 'file-saver';

// دالة محسنة لجلب أحاديث المسند مع معالجة أفضل للأخطاء
async function fetchNarratorMusnad(narratorId: string, page: number = 1, limit: number = 10) {
  try {
    // التأكد من صحة المعرف قبل الإرسال
    if (!narratorId || !isValidUUID(narratorId)) {
      throw new Error('معرف الراوي غير صالح');
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE_URL}/narrators/${narratorId}/musnad?page=${page}&limit=${limit}`;
    
    console.log('🔗 جاري طلب المسند من:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store', 
    });

    console.log('📡 حالة الاستجابة:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        console.error('Server error response data:', errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.warn('لا يمكن قراءة رسالة الخطأ من الخادم:', e);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ تم جلب بيانات المسند بنجاح:', data);
    return data;
  } catch (error: any) {
    console.error('❌ خطأ في جلب أحاديث المسند:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('فشل الاتصال بالخادم. تأكد من تشغيل الخادم المحلي');
    } else if (error.message.includes('404')) {
      throw error; 
    } else if (error.message.includes('500')) {
      throw new Error('خطأ داخلي في الخادم عند جلب المسند');
    }
    throw error; 
  }
}


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
  const [activeTab, setActiveTab] = useState<'marfoo' | 'mawquf' | 'maqtu'>('marfoo');

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
          setError('الراوي غير موجود'); 
        } else if (err.message?.includes('معرف الراوي غير صالح')) {
          setError('معرف الراوي غير صالح');
        } else {
          setError(err.message || 'حدث خطأ أثناء تحميل معلومات الراوي');
        }
        setLoading(false);
        return; 
      }

      // جلب الأحاديث المرفوعة (المسندة) عند تحميل الصفحة أو تغيير الصفحة
      // لاحقًا، يمكن تعديل هذا لجلب بيانات مختلفة بناءً على activeTab إذا لزم الأمر
      if (narratorData) {
        try {
          console.log('📚 جلب أحاديث المسند للصفحة:', currentPage);
          // السطر 91 هنا، حيث يتم استدعاء fetchNarratorMusnad
          const musnadResponse = await fetchNarratorMusnad(id, currentPage, 10); 
          console.log('📊 استجابة المسند:', musnadResponse);
          
          if (musnadResponse && musnadResponse.hadiths) {
            setHadiths(musnadResponse.hadiths);
            setPagination(musnadResponse.pagination);
            if (musnadResponse.hadiths.length === 0 && musnadResponse.pagination.total === 0) {
              console.log('ℹ️ الراوي موجود ولكن لا توجد أحاديث في مسنده');
            }
          } else {
            console.log('⚠️ لا توجد أحاديث في الاستجابة للمسند');
            setHadiths([]);
            setPagination(prev => ({ ...prev, total: 0, pages: 1, page: currentPage }));
          }
        } catch (err: any) {
          console.error('❌ خطأ في جلب أحاديث المسند (useEffect):', err); 
          if (err.response) { 
            console.error('Server response for musnad error:', {
              status: err.response.status,
              data: err.response.data,
              headers: err.response.headers,
            });
          }

          if (err.message?.includes('404') || err.response?.status === 404) {
            if (err.response?.data?.error === 'الراوي غير موجود') {
              setError('الخادم أفاد بأن الراوي المحدد للمسند غير موجود.'); 
            } else {
              setError(`لا يمكن تحميل مسند الراوي (خطأ 404). قد يكون المسند فارغًا أو حدث خطأ آخر في الخادم.`);
            }
          } else if (err.message?.includes('Network Error') || err.message?.includes('فشل الاتصال بالخادم')) {
            setError('خطأ في الشبكة أو فشل الاتصال بالخادم. يرجى التحقق من اتصالك وتشغيل الخادم.');
          } else {
            setError(err.message || 'حدث خطأ غير معروف أثناء تحميل أحاديث المسند');
          }
        }
      }
      setLoading(false);
    };
    
    fetchData();
  }, [id, searchParams]); // لا يتم الاعتماد على activeTab هنا لجلب البيانات


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
      if (activeTab === 'marfoo') {
        activeTabContentElement = document.getElementById('marfoo-content');
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
            background-color: #fff !important; /* خلفية بيضاء للطباعة */
            color: #000 !important; /* نص أسود للطباعة */
            font-family: 'Arial', sans-serif; /* خط مناسب للطباعة */
          }
          .no-print {
            display: none !important;
          }
          /* إخفاء الرابط الخارجي في كل حديث عند الطباعة */
          .external-link-icon-no-export {
            display: none !important;
          }
          /* التأكد من أن خلفيات العناصر بيضاء والنصوص سوداء */
          #narrator-info-exportable, #narrator-info-exportable *,
          #marfoo-content, #marfoo-content *,
          #mawquf-content, #mawquf-content *,
          #maqtu-content, #maqtu-content * {
            background-color: #fff !important;
            color: #000 !important;
            border-color: #ccc !important; /* تخفيف لون الحدود */
          }
          #narrator-info-exportable a, 
          #marfoo-content a,
          #mawquf-content a,
          #maqtu-content a {
            color: #000 !important; /* لون الروابط أسود */
            text-decoration: none !important; /* إزالة تسطير الروابط */
          }
          #narrator-info-exportable a[href]:after,
          #marfoo-content a[href]:after,
          #mawquf-content a[href]:after,
          #maqtu-content a[href]:after {
            content: "" !important; /* عدم عرض URL بجانب الروابط */
          }
          .hadith-card-exportable { /* تنسيق كارت الحديث للطباعة */
            page-break-inside: avoid;
            border: 1px solid #ddd !important;
            margin-bottom: 1rem;
            padding: 1rem;
          }
          /* إخفاء أزرار التبويبات عند الطباعة */
          .tabs-buttons-container {
              display: none !important;
          }
          /* إظهار محتوى التبويب النشط فقط */
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
          
          {/* Narrator Info Box - Add ID here */}
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

                {/* إضافة no-print هنا لإخفاء جيل الراوي عند الطباعة */}
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getGenerationColor(narrator?.generation)} no-print`}>
                  {narrator?.generation}
                </span>
              </div>

              {/* إضافة no-print هنا لإخفاء خانات الإحصائيات عند الطباعة */}
              <div className="grid grid-cols-2 gap-4 no-print">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400">
                    {narrator?._count?.narratedHadiths || 0}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <Book size={16} />
                    حديث يرويه
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {pagination.total}
                  </div>
                  <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                    <Scroll size={16} />
                    في مسنده (مرفوع)
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs Section */}
          <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
            <div className="p-6">
              {/* Tab Buttons - Add no-print class to container */}
              <div className="mb-6 flex border-b border-gray-700 tabs-buttons-container no-print">
                <button 
                  onClick={() => setActiveTab('marfoo')} 
                  className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'marfoo' ? 'border-b-2 border-blue-400 text-blue-300' : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'}`}
                >
                  الأحاديث المرفوعة
                </button>
                <button 
                  onClick={() => setActiveTab('mawquf')} 
                  className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'mawquf' ? 'border-b-2 border-blue-400 text-blue-300' : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'}`}
                >
                  الموقوفات
                </button>
                <button 
                  onClick={() => setActiveTab('maqtu')} 
                  className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'maqtu' ? 'border-b-2 border-blue-400 text-blue-300' : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'}`}
                >
                  المقطوعات
                </button>
              </div>

              {/* Tab Content */}
              <div>
                {/* Marfoo Tab Content - Add ID and class */}
                <div id="marfoo-content" className={`tab-content-panel ${activeTab === 'marfoo' ? 'active' : ''}`}>
                  {activeTab === 'marfoo' && (
                    <>
                      {hadiths.length === 0 && !loading ? ( 
                        <div className="text-center py-12">
                          <BookOpen className="mx-auto text-gray-600 mb-4" size={48} />
                          <p className="text-lg text-gray-400">لا توجد أحاديث مرفوعة مسجلة لهذا الراوي</p>
                          <p className="text-sm text-gray-500 mt-2">قد يكون الراوي غير صحابي، أو لم يتم تسجيل أحاديثه بعد</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-8">
                                {hadiths.map((hadith, index) => (
                                  <div 
                                    key={hadith.id} 
                                    className="border border-gray-700 rounded-lg p-6 hover:bg-gray-700/30 transition-all hadith-card-exportable"
                                  >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                      <div className="flex items-center gap-3 text-sm text-gray-400">
                                        {/* يمكن ترك هذا فارغًا أو إضافة معلومات أخرى إذا لزم الأمر */}
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

                          {/* Pagination - Add no-print class */}
                          {pagination.pages > 1 && (
                            <div className="flex justify-center gap-2 mt-8 no-print">
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
                    </>
                  )}
                </div>
                {/* Mawquf Tab Content - Add ID and class */}
                <div id="mawquf-content" className={`tab-content-panel ${activeTab === 'mawquf' ? 'active' : ''}`}>
                  {activeTab === 'mawquf' && (
                    <div>
                      <div className="text-center py-12">
                        <BookOpen className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-lg text-gray-400">سيتم عرض الأحاديث الموقوفة على هذا الراوي هنا قريباً.</p>
                        <p className="text-sm text-gray-500 mt-2">يتطلب هذا النوع من الأحاديث بيانات إضافية.</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Maqtu Tab Content - Add ID and class */}
                <div id="maqtu-content" className={`tab-content-panel ${activeTab === 'maqtu' ? 'active' : ''}`}>
                  {activeTab === 'maqtu' && (
                    <div>
                       <div className="text-center py-12">
                        <BookOpen className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-lg text-gray-400">سيتم عرض الآثار المقطوعة هنا قريباً.</p>
                        <p className="text-sm text-gray-500 mt-2">يتطلب هذا النوع من الآثار بيانات إضافية.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}