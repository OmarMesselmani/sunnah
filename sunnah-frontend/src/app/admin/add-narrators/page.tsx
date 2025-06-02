'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Plus, X, Loader2, Calendar, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

// تعديل الواجهات لتشمل الشيوخ والتلاميذ
interface NarratorFormData {
  fullName: string;
  kunyas: string;
  deathYears: string[];
  generation: string;
  translation: string;
  teachers: string[];
  students: string[];
}

export default function AddNarratorsPage() {
  const router = useRouter();
  
  // بيانات الراوي الجديد
  const [formData, setFormData] = useState<NarratorFormData>({
    fullName: '',
    kunyas: '',
    deathYears: [''],
    generation: '',
    translation: '',
    teachers: [],
    students: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  
  // المتغيرات الجديدة لإدارة شاشة الإضافة
  const [teacherInput, setTeacherInput] = useState('');
  const [studentInput, setStudentInput] = useState('');
  
  // قائمة الطبقات
  const generations = [
    { value: '', label: 'اختر الطبقة' },
    { value: 'الطبقة الأولى', label: 'الطبقة الأولى - كبار الصحابة' },
    { value: 'الطبقة الثانية', label: 'الطبقة الثانية - صغار الصحابة' },
    { value: 'الطبقة الثالثة', label: 'الطبقة الثالثة - كبار التابعين' },
    { value: 'الطبقة الرابعة', label: 'الطبقة الرابعة - الوسطى من التابعين' },
    { value: 'الطبقة الخامسة', label: 'الطبقة الخامسة - صغار التابعين' },
    { value: 'الطبقة السادسة', label: 'الطبقة السادسة - من عاصر صغار التابعين' },
    { value: 'الطبقة السابعة', label: 'الطبقة السابعة - كبار أتباع التابعين' },
    { value: 'الطبقة الثامنة', label: 'الطبقة الثامنة - الوسطى من أتباع التابعين' },
    { value: 'الطبقة التاسعة', label: 'الطبقة التاسعة - صغار أتباع التابعين' },
    { value: 'الطبقة العاشرة', label: 'الطبقة العاشرة - كبار الآخذين عن تبع الأتباع' },
    { value: 'الطبقة الحادية عشرة', label: 'الطبقة الحادية عشرة - الوسطى من الآخذين عن تبع الأتباع' },
    { value: 'الطبقة الثانية عشرة', label: 'الطبقة الثانية عشرة - صغار الآخذين عن تبع الأتباع' },
  ];

  // إعادة تعيين رسائل النجاح والخطأ
  const resetMessages = () => {
    setSubmitSuccess(false);
    setSubmitError('');
  };

  // التعامل مع تغيير قيم النموذج
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    resetMessages();
    
    if (name.startsWith('deathYear[')) {
      const indexMatch = name.match(/\[(\d+)\]/);
      if (indexMatch) {
        const index = parseInt(indexMatch[1], 10);
        const updatedDeathYears = [...formData.deathYears];
        updatedDeathYears[index] = value;
        setFormData(prev => ({ ...prev, deathYears: updatedDeathYears }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // إضافة سنة وفاة محتملة جديدة
  const addDeathYear = () => {
    setFormData(prev => ({
      ...prev,
      deathYears: [...prev.deathYears, '']
    }));
  };

  // حذف سنة وفاة محتملة
  const removeDeathYear = (index: number) => {
    if (formData.deathYears.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      deathYears: prev.deathYears.filter((_, i) => i !== index)
    }));
  };

  // إضافة شيخ جديد
  const addTeacher = () => {
    if (!teacherInput.trim()) return;
    
    if (formData.teachers.includes(teacherInput.trim())) {
      setSubmitError('هذا الشيخ موجود بالفعل في القائمة');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      teachers: [...prev.teachers, teacherInput.trim()]
    }));
    
    setTeacherInput('');
    resetMessages();
  };
  
  // إضافة تلميذ جديد
  const addStudent = () => {
    if (!studentInput.trim()) return;
    
    if (formData.students.includes(studentInput.trim())) {
      setSubmitError('هذا التلميذ موجود بالفعل في القائمة');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      students: [...prev.students, studentInput.trim()]
    }));
    
    setStudentInput('');
    resetMessages();
  };

  // حذف شيخ
  const removeTeacher = (index: number) => {
    setFormData(prev => ({
      ...prev,
      teachers: prev.teachers.filter((_, i) => i !== index)
    }));
  };
  
  // حذف تلميذ
  const removeStudent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      students: prev.students.filter((_, i) => i !== index)
    }));
  };

  // إضافة راوٍ جديد
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    
    // التحقق من البيانات المطلوبة
    if (!formData.fullName.trim() || !formData.generation) {
      setSubmitError('يرجى ملء جميع الحقول المطلوبة (الاسم الكامل والطبقة)');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // تجهيز البيانات للإرسال
      const narratorData = {
        fullName: formData.fullName.trim(),
        kunyas: formData.kunyas.trim() || null,
        deathYears: formData.deathYears.filter(year => year.trim() !== ''),
        generation: formData.generation,
        translation: formData.translation.trim() || null,
        teachers: formData.teachers,
        students: formData.students
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
          deathYears: [''],
          generation: '',
          translation: '',
          teachers: [],
          students: []
        });
        
        setTeacherInput('');
        setStudentInput('');
        
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  
                  {/* قسم سنوات الوفاة */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">
                      سنة الوفاة (الاحتمالات)
                    </label>
                    <div className="space-y-2">
                      {formData.deathYears.map((year, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="relative flex-grow">
                            <input
                              type="number"
                              name={`deathYear[${index}]`}
                              value={year}
                              onChange={handleChange}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 pl-10"
                              placeholder={`سنة الوفاة ${index > 0 ? 'المحتملة ' + (index + 1) : 'بالهجري'}`}
                            />
                            <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                          
                          {formData.deathYears.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDeathYear(index)}
                              className="p-2 text-red-400 hover:text-red-300 bg-gray-800 rounded-lg"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={addDeathYear}
                        className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 px-2 py-1"
                      >
                        <Plus size={16} />
                        إضافة احتمال آخر
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
              
              {/* قسم الشيوخ والتلاميذ */}
              <div className="space-y-6 pt-4 border-t border-gray-700">
                <h3 className="text-lg font-medium text-white">الشيوخ والتلاميذ (اختياري)</h3>
                
                {/* قسم الشيوخ */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">الشيوخ</h4>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={teacherInput}
                      onChange={(e) => setTeacherInput(e.target.value)}
                      placeholder="اسم الشيخ..."
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={addTeacher}
                      disabled={!teacherInput.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  {formData.teachers.length > 0 ? (
                    <ul className="space-y-1">
                      {formData.teachers.map((teacher, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded-lg"
                        >
                          <span>{teacher}</span>
                          <button
                            type="button"
                            onClick={() => removeTeacher(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">لم تتم إضافة أي شيوخ بعد</p>
                  )}
                </div>
                
                {/* قسم التلاميذ */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">التلاميذ</h4>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={studentInput}
                      onChange={(e) => setStudentInput(e.target.value)}
                      placeholder="اسم التلميذ..."
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      dir="rtl"
                    />
                    <button
                      type="button"
                      onClick={addStudent}
                      disabled={!studentInput.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  {formData.students.length > 0 ? (
                    <ul className="space-y-1">
                      {formData.students.map((student, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded-lg"
                        >
                          <span>{student}</span>
                          <button
                            type="button"
                            onClick={() => removeStudent(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">لم تتم إضافة أي تلاميذ بعد</p>
                  )}
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
        
        {/* نصائح مفيدة */}
        <div className="mt-8 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <h3 className="text-blue-400 font-medium mb-2">💡 نصائح لإضافة الرواة:</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• تأكد من كتابة الاسم الكامل بالشكل الصحيح</li>
            <li>• يمكن إضافة عدة سنوات محتملة للوفاة إذا كان هناك خلاف في المصادر</li>
            <li>• الطبقة مهمة لتصنيف الراوي زمنياً</li>
            <li>• الترجمة والشيوخ والتلاميذ اختيارية ويمكن إضافتها لاحقاً</li>
          </ul>
        </div>
      </div>
    </div>
  );
}