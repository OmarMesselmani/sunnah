'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Calendar, 
  Book, 
  Users, 
  ChevronLeft,
  Scroll,
  Link as LinkIcon,
  Hash,
  ExternalLink
} from 'lucide-react';
import { getNarratorById, getNarratorHadiths, getNarratorRelations } from '@/lib/api';

interface Narrator {
  id: number;
  fullName: string;
  kunyah?: string;
  laqab?: string;
  generation: string;
  deathYear?: number;
  biography?: string;
  _count?: {
    narratedHadiths: number;
    musnadHadiths: number;
    teachersRelation: number;
    studentsRelation: number;
  };
}

interface Hadith {
  id: number;
  hadithNumber: string;
  matn: string;
  source: {
    name: string;
  };
  book?: {
    name: string;
  };
  chapter?: {
    name: string;
  };
}

interface Relation {
  id: number;
  name: string;
  relation_count: number;
}

export default function NarratorDetailPage() {
  const params = useParams();
  const narratorId = params.id as string;
  
  const [narrator, setNarrator] = useState<Narrator | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [teachers, setTeachers] = useState<Relation[]>([]);
  const [students, setStudents] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hadiths' | 'relations'>('hadiths');
  const [hadithsPage, setHadithsPage] = useState(1);
  const [totalHadithsPages, setTotalHadithsPages] = useState(1);

  useEffect(() => {
    if (narratorId) {
      loadNarratorData();
    }
  }, [narratorId]);

  useEffect(() => {
    if (narratorId && activeTab === 'hadiths') {
      loadHadiths();
    }
  }, [hadithsPage]);

  const loadNarratorData = async () => {
    try {
      setLoading(true);
      
      // Load narrator details
      const narratorData = await getNarratorById(Number(narratorId));
      setNarrator(narratorData);
      
      // Load relations
      const relationsData = await getNarratorRelations(Number(narratorId));
      setTeachers(relationsData.teachers || []);
      setStudents(relationsData.students || []);
      
      // Load first page of hadiths
      await loadHadiths();
      
    } catch (error) {
      console.error('Error loading narrator:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHadiths = async () => {
    try {
      const hadithsData = await getNarratorHadiths(Number(narratorId), {
        page: hadithsPage,
        limit: 5
      });
      setHadiths(hadithsData.hadiths || []);
      setTotalHadithsPages(hadithsData.pagination?.pages || 1);
    } catch (error) {
      console.error('Error loading hadiths:', error);
    }
  };

  const getGenerationColor = (generation: string) => {
    switch (generation) {
      case 'صحابي':
        return 'bg-emerald-100 text-emerald-800';
      case 'تابعي':
        return 'bg-blue-100 text-blue-800';
      case 'تابع التابعين':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!narrator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600 text-xl mb-4">لم يتم العثور على الراوي</p>
          <Link
            href="/narrators"
            className="inline-flex items-center gap-2 text-emerald-600 hover:underline"
          >
            <ChevronLeft size={20} />
            العودة لقائمة الرواة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/narrators"
          className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-6"
        >
          <ChevronLeft size={20} />
          العودة لقائمة الرواة
        </Link>

        {/* Narrator Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {narrator.fullName}
              </h1>
              
              <div className="space-y-2 mb-4">
                {narrator.kunyah && (
                  <p className="text-gray-600">
                    <span className="font-semibold">الكنية:</span> {narrator.kunyah}
                  </p>
                )}
                {narrator.laqab && (
                  <p className="text-gray-600">
                    <span className="font-semibold">اللقب:</span> {narrator.laqab}
                  </p>
                )}
                {narrator.deathYear && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Calendar size={18} />
                    <span className="font-semibold">سنة الوفاة:</span> {narrator.deathYear} هـ
                  </p>
                )}
              </div>

              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getGenerationColor(narrator.generation)}`}>
                {narrator.generation}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">
                  {narrator._count?.narratedHadiths || 0}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <Book size={16} />
                  حديث يرويه
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {narrator._count?.musnadHadiths || 0}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <Scroll size={16} />
                  في مسنده
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {narrator._count?.teachersRelation || 0}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <Users size={16} />
                  شيخ
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {narrator._count?.studentsRelation || 0}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <Users size={16} />
                  تلميذ
                </div>
              </div>
            </div>
          </div>

          {narrator.biography && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-lg mb-2">نبذة عن الراوي</h3>
              <p className="text-gray-700 leading-relaxed">{narrator.biography}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('hadiths')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'hadiths'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              الأحاديث التي رواها
            </button>
            <button
              onClick={() => setActiveTab('relations')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'relations'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              الشيوخ والتلاميذ
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'hadiths' ? (
              <div>
                {hadiths.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    لا توجد أحاديث مسجلة لهذا الراوي
                  </p>
                ) : (
                  <>
                    <div className="space-y-6">
                      {hadiths.map((hadith) => (
                        <Link
                          key={hadith.id}
                          href={`/hadiths/${hadith.id}`}
                          className="block border rounded-lg p-6 hover:bg-gray-50 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Hash size={16} />
                                {hadith.hadithNumber}
                              </span>
                              <span className="font-semibold text-emerald-700">
                                {hadith.source.name}
                              </span>
                              {hadith.book?.name && (
                                <span>• {hadith.book.name}</span>
                              )}
                            </div>
                            <ExternalLink 
                              size={18} 
                              className="text-gray-400 group-hover:text-emerald-600 transition-colors"
                            />
                          </div>
                          
                          {hadith.chapter?.name && (
                            <p className="text-sm text-gray-600 mb-3">
                              <span className="font-semibold">الباب:</span> {hadith.chapter.name}
                            </p>
                          )}
                          
                          <p className="text-gray-800 leading-relaxed line-clamp-3 group-hover:text-gray-900">
                            {hadith.matn}
                          </p>
                          
                          <p className="text-sm text-emerald-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            اضغط لعرض تفاصيل الحديث الكامل ←
                          </p>
                        </Link>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalHadithsPages > 1 && (
                      <div className="flex justify-center gap-2 mt-6">
                        <button
                          onClick={() => setHadithsPage(Math.max(1, hadithsPage - 1))}
                          disabled={hadithsPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          السابق
                        </button>
                        <span className="px-4 py-2">
                          صفحة {hadithsPage} من {totalHadithsPages}
                        </span>
                        <button
                          onClick={() => setHadithsPage(Math.min(totalHadithsPages, hadithsPage + 1))}
                          disabled={hadithsPage === totalHadithsPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                {/* Teachers */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="text-purple-600" size={24} />
                    الشيوخ الذين روى عنهم
                  </h3>
                  {teachers.length === 0 ? (
                    <p className="text-gray-500">لا يوجد شيوخ مسجلون</p>
                  ) : (
                    <div className="space-y-3">
                      {teachers.map((teacher) => (
                        <Link
                          key={teacher.id}
                          href={`/narrators/${teacher.id}`}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium">{teacher.name}</span>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            {teacher.relation_count}
                            <LinkIcon size={14} />
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Students */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="text-orange-600" size={24} />
                    التلاميذ الذين رووا عنه
                  </h3>
                  {students.length === 0 ? (
                    <p className="text-gray-500">لا يوجد تلاميذ مسجلون</p>
                  ) : (
                    <div className="space-y-3">
                      {students.map((student) => (
                        <Link
                          key={student.id}
                          href={`/narrators/${student.id}`}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium">{student.name}</span>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            {student.relation_count}
                            <LinkIcon size={14} />
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}