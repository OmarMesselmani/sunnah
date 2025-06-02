'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Plus, X, Loader2, Calendar, Check } from 'lucide-react';
import axios from 'axios';

// تعديل الواجهات لتشمل الشيوخ والتلاميذ
interface NarratorFormData {
  fullName: string;
  kunyas: string;
  deathYears: string[];
  generation: string;
  translation: string;
  teachers: string[]; // إضافة الشيوخ
  students: string[]; // إضافة التلاميذ
}

interface NarratorEntry {
  id: string; 
  fullName: string;
  kunyas: string;
  deathYears: string[];
  generation: string;
  translation: string;
  isSaved: boolean;
  teachers: string[]; // إضافة الشيوخ
  students: string[]; // إضافة التلاميذ
}

export default function AddNarratorsPage() {
  // بيانات الراوي الجديد
  const [formData, setFormData] = useState<NarratorFormData>({
    fullName: '',
    kunyas: '',
    deathYears: [''],
    generation: '',
    translation: '',
    teachers: [], // إضافة مصفوفة فارغة للشيوخ
    students: [], // إضافة مصفوفة فارغة للتلاميذ
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false); // متغير جديد لتتبع نجاح العملية
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

  // التعامل مع تغيير قيم النموذج - تحديث للتعامل مع مصفوفة سنوات الوفاة
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // إذا كان الاسم يحتوي على قيمة deathYear وله مؤشر، فهذا حقل سنة وفاة 
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
    if (formData.deathYears.length <= 1) return; // إبقاء على الأقل سنة وفاة واحدة
    
    setFormData(prev => ({
      ...prev,
      deathYears: prev.deathYears.filter((_, i) => i !== index)
    }));
  };

  // إضافة شيخ جديد
  const addTeacher = () => {
    if (!teacherInput.trim()) return;
    
    if (formData.teachers.includes(teacherInput.trim())) {
      alert('هذا الشيخ موجود بالفعل في القائمة');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      teachers: [...prev.teachers, teacherInput.trim()]
    }));
    
    setTeacherInput('');
  };
  
  // إضافة تلميذ جديد
  const addStudent = () => {
    if (!studentInput.trim()) return;
    
    if (formData.students.includes(studentInput.trim())) {
      alert('هذا التلميذ موجود بالفعل في القائمة');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      students: [...prev.students, studentInput.trim()]
    }));
    
    setStudentInput('');
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
    
    // التحقق من البيانات المطلوبة
    if (!formData.fullName || !formData.generation) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // تجهيز البيانات للإرسال
      const narratorData = {
        fullName: formData.fullName,
        kunyas: formData.kunyas || null,
        // تحويل سنوات الوفاة غير الفارغة إلى أرقام
        deathYears: formData.deathYears
          .filter(year => year.trim() !== '')
          .map(year => parseInt(year, 10)),
        generation: formData.generation,
        translation: formData.translation || null,
        // إرسال الشيوخ والتلاميذ كأسماء
        teachers: formData.teachers,
        students: formData.students
      };
      
      console.log('إرسال بيانات الراوي:', narratorData);
      
      // تعديل مسار API إن لزم الأمر
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // إرسال البيانات إلى API
      const response = await axios.post(`${API_URL}/api/narrators`, narratorData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('استجابة الخادم:', response.data);
      
      // تسجيل تفاصيل الطلب
      console.log('إرسال طلب إضافة راوٍ:', {
        url: `${API_URL}/api/narrators`,
        data: narratorData
      });
      
      if (response.status === 201 || response.status === 200) {
        // نجاح العملية
        setSubmitSuccess(true); // تعيين حالة النجاح
        
        // إخفاء رسالة النجاح بعد 3 ثوانٍ
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 3000);
        
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
        
        // إعادة تعيين المدخلات الإضافية
        setTeacherInput('');
        setStudentInput('');
        
        // تسجيل نجاح الإضافة
        console.log(`تم إضافة الراوي "${formData.fullName}" بنجاح، المعرف: ${response.data.id || 'غير متوفر'}`);
        
      } else {
        throw new Error(`حدث خطأ: ${response.statusText}`);
      }
      
    } catch (error: any) {
      console.error('خطأ في إضافة الراوي:', error);
      
      // عرض رسالة خطأ أكثر تفصيلاً
      if (error.response) {
        // الخادم استجاب برمز حالة خارج نطاق 2xx
        alert(`حدث خطأ أثناء إضافة الراوي: ${error.response.data?.message || error.response.statusText || 'خطأ غير معروف'}`);
        console.error('استجابة الخطأ:', error.response.data);
      } else if (error.request) {
        // الطلب تم إنشاؤه لكن لم يتم تلقي استجابة
        alert('لم نتمكن من الاتصال بالخادم. تأكد من تشغيل الخادم وأنه متاح.');
      } else {
        // حدث خطأ آخر
        alert(`حدث خطأ: ${error.message}`);
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
            href="/"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
          >
            <ChevronLeft size={20} />
            العودة للرئيسية
          </Link
          >
          
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none auto-expand"
                    placeholder="أدخل ترجمة مختصرة للراوي..."
                    dir="rtl"
                    style={{ overflow: 'hidden' }}
                    onInput={(e) => {
                      // تعديل ارتفاع النص تلقائياً
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
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
                          
                          {/* زر إزالة سنة الوفاة - يظهر فقط إذا كان هناك أكثر من سنة */}
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
                      
                      {/* زر إضافة سنة وفاة محتملة */}
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
                <h3 className="text-lg font-medium text-white">الشيوخ والتلاميذ</h3>
                
                {/* قسم الشيوخ */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">الشيوخ</h4>
                  
                  {/* إضافة شيخ يدوياً */}
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
                  
                  {/* قائمة الشيوخ */}
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
                  
                  {/* إضافة تلميذ يدوياً */}
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
                  
                  {/* قائمة التلاميذ */}
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
              
              {/* رسالة نجاح التقديم */}
              {submitSuccess && (
                <div className="bg-emerald-900/30 text-emerald-400 p-4 rounded-lg mb-6 flex items-center">
                  <Check className="mr-2" size={20} />
                  تم إضافة الراوي بنجاح
                </div>
              )}
              
              {/* زر الإضافة */}
              <div className="pt-6 border-t border-gray-700">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.fullName || !formData.generation}
                  className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      جارٍ الإضافة...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      إضافة الراوي
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}