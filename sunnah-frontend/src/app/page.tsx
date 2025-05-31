'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Book, Database, Plus } from 'lucide-react';
import { getNarrators, searchHadiths, checkHealth } from '@/lib/api';
import Link from 'next/link';

export default function HomePage() {
  const [stats, setStats] = useState({
    narrators: 0,
    hadiths: 0,
    connected: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check server connection
    checkHealth()
      .then(() => {
        setStats(prev => ({ ...prev, connected: true }));
        
        // Get stats
        getNarrators({ limit: 1 }).then(data => {
          setStats(prev => ({ ...prev, narrators: data.pagination?.total || 0 }));
        });
        
        searchHadiths({ limit: 1 }).then(data => {
          setStats(prev => ({ ...prev, hadiths: data.pagination?.total || 0 }));
        });
      })
      .catch(() => {
        setStats(prev => ({ ...prev, connected: false }));
      });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100">
      {/* Hero Section - Changed to match the exact color of the Stats section (bg-gray-800) */}
      <section className="bg-gray-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            مشروع السُنّة النبوية
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            منصة رقمية شاملة لجمع وترتيب الأحاديث النبوية الشريفة
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في الأحاديث أو الرواة..."
                className="w-full px-6 py-4 pr-16 text-gray-800 bg-gray-100 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <button
                type="submit"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white p-3 rounded-full hover:bg-gray-600 transition duration-300"
              >
                <Search size={24} />
              </button>
            </div>
          </form>

          {/* Add Hadith Button */}
          <div className="mt-4">
            <Link 
              href="/admin/add-hadith" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-gray-100 rounded-full hover:bg-gray-600 transition-colors border border-gray-600"
            >
              <Plus size={18} />
              إضافة حديث جديد
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-900/30 text-emerald-400 rounded-full mb-4">
                <Users size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-2 text-white">{stats.narrators}</h3>
              <p className="text-gray-300">راوي مسجل</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-900/30 text-blue-400 rounded-full mb-4">
                <Book size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-2 text-white">{stats.hadiths}</h3>
              <p className="text-gray-300">حديث نبوي</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-900/30 text-purple-400 rounded-full mb-4">
                <Database size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-2 text-white">
                {stats.connected ? 'متصل' : 'غير متصل'}
              </h3>
              <p className="text-gray-300">حالة الخادم</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            مميزات المشروع
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:border-emerald-700 transition duration-300">
              <h3 className="text-xl font-bold mb-3 text-emerald-400">ترتيب حسب المسانيد</h3>
              <p className="text-gray-300">
                ترتيب الأحاديث حسب مسانيد الصحابة رضوان الله عليهم
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:border-blue-700 transition duration-300">
              <h3 className="text-xl font-bold mb-3 text-blue-400">ربط ذكي</h3>
              <p className="text-gray-300">
                ربط متقدم بين الرواة والأحاديث مع تتبع سلاسل الرواية
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:border-purple-700 transition duration-300">
              <h3 className="text-xl font-bold mb-3 text-purple-400">بحث متقدم</h3>
              <p className="text-gray-300">
                إمكانية البحث في المتن أو السند أو بأسماء الرواة
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}