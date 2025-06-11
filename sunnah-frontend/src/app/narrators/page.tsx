'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, User, Calendar, ChevronRight, Filter, UserPlus, 
  Clock, Scroll, ChevronDown, ChevronUp 
} from 'lucide-react';
import { getNarrators, getDisplayDeathYears, getPrimaryDeathYear } from '@/lib/api';
import Link from 'next/link';

interface NarratorDeathYear {
  id: string; // تم التعديل ليتوافق مع UUID
  year?: number | null; // يمكن أن يكون رقمًا أو null
  deathDescription?: string | null; // إضافة وصف الوفاة
  isPrimary: boolean;
  source?: string;
}

interface Narrator {
  id: string; 
  fullName: string;
  kunyah?: string;
  laqab?: string;
  generation: string;
  deathYear?: string | number | null; //  تعديل هنا ليتوافق مع lib/api.ts
  deathYears?: NarratorDeathYear[];
  _count?: {
    narratedHadiths: number;
    musnadHadiths: number;
  };
}

export default function NarratorsPage() {
  const searchParams = useSearchParams();
  const deleted = searchParams.get('deleted');
  
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteNotification, setShowDeleteNotification] = useState(false);
  
  // إضافة حالة لتتبع القوائم المفتوحة
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  
  // زيادة عدد العناصر المعروضة لكل صفحة
  const itemsPerPage = 50;
  
  useEffect(() => {
    loadNarrators();
  }, [page, selectedGeneration]);

  useEffect(() => {
    if (deleted === 'true') {
      setShowDeleteNotification(true);
      const timer = setTimeout(() => setShowDeleteNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [deleted]);

  const loadNarrators = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: itemsPerPage };
      if (selectedGeneration) params.generation = selectedGeneration;
      if (search) params.search = search;
      
      const data = await getNarrators(params);
      setNarrators(data.narrators || []); 
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error loading narrators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadNarrators();
  };

  // تعريف الطبقات - حذف الصحابي والتابعي وتابع التابعين
  const generations = [
    { value: '', label: 'جميع الطبقات' },
    { value: 'الطبقة الأولى', label: 'الطبقة الأولى' },
    { value: 'الطبقة الثانية', label: 'الطبقة الثانية' },
    { value: 'الطبقة الثالثة', label: 'الطبقة الثالثة' },
    { value: 'الطبقة الرابعة', label: 'الطبقة الرابعة' },
    { value: 'الطبقة الخامسة', label: 'الطبقة الخامسة' },
    { value: 'الطبقة السادسة', label: 'الطبقة السادسة' },
    { value: 'الطبقة السابعة', label: 'الطبقة السابعة' },
    { value: 'الطبقة الثامنة', label: 'الطبقة الثامنة' },
    { value: 'الطبقة التاسعة', label: 'الطبقة التاسعة' },
    { value: 'الطبقة العاشرة', label: 'الطبقة العاشرة' },
    { value: 'الطبقة الحادية عشرة', label: 'الطبقة الحادية عشرة' },
    { value: 'الطبقة الثانية عشرة', label: 'الطبقة الثانية عشرة' },
    { value: 'أخرى', label: 'رواة غير مصنفين' },
  ];

  // ترتيب معروف للطبقات للعرض
  const generationOrder = [
    'الطبقة الأولى',
    'الطبقة الثانية',
    'الطبقة الثالثة',
    'الطبقة الرابعة',
    'الطبقة الخامسة',
    'الطبقة السادسة',
    'الطبقة السابعة',
    'الطبقة الثامنة',
    'الطبقة التاسعة',
    'الطبقة العاشرة',
    'الطبقة الحادية عشرة',
    'الطبقة الثانية عشرة',
    'أخرى'
  ];

  const getGenerationColor = (generation: string) => {
    switch (generation) {
      case 'صحابي':
      case 'الطبقة الأولى':
      case 'الطبقة الثانية':
        return 'bg-emerald-900/30 text-emerald-400';
      case 'تابعي':
      case 'الطبقة الثالثة':
      case 'الطبقة الرابعة':
      case 'الطبقة الخامسة':
        return 'bg-blue-900/30 text-blue-400';
      case 'تابع التابعين':
      case 'الطبقة السادسة':
      case 'الطبقة السابعة':
      case 'الطبقة الثامنة':
      case 'الطبقة التاسعة':
        return 'bg-purple-900/30 text-purple-400';
      case 'الطبقة العاشرة':
      case 'الطبقة الحادية عشرة':
      case 'الطبقة الثانية عشرة':
        return 'bg-amber-900/30 text-amber-400';
      case 'أخرى':
        return 'bg-gray-800/50 text-gray-300';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  const getHeaderColor = (generation: string) => {
    switch (generation) {
      case 'صحابي':
        return 'bg-gradient-to-r from-emerald-900/80 to-emerald-800/50 border-emerald-700';
      case 'تابعي':
        return 'bg-gradient-to-r from-blue-900/80 to-blue-800/50 border-blue-700';
      case 'تابع التابعين':
        return 'bg-gradient-to-r from-purple-900/80 to-purple-800/50 border-purple-700';
      case 'الطبقة الأولى':
      case 'الطبقة الثانية':
        return 'bg-gradient-to-r from-emerald-900/60 to-emerald-800/30 border-emerald-700/70';
      case 'الطبقة الثالثة':
      case 'الطبقة الرابعة':
      case 'الطبقة الخامسة':
        return 'bg-gradient-to-r from-blue-900/60 to-blue-800/30 border-blue-700/70';
      case 'الطبقة السادسة':
      case 'الطبقة السابعة':
      case 'الطبقة الثامنة':
      case 'الطبقة التاسعة':
        return 'bg-gradient-to-r from-purple-900/60 to-purple-800/30 border-purple-700/70';
      case 'الطبقة العاشرة':
      case 'الطبقة الحادية عشرة':
      case 'الطبقة الثانية عشرة':
        return 'bg-gradient-to-r from-amber-900/60 to-amber-800/30 border-amber-700/70';
      case 'أخرى':
        return 'bg-gradient-to-r from-gray-800/80 to-gray-700/50 border-gray-600';
      default:
        return 'bg-gradient-to-r from-gray-800/80 to-gray-700/50 border-gray-600';
    }
  };

  const renderDeathYearsInfo = (narrator: Narrator) => {
    if (!narrator.deathYears || narrator.deathYears.length === 0) {
      if (narrator.deathYear) {
        return (
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>{narrator.deathYear} هـ</span>
          </div>
        );
      }
      return null;
    }

    if (narrator.deathYears.length === 1) {
      return (
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{narrator.deathYears[0].year} هـ</span>
        </div>
      );
    }

    const primaryYear = narrator.deathYears.find(dy => dy.isPrimary);
    const displayYear = primaryYear ? primaryYear.year : narrator.deathYears[0].year;
    
    return (
      <div className="flex items-center gap-1" title={`سنوات محتملة: ${narrator.deathYears.map(dy => dy.year).join('، ')}`}>
        <Calendar size={14} />
        <span>{displayYear} هـ</span>
        <span className="text-xs text-orange-400">({narrator.deathYears.length}+)</span>
      </div>
    );
  };

  // تجميع الرواة حسب الطبقة
  const groupNarratorsByGeneration = () => {
    const groups: Record<string, Narrator[]> = {};
    
    // إنشاء المجموعات
    generationOrder.forEach(gen => {
      groups[gen] = [];
    });
    
    // توزيع الرواة على المجموعات
    narrators.forEach(narrator => {
      const generation = narrator.generation || '';
      
      // إذا كان الراوي صحابي أو تابعي أو تابع التابعين، ضعه في قائمة "أخرى"
      if (generation === 'صحابي' || generation === 'تابعي' || generation === 'تابع التابعين' || !generation) {
        groups['أخرى'].push(narrator);
      } 
      // وإلا إذا كانت الطبقة معروفة ومحددة في generationOrder، ضعه في طبقته
      else if (generationOrder.includes(generation)) {
        groups[generation].push(narrator);
      } 
      // وإلا ضعه في قائمة "أخرى"
      else {
        groups['أخرى'].push(narrator);
      }
    });
    
    return groups;
  };

  // التبديل بين فتح وإغلاق قائمة
  const toggleAccordion = (generation: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [generation]: !prev[generation]
    }));
  };

  // فتح جميع القوائم
  const openAllAccordions = () => {
    const allOpen: Record<string, boolean> = {};
    generationOrder.forEach(gen => {
      allOpen[gen] = true;
    });
    setOpenAccordions(allOpen);
  };

  // إغلاق جميع القوائم
  const closeAllAccordions = () => {
    setOpenAccordions({});
  };

  const narratorGroups = groupNarratorsByGeneration();

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        {/* إشعار الحذف */}
        {showDeleteNotification && (
          <div className="mb-6 bg-green-900/40 border border-green-700 text-green-200 p-4 rounded-lg flex items-center gap-3 animate-fadeInOut">
            <div className="bg-green-900 rounded-full p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span>تم حذف الراوي بنجاح</span>
          </div>
        )}
        
        {/* Header with Add Narrator Button */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">الرواة</h1>
            <p className="text-gray-400 text-lg">
              استعرض قائمة رواة الحديث النبوي الشريف
            </p>
          </div>
          
          {/* Add Narrator Button */}
          <Link 
            href="/admin/add-narrators"
            className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md"
          >
            <UserPlus size={20} />
            إضافة راوي
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن راوٍ بالاسم أو الكنية..."
                  className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent placeholder-gray-400"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                بحث
              </button>
            </form>

            {/* Generation Filter */}
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <select
                value={selectedGeneration}
                onChange={(e) => {
                  setSelectedGeneration(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
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

        {/* Accordion Controls */}
        <div className="flex justify-end gap-4 mb-4">
          <button
            onClick={openAllAccordions}
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
          >
            <ChevronDown size={16} />
            فتح الكل
          </button>
          <button
            onClick={closeAllAccordions}
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
          >
            <ChevronUp size={16} />
            إغلاق الكل
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
            <p className="mt-4 text-gray-400">جارٍ التحميل...</p>
          </div>
        ) : (
          <>
            {/* الرواة المجمعين في قوائم منسدلة */}
            <div className="space-y-4">
              {generationOrder.map((generation) => {
                const generationNarrators = narratorGroups[generation] || [];
                if (generationNarrators.length === 0 && generation !== 'أخرى') return null;
                
                // تجاهل طباعة "أخرى" إذا لم يكن هناك رواة
                if (generation === 'أخرى' && generationNarrators.length === 0) return null;

                // للبحث، إذا تم اختيار طبقة محددة، عرضها فقط
                if (selectedGeneration && selectedGeneration !== '' && selectedGeneration !== 'أخرى') {
                  // إذا كان التصنيف المحدد ليس هو التصنيف الحالي، لا تعرض هذا القسم
                  if (selectedGeneration !== generation) return null;
                }
                
                // حالة خاصة للطبقة "أخرى" - إذا تم تحديد "أخرى" في التصفية، أظهر فقط الرواة غير المصنفين
                if (generation === 'أخرى' && selectedGeneration === 'أخرى') {
                  // اعرض الرواة غير المصنفين فقط
                } else if (generation === 'أخرى' && selectedGeneration && selectedGeneration !== '') {
                  // لا تعرض قسم "أخرى" إذا تم تحديد تصنيف آخر
                  return null;
                }
                
                return (
                  <div key={generation} className="border border-gray-700 rounded-lg overflow-hidden">
                    {/* عنوان القائمة المنسدلة */}
                    <button 
                      onClick={() => toggleAccordion(generation)}
                      className={`w-full p-4 flex justify-between items-center ${getHeaderColor(generation)} text-white`}
                    >
                      <div className="flex items-center">
                        <span className="font-bold text-lg">{generation === 'أخرى' ? 'رواة غير مصنفين' : generation}</span>
                        <span className="mr-3 px-3 py-1 rounded-full bg-gray-900/40 text-sm">
                          {generationNarrators.length}
                        </span>
                      </div>
                      {openAccordions[generation] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    
                    {/* محتوى القائمة المنسدلة */}
                    {openAccordions[generation] && (
                      <div className="bg-gray-900 p-3">
                        {/* تغيير من space-y-1 إلى space-y-2 لزيادة المساحة بين أسماء الرواة */}
                        <div className="space-y-2">
                          {generationNarrators.map((narrator) => (
                            <Link
                              key={narrator.id}
                              href={`/narrators/${narrator.id}`}
                              className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-all border border-gray-700 hover:border-gray-600 flex items-center justify-between w-full"
                            >
                              {/* معلومات الراوي الأساسية - أصغر مع الكنية فقط */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-white">
                                    {narrator.fullName}
                                  </h3>
                                  {/* عرض الكنية فقط وتجاهل اللقب */}
                                  {narrator.kunyah && (
                                    <span className="text-gray-400 text-xs bg-gray-700/50 px-2 py-0.5 rounded-md">
                                      {narrator.kunyah}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* المعلومات الإضافية (سنة الوفاة والأحاديث والمسند) */}
                              <div className="flex items-center gap-3 text-xs">
                                {/* سنة الوفاة */}
                                {renderDeathYearsInfo(narrator) && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    {renderDeathYearsInfo(narrator)}
                                  </div>
                                )}
                                
                                {/* عدد الأحاديث - إصلاح شرط العرض للتخلص من الصفر والتحقق من وجود _count */}
                                {narrator._count && narrator._count.narratedHadiths > 0 && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <User size={14} />
                                    <span>{narrator._count.narratedHadiths}</span>
                                  </div>
                                )}

                                {/* المسند - التحقق من وجود _count وmusnadHadiths أكبر من 0 */}
                                {narrator._count && narrator._count.musnadHadiths > 0 && (
                                  <Link
                                    href={`/musnad/${narrator.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault(); // منع التنقل العادي
                                      window.location.href = `/musnad/${narrator.id}`; // توجيه يدوي
                                    }}
                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                  >
                                    <Scroll size={14} />
                                    <span>المسند</span>
                                  </Link>
                                )}

                                {/* سهم للإشارة إلى أن العنصر قابل للنقر */}
                                <ChevronRight className="text-gray-500" size={16} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* No Results */}
            {narrators.length === 0 && (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <User className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-400 text-lg">لم يتم العثور على رواة</p>
                <p className="text-gray-500 text-sm mt-2">
                  جرب تعديل معايير البحث أو إضافة راوي جديد
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                
                {/* Pagination buttons here as before */}
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else {
                      const start = Math.max(1, page - 2);
                      const end = Math.min(totalPages, start + 4);
                      pageNum = start + i;
                      if (pageNum > end) return null;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2 rounded-lg ${
                          page === pageNum
                            ? 'bg-gray-700 text-white'
                            : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && page < totalPages - 2 && (
                    <>
                      <span className="text-gray-400">...</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className="px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}