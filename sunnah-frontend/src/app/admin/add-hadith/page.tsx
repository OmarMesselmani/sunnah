'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Save, 
  Search, 
  Brain, 
  ChevronLeft, 
  AlertCircle,
  Loader2,
  Plus,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Edit // إضافة أيقونة Edit هنا
} from 'lucide-react';
import { analyzeIsnad, generateSearchQueries, ExtractedNarrator } from '@/lib/gemini-api';
import { getNarrators, isValidUUID, searchNarratorsByName } from '@/lib/api';

interface HadithEntry {
  id: string; // temporary ID for UI
  sourceId: number;
  hadithNumber: string;
  sanad: string;
  matn: string;
  extractedNarrators: ExtractedNarrator[];
  isAnalyzed: boolean;
  isExpanded: boolean;
  analysisError?: string;
}

// إضافة الواجهات المفقودة
interface Narrator {
  id: string;
  fullName: string;
  kunyah?: string;
  laqab?: string;
  generation: string;
  deathYear?: number;
  deathYears?: Array<{
    id: number;
    year: number;
    isPrimary: boolean;
    source?: string;
  }>;
}

interface HadithNarrator {
  id: string | number;
  orderInChain: number;
  narrationType?: string;
  narrator: Narrator;
}

// أضف هذه الدالة قبل دالة المكون الرئيسية
const getGenerationColor = (generation: string) => {
  switch (generation) {
    case 'صحابي':
    case 'صحابية':
    case 'الطبقة الأولى':
      return 'bg-green-900/30 text-green-400';
    case 'تابعي':
    case 'تابعية':
    case 'الطبقة الثانية':
    case 'الطبقة الثالثة':
      return 'bg-blue-900/30 text-blue-400';
    case 'تابع التابعين':
    case 'الطبقة الرابعة':
    case 'الطبقة الخامسة':
      return 'bg-purple-900/30 text-purple-400';
    default:
      return 'bg-gray-800/50 text-gray-300';
  }
};

