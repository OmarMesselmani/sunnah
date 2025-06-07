import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface NarratorDeathYear {
  id: string; // يجب أن يكون string ليتوافق مع UUIDs
  year?: number | null;
  deathDescription?: string | null;
  isPrimary: boolean;
  source?: string;
}

export interface Narrator {
  id: string;
  fullName: string;
  kunyah?: string;
  laqab?: string;
  generation: string;
  deathYear?: string | number | null;
  deathYears?: NarratorDeathYear[];
  biography?: string;
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

export const deleteNarrator = async (id: string) => {
  // Validate UUID before making the request
  if (!isValidUUID(id)) {
    throw new Error('Invalid narrator ID format');
  }
  
  const response = await api.delete(`/narrators/${id}`);
  return response.data;
};

export const searchNarrators = async (query: string) => {
  const response = await api.get<Narrator[]>('/narrators/search', { 
    params: { query } 
  });
  return response.data;
};

// إضافة دالة البحث عن الرواة بالاسم
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

// Health Check
export const checkHealth = async () => {
  const response = await api.get<{
    status: string;
    message: string;
  }>('/health');
  return response.data;
};

// Helper functions لسنوات الوفاة
export const getDisplayDeathYears = (narrator: Narrator): string => {
  if (narrator.deathYears && narrator.deathYears.length > 0) {
    const displayEntries = narrator.deathYears.map(dy => {
      if (dy.year) return `${dy.year} هـ`;
      if (dy.deathDescription) return dy.deathDescription;
      return null; // أو 'غير محدد' إذا أردت
    }).filter(Boolean); // إزالة القيم الفارغة

    if (displayEntries.length === 0) {
      // لا يوجد شيء لعرضه من deathYears
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

// في صفحة المسند
export const adaptHadiths = (apiHadiths: any[]): Hadith[] => {
  return apiHadiths.map(hadith => ({
    ...hadith,
    chain: hadith.sanad, // تحويل sanad إلى chain
    // أي تحويلات أخرى مطلوبة
  }));
};

export default api;