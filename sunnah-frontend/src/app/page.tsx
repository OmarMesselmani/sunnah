'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Book, Database } from 'lucide-react';
import { getNarrators, searchHadiths, checkHealth } from '@/lib/api';

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
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-emerald-900 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            مشروع السُنّة النبوية
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            منصة رقمية شاملة لجمع وترتيب الأحاديث النبوية الشريفة
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في الأحاديث أو الرواة..."
                className="w-full px-6 py-4 pr-16 text-gray-800 rounded-full text-lg"
              />
              <button
                type="submit"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-700"
              >
                <Search size={24} />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                <Users size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-2">{stats.narrators}</h3>
              <p className="text-gray-600">راوي مسجل</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Book size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-2">{stats.hadiths}</h3>
              <p className="text-gray-600">حديث نبوي</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 text-purple-600 rounded-full mb-4">
                <Database size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-2">
                {stats.connected ? 'متصل' : 'غير متصل'}
              </h3>
              <p className="text-gray-600">حالة الخادم</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            مميزات المشروع
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3">ترتيب حسب المسانيد</h3>
              <p className="text-gray-600">
                ترتيب الأحاديث حسب مسانيد الصحابة رضوان الله عليهم
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3">ربط ذكي</h3>
              <p className="text-gray-600">
                ربط متقدم بين الرواة والأحاديث مع تتبع سلاسل الرواية
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3">بحث متقدم</h3>
              <p className="text-gray-600">
                إمكانية البحث في المتن أو السند أو بأسماء الرواة
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}