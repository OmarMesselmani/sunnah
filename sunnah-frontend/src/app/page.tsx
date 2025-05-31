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
    checkHealth()
      .then(() => {
        setStats(prev => ({ ...prev, connected: true }));
        
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
      <section className="hero-section">
        <div className="hero-container">
          <h1 className="hero-title">
            مشروع السُنّة النبوية
          </h1>
          <p className="hero-subtitle">
            منصة رقمية شاملة لجمع وترتيب الأحاديث النبوية الشريفة
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-wrapper">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في الأحاديث أو الرواة..."
                className="search-input"
              />
              <button
                type="submit"
                className="search-button"
              >
                <Search size={24} />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon green">
                <Users size={40} />
              </div>
              <h3 className="stat-number">{stats.narrators}</h3>
              <p className="stat-label">راوي مسجل</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <Book size={40} />
              </div>
              <h3 className="stat-number">{stats.hadiths}</h3>
              <p className="stat-label">حديث نبوي</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">
                <Database size={40} />
              </div>
              <h3 className="stat-number">
                {stats.connected ? 'متصل' : 'غير متصل'}
              </h3>
              <p className="stat-label">حالة الخادم</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="features-title">
            مميزات المشروع
          </h2>

          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-title">ترتيب حسب المسانيد</h3>
              <p className="feature-description">
                ترتيب الأحاديث حسب مسانيد الصحابة رضوان الله عليهم
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">ربط ذكي</h3>
              <p className="feature-description">
                ربط متقدم بين الرواة والأحاديث مع تتبع سلاسل الرواية
              </p>
            </div>

            <div className="feature-card">
              <h3 className="feature-title">بحث متقدم</h3>
              <p className="feature-description">
                إمكانية البحث في المتن أو السند أو بأسماء الرواة
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}