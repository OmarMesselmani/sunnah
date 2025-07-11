// File: sunnah-frontend/src/lib/api.ts
import axios from 'axios';

// تعديل API_BASE_URL لاستخدام المتغير البيئي إذا كان موجوداً
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types - تحديث واجهة NarratorDeathYear
export interface NarratorDeathYear {
  id: string; // يجب أن يكون string ليتوافق مع UUIDs
  year?: number | null;
  deathDescription?: string | null; // إضافة دعم للوصف النصي
  isPrimary?: boolean; // جعلها اختيارية
  source?: string;
}

export interface Narrator {
  id: string;
  fullName: string;
  kunyah?: string;
  laqab?: string;
  generation: string;
  deathYear?: string | number | null;
  deathYears?: NarratorDeathYear[];   // استخدام الواجهة المحدثة
  biography?: string;
  translation?: string;
  _count?: {
    narratedHadiths: number;
    musnadHadiths: number;
    teachersRelation: number;
    studentsRelation: number;
  };
}

export interface Source {
  id: number;
  name: string;
  author?: string;
}

export interface Book {
  id: number;
  name: string;
  bookNumber?: number;
}

export interface Chapter {
  id: number;
  name: string;
  chapterNumber?: number;
}

export interface HadithNarrator {
  id: number;
  orderInChain: number;
  narrationType?: string;
  narrator: Narrator;
}

export interface Hadith {
  id: number;
  hadithNumber: string;
  sanad: string;
  matn: string;
  source: Source;
  book?: Book;
  chapter?: Chapter;
  musnadSahabi?: Narrator;
  narrators: HadithNarrator[];
  manualReviews?: Array<{
    id: number;
    reviewerNotes?: string;
    isVerified: boolean;
    reviewedAt: string;
  }>;
  chain?: string; // إضافة حقل chain
  grade?: string; // إضافة خاصية الدرجة كخاصية اختيارية
  explanation?: string; // إضافة خاصية الشرح كخاصية اختيارية
}

