'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Save, 
  Search, 
  Brain, 
  ChevronLeft, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  Hash
} from 'lucide-react';
import { analyzeIsnad, generateSearchQueries } from '@/lib/gemma-api';
import { getNarrators } from '@/lib/api';

interface ExtractedNarrator {
  name: string;
  order: number;
  narrationType?: string;
  possibleVariations?: string[];
  matchedNarratorId?: number;
  matchedNarratorName?: string;
  isConfirmed?: boolean;
}

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

  // حذف حديث
  const removeHadith = (id: string) => {
    setHadiths(hadiths.filter(h => h.id !== id));
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
        analysisError: 'خطأ في تحليل السند. تأكد من تشغيل Ollama'
      });
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
                matchedNarratorId: match.id,
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
          matchedNarratorId: match.id,
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
    const readyHadiths = hadiths.filter(h => 
      h.hadithNumber && 
      h.sanad && 
      h.matn && 
      h.isAnalyzed &&
      h.extractedNarrators.every(n => n.matchedNarratorId)
    );

    if (readyHadiths.length === 0) {
      alert('لا توجد أحاديث جاهزة للحفظ. تأكد من تحليل وربط جميع الرواة');
      return;
    }

    setIsSavingAll(true);
    setSaveProgress({ current: 0, total: readyHadiths.length });

    let savedCount = 0;
    const errors: string[] = [];

    for (const hadith of readyHadiths) {
      try {
        // إعداد بيانات الرواة
        const narratorsData = hadith.extractedNarrators.map(n => ({
          narratorId: n.matchedNarratorId!,
          orderInChain: n.order,
          narrationType: n.narrationType
        }));

        // تحديد الصحابي (آخر راوي عادة)
        const lastNarrator = hadith.extractedNarrators[hadith.extractedNarrators.length - 1];
        const musnadSahabiId = lastNarrator?.matchedNarratorId;

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
          throw new Error(`Failed to save hadith ${hadith.hadithNumber}`);
        }

        savedCount++;
        setSaveProgress({ current: savedCount, total: readyHadiths.length });

        // حذف الحديث المحفوظ من القائمة
        setHadiths(prev => prev.filter(h => h.id !== hadith.id));

      } catch (error) {
        errors.push(`خطأ في حفظ حديث رقم ${hadith.hadithNumber}`);
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

  // حساب الإحصائيات
  const stats = {
    total: hadiths.length,
    analyzed: hadiths.filter(h => h.isAnalyzed).length,
    ready: hadiths.filter(h => 
      h.hadithNumber && 
      h.sanad && 
      h.matn && 
      h.isAnalyzed &&
      h.extractedNarrators.every(n => n.matchedNarratorId)
    ).length
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-4"
          >
            <ChevronLeft size={20} />
            العودة للرئيسية
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إضافة دفعة أحاديث</h1>
              <p className="text-gray-600 mt-2">
                يمكنك إضافة حتى 5 أحاديث في المرة الواحدة
              </p>
            </div>
            
            {/* Statistics */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">إجمالي</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.analyzed}</div>
                  <div className="text-sm text-gray-600">محلل</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
                  <div className="text-sm text-gray-600">جاهز</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3">
          <button
            onClick={addHadith}
            disabled={hadiths.length >= 5}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 mr-auto"
          >
            {isSavingAll ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                جارٍ الحفظ ({saveProgress.current}/{saveProgress.total})...
              </>
            ) : (
              <>
                <Save size={20} />
                حفظ الأحاديث الجاهزة ({stats.ready})
              </>
            )}
          </button>
        </div>

        {/* Hadiths List */}
        <div className="space-y-4">
          {hadiths.map((hadith, index) => (
            <div key={hadith.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Hadith Header */}
              <div 
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  hadith.isAnalyzed && hadith.extractedNarrators.every(n => n.matchedNarratorId)
                    ? 'bg-green-50' : ''
                }`}
                onClick={() => toggleExpand(hadith.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">
                        حديث {hadith.hadithNumber || '(بدون رقم)'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {hadith.isAnalyzed ? (
                          <span className="text-green-600">
                            ✓ محلل ({hadith.extractedNarrators.length} راوي)
                          </span>
                        ) : (
                          <span className="text-gray-500">غير محلل</span>
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
                      className="p-2 text-gray-500 hover:text-emerald-600"
                      title="نسخ الحديث"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHadith(hadith.id);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المصدر
                      </label>
                      <select
                        value={hadith.sourceId}
                        onChange={(e) => updateHadith(hadith.id, { sourceId: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={1}>صحيح البخاري</option>
                        <option value={2}>صحيح مسلم</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        رقم الحديث
                      </label>
                      <input
                        type="text"
                        value={hadith.hadithNumber}
                        onChange={(e) => updateHadith(hadith.id, { hadithNumber: e.target.value })}
                        placeholder="مثال: 1234"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السند
                    </label>
                    <textarea
                      value={hadith.sanad}
                      onChange={(e) => updateHadith(hadith.id, { sanad: e.target.value })}
                      placeholder="حدثنا..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={() => analyzeSingleHadith(hadith.id)}
                      disabled={!hadith.sanad || isAnalyzingAll}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Brain size={16} />
                      تحليل السند
                    </button>
                  </div>

                  {hadith.analysisError && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-sm">
                      <AlertCircle size={16} className="inline mr-1" />
                      {hadith.analysisError}
                    </div>
                  )}

                  {/* Extracted Narrators */}
                  {hadith.extractedNarrators.length > 0 && (
                    <div className="mb-4 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-3">سلسلة الرواة:</h4>
                      <div className="space-y-2">
                        {hadith.extractedNarrators.map((narrator, nIndex) => (
                          <div key={nIndex} className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                              {narrator.order}
                            </div>
                            <input
                              type="text"
                              value={narrator.name}
                              onChange={(e) => updateNarratorInHadith(hadith.id, nIndex, { name: e.target.value })}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <select
                              value={narrator.narrationType || ''}
                              onChange={(e) => updateNarratorInHadith(hadith.id, nIndex, { narrationType: e.target.value })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">-</option>
                              <option value="حدثنا">حدثنا</option>
                              <option value="أخبرنا">أخبرنا</option>
                              <option value="عن">عن</option>
                              <option value="قال">قال</option>
                            </select>
                            {narrator.matchedNarratorId ? (
                              <span className="text-green-600 text-sm">
                                ✓ {narrator.matchedNarratorName}
                              </span>
                            ) : (
                              <button
                                onClick={() => searchSingleNarrator(hadith.id, nIndex)}
                                className="text-emerald-600 hover:underline text-sm"
                              >
                                <Search size={14} className="inline" /> بحث
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المتن
                    </label>
                    <textarea
                      value={hadith.matn}
                      onChange={(e) => updateHadith(hadith.id, { matn: e.target.value })}
                      placeholder="نص الحديث..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {hadiths.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">لا توجد أحاديث. ابدأ بإضافة حديث جديد.</p>
            <button
              onClick={addHadith}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus size={20} />
              إضافة أول حديث
            </button>
          </div>
        )}
      </div>
    </div>
  );
}