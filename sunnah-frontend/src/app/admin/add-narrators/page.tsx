'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Plus, X, Loader2, Calendar, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

// تعديل واجهة NarratorFormData لتتضمن اللقب والأسماء البديلة
interface NarratorFormData {
  fullName: string;
  kunyas: string;
  laqab: string;             // إضافة حقل اللقب
  alternativeNames: string;  // إضافة حقل الأسماء البديلة
  deathYears: DeathYearEntry[];
  generation: string;
  translation: string;
}

interface DeathYearEntry {
  id: string;
  year: string;
  description: string;
}

export default function AddNarratorsPage() {
  const router = useRouter();
  
  // تحديث بيانات الراوي لتشمل الحقول الجديدة
  const [formData, setFormData] = useState<NarratorFormData>({
    fullName: '',
    kunyas: '',
    laqab: '',             // إضافة حقل اللقب
    alternativeNames: '',  // إضافة حقل الأسماء البديلة
    deathYears: [{ id: Date.now().toString(), year: '', description: '' }] as DeathYearEntry[],
    generation: '',
    translation: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  
  // قائمة الطبقات
  const generations = [
    { value: '', label: 'اختر الطبقة' },
    { value: 'الطبقة الأولى', label: 'الأولى' },
    { value: 'الطبقة الثانية', label: 'الثانية' },
    { value: 'الطبقة الثالثة', label: 'الثالثة' },
    { value: 'الطبقة الرابعة', label: 'الرابعة' },
    { value: 'الطبقة الخامسة', label: 'الخامسة' },
    { value: 'الطبقة السادسة', label: 'السادسة' },
    { value: 'الطبقة السابعة', label: 'السابعة' },
    { value: 'الطبقة الثامنة', label: 'الثامنة' },
    { value: 'الطبقة التاسعة', label: 'التاسعة' },
    { value: 'الطبقة العاشرة', label: 'العاشرة' },
    { value: 'الطبقة الحادية عشرة', label: 'الحادية عشرة' },
    { value: 'الطبقة الثانية عشرة', label: 'الثانية عشرة' },
  ];

  // إعادة تعيين رسائل النجاح والخطأ
  const resetMessages = () => {
    setSubmitSuccess(false);
    setSubmitError('');
  };

  // التعامل مع تغيير قيم النموذج
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    index?: number,
    field?: keyof DeathYearEntry
  ) => {
    const { name, value, type } = e.target;

    if (name.startsWith('deathYear[')) { // مثال قديم، سنغيره
      // ...
    } else if (field && index !== undefined && (field === 'year' || field === 'description')) {
      setFormData(prev => ({
        ...prev,
        deathYears: prev.deathYears.map((dy, i) => 
          i === index ? { ...dy, [field]: value } : dy
        )
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // إضافة سنة وفاة محتملة جديدة
  const addDeathYear = () => {
    setFormData(prev => ({
      ...prev,
      deathYears: [
        ...prev.deathYears, 
        { 
          id: Date.now().toString(), 
          year: '', 
          description: '' 
        }
      ]
    }));
  };

  // حذف سنة وفاة محتملة
  const removeDeathYear = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      deathYears: prev.deathYears.filter((_, index) => index !== indexToRemove)
    }));
  };

  // إضافة راوٍ جديد
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    
    if (!formData.fullName.trim() || !formData.generation) {
      setSubmitError('يرجى ملء جميع الحقول المطلوبة (الاسم الكامل والطبقة)');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const narratorData = {
        fullName: formData.fullName.trim(),
        kunyas: formData.kunyas.trim() || null,
        laqab: formData.laqab.trim() || null,             // إضافة حقل اللقب
        alternativeNames: formData.alternativeNames.trim() || null,  // إضافة حقل الأسماء البديلة
        deathYears: formData.deathYears.map(dy => ({
          year: dy.year.trim(),
          description: dy.description.trim()
        })).filter(dy => dy.year || dy.description),
        generation: formData.generation,
        translation: formData.translation.trim() || null,
      };
      
      console.log('🚀 إرسال بيانات الراوي:', narratorData);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // إرسال البيانات إلى API
      const response = await axios.post(`${API_URL}/api/narrators`, narratorData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 ثوانٍ
      });
      
      console.log('✅ استجابة الخادم:', response.data);
      
      if (response.status === 201 || response.status === 200) {
        // نجاح العملية
        setSubmitSuccess(true);
        
        // إعادة تعيين النموذج
        setFormData({
          fullName: '',
          kunyas: '',
          laqab: '',             // إعادة تعيين حقل اللقب
          alternativeNames: '',  // إعادة تعيين حقل الأسماء البديلة
          deathYears: [{ id: Date.now().toString(), year: '', description: '' }] as DeathYearEntry[],
          generation: '',
          translation: '',
        });
        
        console.log(`✅ تم إضافة الراوي "${narratorData.fullName}" بنجاح`);
        
        // إخفاء رسالة النجاح والانتقال لصفحة الرواة بعد 2 ثانية
        setTimeout(() => {
          router.push('/narrators');
        }, 2000);
        
      } else {
        throw new Error(`حدث خطأ: ${response.statusText}`);
      }
      
    } catch (error: any) {
      console.error('❌ خطأ في إضافة الراوي:', error);
      
      // عرض رسالة خطأ أكثر تفصيلاً
      if (error.response) {
        // الخادم استجاب برمز حالة خارج نطاق 2xx
        const errorMessage = error.response.data?.error || error.response.data?.message || 'خطأ من الخادم';
        setSubmitError(`خطأ (${error.response.status}): ${errorMessage}`);
        console.error('🔴 استجابة الخطأ:', error.response.data);
      } else if (error.request) {
        // الطلب تم إنشاؤه لكن لم يتم تلقي استجابة
        setSubmitError('لم نتمكن من الاتصال بالخادم. تأكد من تشغيل الخادم وأنه متاح على المنفذ 5000.');
      } else if (error.code === 'ECONNABORTED') {
        setSubmitError('انتهت مهلة الاتصال. تأكد من سرعة الإنترنت.');
      } else {
        // حدث خطأ آخر
        setSubmitError(`حدث خطأ غير متوقع: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* رأس الصفحة */}
        <div className="mb-8">
          <Link
            href="/narrators"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
          >
            <ChevronLeft size={20} />
            العودة لقائمة الرواة
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold text-white">إضافة راوٍ جديد</h1>
            <p className="text-gray-300 mt-2">
              أضف راوٍ جديد إلى قاعدة البيانات
            </p>
          </div>
        </div>

        {/* نموذج الإضافة */}
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* رسائل النجاح والخطأ */}
              {submitSuccess && (
                <div className="bg-emerald-900/30 text-emerald-400 p-4 rounded-lg mb-6 flex items-center">
                  <Check className="mr-2" size={20} />
                  تم إضافة الراوي بنجاح! جارٍ التوجيه لصفحة الرواة...
                </div>
              )}
              
              {submitError && (
                <div className="bg-red-900/30 text-red-400 p-4 rounded-lg mb-6 flex items-start">
                  <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <div className="font-medium">حدث خطأ:</div>
                    <div className="text-sm mt-1">{submitError}</div>
                  </div>
                </div>
              )}

              {/* البيانات الأساسية */}
              <div className="space-y-4">
                {/* اسم الراوي */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    الاسم الكامل للراوي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="مثال: عبدالله بن عمر بن الخطاب"
                    dir="rtl"
                  />
                </div>
                
                {/* خانة الترجمة */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    الترجمة
                  </label>
                  <textarea
                    name="translation"
                    value={formData.translation}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="أدخل ترجمة مختصرة للراوي..."
                    dir="rtl"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                      الكنى
                    </label>
                    <input
                      type="text"
                      name="kunyas"
                      value={formData.kunyas}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: أبو عبدالرحمن"
                      dir="rtl"
                    />
                  </div>
                  
                  {/* إضافة حقل اللقب هنا */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                      اللقب
                    </label>
                    <input
                      type="text"
                      name="laqab"
                      value={formData.laqab}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="مثال: الزهري، الحافظ"
                      dir="rtl"
                    />
                  </div>
                </div>
                
                {/* إضافة حقل الأسماء البديلة */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    الأسماء البديلة
                  </label>
                  <input
                    type="text"
                    name="alternativeNames"
                    value={formData.alternativeNames}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="اسماء أخرى يُعرف بها الراوي، افصل بينها بفواصل"
                    dir="rtl"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* قسم سنوات الوفاة */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                      سنة الوفاة (الاحتمالات)
                    </label>
                    <div className="space-y-2">
                      {formData.deathYears.map((entry, index) => (
                        <div key={entry.id} className="p-3 border border-gray-700 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-grow">
                              <label htmlFor={`deathYear-year-${index}`} className="text-xs text-gray-400 mb-1 block">السنة (رقم)</label>
                              <input
                                type="number"
                                id={`deathYear-year-${index}`}
                                value={entry.year}
                                onChange={(e) => handleChange(e, index, 'year')}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="مثال: 125"
                              />
                            </div>
                            <div className="flex-grow">
                              <label htmlFor={`deathYear-desc-${index}`} className="text-xs text-gray-400 mb-1 block">أو وصف نصي</label>
                              <input
                                type="text"
                                id={`deathYear-desc-${index}`}
                                value={entry.description}
                                onChange={(e) => handleChange(e, index, 'description')}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="مثال: توفي في خلافة عمر"
                                dir="rtl"
                              />
                            </div>
                            {formData.deathYears.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDeathYear(index)}
                                className="p-2 text-red-400 hover:text-red-300 self-end"
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={addDeathYear}
                        className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 px-2 py-1"
                      >
                        <Plus size={16} />
                        إضافة احتمال وفاة آخر
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                      الطبقة <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="generation"
                      value={formData.generation}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {generations.map((gen) => (
                        <option key={gen.value} value={gen.value}>
                          {gen.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* زر الإضافة */}
              <div className="pt-6 border-t border-gray-700">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.fullName.trim() || !formData.generation || submitSuccess}
                  className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      جارٍ إضافة الراوي...
                    </>
                  ) : submitSuccess ? (
                    <>
                      <Check className="h-5 w-5" />
                      تم الحفظ بنجاح
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      إضافة الراوي
                    </>
                  )}
                </button>
                
                {/* معلومات إضافية */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">
                    <span className="text-red-500">*</span> الحقول المطلوبة
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    سيتم حفظ الراوي في قاعدة البيانات وإضافته لقائمة الرواة
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        {/* نصائح مفيدة - تم تعديلها لإزالة الإشارة للشيوخ والتلاميذ */}
        <div className="mt-8 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <h3 className="text-blue-400 font-medium mb-2">💡 نصائح لإضافة الرواة:</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• تأكد من كتابة الاسم الكامل بالشكل الصحيح</li>
            <li>• يمكن إضافة عدة سنوات محتملة للوفاة إذا كان هناك خلاف في المصادر</li>
            <li>• الطبقة مهمة لتصنيف الراوي زمنياً</li>
            <li>• الترجمة اختيارية ويمكن إضافتها لاحقاً</li>
          </ul>
        </div>
      </div>
    </div>
  );
}