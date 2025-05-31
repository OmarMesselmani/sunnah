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
  id: number;
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
        return 'bg-emerald-100 text-emerald-800';
      case 'تابعي':
        return 'bg-blue-100 text-blue-800';
      case 'تابع التابعين':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!hadith) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600 text-xl mb-4">لم يتم العثور على الحديث</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:underline"
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Back Button */}
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-6"
        >
          <ChevronLeft size={20} />
          العودة للبحث
        </Link>

        {/* Hadith Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-emerald-700">
              <BookOpen size={24} />
              {hadith.source.name}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Hash size={18} />
              حديث رقم {hadith.hadithNumber}
            </div>
            {isVerified && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle size={18} />
                <span className="text-sm">مراجع</span>
              </div>
            )}
          </div>

          {/* Book and Chapter Info */}
          <div className="space-y-2 text-sm text-gray-600">
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
                  className="text-emerald-600 hover:underline"
                >
                  {hadith.musnadSahabi.fullName}
                  {hadith.musnadSahabi.kunyah && ` (${hadith.musnadSahabi.kunyah})`}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sanad (Chain of Narrators) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <LinkIcon size={24} className="text-emerald-600" />
            سلسلة الرواة (السند)
          </h2>
          
          {/* Visual Chain */}
          <div className="mb-4">
            {hadith.narrators.length > 0 ? (
              <div className="space-y-3">
                {hadith.narrators.map((narratorLink, index) => (
                  <div key={narratorLink.id} className="flex items-center gap-3">
                    <div className="text-2xl text-gray-400 w-8 text-center">
                      {getNarrationTypeIcon(narratorLink.narrationType)}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/narrators/${narratorLink.narrator.id}`}
                        className="inline-flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 hover:text-emerald-600">
                            {narratorLink.narrator.fullName}
                          </div>
                          {narratorLink.narrator.kunyah && (
                            <div className="text-sm text-gray-600">
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
                      <div className="text-sm text-gray-500 font-medium">
                        {narratorLink.narrationType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">لا توجد معلومات عن سلسلة الرواة</div>
            )}
          </div>

          {/* Original Sanad Text */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowFullSanad(!showFullSanad)}
              className="text-sm text-emerald-600 hover:underline mb-2"
            >
              {showFullSanad ? 'إخفاء' : 'عرض'} نص السند الكامل
            </button>
            {showFullSanad && (
              <div className="bg-gray-50 p-4 rounded-lg text-gray-700 leading-relaxed">
                {hadith.sanad}
              </div>
            )}
          </div>
        </div>

        {/* Matn (Hadith Text) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText size={24} className="text-emerald-600" />
            متن الحديث
          </h2>
          <div className="text-lg leading-relaxed text-gray-800 bg-emerald-50 p-6 rounded-lg border-r-4 border-emerald-600">
            {hadith.matn}
          </div>
        </div>

        {/* Reviews Section */}
        {hadith.manualReviews && hadith.manualReviews.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle size={24} className="text-blue-600" />
              ملاحظات المراجعة
            </h2>
            <div className="space-y-3">
              {hadith.manualReviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {review.isVerified ? (
                        <CheckCircle className="text-green-600" size={20} />
                      ) : (
                        <AlertCircle className="text-yellow-600" size={20} />
                      )}
                      <span className="text-sm font-medium">
                        {review.isVerified ? 'تمت المراجعة' : 'قيد المراجعة'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.reviewedAt).toLocaleDateString('ar')}
                    </span>
                  </div>
                  {review.reviewerNotes && (
                    <p className="text-gray-700">{review.reviewerNotes}</p>
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              <User size={20} />
              عرض جميع أحاديث {hadith.musnadSahabi.fullName}
            </Link>
          )}
          <Link
            href={`/search?source=${encodeURIComponent(hadith.source.name)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <BookOpen size={20} />
            عرض أحاديث {hadith.source.name}
          </Link>
        </div>
      </div>
    </div>
  );
}