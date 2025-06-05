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
  Edit
} from 'lucide-react';
import { analyzeIsnad, ExtractedNarrator } from '@/lib/gemini-api'; // Removed generateSearchQueries
import { getNarrators, isValidUUID, searchNarratorsByName } from '@/lib/api';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd'; // تغيير الاستيراد هنا

interface HadithEntry {
  id: string; 
  sourceId: number;
  hadithNumber: string;
  sanad: string;
  matn: string;
  extractedNarrators: ExtractedNarrator[];
  isAnalyzed: boolean;
  isExpanded: boolean;
  analysisError?: string;
}

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

const generateSearchQueriesLocal = (narrator: ExtractedNarrator): string[] => {
  const name = narrator.name.trim();
  const queries = new Set<string>();
  queries.add(name);
  const cleanName = name.replace(/[،,.:;""()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanName !== name) {
    queries.add(cleanName);
  }
  const parts = cleanName.split(' ').filter(part => part.length > 1);
  if (parts.length > 1) {
    queries.add(`${parts[0]} ${parts[parts.length - 1]}`);
    const ibnIndex = parts.findIndex(part => part === 'بن' || part === 'ابن');
    if (ibnIndex > 0 && ibnIndex < parts.length - 1) {
      queries.add(`${parts[ibnIndex - 1]} بن ${parts[ibnIndex + 1]}`);
      queries.add(`${parts[ibnIndex - 1]} ابن ${parts[ibnIndex + 1]}`);
    }
    if (parts.length >= 3) {
      queries.add(parts.slice(0, 3).join(' '));
    }
    if (parts.length >= 2) {
      queries.add(parts.slice(0, 2).join(' '));
    }
  }
  const finalQueries = Array.from(queries).filter(q => q.length >= 3);
  console.log(`🔍 تم توليد ${finalQueries.length} استعلام بحث للراوي "${name}":`, finalQueries);
  return finalQueries;
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
  
  const [showManualNarratorModal, setShowManualNarratorModal] = useState(false);
  const [narratorSearch, setNarratorSearch] = useState('');
  const [narratorSearchResults, setNarratorSearchResults] = useState<Narrator[]>([]);
  const [selectedNarrator, setSelectedNarrator] = useState<Narrator | null>(null);
  const [narratorOrder, setNarratorOrder] = useState(1);

  const [currentHadithId, setCurrentHadithId] = useState<string | null>(null);
  
  const [showAddNarratorModal, setShowAddNarratorModal] = useState(false);
  const [newNarratorData, setNewNarratorData] = useState({
    fullName: '',
    kunyah: '',
    generation: '',
    deathYear: '',
    translation: ''
  });
  const [currentNarratorIndex, setCurrentNarratorIndex] = useState<number>(-1);
  const [isAddingNarrator, setIsAddingNarrator] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchingNarratorIndex, setSearchingNarratorIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Narrator[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const updateHadith = (id: string, updates: Partial<HadithEntry>) => {
    setHadiths(prevHadiths => prevHadiths.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const analyzeSingleHadith = async (hadithId: string) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith || !hadith.sanad) return;
    updateHadith(hadithId, { analysisError: '' });
    try {
      const narrators = await analyzeIsnad(hadith.sanad);
      if (narrators.length === 0) {
        updateHadith(hadithId, { analysisError: 'لم يتم العثور على رواة في السند' });
        return;
      }
      const matchedNarrators = await searchNarratorsInDB(narrators);
      updateHadith(hadithId, {
        extractedNarrators: matchedNarrators,
        isAnalyzed: true
      });
    } catch (error) {
      console.error('❌ خطأ في تحليل السند:', error);
      updateHadith(hadithId, {
        analysisError: 'خطأ في تحليل السند. تأكد من وجود اتصال بالإنترنت وصلاحية مفتاح API'
      });
    }
  };

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

  const searchNarratorsInDB = async (narrators: ExtractedNarrator[]): Promise<ExtractedNarrator[]> => {
    return await Promise.all(
      narrators.map(async (narrator) => {
        const searchQueries = generateSearchQueriesLocal(narrator);
        for (const query of searchQueries) {
          try {
            const result = await getNarrators({ search: query, limit: 1 });
            if (result.narrators && result.narrators.length > 0) {
              const match = result.narrators[0];
              return {
                ...narrator,
                matchedNarratorId: match.id,
                matchedNarratorName: match.fullName,
                isConfirmed: true,
                generation: match.generation
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

  const updateNarratorInHadith = (hadithId: string, narratorIndex: number, updates: Partial<ExtractedNarrator>) => {
    setHadiths(prevHadiths => prevHadiths.map(h => {
      if (h.id === hadithId) {
        const updatedNarrators = [...h.extractedNarrators];
        updatedNarrators[narratorIndex] = { ...updatedNarrators[narratorIndex], ...updates };
        return { ...h, extractedNarrators: updatedNarrators };
      }
      return h;
    }));
  };

  const removeNarratorFromHadith = (hadithId: string, narratorIndex: number) => {
    setHadiths(prevHadiths => prevHadiths.map(h => {
      if (h.id === hadithId) {
        const updatedNarrators = h.extractedNarrators.filter((_, idx) => idx !== narratorIndex);
        const reorderedNarrators = updatedNarrators.map((narrator, idx) => ({
          ...narrator,
          order: idx + 1
        }));
        return { ...h, extractedNarrators: reorderedNarrators, isAnalyzed: reorderedNarrators.length > 0 };
      }
      return h;
    }));
  };

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
    setHadiths(prevHadiths => [...prevHadiths, newHadith]);
  };

  const saveAllHadiths = async () => {
    const readyHadiths = hadiths.filter(h => h.hadithNumber && h.sanad && h.matn);
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
        interface NarratorData {
          narratorId: string;
          orderInChain: number;
          narrationType?: string;
        }
        let narratorsData: NarratorData[] = [];
        let musnadSahabiId: string | undefined = undefined;
        if (hadith.isAnalyzed && hadith.extractedNarrators.length > 0) {
          narratorsData = hadith.extractedNarrators
            .filter(n => n.matchedNarratorId && isValidUUID(n.matchedNarratorId))
            .map(n => ({
              narratorId: n.matchedNarratorId!,
              orderInChain: n.order,
              narrationType: n.narrationType
            }));
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hadithData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to save hadith ${hadith.hadithNumber}`);
        }
        savedCount++;
        setSaveProgress(prev => ({ ...prev, current: savedCount }));
        setHadiths(prev => prev.filter(h => h.id !== hadith.id));
      } catch (error) {
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
    if (hadiths.length === readyHadiths.length && readyHadiths.length > 0) { // Check if all saved were the only ones
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
    } else if (hadiths.filter(h => h.id !== '').length === 0) { // If list becomes empty after save
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

  const toggleExpand = (id: string) => {
    setHadiths(prevHadiths => prevHadiths.map(h =>
      h.id === id ? { ...h, isExpanded: !h.isExpanded } : h
    ));
  };

  const stats = {
    total: hadiths.length,
    analyzed: hadiths.filter(h => h.isAnalyzed).length,
    ready: hadiths.filter(h => h.hadithNumber && h.sanad && h.matn).length
  };

  const removeHadithEntry = (id: string) => {
    setHadiths(prevHadiths => prevHadiths.filter(h => h.id !== id));
  };

  useEffect(() => {
    const searchApi = async () => {
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
    const handler = setTimeout(searchApi, 300);
    return () => clearTimeout(handler);
  }, [narratorSearch]);

  const selectNarratorForManualAdd = (narrator: Narrator) => {
    setSelectedNarrator(narrator);
    setNarratorSearch(narrator.fullName);
    setNarratorSearchResults([]);
  };

  const handleAddNarratorToChain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNarrator || !currentHadithId) return;
    const hadith = hadiths.find(h => h.id === currentHadithId);
    if (!hadith) return;

    const newExtractedNarrator: ExtractedNarrator = {
      name: selectedNarrator.fullName,
      order: narratorOrder,
      matchedNarratorId: selectedNarrator.id,
      matchedNarratorName: selectedNarrator.fullName,
      isConfirmed: true,
      generation: selectedNarrator.generation
    };
    const updatedExtractedNarrators = [...hadith.extractedNarrators, newExtractedNarrator]
      .sort((a, b) => a.order - b.order)
      .map((n, idx) => ({ ...n, order: idx + 1 })); // Re-order after adding

    updateHadith(currentHadithId, {
      extractedNarrators: updatedExtractedNarrators,
      isAnalyzed: true
    });
    setSelectedNarrator(null);
    setNarratorSearch('');
    setNarratorOrder(updatedExtractedNarrators.length + 1);
    setShowManualNarratorModal(false);
  };

  const handleShowAddNarratorModal = (hadithId: string, narratorIndex: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;
    const narrator = hadith.extractedNarrators[narratorIndex];
    setCurrentHadithId(hadithId);
    setCurrentNarratorIndex(narratorIndex);
    setNewNarratorData({
      fullName: narrator.name,
      kunyah: '',
      generation: '',
      deathYear: '',
      translation: ''
    });
    setShowAddNarratorModal(true);
  };

  const handleAddNewNarratorToDB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHadithId || currentNarratorIndex === -1) return;
    setIsAddingNarrator(true);
    try {
      const response = await fetch('http://localhost:5000/api/narrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newNarratorData.fullName,
          kunyas: newNarratorData.kunyah ? [newNarratorData.kunyah] : undefined,
          generation: newNarratorData.generation,
          translation: newNarratorData.translation || undefined,
          deathYears: newNarratorData.deathYear ? [newNarratorData.deathYear] : undefined
        }),
      });
      if (!response.ok) throw new Error('فشل إضافة الراوي');
      const newNarrator = await response.json();
      updateNarratorInHadith(currentHadithId, currentNarratorIndex, {
        matchedNarratorId: newNarrator.id,
        matchedNarratorName: newNarrator.fullName,
        isConfirmed: true,
        generation: newNarrator.generation
      });
      setShowAddNarratorModal(false);
      setNewNarratorData({ fullName: '', kunyah: '', generation: '', deathYear: '', translation: '' });
      setCurrentNarratorIndex(-1);
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الراوي');
    } finally {
      setIsAddingNarrator(false);
    }
  };
  
  // دالة فتح نافذة البحث للراوي غير المطابق
  const handleSearchNarrator = (hadithId: string, narratorIndex: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;
    const narrator = hadith.extractedNarrators[narratorIndex];
    setCurrentHadithId(hadithId);
    setSearchingNarratorIndex(narratorIndex);
    setSearchQuery(narrator.name); 
    setSearchResults([]);
    setShowSearchModal(true);
  };

  const handleEditNarrator = (hadithId: string, narratorIndex: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;
    const narrator = hadith.extractedNarrators[narratorIndex];
    setCurrentHadithId(hadithId);
    setSearchingNarratorIndex(narratorIndex);
    setSearchQuery(narrator.name);
    setSearchResults([]);
    setShowSearchModal(true);
  };

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const result = await searchNarratorsByName(searchQuery);
        setSearchResults(result.narrators || []);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const handler = setTimeout(performSearch, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, showSearchModal]); // Added showSearchModal to dependencies

  const selectSearchResult = (narrator: Narrator) => {
    if (!currentHadithId || searchingNarratorIndex === -1) return;
    updateNarratorInHadith(currentHadithId, searchingNarratorIndex, {
      matchedNarratorId: narrator.id,
      matchedNarratorName: narrator.fullName,
      isConfirmed: true,
      generation: narrator.generation
    });
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentHadithId(null);
    setSearchingNarratorIndex(-1);
  };

  const onNarratorDragEnd = (result: DropResult, hadithId: string) => {
    if (!result.destination) return;
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith) return;
    const narrators = Array.from(hadith.extractedNarrators);
    const [removed] = narrators.splice(result.source.index, 1);
    narrators.splice(result.destination.index, 0, removed);
    const reordered = narrators.map((n, idx) => ({ ...n, order: idx + 1 }));
    updateHadith(hadithId, { extractedNarrators: reordered });
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
            <ChevronLeft size={20} /> العودة للرئيسية
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">إضافة دفعة أحاديث</h1>
              <p className="text-gray-300 mt-2">يمكنك إضافة حتى 5 أحاديث في المرة الواحدة</p>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold text-white">{stats.total}</div><div className="text-sm text-gray-300">إجمالي</div></div>
                <div><div className="text-2xl font-bold text-purple-400">{stats.analyzed}</div><div className="text-sm text-gray-300">محلل</div></div>
                <div><div className="text-2xl font-bold text-emerald-400">{stats.ready}</div><div className="text-sm text-gray-300">جاهز</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3 border border-gray-700">
          <button onClick={addHadith} disabled={hadiths.length >= 5} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Plus size={20} /> إضافة حديث جديد
          </button>
          <button onClick={analyzeAllHadiths} disabled={isAnalyzingAll || stats.total === stats.analyzed} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {isAnalyzingAll ? <><Loader2 size={20} className="animate-spin" /> جارٍ التحليل...</> : <><Brain size={20} /> تحليل جميع الأحاديث</>}
          </button>
          <button onClick={saveAllHadiths} disabled={isSavingAll || stats.ready === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 mr-auto">
            {isSavingAll ? <><Loader2 size={20} className="animate-spin" /> جارٍ الحفظ ({saveProgress.current}/{saveProgress.total})...</> : <><Save size={20} /> {stats.ready === 1 ? 'حفظ الحديث' : `حفظ الأحاديث (${stats.ready})`}</>}
          </button>
        </div>

        <div className="space-y-4">
          {hadiths.map((hadith, index) => (
            <div key={hadith.id} className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
              <div className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${hadith.isAnalyzed && hadith.extractedNarrators.every(n => n.matchedNarratorId) ? 'bg-green-900/20' : ''}`} onClick={() => toggleExpand(hadith.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                    <div>
                      <div className="font-semibold text-white">حديث {hadith.hadithNumber || '(بدون رقم)'}</div>
                      <div className="text-sm">{hadith.isAnalyzed ? <span className="text-emerald-400">✓ محلل ({hadith.extractedNarrators.length} راوي)</span> : <span className="text-gray-400">غير محلل</span>}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); duplicateHadith(hadith.id); }} className="p-2 text-gray-400 hover:text-blue-400" title="نسخ الحديث"><Copy size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeHadithEntry(hadith.id); }} className="p-2 text-gray-400 hover:text-red-400" title="حذف الحديث"><X size={18} /></button>
                    {hadith.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {hadith.isExpanded && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">المصدر</label>
                      <select value={hadith.sourceId} onChange={(e) => updateHadith(hadith.id, { sourceId: Number(e.target.value) })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value={1}>صحيح البخاري</option>
                        <option value={2}>صحيح مسلم</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">رقم الحديث</label>
                      <input type="text" value={hadith.hadithNumber} onChange={(e) => updateHadith(hadith.id, { hadithNumber: e.target.value })} placeholder="مثال: 1234" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">السند</label>
                    <textarea value={hadith.sanad} onChange={(e) => updateHadith(hadith.id, { sanad: e.target.value })} placeholder="حدثنا..." rows={3} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => analyzeSingleHadith(hadith.id)} disabled={!hadith.sanad || isAnalyzingAll} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"><Brain size={16} /> تحليل السند</button>
                      <button type="button" onClick={() => { setCurrentHadithId(hadith.id); setNarratorOrder((hadith.extractedNarrators.length || 0) + 1); setShowManualNarratorModal(true); }} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 flex items-center gap-1"><UserPlus size={16} /> إضافة راوي يدوياً</button>
                    </div>
                  </div>
                  {hadith.analysisError && <div className="mb-4 bg-red-900/20 border border-red-800 text-red-400 px-3 py-2 rounded-lg text-sm"><AlertCircle size={16} className="inline mr-1" />{hadith.analysisError}</div>}
                  
                  {hadith.extractedNarrators.length > 0 && (
                    <div className="mb-4 bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h4 className="font-semibold text-sm mb-3 text-white">سلسلة الرواة (1: الصحابي، والأرقام التالية لمن بعده):</h4>
                      <DragDropContext onDragEnd={(result: DropResult) => onNarratorDragEnd(result, hadith.id)}>
                        <Droppable droppableId={`narrators-${hadith.id}`}>
                          {(provided: DroppableProvided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {hadith.extractedNarrators.map((narrator, nIndex) => (
                                <Draggable key={`${narrator.name}-${nIndex}-${hadith.id}`} draggableId={`${narrator.name}-${nIndex}-${hadith.id}`} index={nIndex}>
                                  {(providedDraggable: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                    <div ref={providedDraggable.innerRef} {...providedDraggable.draggableProps} className={`flex items-center gap-2 p-2 bg-gray-800 rounded ${snapshot.isDragging ? 'ring-2 ring-blue-400 shadow-lg' : ''}`} style={providedDraggable.draggableProps.style}>
                                      <div {...providedDraggable.dragHandleProps} className="w-6 h-6 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold cursor-move" title="اسحب لتغيير الترتيب">{narrator.order}</div>
                                      <input type="text" value={narrator.name} onChange={(e) => updateNarratorInHadith(hadith.id, nIndex, { name: e.target.value })} className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 text-white rounded text-sm focus:ring-1 focus:ring-blue-500" />
                                      <button onClick={() => removeNarratorFromHadith(hadith.id, nIndex)} className="text-gray-400 hover:text-red-400 p-1 rounded-full hover:bg-gray-600" title="حذف الراوي"><X size={14} /></button>
                                      {narrator.matchedNarratorId ? (
                                        <div className="flex items-center gap-2">
                                          <span className={`text-sm flex items-center gap-1 ${narrator.isConfirmed ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                            {narrator.isConfirmed ? '✓' : '?'} {narrator.matchedNarratorName}
                                            {narrator.generation && <span className={`text-xs px-1 py-0.5 rounded ${getGenerationColor(narrator.generation)}`}>{narrator.generation}</span>}
                                          </span>
                                          <button onClick={() => handleEditNarrator(hadith.id, nIndex)} className="text-gray-400 hover:text-yellow-400 p-1 rounded-full hover:bg-gray-600" title="تغيير الراوي"><Edit size={14} /></button>
                                          {!narrator.isConfirmed && <button onClick={() => updateNarratorInHadith(hadith.id, nIndex, { isConfirmed: true })} className="text-yellow-400 hover:text-green-400 p-1 rounded-full hover:bg-gray-600 text-xs" title="تأكيد المطابقة">✓</button>}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => handleSearchNarrator(hadith.id, nIndex)} className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-gray-600" title="البحث عن راوي"><Search size={14} /></button>
                                          <button onClick={(e) => { e.stopPropagation(); handleShowAddNarratorModal(hadith.id, nIndex); }} className="text-emerald-400 hover:text-emerald-300 p-1 rounded-full hover:bg-gray-600 flex items-center" title="إضافة راوي جديد"><Plus size={16} /></button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">المتن</label>
                    <textarea value={hadith.matn} onChange={(e) => updateHadith(hadith.id, { matn: e.target.value })} placeholder="نص الحديث..." rows={4} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {hadiths.length === 0 && (
          <div className="bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-700">
            <p className="text-gray-300 mb-4">لا توجد أحاديث. ابدأ بإضافة حديث جديد.</p>
            <button onClick={addHadith} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={20} /> إضافة أول حديث</button>
          </div>
        )}

        {showSearchModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-md w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">البحث عن راوي وتعيينه</h3>
                <button onClick={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]); setCurrentHadithId(null); setSearchingNarratorIndex(-1); }} className="text-gray-400 hover:text-gray-300"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">ابحث عن راوي</label>
                  <div className="relative">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="اكتب اسم الراوي..." className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" autoFocus />
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                  </div>
                </div>
                <div className="space-y-2">
                  {isSearching ? <div className="text-center py-4"><Loader2 className="animate-spin mx-auto mb-2" size={24} /><p className="text-gray-400">جارٍ البحث...</p></div>
                    : searchResults.length > 0 ? (
                      <>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">نتائج البحث ({searchResults.length}):</h4>
                        <div className="max-h-60 overflow-y-auto">
                          {searchResults.map((narrator) => (
                            <button key={narrator.id} onClick={() => selectSearchResult(narrator)} className="w-full text-right p-3 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors mb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1"><div className="font-medium text-white">{narrator.fullName}</div>{narrator.kunyah && <div className="text-sm text-gray-400">{narrator.kunyah}</div>}</div>
                                <span className={`text-xs px-2 py-1 rounded-full ${getGenerationColor(narrator.generation)}`}>{narrator.generation}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : searchQuery.length >= 2 ? <div className="text-center py-4"><p className="text-gray-400">لم يتم العثور على نتائج</p><p className="text-sm text-gray-500 mt-1">جرب البحث بكلمات أخرى</p></div>
                      : <div className="text-center py-4"><p className="text-gray-400">اكتب اسم الراوي للبحث</p></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {showManualNarratorModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-md w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">إضافة راوي يدوياً</h3>
                <button onClick={() => setShowManualNarratorModal(false)} className="text-gray-400 hover:text-gray-300"><X size={20} /></button>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddNarratorToChain} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">البحث عن راوي</label>
                    <div className="relative">
                      <input type="text" value={narratorSearch} onChange={(e) => setNarratorSearch(e.target.value)} placeholder="ابحث عن راوي..." className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                    </div>
                    {narratorSearchResults.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto border border-gray-600 rounded-lg">
                        {narratorSearchResults.map((narrator) => (
                          <button key={narrator.id} type="button" onClick={() => selectNarratorForManualAdd(narrator)} className="w-full text-right p-2 hover:bg-gray-700 border-b border-gray-600 last:border-b-0">
                            <div className="font-medium text-white">{narrator.fullName}</div>{narrator.kunyah && <div className="text-sm text-gray-400">{narrator.kunyah}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">ترتيب الراوي في السند</label>
                    <input type="number" value={narratorOrder} onChange={(e) => setNarratorOrder(Number(e.target.value))} min="1" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowManualNarratorModal(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">إلغاء</button>
                    <button type="submit" disabled={!selectedNarrator} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">إضافة الراوي</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showAddNarratorModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-md w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">إضافة راوي جديد</h3>
                <button onClick={() => { setShowAddNarratorModal(false); setNewNarratorData({ fullName: '', kunyah: '', generation: '', deathYear: '', translation: '' }); }} className="text-gray-400 hover:text-gray-300"><X size={20} /></button>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddNewNarratorToDB} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                    <input type="text" value={newNarratorData.fullName} onChange={(e) => setNewNarratorData({...newNarratorData, fullName: e.target.value})} placeholder="اسم الراوي الكامل" required className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">الكنية</label>
                    <input type="text" value={newNarratorData.kunyah} onChange={(e) => setNewNarratorData({...newNarratorData, kunyah: e.target.value})} placeholder="كنية الراوي (اختياري)" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">الطبقة <span className="text-red-500">*</span></label>
                    <select value={newNarratorData.generation} onChange={(e) => setNewNarratorData({...newNarratorData, generation: e.target.value})} required className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">اختر الطبقة</option>
                      <option value="صحابي">صحابي</option><option value="صحابية">صحابية</option><option value="تابعي">تابعي</option><option value="تابعية">تابعية</option><option value="تابع التابعين">تابع التابعين</option>
                      <option value="الطبقة الأولى">الطبقة الأولى</option><option value="الطبقة الثانية">الطبقة الثانية</option><option value="الطبقة الثالثة">الطبقة الثالثة</option><option value="الطبقة الرابعة">الطبقة الرابعة</option>
                      <option value="الطبقة الخامسة">الطبقة الخامسة</option><option value="الطبقة السادسة">الطبقة السادسة</option><option value="الطبقة السابعة">الطبقة السابعة</option><option value="الطبقة الثامنة">الطبقة الثامنة</option>
                      <option value="الطبقة التاسعة">الطبقة التاسعة</option><option value="الطبقة العاشرة">الطبقة العاشرة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">سنة الوفاة</label>
                    <input type="number" value={newNarratorData.deathYear} onChange={(e) => setNewNarratorData({...newNarratorData, deathYear: e.target.value})} placeholder="سنة الوفاة بالهجري" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">الترجمة</label>
                    <textarea value={newNarratorData.translation} onChange={(e) => setNewNarratorData({...newNarratorData, translation: e.target.value})} placeholder="أدخل ترجمة مختصرة للراوي..." rows={3} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" dir="rtl" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => { setShowAddNarratorModal(false); setNewNarratorData({ fullName: '', kunyah: '', generation: '', deathYear: '', translation: '' }); }} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">إلغاء</button>
                    <button type="submit" disabled={isAddingNarrator || !newNarratorData.fullName || !newNarratorData.generation} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isAddingNarrator ? <><Loader2 size={16} className="inline mr-2 animate-spin" /> جارٍ الإضافة...</> : 'إضافة الراوي'}
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