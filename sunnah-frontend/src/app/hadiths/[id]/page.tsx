'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpen, 
  ChevronLeft, 
  User, 
  Hash,
  Bookmark,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import { getHadithById } from '@/lib/api';

interface Narrator {
  id: string | number;
  fullName: string;
  kunyah?: string;
  generation: string;
}

interface HadithNarrator {
  id: number;
  orderInChain: number;
  narrationType?: string;
  narrator: Narrator;
}

interface Hadith {
  id: number;
  hadithNumber: string;
  sanad: string;
  matn: string;
  source: {
    id: number;
    name: string;
    author?: string;
  };
  book?: {
    id: number;
    name: string;
    bookNumber?: number;
  };
  chapter?: {
    id: number;
    name: string;
    chapterNumber?: number;
  };
  musnadSahabi?: Narrator;
  narrators: HadithNarrator[];
  manualReviews?: Array<{
    id: number;
    reviewerNotes?: string;
    isVerified: boolean;
    reviewedAt: string;
  }>;
}

export default function HadithDetailPage() {
  const params = useParams();
  const hadithId = params.id as string;
  
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullSanad, setShowFullSanad] = useState(false);

  useEffect(() => {
    if (hadithId) {
      loadHadith();
    }
  }, [hadithId]);

  const loadHadith = async () => {
    try {
      setLoading(true);
      const data = await getHadithById(Number(hadithId));
      setHadith(data);
    } catch (error) {
      console.error('Error loading hadith:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGenerationColor = (generation: string) => {
    switch (generation) {
      case 'صحابي':
        return 'bg-emerald-900/30 text-emerald-400';
      case 'تابعي':
        return 'bg-blue-900/30 text-blue-400';
      case 'تابع التابعين':
        return 'bg-purple-900/30 text-purple-400';
      default:
        return 'bg-gray-800/50 text-gray-300';
    }
  };

  const getNarrationTypeIcon = (type?: string) => {
    if (!type) return '•';
    if (type.includes('حدث')) return '←';
    if (type.includes('أخبر')) return '→';
    if (type.includes('عن')) return '↓';
    return '•';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <p className="mt-4 text-gray-400">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!hadith) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto text-gray-500 mb-4" size={64} />
          <p className="text-gray-400 text-xl mb-4">لم يتم العثور على الحديث</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ChevronLeft size={20} />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = hadith.manualReviews?.some(review => review.isVerified);

  return (
    <div className="min-h-screen bg-gray-900 py-8 text-gray-100">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Back Button */}
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
        >
          <ChevronLeft size={20} />
          العودة للبحث
        </Link>

        {/* Hadith Header */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-blue-400">
              <BookOpen size={24} />
              {hadith.source.name}
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Hash size={18} />
              حديث رقم {hadith.hadithNumber}
            </div>
            {isVerified && (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle size={18} />
                <span className="text-sm">مراجع</span>
              </div>
            )}
          </div>

          {/* Book and Chapter Info */}
          <div className="space-y-2 text-sm text-gray-300">
            {hadith.book && (
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span className="font-semibold">الكتاب:</span>
                {hadith.book.name}
                {hadith.book.bookNumber && ` (${hadith.book.bookNumber})`}
              </div>
            )}
            {hadith.chapter && (
              <div className="flex items-start gap-2">
                <Bookmark size={16} className="mt-0.5" />
                <div>
                  <span className="font-semibold">الباب:</span>
                  <span className="block mr-6">{hadith.chapter.name}</span>
                </div>
              </div>
            )}
            {hadith.musnadSahabi && (
              <div className="flex items-center gap-2">
                <User size={16} />
                <span className="font-semibold">مسند:</span>
                <Link
                  href={`/narrators/${hadith.musnadSahabi.id}`}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {hadith.musnadSahabi.fullName}
                  {hadith.musnadSahabi.kunyah && ` (${hadith.musnadSahabi.kunyah})`}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sanad (Chain of Narrators) */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <LinkIcon size={24} className="text-blue-400" />
            سلسلة الرواة (السند)
          </h2>
          
          {/* Visual Chain */}
          <div className="mb-4">
            {hadith.narrators.length > 0 ? (
              <div className="space-y-3">
                {hadith.narrators.map((narratorLink, index) => (
                  <div key={narratorLink.id} className="flex items-center gap-3">
                    <div className="text-2xl text-gray-500 w-8 text-center">
                      {getNarrationTypeIcon(narratorLink.narrationType)}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/narrators/${narratorLink.narrator.id}`}
                        className="inline-flex items-center gap-2 hover:bg-gray-700 p-2 rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 bg-gray-700 text-blue-400 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-white hover:text-blue-400">
                            {narratorLink.narrator.fullName}
                          </div>
                          {narratorLink.narrator.kunyah && (
                            <div className="text-sm text-gray-300">
                              {narratorLink.narrator.kunyah}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getGenerationColor(narratorLink.narrator.generation)}`}>
                          {narratorLink.narrator.generation}
                        </span>
                      </Link>
                    </div>
                    {narratorLink.narrationType && (
                      <div className="text-sm text-gray-400 font-medium">
                        {narratorLink.narrationType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">لا توجد معلومات عن سلسلة الرواة</div>
            )}
          </div>

          {/* Original Sanad Text */}
          <div className="border-t border-gray-700 pt-4">
            <button
              onClick={() => setShowFullSanad(!showFullSanad)}
              className="text-sm text-blue-400 hover:text-blue-300 mb-2"
            >
              {showFullSanad ? 'إخفاء' : 'عرض'} نص السند الكامل
            </button>
            {showFullSanad && (
              <div className="bg-gray-700 p-4 rounded-lg text-gray-300 leading-relaxed">
                {hadith.sanad}
              </div>
            )}
          </div>
        </div>

        {/* Matn (Hadith Text) */}
        <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <FileText size={24} className="text-blue-400" />
            متن الحديث
          </h2>
          <div className="text-lg leading-relaxed text-gray-100 bg-gray-700 p-6 rounded-lg border-r-4 border-blue-600">
            {hadith.matn}
          </div>
        </div>

        {/* Reviews Section */}
        {hadith.manualReviews && hadith.manualReviews.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <AlertCircle size={24} className="text-blue-400" />
              ملاحظات المراجعة
            </h2>
            <div className="space-y-3">
              {hadith.manualReviews.map((review) => (
                <div key={review.id} className="border border-gray-700 rounded-lg p-4 bg-gray-750">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {review.isVerified ? (
                        <CheckCircle className="text-emerald-400" size={20} />
                      ) : (
                        <AlertCircle className="text-yellow-400" size={20} />
                      )}
                      <span className="text-sm font-medium text-gray-100">
                        {review.isVerified ? 'تمت المراجعة' : 'قيد المراجعة'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(review.reviewedAt).toLocaleDateString('ar')}
                    </span>
                  </div>
                  {review.reviewerNotes && (
                    <p className="text-gray-300">{review.reviewerNotes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Actions */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          {hadith.musnadSahabi && (
            <Link
              href={`/narrators/${hadith.musnadSahabi.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-900/30 text-emerald-400 rounded-lg hover:bg-emerald-900/50 transition-colors border border-emerald-800"
            >
              <User size={20} />
              عرض جميع أحاديث {hadith.musnadSahabi.fullName}
            </Link>
          )}
          <Link
            href={`/search?source=${encodeURIComponent(hadith.source.name)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900/30 text-blue-400 rounded-lg hover:bg-blue-900/50 transition-colors border border-blue-800"
          >
            <BookOpen size={20} />
            عرض أحاديث {hadith.source.name}
          </Link>
        </div>
      </div>
    </div>
  );
}