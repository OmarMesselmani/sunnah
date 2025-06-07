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
  Edit,
  GitFork
} from 'lucide-react';
import { 
  analyzeIsnad, 
  ExtractedNarrator, 
  AnalyzedIsnadWithPaths,
  NarrationPath
} from '@/lib/gemini-api'; 
import { getNarrators, isValidUUID, searchNarratorsByName } from '@/lib/api';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';

interface HadithEntry {
  id: string; 
  sourceId: number;
  hadithNumber: string;
  sanad: string;
  matn: string;
  analysisResult?: AnalyzedIsnadWithPaths;
  isAnalyzed: boolean;
  isExpanded: boolean;
  analysisError?: string;
}

// تعريف الواجهة المحدث لـ NarratorDeathYear (إذا لم تكن مستوردة)
interface NarratorDeathYearFE { // FE for FrontEnd to avoid conflict if imported
  id: string; 
  year?: number | null;
  deathDescription?: string | null;
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
  deathYears?: NarratorDeathYearFE[];  // استخدام الواجهة المحدثة
}

const getGenerationColor = (generation: string) => {
  switch (generation) {
    case 'الطبقة الأولى':
      return 'bg-green-900/30 text-green-400';
    case 'الطبقة الثانية':
      return 'bg-blue-900/30 text-blue-400';
    case 'الطبقة الثالثة':
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
  // console.log(`🔍 تم توليد ${finalQueries.length} استعلام بحث للراوي "${name}":`, finalQueries);
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
      analysisResult: undefined,
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
  const [narratorOrder, setNarratorOrder] = useState(1); // For manual add, order in the target path

  const [currentHadithId, setCurrentHadithId] = useState<string | null>(null);
  
  const [showAddNarratorModal, setShowAddNarratorModal] = useState(false);
  const [newNarratorData, setNewNarratorData] = useState({
    fullName: '',
    kunyah: '',
    generation: '',
    deathYear: '',
    translation: ''
  });
  const [currentNarratorIndex, setCurrentNarratorIndex] = useState<number>(-1); // This is narratorIndexInPath
  const [isAddingNarrator, setIsAddingNarrator] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchingNarratorIndex, setSearchingNarratorIndex] = useState<number>(-1); // This is narratorIndexInPath for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Narrator[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [currentPathIndex, setCurrentPathIndex] = useState<number>(-1);

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
      analysisResult: undefined,
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
    
    updateHadith(hadithId, { 
      analysisError: '', 
      isAnalyzed: false, 
      analysisResult: undefined 
    });

    try {
      const analysisData: AnalyzedIsnadWithPaths = await analyzeIsnad(hadith.sanad);
      
      if (!analysisData.paths || analysisData.paths.length === 0) {
        updateHadith(hadithId, { 
          analysisError: 'لم يتم العثور على أي طرق للسند بعد التحليل.',
          isAnalyzed: false
        });
        return;
      }
      
      const updatedPathsPromises = analysisData.paths.map(async (path) => {
        const matchedNarratorsInPath = await Promise.all(
          path.narrators.map(async (narrator) => {
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
                console.error(`Error searching narrator "${narrator.name}" with query "${query}":`, error);
              }
            }
            return narrator; 
          })
        );
        return { ...path, narrators: matchedNarratorsInPath };
      });

      const resolvedUpdatedPaths = await Promise.all(updatedPathsPromises);
      
      // تعديل اسم الطريق إذا كان هناك طريق واحد فقط
      let finalPaths = resolvedUpdatedPaths;
      if (finalPaths.length === 1) {
        finalPaths[0].pathName = "السند"; // تغيير الاسم هنا
      } else {
        // التأكد من أن أسماء الطرق مرقمة بشكل صحيح إذا كان هناك أكثر من طريق
        finalPaths = finalPaths.map((p, idx) => ({
          ...p,
          pathName: p.pathName || `الطريق ${idx + 1}`
        }));
      }
      
      updateHadith(hadithId, {
        analysisResult: { paths: finalPaths },
        isAnalyzed: true,
        analysisError: undefined
      });

    } catch (error) {
      console.error('❌ خطأ في تحليل السند:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateHadith(hadithId, {
        analysisError: `خطأ في تحليل السند: ${errorMessage}`,
        isAnalyzed: false,
        analysisResult: undefined
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

  const updateNarratorInHadith = (
    hadithId: string, 
    pathIndex: number,
    narratorIndexInPath: number,
    updates: Partial<ExtractedNarrator>
  ) => {
    setHadiths(prevHadiths => prevHadiths.map(h => {
      if (h.id === hadithId && h.analysisResult && h.analysisResult.paths[pathIndex]) {
        const newAnalysisResult = JSON.parse(JSON.stringify(h.analysisResult)) as AnalyzedIsnadWithPaths;
        
        if (newAnalysisResult.paths[pathIndex].narrators[narratorIndexInPath]) {
          newAnalysisResult.paths[pathIndex].narrators[narratorIndexInPath] = { 
            ...newAnalysisResult.paths[pathIndex].narrators[narratorIndexInPath], 
            ...updates 
          };
          // Re-check duplicates if name or matching status changed, though gemini-api handles initial check
          // This is more for UI consistency if a name is manually changed to match another.
          if (updates.name || updates.matchedNarratorId) {
            if (newAnalysisResult.paths.length > 1) {
                const allNarratorNames = new Map<string, number>();
                newAnalysisResult.paths.forEach(p => {
                    p.narrators.forEach(n => {
                        allNarratorNames.set(n.name, (allNarratorNames.get(n.name) || 0) + 1);
                    });
                });
                newAnalysisResult.paths.forEach(p => {
                    p.narrators.forEach(n => {
                        n.isDuplicateAcrossPaths = (allNarratorNames.get(n.name) || 0) > 1;
                    });
                });
            }
          }
          return { ...h, analysisResult: newAnalysisResult };
        }
      }
      return h;
    }));
  };

  const removeNarratorFromHadith = (hadithId: string, pathIndex: number, narratorIndexInPath: number) => {
    setHadiths(prevHadiths => prevHadiths.map(h => {
      if (h.id === hadithId && h.analysisResult && h.analysisResult.paths[pathIndex]) {
        const newAnalysisResult = JSON.parse(JSON.stringify(h.analysisResult)) as AnalyzedIsnadWithPaths;
        
        let narratorsInPath = newAnalysisResult.paths[pathIndex].narrators;
        narratorsInPath.splice(narratorIndexInPath, 1);
        
        newAnalysisResult.paths[pathIndex].narrators = narratorsInPath.map((narrator, idx) => ({
          ...narrator,
          order: idx + 1 
        }));

        if (newAnalysisResult.paths.length > 1) {
            const allNarratorNames = new Map<string, number>();
            newAnalysisResult.paths.forEach(p => {
                p.narrators.forEach(n => {
                    allNarratorNames.set(n.name, (allNarratorNames.get(n.name) || 0) + 1);
                });
            });
            newAnalysisResult.paths.forEach(p => {
                p.narrators.forEach(n => {
                    n.isDuplicateAcrossPaths = (allNarratorNames.get(n.name) || 0) > 1;
                });
            });
        } else if (newAnalysisResult.paths.length === 1) {
            newAnalysisResult.paths[0].narrators.forEach(n => n.isDuplicateAcrossPaths = false);
        }

        return { 
          ...h, 
          analysisResult: newAnalysisResult,
          isAnalyzed: newAnalysisResult.paths.some(p => p.narrators.length > 0)
        };
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
      ...JSON.parse(JSON.stringify(hadith)), // Deep copy
      id: Date.now().toString(),
      hadithNumber: '', // Clear hadith number for duplicate
      isExpanded: true
    };
    setHadiths(prevHadiths => [...prevHadiths, newHadith]);
  };

  const saveAllHadiths = async () => {
    const readyHadiths = hadiths.filter(h => h.hadithNumber && h.sanad && h.matn && h.isAnalyzed && h.analysisResult && h.analysisResult.paths && h.analysisResult.paths.length > 0);
    if (readyHadiths.length === 0) {
      alert('لا توجد أحاديث جاهزة للحفظ. تأكد من تعبئة جميع الخانات المطلوبة وتحليل السند بشكل صحيح.');
      return;
    }
    setIsSavingAll(true);
    setSaveProgress({ current: 0, total: readyHadiths.length });
    let savedCount = 0;
    const errors: string[] = [];

    for (const hadith of readyHadiths) {
      try {
        const primaryPath = hadith.analysisResult!.paths[0]; 
        let narratorsData: Array<{ narratorId: string; orderInChain: number; narrationType?: string; }> = [];
        let musnadSahabiId: string | undefined = undefined;

        if (primaryPath && primaryPath.narrators.length > 0) {
          narratorsData = primaryPath.narrators
            .filter(n => n.matchedNarratorId && isValidUUID(n.matchedNarratorId))
            .map(n => ({
              narratorId: n.matchedNarratorId!,
              orderInChain: n.order,
              narrationType: n.narrationType
            }));
          
          const sahabiNarrator = primaryPath.narrators.find(n => n.order === 1);
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
          narrators: narratorsData,
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
        // Remove saved hadith from the list
        setHadiths(prev => prev.filter(h => h.id !== hadith.id));

      } catch (error) {
        errors.push(`خطأ في حفظ حديث رقم ${hadith.hadithNumber}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
      }
    }
    setIsSavingAll(false);
    setSaveProgress({ current: 0, total: 0 });
    if (errors.length > 0) {
      alert(`تم حفظ ${savedCount} من ${readyHadiths.length} أحاديث.\n\nالأخطاء:\n${errors.join('\n')}`);
    } else if (savedCount > 0) {
      alert(`تم حفظ جميع الأحاديث الجاهزة بنجاح (${savedCount} حديث).`);
    } else if (readyHadiths.length > 0 && savedCount === 0) {
        alert('لم يتم حفظ أي حديث. الرجاء مراجعة الأخطاء.');
    }

    // If all hadiths were processed (saved or had errors) and list is empty, add a new blank entry
    if (hadiths.filter(h => h.id !== '').length === 0) { 
        setHadiths([{
            id: Date.now().toString(),
            sourceId: 1,
            hadithNumber: '',
            sanad: '',
            matn: '',
            analysisResult: undefined,
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
    analyzed: hadiths.filter(h => h.isAnalyzed && h.analysisResult && h.analysisResult.paths && h.analysisResult.paths.some(p => p.narrators.length > 0)).length,
    ready: hadiths.filter(h => h.hadithNumber && h.sanad && h.matn && h.isAnalyzed && h.analysisResult && h.analysisResult.paths && h.analysisResult.paths.length > 0 && h.analysisResult.paths.every(p => p.narrators.every(n => n.matchedNarratorId && n.isConfirmed))).length
  };

  const removeHadithEntry = (id: string) => {
    setHadiths(prevHadiths => {
      const newList = prevHadiths.filter(h => h.id !== id);
      if (newList.length === 0) {
        return [{
          id: Date.now().toString(),
          sourceId: 1,
          hadithNumber: '',
          sanad: '',
          matn: '',
          analysisResult: undefined,
          isAnalyzed: false,
          isExpanded: true
        }];
      }
      return newList;
    });
  };

  useEffect(() => {
    const searchApi = async () => {
      if (narratorSearch.trim().length < 2) {
        setNarratorSearchResults([]);
        return;
      }
      try {
        // تأكد أن searchNarratorsByName ترجع النوع الصحيح من lib/api.ts
        const result = await searchNarratorsByName(narratorSearch); 
        setNarratorSearchResults(result.narrators || []); // الخطأ يجب أن يختفي هنا
      } catch (error) {
        console.error('Error searching narrators:', error);
      }
    };
    const handler = setTimeout(searchApi, 300);
    return () => clearTimeout(handler);
  }, [narratorSearch]);

  const selectNarratorForManualAdd = (narrator: Narrator) => {
    setSelectedNarrator(narrator);
    setNarratorSearch(narrator.fullName); // Optionally fill search bar
    setNarratorSearchResults([]); // Clear results after selection
  };

  const handleAddNarratorToChain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNarrator || !currentHadithId) return;
  
    setHadiths(prevHadiths => prevHadiths.map(h => {
      if (h.id === currentHadithId) {
        const newExtractedNarrator: ExtractedNarrator = {
          name: selectedNarrator.fullName,
          order: narratorOrder,
          matchedNarratorId: selectedNarrator.id,
          matchedNarratorName: selectedNarrator.fullName,
          isConfirmed: true,
          generation: selectedNarrator.generation,
          isDuplicateAcrossPaths: false 
        };
  
        let updatedAnalysisResult: AnalyzedIsnadWithPaths;
  
        if (!h.analysisResult || !h.analysisResult.paths || h.analysisResult.paths.length === 0) {
          updatedAnalysisResult = {
            paths: [{
              pathName: "الطريق الأول",
              narrators: [newExtractedNarrator].map((n,idx)=>({...n, order:idx+1}))
            }]
          };
        } else {
          updatedAnalysisResult = JSON.parse(JSON.stringify(h.analysisResult));
          const targetPathIndex = 0; 
          
          if (!updatedAnalysisResult.paths[targetPathIndex]) { // Ensure path exists
            updatedAnalysisResult.paths[targetPathIndex] = { pathName: `الطريق ${targetPathIndex + 1}`, narrators: [] };
          }
          let narratorsInTargetPath = updatedAnalysisResult.paths[targetPathIndex].narrators;
          narratorsInTargetPath.push(newExtractedNarrator);
          narratorsInTargetPath.sort((a, b) => a.order - b.order);
          updatedAnalysisResult.paths[targetPathIndex].narrators = narratorsInTargetPath.map((n, idx) => ({ ...n, order: idx + 1 }));
          
          if (updatedAnalysisResult.paths.length > 1) {
            const allNarratorNames = new Map<string, number>();
            updatedAnalysisResult.paths.forEach(p => {
                p.narrators.forEach(n => {
                    allNarratorNames.set(n.name, (allNarratorNames.get(n.name) || 0) + 1);
                });
            });
            updatedAnalysisResult.paths.forEach(p => {
                p.narrators.forEach(n => {
                    n.isDuplicateAcrossPaths = (allNarratorNames.get(n.name) || 0) > 1;
                });
            });
          }
        }
        
        setSelectedNarrator(null);
        setNarratorSearch('');
        setNarratorOrder(1); 
        setShowManualNarratorModal(false);
        setCurrentHadithId(null);

        return {
          ...h,
          analysisResult: updatedAnalysisResult,
          isAnalyzed: updatedAnalysisResult.paths.some(p => p.narrators.length > 0),
        };
      }
      return h;
    }));
  };

  const handleShowAddNarratorModal = (hadithId: string, pathIndex: number, narratorIndexInPath: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith || !hadith.analysisResult || !hadith.analysisResult.paths[pathIndex]) return;
    const narrator = hadith.analysisResult.paths[pathIndex].narrators[narratorIndexInPath];
    
    setCurrentHadithId(hadithId);
    setCurrentPathIndex(pathIndex);
    setCurrentNarratorIndex(narratorIndexInPath);
    setNewNarratorData({
      fullName: narrator.name, // Pre-fill with current name
      kunyah: '',
      generation: '',
      deathYear: '',
      translation: ''
    });
    setShowAddNarratorModal(true);
  };

  const handleAddNewNarratorToDB = async (e: React.FormEvent) => {
    e.preventDefault();
    // The existing guard for submit button is:
    // disabled={isAddingNarrator || !newNarratorData.fullName || !newNarratorData.generation}
    // We can add an explicit check here if needed, but the button's disabled state should cover it.

    setIsAddingNarrator(true);
    try {
      const payload: {
        fullName: string;
        generation: string;
        kunyas?: string[];
        translation?: string;
        deathYears?: Array<{ year: number | null; deathDescription?: string | null; isPrimary: boolean }>;
      } = {
        fullName: newNarratorData.fullName.trim(),
        generation: newNarratorData.generation,
      };

      if (newNarratorData.kunyah && newNarratorData.kunyah.trim()) {
        payload.kunyas = [newNarratorData.kunyah.trim()];
      }
      if (newNarratorData.translation && newNarratorData.translation.trim()) {
        payload.translation = newNarratorData.translation.trim();
      }

      const deathYearInput = newNarratorData.deathYear.trim();
      if (deathYearInput) {
        const parsedYear = parseInt(deathYearInput, 10);
        if (!isNaN(parsedYear)) {
          // إذا كان الإدخال رقمًا صحيحًا، أرسله كـ year
          payload.deathYears = [{ year: parsedYear, isPrimary: true, deathDescription: null }];
        } else {
          // إذا لم يكن الإدخال رقمًا، اعتبره deathDescription واجعل year فارغًا (null)
          payload.deathYears = [{ year: null, deathDescription: deathYearInput, isPrimary: true }];
        }
      }
      // إذا كان deathYearInput فارغًا، فلن يتم إرسال الحقل deathYears، وهو أمر مقبول.

      const response = await fetch('http://localhost:5000/api/narrators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // من الأفضل تسجيل الخطأ الفعلي من الواجهة الخلفية لمزيد من التفاصيل
        console.error('Backend error:', errorData);
        throw new Error(errorData.message || errorData.error || 'فشل إضافة الراوي');
      }
      const newNarrator = await response.json();
      
      // تحديث الراوي في السند بالمعلومات الجديدة من قاعدة البيانات
      if (currentHadithId && currentPathIndex !== -1 && currentNarratorIndex !== -1) {
        updateNarratorInHadith(currentHadithId, currentPathIndex, currentNarratorIndex, {
          matchedNarratorId: newNarrator.id,
          matchedNarratorName: newNarrator.fullName,
          isConfirmed: true,
          generation: newNarrator.generation
        });
      }

      setShowAddNarratorModal(false);
      setNewNarratorData({ fullName: '', kunyah: '', generation: '', deathYear: '', translation: '' });
      setCurrentHadithId(null); // Reset these as the modal is closing
      setCurrentPathIndex(-1);
      setCurrentNarratorIndex(-1);

    } catch (error) { 
        alert(`حدث خطأ أثناء إضافة الراوي: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        console.error('Error adding narrator to DB:', error);
    } finally { 
        setIsAddingNarrator(false); 
    }
  };
  
  const handleSearchNarrator = (hadithId: string, pathIndex: number, narratorIndexInPath: number) => {
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith || !hadith.analysisResult || !hadith.analysisResult.paths[pathIndex]) return;
    const narrator = hadith.analysisResult.paths[pathIndex].narrators[narratorIndexInPath];

    setCurrentHadithId(hadithId);
    setCurrentPathIndex(pathIndex);
    setSearchingNarratorIndex(narratorIndexInPath);
    setSearchQuery(narrator.name); 
    setSearchResults([]);
    setShowSearchModal(true);
    // Trigger search immediately
    performSearch(narrator.name);
  };

  const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // تأكد أن getNarrators ترجع النوع الصحيح من lib/api.ts
      const result = await getNarrators({ search: query, limit: 10 }); 
      setSearchResults(result.narrators || []); // الخطأ يجب أن يختفي هنا
    } catch (error) {
      console.error('Error searching narrators:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // useEffect for debounced search in modal
  useEffect(() => {
    if (!showSearchModal) return;
    const handler = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // Debounce time
    return () => clearTimeout(handler);
  }, [searchQuery, showSearchModal]);


  const handleEditNarrator = (hadithId: string, pathIndex: number, narratorIndexInPath: number) => {
    handleSearchNarrator(hadithId, pathIndex, narratorIndexInPath);
  };

  const selectSearchResult = (narrator: Narrator) => {
    if (!currentHadithId || currentPathIndex === -1 || searchingNarratorIndex === -1) return;
    updateNarratorInHadith(currentHadithId, currentPathIndex, searchingNarratorIndex, {
      matchedNarratorId: narrator.id,
      matchedNarratorName: narrator.fullName, // هذا يعرض الاسم من قاعدة البيانات بجانب اسم الإدخال
      isConfirmed: true,
      generation: narrator.generation
    });
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentHadithId(null);
    setCurrentPathIndex(-1);
    setSearchingNarratorIndex(-1);
  };

  const onNarratorDragEnd = (result: DropResult, hadithId: string, pathIndex: number) => {
    if (!result.destination) return;
    const hadith = hadiths.find(h => h.id === hadithId);
    if (!hadith || !hadith.analysisResult || !hadith.analysisResult.paths[pathIndex]) return;

    const path = hadith.analysisResult.paths[pathIndex];
    const items = Array.from(path.narrators);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedNarratorsInPath = items.map((item, index) => ({ ...item, order: index + 1 }));
    
    const newAnalysisResult = JSON.parse(JSON.stringify(hadith.analysisResult)) as AnalyzedIsnadWithPaths;
    newAnalysisResult.paths[pathIndex].narrators = updatedNarratorsInPath;
    
    updateHadith(hadithId, { 
      analysisResult: newAnalysisResult
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
            <ChevronLeft size={20} /> العودة للرئيسية
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">إضافة دفعة أحاديث</h1>
              <p className="text-gray-300 mt-2">يمكنك إضافة حتى 5 أحاديث في المرة الواحدة</p>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-700 min-w-[280px]">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold text-white">{stats.total}</div><div className="text-sm text-gray-300">إجمالي</div></div>
                <div><div className="text-2xl font-bold text-purple-400">{stats.analyzed}</div><div className="text-sm text-gray-300">محلل</div></div>
                <div><div className="text-2xl font-bold text-emerald-400">{stats.ready}</div><div className="text-sm text-gray-300">جاهز للحفظ</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3 border border-gray-700 items-center">
          <button onClick={addHadith} disabled={hadiths.length >= 5} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Plus size={20} /> إضافة حديث جديد
          </button>
          <button onClick={analyzeAllHadiths} disabled={isAnalyzingAll || hadiths.every(h => h.isAnalyzed || !h.sanad)} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {isAnalyzingAll ? <><Loader2 size={20} className="animate-spin" /> جارٍ التحليل...</> : <><Brain size={20} /> تحليل جميع الأحاديث</>}
          </button>
          <div className="ml-auto">
            <button onClick={saveAllHadiths} disabled={isSavingAll || stats.ready === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {isSavingAll ? <><Loader2 size={20} className="animate-spin" /> جارٍ الحفظ ({saveProgress.current}/{saveProgress.total})...</> : <><Save size={20} /> {stats.ready === 1 ? 'حفظ الحديث الجاهز' : `حفظ الأحاديث الجاهزة (${stats.ready})`}</>}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {hadiths.map((hadith, index) => (
            <div key={hadith.id} className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
              <div 
                className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors ${
                  hadith.isAnalyzed && 
                  hadith.analysisResult && 
                  hadith.analysisResult.paths &&
                  hadith.analysisResult.paths.length > 0 &&
                  hadith.analysisResult.paths.every(p => p.narrators.every(n => n.matchedNarratorId && n.isConfirmed)) 
                  ? 'bg-green-900/30' : '' // More subtle green for "ready"
                }`} 
                onClick={() => toggleExpand(hadith.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        hadith.isAnalyzed && hadith.analysisResult && hadith.analysisResult.paths && hadith.analysisResult.paths.length > 0 ? 'bg-purple-800 text-purple-300' : 'bg-gray-700 text-gray-400'
                    }`}>{index + 1}</div>
                    <div>
                      <div className="font-semibold text-white">حديث {hadith.hadithNumber || '(بدون رقم)'}</div>
                      <div className="text-sm mt-1">{
                        hadith.isAnalyzed && hadith.analysisResult && hadith.analysisResult.paths ? 
                        (hadith.analysisResult.paths.reduce((sum, path) => sum + path.narrators.length, 0) > 0 ?
                          <span className="text-emerald-400">
                            ✓ محلل ({hadith.analysisResult.paths.reduce((sum, path) => sum + path.narrators.length, 0)} راوي في {hadith.analysisResult.paths.length} {hadith.analysisResult.paths.length === 1 ? 'طريق' : 'طرق'})
                          </span> :
                          <span className="text-yellow-400">! محلل (لم يتم استخراج رواة)</span>
                        ) : 
                        <span className="text-gray-400">غير محلل</span>
                      }</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={(e) => { e.stopPropagation(); duplicateHadith(hadith.id); }} className="p-2 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700" title="نسخ الحديث"><Copy size={18} /></button>
                    {hadiths.length > 1 && <button onClick={(e) => { e.stopPropagation(); removeHadithEntry(hadith.id); }} className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-700" title="حذف الحديث"><X size={18} /></button>}
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
                        {/* Add other sources as needed */}
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
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button onClick={() => analyzeSingleHadith(hadith.id)} disabled={!hadith.sanad || isAnalyzingAll} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"><Brain size={16} /> تحليل السند</button>
                      <button 
                        type="button" 
                        onClick={() => { 
                          setCurrentHadithId(hadith.id); 
                          const firstPathNarrators = hadith.analysisResult?.paths?.[0]?.narrators;
                          const currentOrder = (firstPathNarrators?.length || 0) + 1;
                          setNarratorOrder(currentOrder); 
                          setShowManualNarratorModal(true); 
                        }} 
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 flex items-center gap-1"
                      >
                        <UserPlus size={16} /> إضافة راوي يدوياً
                      </button>
                    </div>
                  </div>
                  {hadith.analysisError && <div className="mb-4 bg-red-900/20 border border-red-800 text-red-400 px-3 py-2 rounded-lg text-sm"><AlertCircle size={16} className="inline mr-1" />{hadith.analysisError}</div>}
                  
                  {hadith.isAnalyzed && hadith.analysisResult && hadith.analysisResult.paths && hadith.analysisResult.paths.length > 0 && (
                    <div className="mb-4 space-y-6">
                      {hadith.analysisResult.paths.map((path, pathIdx) => (
                        <div key={`path-${hadith.id}-${pathIdx}`} className="bg-gray-700/70 rounded-lg p-4 border border-gray-600">
                          <h4 className="font-semibold text-sm mb-3 text-blue-300 flex items-center">
                            <GitFork size={16} className="mr-2" />
                            {/* تعديل هنا لعرض "السند" إذا كان هناك طريق واحد فقط */}
                            {hadith.analysisResult!.paths.length === 1 ? "السند" : (path.pathName || `الطريق ${pathIdx + 1}`)}
                            <span className="text-xs text-gray-400 mx-2">({path.narrators.length} راوي)</span>
                          </h4>
                          <DragDropContext onDragEnd={(result: DropResult) => onNarratorDragEnd(result, hadith.id, pathIdx)}>
                            <Droppable droppableId={`narrators-${hadith.id}-path-${pathIdx}`}>
                              {(provided: DroppableProvided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                  {path.narrators.map((narrator, nIndex) => (
                                    <Draggable key={`${narrator.order}-${pathIdx}-${nIndex}-${hadith.id}`} draggableId={`${narrator.order}-${pathIdx}-${nIndex}-${hadith.id}`} index={nIndex}>
                                      {(providedDraggable: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                        <div 
                                          ref={providedDraggable.innerRef} 
                                          {...providedDraggable.draggableProps} 
                                          className={`flex items-center gap-2 p-2 bg-gray-800 rounded ${snapshot.isDragging ? 'ring-2 ring-blue-400 shadow-lg' : ''} ${narrator.isDuplicateAcrossPaths ? 'border-l-4 border-yellow-500' : 'border-l-4 border-transparent'}`}
                                          style={providedDraggable.draggableProps.style}
                                        >
                                          <div {...providedDraggable.dragHandleProps} className="w-6 h-6 bg-gray-700 text-gray-400 rounded-full flex items-center justify-center text-xs font-bold cursor-move hover:bg-gray-600" title="اسحب لتغيير الترتيب">{narrator.order}</div>
                                          <input 
                                            type="text" 
                                            value={narrator.name} 
                                            onChange={(e) => updateNarratorInHadith(hadith.id, pathIdx, nIndex, { name: e.target.value })} 
                                            className={`flex-1 px-2 py-1 bg-gray-600 border border-gray-500 text-white rounded text-sm focus:ring-1 focus:ring-blue-500 ${narrator.isDuplicateAcrossPaths ? 'font-semibold text-yellow-300 placeholder-yellow-500' : ''}`}
                                            placeholder="اسم الراوي"
                                          />
                                          <button onClick={() => removeNarratorFromHadith(hadith.id, pathIdx, nIndex)} className="text-gray-400 hover:text-red-400 p-1 rounded-full hover:bg-gray-600" title="حذف الراوي"><X size={14} /></button>
                                          {narrator.matchedNarratorId ? (
                                            <div className="flex items-center gap-1 sm:gap-2">
                                              <span className={`text-xs sm:text-sm flex items-center gap-1 ${narrator.isConfirmed ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                                {narrator.isConfirmed ? '✓' : '?'} {narrator.matchedNarratorName}
                                                {narrator.generation && <span className={`text-xs px-1 py-0.5 rounded ${getGenerationColor(narrator.generation)}`}>{narrator.generation}</span>}
                                              </span>
                                              <button onClick={() => handleEditNarrator(hadith.id, pathIdx, nIndex)} className="text-gray-400 hover:text-yellow-400 p-1 rounded-full hover:bg-gray-600" title="تغيير الراوي"><Edit size={14} /></button>
                                              {!narrator.isConfirmed && <button onClick={() => updateNarratorInHadith(hadith.id, pathIdx, nIndex, { isConfirmed: true })} className="text-yellow-400 hover:text-green-400 p-1 rounded-full hover:bg-gray-600 text-xs" title="تأكيد المطابقة">✓</button>}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1 sm:gap-2">
                                              <button onClick={() => handleSearchNarrator(hadith.id, pathIdx, nIndex)} className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-gray-600" title="البحث عن راوي"><Search size={14} /></button>
                                              <button onClick={(e) => { e.stopPropagation(); handleShowAddNarratorModal(hadith.id, pathIdx, nIndex); }} className="text-emerald-400 hover:text-emerald-300 p-1 rounded-full hover:bg-gray-600 flex items-center" title="إضافة راوي جديد"><Plus size={16} /></button>
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
                      ))}
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
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">البحث عن راوي وتعيينه</h3>
                <button onClick={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]); setCurrentHadithId(null); setCurrentPathIndex(-1); setSearchingNarratorIndex(-1); }} className="text-gray-400 hover:text-gray-300 p-1 rounded-full hover:bg-gray-700"><X size={20} /></button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <div className="mb-4">
                  <label htmlFor="narrator-search-input" className="block text-sm font-medium text-gray-300 mb-2">ابحث عن راوي</label>
                  <div className="relative">
                    <input id="narrator-search-input" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="اكتب اسم الراوي..." className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" autoFocus />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {isSearching ? <div className="text-center py-4"><Loader2 className="animate-spin mx-auto mb-2 text-blue-400" size={24} /><p className="text-gray-400">جارٍ البحث...</p></div>
                    : searchResults.length > 0 ? (
                      <>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">نتائج البحث ({searchResults.length}):</h4>
                        <div className="max-h-60 overflow-y-auto pr-1">
                          {searchResults.map((narrator) => (
                            <button key={narrator.id} onClick={() => selectSearchResult(narrator)} className="w-full text-right p-3 bg-gray-700 hover:bg-gray-600/70 rounded-lg border border-gray-600 transition-colors mb-2 block">
                              <div className="flex items-center justify-between">
                                <div className="flex-1"><div className="font-medium text-white">{narrator.fullName}</div>{narrator.kunyah && <div className="text-sm text-gray-400">{narrator.kunyah}</div>}</div>
                                <span className={`text-xs px-2 py-1 rounded-full ${getGenerationColor(narrator.generation)}`}>{narrator.generation}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : searchQuery.length >= 2 ? <div className="text-center py-4"><p className="text-gray-400">لم يتم العثور على نتائج</p><p className="text-sm text-gray-500 mt-1">جرب البحث بكلمات أخرى أو تأكد من الإملاء</p></div>
                      : <div className="text-center py-4"><p className="text-gray-400">اكتب حرفين على الأقل للبحث عن راوي</p></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {showManualNarratorModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">إضافة راوي يدوياً</h3>
                <button onClick={() => {setShowManualNarratorModal(false); setSelectedNarrator(null); setNarratorSearch('');}} className="text-gray-400 hover:text-gray-300 p-1 rounded-full hover:bg-gray-700"><X size={20} /></button>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddNarratorToChain} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">البحث عن راوي موجود</label>
                    <div className="relative">
                      <input type="text" value={narratorSearch} onChange={(e) => {setNarratorSearch(e.target.value); setSelectedNarrator(null);}} placeholder="ابحث عن راوي..." className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                    {narratorSearchResults.length > 0 && !selectedNarrator && (
                      <div className="mt-2 max-h-32 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700/50">
                        {narratorSearchResults.map((narrator) => (
                          <button key={narrator.id} type="button" onClick={() => selectNarratorForManualAdd(narrator)} className="w-full text-right p-2 hover:bg-gray-600 border-b border-gray-600 last:border-b-0 block">
                            <div className="font-medium text-white">{narrator.fullName}</div>{narrator.kunyah && <div className="text-sm text-gray-400">{narrator.kunyah}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                     {selectedNarrator && (
                        <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300">
                            الراوي المختار: {selectedNarrator.fullName}
                        </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">ترتيب الراوي في السند (للطريق الأول)</label>
                    <input type="number" value={narratorOrder} onChange={(e) => setNarratorOrder(Number(e.target.value))} min="1" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => {setShowManualNarratorModal(false); setSelectedNarrator(null); setNarratorSearch('');}} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">إلغاء</button>
                    <button type="submit" disabled={!selectedNarrator} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">إضافة الراوي المختار</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showAddNarratorModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">إضافة / تعديل راوي جديد</h3>
                <button onClick={() => { setShowAddNarratorModal(false); setNewNarratorData({ fullName: '', kunyah: '', generation: '', deathYear: '', translation: '' }); setCurrentHadithId(null); setCurrentPathIndex(-1); setCurrentNarratorIndex(-1);}} className="text-gray-400 hover:text-gray-300 p-1 rounded-full hover:bg-gray-700"><X size={20} /></button>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddNewNarratorToDB} className="space-y-4">
                  <div>
                    <label htmlFor="new-narrator-fullname" className="block text-sm font-medium text-gray-300 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                    <input id="new-narrator-fullname" type="text" value={newNarratorData.fullName} onChange={(e) => setNewNarratorData({...newNarratorData, fullName: e.target.value})} placeholder="اسم الراوي الكامل" required className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="new-narrator-kunyah" className="block text-sm font-medium text-gray-300 mb-1">الكنية</label>
                    <input id="new-narrator-kunyah" type="text" value={newNarratorData.kunyah} onChange={(e) => setNewNarratorData({...newNarratorData, kunyah: e.target.value})} placeholder="كنية الراوي (اختياري)" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="new-narrator-generation" className="block text-sm font-medium text-gray-300 mb-1">الطبقة <span className="text-red-500">*</span></label>
                    <select id="new-narrator-generation" value={newNarratorData.generation} onChange={(e) => setNewNarratorData({...newNarratorData, generation: e.target.value})} required className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">اختر الطبقة</option>
                      <option value="الطبقة الأولى">الأولى</option>
                      <option value="الطبقة الثانية">الثانية</option>
                      <option value="الطبقة الثالثة">الثالثة</option>
                      <option value="الطبقة الرابعة">الرابعة</option>
                      <option value="الطبقة الخامسة">الخامسة</option>
                      <option value="الطبقة السادسة">السادسة</option>
                      <option value="الطبقة السابعة">السابعة</option>
                      <option value="الطبقة الثامنة">الثامنة</option>
                      <option value="الطبقة التاسعة">التاسعة</option>
                      <option value="الطبقة العاشرة">العاشرة</option>
                      <option value="الطبقة الحادية عشرة">الحادية عشرة</option>
                      <option value="الطبقة الثانية عشرة">الثانية عشرة</option>
                      {/* يمكنك إضافة الصحابة والتابعين هنا إذا أردت، أو إبقاؤها منفصلة كما في القائمة الأصلية */}
                      {/* <option value="صحابي">صحابي</option> */}
                      {/* <option value="تابعي">تابعي</option> */}
                      {/* <option value="تابع التابعين">تابع التابعين</option> */}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-narrator-deathyear" className="block text-sm font-medium text-gray-300 mb-1">سنة الوفاة</label>
                    <input id="new-narrator-deathyear" type="number" value={newNarratorData.deathYear} onChange={(e) => setNewNarratorData({...newNarratorData, deathYear: e.target.value})} placeholder="سنة الوفاة بالهجري" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="new-narrator-translation" className="block text-sm font-medium text-gray-300 mb-1">الترجمة</label>
                    <textarea id="new-narrator-translation" value={newNarratorData.translation} onChange={(e) => setNewNarratorData({...newNarratorData, translation: e.target.value})} placeholder="أدخل ترجمة مختصرة للراوي..." rows={3} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" dir="rtl" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => { setShowAddNarratorModal(false); setNewNarratorData({ fullName: '', kunyah: '', generation: '', deathYear: '', translation: '' }); setCurrentHadithId(null); setCurrentPathIndex(-1); setCurrentNarratorIndex(-1);}} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">إلغاء</button>
                    <button type="submit" disabled={isAddingNarrator || !newNarratorData.fullName || !newNarratorData.generation} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isAddingNarrator ? <><Loader2 size={16} className="inline mr-2 animate-spin" /> جارٍ الإضافة...</> : 'حفظ معلومات الراوي'}
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