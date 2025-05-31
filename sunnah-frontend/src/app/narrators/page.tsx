'use client';

import { useState, useEffect } from 'react';
import { Search, User, Calendar, ChevronRight, Filter } from 'lucide-react';
import { getNarrators } from '@/lib/api';
import Link from 'next/link';

interface Narrator {
  id: number;
  fullName: string;
  kunyah?: string;
  laqab?: string;
  generation: string;
  deathYear?: number;
  _count?: {
    narratedHadiths: number;
  };
}

export default function NarratorsPage() {
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadNarrators();
  }, [page, selectedGeneration]);

  const loadNarrators = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 12 };
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

  const generations = [
    { value: '', label: 'جميع الطبقات' },
    { value: 'صحابي', label: 'الصحابة' },
    { value: 'تابعي', label: 'التابعون' },
    { value: 'تابع التابعين', label: 'تابعو التابعين' },
  ];

  const getGenerationColor = (generation: string) => {
    switch (generation) {
      case 'صحابي':
        return 'bg-emerald-900/30 text-emerald-400';
      case 'تابعي':
        return 'bg-blue-900/30 text-blue-400';
      case 'تابع التابعين':
        return 'bg-purple-900/30 text-purple-400';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">الرواة</h1>
          <p className="text-gray-400 text-lg">
            استعرض قائمة رواة الحديث النبوي الشريف
          </p>
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

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
            <p className="mt-4 text-gray-400">جارٍ التحميل...</p>
          </div>
        ) : (
          <>
            {/* Narrators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {narrators.map((narrator) => (
                <Link
                  key={narrator.id}
                  href={`/narrators/${narrator.id}`}
                  className="bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-all hover:-translate-y-1 block border border-gray-700 hover:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {narrator.fullName}
                      </h3>
                      {narrator.kunyah && (
                        <p className="text-gray-400 text-sm">
                          الكنية: {narrator.kunyah}
                        </p>
                      )}
                      {narrator.laqab && (
                        <p className="text-gray-400 text-sm">
                          اللقب: {narrator.laqab}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="text-gray-500 mt-1" size={20} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getGenerationColor(narrator.generation)}`}>
                      {narrator.generation}
                    </span>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {narrator.deathYear && (
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>{narrator.deathYear} هـ</span>
                        </div>
                      )}
                      {narrator._count?.narratedHadiths ? (
                        <div className="flex items-center gap-1">
                          <User size={16} />
                          <span>{narrator._count.narratedHadiths} حديث</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* No Results */}
            {narrators.length === 0 && (
              <div className="text-center py-12">
                <User className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-400 text-lg">لم يتم العثور على رواة</p>
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
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
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