export interface NarratorRelation {
  id: string; // Changed from number to string for UUID
  name: string;
  relation_count: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface NarratorsResponse {
  narrators: Narrator[];
  pagination: PaginationInfo;
}

// إضافة واجهة MusnadResponse هنا
export interface MusnadResponse {
  hadiths: Hadith[];
  pagination: PaginationInfo;
}

// Helper function to validate UUID
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// API Functions

// Narrators
export const getNarrators = async (params?: {
  generation?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get<NarratorsResponse>('/narrators', { params });
  return response.data;
};

export const getNarratorById = async (id: string) => {
  // Validate UUID before making the request
  if (!isValidUUID(id)) {
    throw new Error('Invalid narrator ID format');
  }
  
  const response = await api.get<Narrator>(`/narrators/${id}`);
  return response.data;
};

export const getNarratorHadiths = async (
  id: string,
  params?: { page?: number; limit?: number }
) => {
  // Validate UUID before making the request
  if (!isValidUUID(id)) {
    throw new Error('Invalid narrator ID format');
  }
  
  const response = await api.get<{
    hadiths: Hadith[];
    pagination: PaginationInfo;
  }>(`/narrators/${id}/hadiths`, { params });
  return response.data;
};

export const getNarratorRelations = async (id: string) => {
  // Validate UUID before making the request
  if (!isValidUUID(id)) {
    throw new Error('Invalid narrator ID format');
  }
  
  const response = await api.get<{
    teachers: NarratorRelation[];
    students: NarratorRelation[];
  }>(`/narrators/${id}/relations`);
  return response.data;
};

export const createNarrator = async (narratorData: any) => {
  const response = await api.post('/narrators', narratorData);
  return response.data;
};

export const updateNarrator = async (id: string, narratorData: any) => {
  // Validate UUID before making the request
  if (!isValidUUID(id)) {
    throw new Error('Invalid narrator ID format');
  }
  
  const response = await api.put(`/narrators/${id}`, narratorData);
  return response.data;
};

// دالة حذف الراوي مُحسّنة
export const deleteNarrator = async (narratorId: string): Promise<{ success: boolean; message: string }> => {
  try {
    // التحقق من صحة UUID
    if (!isValidUUID(narratorId)) {
      return {
        success: false,
        message: 'معرف الراوي غير صالح'
      };
    }

    console.log(`🗑️ محاولة حذف الراوي بـ ID: ${narratorId}`);

    // استخدام api instance للاستفادة من baseURL
    const response = await api.delete(`/narrators/${narratorId}`);
    
    console.log('✅ استجابة الخادم:', response.data);
    
    return {
      success: true,
      message: response.data?.message || 'تم حذف الراوي بنجاح'
    };
  } catch (error: any) {
    console.error('❌ خطأ في حذف الراوي:', error);
    
    // معالجة أفضل للأخطاء
    if (error.response) {
      // الخادم استجاب برمز خطأ
      const status = error.response.status;
      const errorData = error.response.data;
      const errorMessage = errorData?.error || errorData?.message || 'خطأ غير معروف';
      
      console.log(`📊 رمز الحالة: ${status}, رسالة الخطأ: ${errorMessage}`);
      
      switch (status) {
        case 400:
          return {
            success: false,
            message: `خطأ في البيانات: ${errorMessage}`
          };
        case 404:
          return {
            success: false,
            message: 'الراوي غير موجود'
          };
        case 409:
          return {
            success: false,
            message: errorMessage // استخدم رسالة الخادم مباشرة لأنها تحتوي على التفاصيل
          };
        case 500:
          return {
            success: false,
            message: `خطأ داخلي في الخادم: ${errorMessage}`
          };
        default:
          return {
            success: false,
            message: `خطأ من الخادم (${status}): ${errorMessage}`
          };
      }
    } else if (error.request) {
      // الطلب تم إرساله لكن لم يتم تلقي استجابة
      console.log('📡 لا توجد استجابة من الخادم');
      return {
        success: false,
        message: 'لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم على المنفذ 5000'
      };
    } else {
      // خطأ آخر
      console.log('💥 خطأ غير متوقع:', error.message);
      return {
        success: false,
        message: `خطأ غير متوقع: ${error.message}`
      };
    }
  }
};

export const searchNarrators = async (query: string) => {
  const response = await api.get<Narrator[]>('/narrators/search', { 
    params: { query } 
  });
  return response.data;
};

// دالة البحث عن الرواة بالاسم
export const searchNarratorsByName = async (search: string) => {
  const response = await api.get<NarratorsResponse>('/narrators', { 
    params: { search, limit: 10 } 
  });
  return response.data;
};

// Hadiths
export const searchHadiths = async (params: {
  query?: string;
  searchIn?: 'all' | 'matn' | 'narrator' | 'sahabi';
  source?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get<{
    hadiths: Hadith[];
    pagination: PaginationInfo;
  }>('/hadiths/search', { params });
  return response.data;
};

export const getHadithById = async (id: number) => {
  const response = await api.get<Hadith>(`/hadiths/${id}`);
  return response.data;
};

export const createHadith = async (hadithData: {
  sourceId: number;
  bookId?: number;
  chapterId?: number;
  hadithNumber: string;
  sanad: string;
  matn: string;
  musnadSahabiId?: string; // Changed from number to string for UUID
  narrators?: Array<{
    narratorId: string; // Changed from number to string for UUID
    orderInChain: number;
    narrationType?: string;
  }>;
}) => {
  // Validate UUIDs if provided
  if (hadithData.musnadSahabiId && !isValidUUID(hadithData.musnadSahabiId)) {
    throw new Error('Invalid musnadSahabi ID format');
  }
  
  if (hadithData.narrators) {
    for (const narrator of hadithData.narrators) {
      if (!isValidUUID(narrator.narratorId)) {
        throw new Error('Invalid narrator ID format');
      }
    }
  }
  
  const response = await api.post('/hadiths', hadithData);
  return response.data;
};

export const createHadithsBatch = async (hadiths: Array<{
  sourceId: number;
  bookId?: number;
  chapterId?: number;
  hadithNumber: string;
  sanad: string;
  matn: string;
  musnadSahabiId?: string; // Changed from number to string for UUID
  narrators?: Array<{
    narratorId: string; // Changed from number to string for UUID
    orderInChain: number;
    narrationType?: string;
  }>;
}>) => {
  // Validate UUIDs in batch data
  for (const hadith of hadiths) {
    if (hadith.musnadSahabiId && !isValidUUID(hadith.musnadSahabiId)) {
      throw new Error(`Invalid musnadSahabi ID format in hadith ${hadith.hadithNumber}`);
    }
    
    if (hadith.narrators) {
      for (const narrator of hadith.narrators) {
        if (!isValidUUID(narrator.narratorId)) {
          throw new Error(`Invalid narrator ID format in hadith ${hadith.hadithNumber}`);
        }
      }
    }
  }
  
  const response = await api.post('/hadiths/batch', { hadiths });
  return response.data;
};

// دالة جلب مسند راوي محدد
export const getNarratorMusnad = async (
  id: string,
  params?: { page?: number; limit?: number }
) => {
  if (!isValidUUID(id)) {
    throw new Error('معرف الراوي غير صالح');
  }
  
  const response = await api.get<MusnadResponse>(`/narrators/${id}/musnad`, { 
    params 
  });
  return response.data;
};

// Health Check
export const checkHealth = async () => {
  const response = await api.get<{
    status: string;
    message: string;
  }>('/health');
  return response.data;
};

// Helper functions لسنوات الوفاة - تم تحديثها لدعم deathDescription
export const getDisplayDeathYears = (narrator: Narrator): string => {
  if (narrator.deathYears && narrator.deathYears.length > 0) {
    const displayEntries = narrator.deathYears.map(dy => {
      // إذا كان هناك سنة رقمية، استخدمها مع "هـ"
      if (dy.year && typeof dy.year === 'number') {
        return `${dy.year} هـ`;
      }
      // إذا كان هناك وصف نصي، استخدمه
      if (dy.deathDescription && dy.deathDescription.trim()) {
        return dy.deathDescription.trim();
      }
      return null;
    }).filter(Boolean); // إزالة القيم الفارغة

    if (displayEntries.length === 0) {
      // لا يوجد شيء لعرضه من deathYears، انتقل للنظام القديم
    } else if (displayEntries.length === 1) {
      return displayEntries[0] as string;
    } else {
      return `${displayEntries.join('، ')} (محتمل)`;
    }
  }
  
  // التوافق مع النظام القديم
  if (narrator.deathYear) {
    // إذا كان deathYear رقمًا، أضف "هـ"
    if (typeof narrator.deathYear === 'number') {
      return `${narrator.deathYear} هـ`;
    }
    // إذا كان نصًا، اعرضه كما هو
    return narrator.deathYear.toString(); 
  }
  
  return 'غير محدد'; // قيمة افتراضية إذا لم يوجد شيء
};

export const getPrimaryDeathYear = (narrator: Narrator): number | null => {
  if (narrator.deathYears && narrator.deathYears.length > 0) {
    const primary = narrator.deathYears.find(dy => dy.isPrimary);
    if (primary && typeof primary.year === 'number') {
      return primary.year;
    }
    // إذا لم يكن هناك primary أو primary.year ليس رقمًا، حاول أول إدخال صالح
    const firstValidYearEntry = narrator.deathYears.find(dy => typeof dy.year === 'number');
    if (firstValidYearEntry && typeof firstValidYearEntry.year === 'number') {
      return firstValidYearEntry.year;
    }
  }
  
  // التوافق مع النظام القديم
  if (narrator.deathYear) {
    if (typeof narrator.deathYear === 'number') {
      return narrator.deathYear;
    }
    // إذا كان نصًا، حاول تحويله إلى رقم. إذا فشل، أرجع null.
    if (typeof narrator.deathYear === 'string') {
      const parsedYear = parseInt(narrator.deathYear, 10);
      if (!isNaN(parsedYear)) {
        return parsedYear;
      }
    }
  }
  
  return null; // إذا لم يتم العثور على سنة وفاة رقمية صالحة
};

// دالة مساعدة جديدة للحصول على تفاصيل سنوات الوفاة للعرض
export const getDeathYearsDisplay = (narrator: Narrator): {
  hasMultiple: boolean;
  primary: string | null;
  all: Array<{ value: string; isPrimary?: boolean; source?: string }>;
} => {
  if (!narrator.deathYears || narrator.deathYears.length === 0) {
    // التوافق مع النظام القديم
    if (narrator.deathYear) {
      const value = typeof narrator.deathYear === 'number' 
        ? `${narrator.deathYear} هـ` 
        : narrator.deathYear.toString();
      return {
        hasMultiple: false,
        primary: value,
        all: [{ value, isPrimary: true }]
      };
    }
    return {
      hasMultiple: false,
      primary: null,
      all: []
    };
  }

  const processedEntries = narrator.deathYears.map(dy => {
    let value: string;
    if (dy.year && typeof dy.year === 'number') {
      value = `${dy.year} هـ`;
    } else if (dy.deathDescription && dy.deathDescription.trim()) {
      value = dy.deathDescription.trim();
    } else {
      value = 'غير محدد';
    }
    
    return {
      value,
      isPrimary: dy.isPrimary,
      source: dy.source
    };
  }).filter(entry => entry.value !== 'غير محدد');

  // البحث عن الإدخال الأساسي، أو استخدام الأول إذا لم يتم العثور على أساسي
  const primaryEntry = processedEntries.find(entry => entry.isPrimary === true);
  
  return {
    hasMultiple: processedEntries.length > 1,
    primary: primaryEntry?.value || processedEntries[0]?.value || null,
    all: processedEntries
  };
};

// دالة مساعدة لتحويل بيانات الأحاديث في صفحة المسند
export const adaptHadiths = (apiHadiths: any[]): Hadith[] => {
  return apiHadiths.map(hadith => ({
    ...hadith,
    chain: hadith.sanad, // تحويل sanad إلى chain
    narrators: hadith.narrators?.map((n: any) => ({
      ...n,
      narrator: {
        ...n.narrator,
        // معالجة سنوات الوفاة للرواة
        deathYears: n.narrator.deathYears?.map((dy: any) => ({
          ...dy,
          isPrimary: dy.isPrimary === undefined ? false : dy.isPrimary
        }))
      }
    })),
    // إضافة حقول أخرى قد تحتاجها واجهة المستخدم
    grade: hadith.grade || undefined,
    explanation: hadith.explanation || undefined
  }));
};

// 4. إنشاء واجهة لحالة صفحة عرض المسند
export interface MusnadPageState {
  narrator: Narrator | null;
  hadiths: Hadith[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo;
}

// 5. إضافة دالة مساعدة للتعامل مع روابط صفحة المسند
export const getMusnadPageUrl = (narratorId: string, page: number = 1) => {
  if (!isValidUUID(narratorId)) {
    throw new Error('معرف الراوي غير صالح');
  }
  return `/musnad/${narratorId}?page=${page}`;
};

// 6. إضافة دالة مساعدة لتنسيق عرض معلومات الراوي في صفحة المسند
export const formatNarratorInfo = (narrator: Narrator | null): string => {
  if (!narrator) return '';
  
  const parts = [narrator.fullName];
  
  if (narrator.kunyah) {
    parts.push(`(${narrator.kunyah})`);
  }
  
  if (narrator.generation) {
    parts.push(`- ${narrator.generation}`);
  }
  
  const deathYearDisplay = getDisplayDeathYears(narrator);
  if (deathYearDisplay !== 'غير محدد') {
    parts.push(`- ت ${deathYearDisplay}`);
  }
  
  return parts.join(' ');
};

// تعديل الدالة الموجودة لتصبح خاصة بالمرفوع فقط
export async function fetchNarratorMusnad(narratorId: string, page: number = 1, limit: number = 10) {
  try {
    if (!narratorId || !isValidUUID(narratorId)) {
      throw new Error('معرف الراوي غير صالح');
    }

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

// دالة جديدة لجلب الأحاديث الموقوفة
export async function fetchNarratorMawquf(narratorId: string, page: number = 1, limit: number = 10) {
  try {
    if (!narratorId || !isValidUUID(narratorId)) {
      throw new Error('معرف الراوي غير صالح');
    }

    const url = `${API_BASE_URL}/narrators/${narratorId}/mawquf?page=${page}&limit=${limit}`;
    console.log('🔗 جاري طلب الموقوفات من:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store', 
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.warn('لا يمكن قراءة رسالة الخطأ من الخادم:', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ تم جلب الموقوفات بنجاح:', data);
    return data;
  } catch (error: any) {
    console.error('❌ خطأ في جلب الموقوفات:', error);
    throw error; 
  }
}

// دالة جديدة لجلب الأحاديث المقطوعة
export async function fetchNarratorMaqtu(narratorId: string, page: number = 1, limit: number = 10) {
  try {
    if (!narratorId || !isValidUUID(narratorId)) {
      throw new Error('معرف الراوي غير صالح');
    }

    const url = `${API_BASE_URL}/narrators/${narratorId}/maqtu?page=${page}&limit=${limit}`;
    console.log('🔗 جاري طلب المقطوعات من:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store', 
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.warn('لا يمكن قراءة رسالة الخطأ من الخادم:', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ تم جلب المقطوعات بنجاح:', data);
    return data;
  } catch (error: any) {
    console.error('❌ خطأ في جلب المقطوعات:', error);
    throw error; 
  }
}

// دالة جديدة لجلب إحصائيات أنواع الأحاديث
export async function fetchNarratorHadithStats(narratorId: string) {
  try {
    if (!narratorId || !isValidUUID(narratorId)) {
      throw new Error('معرف الراوي غير صالح');
    }

    const url = `${API_BASE_URL}/narrators/${narratorId}/hadith-stats`;
    console.log('🔗 جاري طلب إحصائيات الأحاديث من:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store', 
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.warn('لا يمكن قراءة رسالة الخطأ من الخادم:', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ تم جلب إحصائيات الأحاديث بنجاح:', data);
    return data;
  } catch (error: any) {
    console.error('❌ خطأ في جلب إحصائيات الأحاديث:', error);
    throw error; 
  }
}

export default api;