export default function BatchAddHadithPage() {
  const [hadiths, setHadiths] = useState<HadithEntry[]>([
    {
      id: '1',
      sourceId: 1,
      hadithNumber: '',
      sanad: '',
      matn: '',
      extractedNarrators: [],
      isAnalyzed: false,
      isExpanded: true
    }
  ]);

  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  // إضافة حالات للتحكم في المودال وعملية البحث عن الرواة
  const [showManualNarratorModal, setShowManualNarratorModal] = useState(false);
  const [narratorSearch, setNarratorSearch] = useState('');
  const [narratorSearchResults, setNarratorSearchResults] = useState<Narrator[]>([]);
  const [selectedNarrator, setSelectedNarrator] = useState<Narrator | null>(null);
  const [narratorOrder, setNarratorOrder] = useState(1);

  const [currentHadithId, setCurrentHadithId] = useState<string | null>(null);
  const [narrators, setNarrators] = useState<HadithNarrator[]>([]);

  // أضف هذه المتغيرات إلى متغيرات الحالة في المكون
  const [showAddNarratorModal, setShowAddNarratorModal] = useState(false);
  const [newNarratorData, setNewNarratorData] = useState({
    fullName: '',
    kunyah: '',
    generation: '',
    deathYear: ''
  });
  const [currentNarratorIndex, setCurrentNarratorIndex] = useState<number>(-1);
  const [isAddingNarrator, setIsAddingNarrator] = useState(false);

  // إضافة حديث جديد
  const addHadith = () => {
    if (hadiths.length >= 5) {
      alert('يمكن إضافة 5 أحاديث كحد أقصى في المرة الواحدة');
      return;
    }

    const newHadith: HadithEntry = {
      id: Date.now().toString(),
      sourceId: 1,
      hadithNumber: '',
      sanad: '',
      matn: '',
      extractedNarrators: [],
      isAnalyzed: false,
      isExpanded: true
    };

    setHadiths([...hadiths, newHadith]);
  };

  // تحليل سند واحد
  const analyzeSingleHadith = async (hadithId: string) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith || !hadith.sanad) return;

    updateHadith(hadithId, { analysisError: '' });

    try {
      const narrators = await analyzeIsnad(hadith.sanad);
      
      if (narrators.length === 0) {
        updateHadith(hadithId, { 
          analysisError: 'لم يتم العثور على رواة في السند' 
        });
        return;
      }

      // البحث التلقائي عن الرواة
      const matchedNarrators = await searchNarratorsInDB(narrators);
      
      updateHadith(hadithId, {
        extractedNarrators: matchedNarrators,
        isAnalyzed: true
      });
    } catch (error) {
      updateHadith(hadithId, {
        analysisError: 'خطأ في تحليل السند. تأكد من وجود اتصال بالإنترنت وصلاحية مفتاح API'
      });
      console.error('Error analyzing isnad:', error);
    }
  };

  // تحليل جميع الأحاديث
  const analyzeAllHadiths = async () => {
    const unanalyzedHadiths = hadiths.filter(h => !h.isAnalyzed && h.sanad);
    
    if (unanalyzedHadiths.length === 0) {
      alert('لا توجد أحاديث جديدة للتحليل');
      return;
    }

    setIsAnalyzingAll(true);

    for (const hadith of unanalyzedHadiths) {
      await analyzeSingleHadith(hadith.id);
    }

    setIsAnalyzingAll(false);
  };

  // البحث عن الرواة في قاعدة البيانات
  const searchNarratorsInDB = async (narrators: ExtractedNarrator[]): Promise<ExtractedNarrator[]> => {
    return await Promise.all(
      narrators.map(async (narrator) => {
        const searchQueries = generateSearchQueries(narrator);
        
        for (const query of searchQueries) {
          try {
            const result = await getNarrators({ search: query, limit: 1 });
            if (result.narrators && result.narrators.length > 0) {
              const match = result.narrators[0];
              return {
                ...narrator,
                matchedNarratorId: match.id, // Now UUID string
                matchedNarratorName: match.fullName,
                isConfirmed: false
              };
            }
          } catch (error) {
            console.error('Error searching narrator:', error);
          }
        }
        
        return narrator;
      })
    );
  };

  // تحديث راوي في حديث معين
  const updateNarratorInHadith = (hadithId: string, narratorIndex: number, updates: Partial<ExtractedNarrator>) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;

    const updatedNarrators = [...hadith.extractedNarrators];
    updatedNarrators[narratorIndex] = { ...updatedNarrators[narratorIndex], ...updates };

    updateHadith(hadithId, { extractedNarrators: updatedNarrators });
  };

  // حذف راوي من حديث معين
  const removeNarratorFromHadith = (hadithId: string, narratorIndex: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;

    const updatedNarrators = [...hadith.extractedNarrators];
    updatedNarrators.splice(narratorIndex, 1);

    // تحديث ترتيب الرواة المتبقيين بعد الحذف
    const reorderedNarrators = updatedNarrators.map((narrator, idx) => ({
      ...narrator,
      order: idx + 1 // بدء الترتيب من 1
    }));

    updateHadith(hadithId, { 
      extractedNarrators: reorderedNarrators,
      // إذا لم يتبق أي راوي، نعتبر أن الحديث غير محلل
      isAnalyzed: reorderedNarrators.length > 0 
    });
  };

  // البحث عن راوي واحد
  const searchSingleNarrator = async (hadithId: string, narratorIndex: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;

    const narrator = hadith.extractedNarrators[narratorIndex];

    try {
      const result = await getNarrators({ search: narrator.name, limit: 5 });
      
      if (result.narrators && result.narrators.length > 0) {
        // للتبسيط، نأخذ النتيجة الأولى
        const match = result.narrators[0];
        updateNarratorInHadith(hadithId, narratorIndex, {
          matchedNarratorId: match.id, // Now UUID string
          matchedNarratorName: match.fullName,
          isConfirmed: true
        });
      } else {
        alert('لم يتم العثور على الراوي في قاعدة البيانات');
      }
    } catch (error) {
      console.error('Error searching narrator:', error);
    }
  };

  // نسخ حديث
  const duplicateHadith = (hadithId: string) => {
    if (hadiths.length >= 5) {
      alert('يمكن إضافة 5 أحاديث كحد أقصى');
      return;
    }

    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;

    const newHadith: HadithEntry = {
      ...hadith,
      id: Date.now().toString(),
      hadithNumber: '',
      isExpanded: true
    };

    setHadiths([...hadiths, newHadith]);
  };

  // حفظ جميع الأحاديث
  const saveAllHadiths = async () => {
    // تعديل شروط الجاهزية هنا أيضًا
    const readyHadiths = hadiths.filter(h => 
      h.hadithNumber && 
      h.sanad && 
      h.matn
    );

    if (readyHadiths.length === 0) {
      alert('لا توجد أحاديث جاهزة للحفظ. تأكد من تعبئة جميع الخانات المطلوبة');
      return;
    }

    setIsSavingAll(true);
    setSaveProgress({ current: 0, total: readyHadiths.length });

    let savedCount = 0;
    const errors: string[] = [];

    for (const hadith of readyHadiths) {
      try {
        // تعريف واضح لنوع البيانات لمتغير narratorsData
        interface NarratorData {
          narratorId: string; // Changed from number to string for UUID
          orderInChain: number;
          narrationType?: string;
        }
        
        // تجهيز بيانات الرواة إذا كانت موجودة
        let narratorsData: NarratorData[] = [];
        let musnadSahabiId: string | undefined = undefined; // Changed from number to string
        
        if (hadith.isAnalyzed && hadith.extractedNarrators.length > 0) {
          narratorsData = hadith.extractedNarrators
            .filter(n => n.matchedNarratorId && isValidUUID(n.matchedNarratorId)) // Validate UUID
            .map(n => ({
              narratorId: n.matchedNarratorId!,
              orderInChain: n.order,
              narrationType: n.narrationType
            }));
            
          // تحديد الصحابي إذا كان موجودًا ومطابقًا
          const sahabiNarrator = hadith.extractedNarrators[0];
          if (sahabiNarrator?.matchedNarratorId && isValidUUID(sahabiNarrator.matchedNarratorId)) {
            musnadSahabiId = sahabiNarrator.matchedNarratorId;
          }
        }

        const hadithData = {
          sourceId: hadith.sourceId,
          hadithNumber: hadith.hadithNumber,
          sanad: hadith.sanad,
          matn: hadith.matn,
          musnadSahabiId,
          narrators: narratorsData
        };

        const response = await fetch('http://localhost:5000/api/hadiths', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hadithData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to save hadith ${hadith.hadithNumber}`);
        }

        savedCount++;
        setSaveProgress({ current: savedCount, total: readyHadiths.length });

        // حذف الحديث المحفوظ من القائمة
        setHadiths(prev => prev.filter(h => h.id !== hadith.id));

      } catch (error) {
        console.error('Error saving hadith:', error);
        errors.push(`خطأ في حفظ حديث رقم ${hadith.hadithNumber}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      }
    }

    setIsSavingAll(false);
    setSaveProgress({ current: 0, total: 0 });

    if (errors.length > 0) {
      alert(`تم حفظ ${savedCount} من ${readyHadiths.length} أحاديث\n\nالأخطاء:\n${errors.join('\n')}`);
    } else {
      alert(`تم حفظ جميع الأحاديث بنجاح (${savedCount} حديث)`);
    }

    // إضافة حديث جديد فارغ إذا لم يتبق شيء
    if (hadiths.length === readyHadiths.length) {
      setHadiths([{
        id: Date.now().toString(),
        sourceId: 1,
        hadithNumber: '',
        sanad: '',
        matn: '',
        extractedNarrators: [],
        isAnalyzed: false,
        isExpanded: true
      }]);
    }
  };

  // تحديث بيانات حديث
  const updateHadith = (id: string, updates: Partial<HadithEntry>) => {
    setHadiths(hadiths.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  // توسيع/طي حديث
  const toggleExpand = (id: string) => {
    setHadiths(hadiths.map(h => 
      h.id === id ? { ...h, isExpanded: !h.isExpanded } : h
    ));
  };

  // حساب الإحصائيات
  const stats = {
    total: hadiths.length,
    analyzed: hadiths.filter(h => h.isAnalyzed).length,
    // تعديل شروط الجاهزية: تفعيل الزر بمجرد تعمير الخانات الأساسية
    ready: hadiths.filter(h => 
      h.hadithNumber && 
      h.sanad && 
      h.matn
    ).length
  };

  // حذف حديث
  const removeHadith = (id: string) => {
    setHadiths(hadiths.filter(h => h.id !== id));
  };

  // تحليل السند
  const analyzeChain = async () => {
    setIsLoading(true);

    for (const hadith of hadiths) {
      if (!hadith.isAnalyzed || hadith.extractedNarrators.some(n => !n.matchedNarratorId)) {
        await analyzeSingleHadith(hadith.id);
      }
    }

    setIsLoading(false);
  };

  // دالة البحث عن الرواة
  useEffect(() => {
    const searchNarrators = async () => {
      if (narratorSearch.trim().length < 2) {
        setNarratorSearchResults([]);
        return;
      }

      try {
        const result = await searchNarratorsByName(narratorSearch);
        setNarratorSearchResults(result.narrators || []);
      } catch (error) {
        console.error('Error searching narrators:', error);
      }
    };

    const handler = setTimeout(searchNarrators, 300);
    return () => clearTimeout(handler);
  }, [narratorSearch]);

  // دالة اختيار راوي - تم تعديلها لتتوافق مع السلوك الجديد
  const selectNarrator = (narrator: Narrator) => {
    setSelectedNarrator(narrator);
    setNarratorSearch(narrator.fullName); // وضع اسم الراوي في حقل البحث مباشرة
    setNarratorSearchResults([]); // إخفاء نتائج البحث بعد الاختيار
  };

  // دالة إضافة الراوي إلى السند
  const handleAddNarrator = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedNarrator || !currentHadithId) return;

    const newNarrator: HadithNarrator = {
      id: `temp-${Date.now()}`,
      orderInChain: narratorOrder,
      narrator: selectedNarrator
    };

    // تحديث قائمة الرواة المحلية
    const updatedNarrators = [...narrators, newNarrator]
      .sort((a, b) => a.orderInChain - b.orderInChain);
    
    setNarrators(updatedNarrators);
    
    // تحويل HadithNarrator إلى ExtractedNarrator لتحديث الحديث
    const extractedNarrator: ExtractedNarrator = {
      name: selectedNarrator.fullName,
      order: narratorOrder,
      matchedNarratorId: selectedNarrator.id,
      matchedNarratorName: selectedNarrator.fullName,
      isConfirmed: true,
      generation: selectedNarrator.generation
    };

    // تحديث الحديث المختار
    const hadith = hadiths.find(h => h.id === currentHadithId);
    if (hadith) {
      const updatedExtractedNarrators = [...hadith.extractedNarrators, extractedNarrator]
        .sort((a, b) => a.order - b.order);
      
      updateHadith(currentHadithId, { 
        extractedNarrators: updatedExtractedNarrators,
        isAnalyzed: true 
      });
    }
    
    // إعادة تعيين الحقول وإغلاق المودال
    setSelectedNarrator(null);
    setNarratorSearch('');
    setNarratorOrder((hadith?.extractedNarrators.length || 0) + 2);
    setShowManualNarratorModal(false);
  };

  // تحديث متغير narrators عند اختيار حديث
  useEffect(() => {
    if (currentHadithId) {
      const hadith = hadiths.find(h => h.id === currentHadithId);
      if (hadith) {
        // تحويل extractedNarrators إلى HadithNarrator[]
        const hadithNarrators: HadithNarrator[] = hadith.extractedNarrators.map(n => ({
          id: n.matchedNarratorId || `temp-${Date.now()}-${Math.random()}`,
          orderInChain: n.order,
          narrator: {
            id: n.matchedNarratorId || '',
            fullName: n.name,
            generation: n.generation || ''
          }
        }));
        setNarrators(hadithNarrators);
      }
    } else {
      setNarrators([]);
    }
  }, [currentHadithId, hadiths]);

  // دالة عرض مودال إضافة/بحث راوي
  const handleShowAddNarratorModal = (hadithId: string, narratorIndex: number, mode: 'add' | 'search' = 'add') => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;
    
    const narrator = hadith.extractedNarrators[narratorIndex];
    
    setCurrentHadithId(hadithId);
    setCurrentNarratorIndex(narratorIndex);
    
    if (mode === 'add') {
      // وضع إضافة راوي جديد
      setNewNarratorData({
        fullName: narrator.name,
        kunyah: '',
        generation: '',
        deathYear: ''
      });
      setShowAddNarratorModal(true);
    } else {
      // وضع البحث عن راوي
      setNarratorSearch(narrator.name);
      setSelectedNarrator(null);
      setShowManualNarratorModal(true);
    }
  };

  // دالة إضافة راوي جديد
  const handleAddNewNarrator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHadithId || currentNarratorIndex === -1) return;
    
    try {
      setIsAddingNarrator(true);
      
      // طلب إضافة راوي جديد إلى API
      const response = await fetch('http://localhost:5000/api/narrators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: newNarratorData.fullName,
          kunyah: newNarratorData.kunyah || undefined,
          generation: newNarratorData.generation,
          deathYears: newNarratorData.deathYear ? 
            [{ year: parseInt(newNarratorData.deathYear), isPrimary: true }] : 
            undefined
        }),
      });

      if (!response.ok) {
        throw new Error('فشل إضافة الراوي');
      }

      const newNarrator = await response.json();
      
      // تحديث الحديث بمعرف الراوي الجديد
      updateNarratorInHadith(currentHadithId, currentNarratorIndex, {
        matchedNarratorId: newNarrator.id,
        matchedNarratorName: newNarrator.fullName,
        isConfirmed: true,
        generation: newNarrator.generation
      });
      
      // إغلاق النافذة المنبثقة وإعادة تعيين البيانات
      setShowAddNarratorModal(false);
      setNewNarratorData({ fullName: '', kunyah: '', generation: '', deathYear: '' });
      setCurrentNarratorIndex(-1);
      
    } catch (error) {
      console.error('Error adding narrator:', error);
      alert('حدث خطأ أثناء إضافة الراوي');
    } finally {
      setIsAddingNarrator(false);
    }
  };

  // دالة لإلغاء تطابق الراوي الحالي
  const resetNarratorMatch = (hadithId: string, narratorIndex: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;
    
    const narrator = hadith.extractedNarrators[narratorIndex];
    
    // إلغاء المطابقة أولاً
    updateNarratorInHadith(hadithId, narratorIndex, {
      matchedNarratorId: undefined,
      matchedNarratorName: undefined,
      isConfirmed: false,
      generation: undefined
    });

    // فتح نافذة بحث متقدمة
    setCurrentHadithId(hadithId);
    setCurrentNarratorIndex(narratorIndex);
    setNarratorSearch(narrator.name); // ملء حقل البحث باسم الراوي الحالي
    setSelectedNarrator(null);
    setShowManualNarratorModal(true); // فتح النافذة المنبثقة للبحث
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
          >
            <ChevronLeft size={20} />
            العودة للرئيسية
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">إضافة دفعة أحاديث</h1>
              <p className="text-gray-300 mt-2">
                يمكنك إضافة حتى 5 أحاديث في المرة الواحدة
              </p>
            </div>
            
            {/* Statistics */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-300">إجمالي</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{stats.analyzed}</div>
                  <div className="text-sm text-gray-300">محلل</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{stats.ready}</div>
                  <div className="text-sm text-gray-300">جاهز</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3 border border-gray-700">
          <button
            onClick={addHadith}
            disabled={hadiths.length >= 5}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={20} />
            إضافة حديث جديد
          </button>
          
          <button
            onClick={analyzeAllHadiths}
            disabled={isAnalyzingAll || stats.total === stats.analyzed}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isAnalyzingAll ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                جارٍ التحليل...
              </>
            ) : (
              <>
                <Brain size={20} />
                تحليل جميع الأحاديث
              </>
            )}
          </button>

          <button
            onClick={saveAllHadiths}
            disabled={isSavingAll || stats.ready === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 mr-auto"
          >
            {isSavingAll ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                جارٍ الحفظ ({saveProgress.current}/{saveProgress.total})...
              </>
            ) : (
              <>
                <Save size={20} />
                {stats.ready === 1 ? 'حفظ الحديث' : `حفظ الأحاديث (${stats.ready})`}
              </>
            )}
          </button>
        </div>

        {/* Hadiths List */}
        <div className="space-y-4">
          {hadiths.map((hadith, index) => (
            <div key={hadith.id} className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
              {/* Hadith Header */}
              <div 
                className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${
                  hadith.isAnalyzed && hadith.extractedNarrators.every(n => n.matchedNarratorId)
                    ? 'bg-green-900/20' : ''
                }`}
                onClick={() => toggleExpand(hadith.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        حديث {hadith.hadithNumber || '(بدون رقم)'}
                      </div>
                      <div className="text-sm">
                        {hadith.isAnalyzed ? (
                          <span className="text-emerald-400">
                            ✓ محلل ({hadith.extractedNarrators.length} راوي)
                          </span>
                        ) : (
                          <span className="text-gray-400">غير محلل</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateHadith(hadith.id);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-400"
                      title="نسخ الحديث"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHadith(hadith.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-400"
                    >
                      <X size={18} />
                    </button>
                    {hadith.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {/* Hadith Content */}
              {hadith.isExpanded && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        المصدر
                      </label>
                      <select
                        value={hadith.sourceId}
                        onChange={(e) => updateHadith(hadith.id, { sourceId: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>صحيح البخاري</option>
                        <option value={2}>صحيح مسلم</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        رقم الحديث
                      </label>
                      <input
                        type="text"
                        value={hadith.hadithNumber}
                        onChange={(e) => updateHadith(hadith.id, { hadithNumber: e.target.value })}
                        placeholder="مثال: 1234"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      السند
                    </label>
                    <textarea
                      value={hadith.sanad}
                      onChange={(e) => updateHadith(hadith.id, { sanad: e.target.value })}
                      placeholder="حدثنا..."
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => analyzeSingleHadith(hadith.id)}
                        disabled={!hadith.sanad || isAnalyzingAll}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Brain size={16} />
                        تحليل السند
                      </button>
                      
                      {/* زر إضافة راوي يدوياً نُقل إلى هنا */}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentHadithId(hadith.id);
                          setNarratorOrder((hadith.extractedNarrators.length || 0) + 1);
                          setShowManualNarratorModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <UserPlus size={16} />
                        إضافة راوي يدوياً
                      </button>
                    </div>
                  </div>

                  {hadith.analysisError && (
                    <div className="mb-4 bg-red-900/20 border border-red-800 text-red-400 px-3 py-2 rounded-lg text-sm">
                      <AlertCircle size={16} className="inline mr-1" />
                      {hadith.analysisError}
                    </div>
                  )}

                  {/* Extracted Narrators */}
                  {hadith.extractedNarrators.length > 0 && (
                    <div className="mb-4 bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h4 className="font-semibold text-sm mb-3 text-white">
                        سلسلة الرواة (1: الصحابي، والأرقام التالية لمن بعده):
                      </h4>
                      <div className="space-y-2">
                        {hadith.extractedNarrators.map((narrator, nIndex) => (
                          <div key={nIndex} className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                              {narrator.order}
                            </div>
                            <input
                              type="text"
                              value={narrator.name}
                              onChange={(e) => updateNarratorInHadith(hadith.id, nIndex, { name: e.target.value })}
                              className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 text-white rounded text-sm focus:ring-1 focus:ring-blue-500"
                            />
                            
                            {/* زر حذف راوي */}
                            <button
                              onClick={() => removeNarratorFromHadith(hadith.id, nIndex)}
                              className="text-gray-400 hover:text-red-400 p-1 rounded-full hover:bg-gray-600"
                              title="حذف الراوي"
                            >
                              <X size={14} />
                            </button>
                            
                            {narrator.matchedNarratorId ? (
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 text-sm">
                                  ✓ {narrator.matchedNarratorName}
                                </span>
                                <button
                                  onClick={() => resetNarratorMatch(hadith.id, nIndex)}
                                  className="text-gray-400 hover:text-yellow-400 p-1 rounded-full hover:bg-gray-600"
                                  title="تغيير الراوي"
                                >
                                  <Edit size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => searchSingleNarrator(hadith.id, nIndex)}
                                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                                >
                                  <Search size={14} className="mr-1" /> بحث
                                </button>
                                
                                {/* زر إضافة راوي جديد */}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowAddNarratorModal(hadith.id, nIndex);
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 p-1 rounded-full hover:bg-gray-600 flex items-center"
                                  title="إضافة راوي جديد"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      المتن
                    </label>
                    <textarea
                      value={hadith.matn}
                      onChange={(e) => updateHadith(hadith.id, { matn: e.target.value })}
                      placeholder="نص الحديث..."
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {hadiths.length === 0 && (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <p className="text-gray-300 mb-4">لا توجد أحاديث. ابدأ بإضافة حديث جديد.</p>
            <button
              onClick={addHadith}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              إضافة أول حديث
            </button>
          </div>
        )}

        {/* إضافة مودال إضافة راوي يدوياً */}
        {showManualNarratorModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-md w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  إضافة راوي جديد
                </h3>
                <button
                  onClick={() => setShowManualNarratorModal(false)} // تعديل هنا: استخدم المتغير الصحيح
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleAddNewNarrator} className="space-y-4">
                  {/* الاسم الكامل للراوي */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newNarratorData.fullName}
                      onChange={(e) => setNewNarratorData({...newNarratorData, fullName: e.target.value})}
                      placeholder="اسم الراوي الكامل"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* الكنية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      الكنية
                    </label>
                    <input
                      type="text"
                      value={newNarratorData.kunyah}
                      onChange={(e) => setNewNarratorData({...newNarratorData, kunyah: e.target.value})}
                      placeholder="كنية الراوي (اختياري)"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* الطبقة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      الطبقة <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newNarratorData.generation}
                      onChange={(e) => setNewNarratorData({...newNarratorData, generation: e.target.value})}
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر الطبقة</option>
                      <option value="صحابي">صحابي</option>
                      <option value="صحابية">صحابية</option>
                      <option value="تابعي">تابعي</option>
                      <option value="تابعية">تابعية</option>
                      <option value="تابع التابعين">تابع التابعين</option>
                      <option value="الطبقة الأولى">الطبقة الأولى</option>
                      <option value="الطبقة الثانية">الطبقة الثانية</option>
                      <option value="الطبقة الثالثة">الطبقة الثالثة</option>
                      <option value="الطبقة الرابعة">الطبقة الرابعة</option>
                      <option value="الطبقة الخامسة">الطبقة الخامسة</option>
                      <option value="الطبقة السادسة">الطبقة السادسة</option>
                      <option value="الطبقة السابعة">الطبقة السابعة</option>
                      <option value="الطبقة الثامنة">الطبقة الثامنة</option>
                      <option value="الطبقة التاسعة">الطبقة التاسعة</option>
                      <option value="الطبقة العاشرة">الطبقة العاشرة</option>
                    </select>
                  </div>

                  {/* سنة الوفاة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      سنة الوفاة
                    </label>
                    <input
                      type="number"
                      value={newNarratorData.deathYear}
                      onChange={(e) => setNewNarratorData({...newNarratorData, deathYear: e.target.value})}
                      placeholder="سنة الوفاة بالهجري"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualNarratorModal(false)}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingNarrator || !newNarratorData.fullName || !newNarratorData.generation}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingNarrator ? (
                        <>
                          <Loader2 size={16} className="inline mr-2 animate-spin" />
                          جارٍ الإضافة...
                        </>
                      ) : (
                        'إضافة الراوي'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}