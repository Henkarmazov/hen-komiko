/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Menu as MenuIcon, Book, LayoutGrid, Home as HomeIcon, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, ArrowUpDown, Loader2, AlertCircle, X, Bookmark, Heart, Trash2, Check, ArrowLeft, Facebook, Instagram, Globe, Music2 } from 'lucide-react';

interface ComicData {
  title: string;
  slug: string;
  url: string;
  desc: string;
  chapter: string;
  cover: string;
  background: string;
  genres: string[];
  rating?: string;
}

interface HomeData {
  slider: ComicData[];
  popularToday: ComicData[];
  latest: ComicData[];
  popularSerial: {
    weekly: ComicData[];
    monthly: ComicData[];
    alltime: ComicData[];
  };
}

interface Chapter {
  name: string;
  number?: number | null;
  url: string;
  slug: string;
  date: string;
}

interface ChapterPagination {
  current_page: number;
  total_pages: number;
  total_record: number;
  page_size: number;
}

interface ComicDetail {
  title: string;
  slug: string;
  cover: string;
  banner: string;
  rating: string;
  synopsis: string;
  genres: string[];
  info: {
    judul_alt: string;
    status: string;
    jenis_komik: string;
    pengarang: string;
    artist: string;
  };
  chapters: Chapter[];
  pagination?: ChapterPagination;
}

interface ChapterData {
  title: string;
  images: string[];
  prev_chapter?: { chapter_id: string; chapter_number: number | string; url: string } | null;
  next_chapter?: { chapter_id: string; chapter_number: number | string; url: string } | null;
  chapter_number?: number | string;
}

interface HistoryItem extends ComicData {
  viewedAt: number;
}

const PLACEHOLDER_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" fill="%23f3f4f6"><rect width="300" height="400" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="16" font-weight="bold">No Cover</text></svg>';

const getValidImgSrc = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return PLACEHOLDER_COVER;
  }
  return url.trim();
};

const ComicCard = ({ 
  comic, 
  onClick, 
  index, 
  onGenreClick,
  showGenres = true,
  className = "",
  extraOverlay
}: { 
  comic: ComicData; 
  onClick: () => void | Promise<void>; 
  index: number;
  onGenreClick?: (genre: string) => void;
  showGenres?: boolean;
  className?: string;
  extraOverlay?: React.ReactNode;
  key?: any;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
    className={`group cursor-pointer ${className}`}
    onClick={onClick}
  >
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 h-full flex flex-col">
      <div className="aspect-[3/4] overflow-hidden relative">
        <img
          src={getValidImgSrc(comic.cover)}
          alt={comic.title || "Comic"}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_COVER;
          }}
        />
        {showGenres && comic.genres && comic.genres.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[90%]">
            {comic.genres.slice(0, 2).map((genre, idx) => (
              <button 
                key={idx} 
                onClick={(e) => {
                  e.stopPropagation();
                  onGenreClick?.(genre);
                }}
                className="px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[9px] text-white font-bold rounded uppercase hover:bg-hex-accent transition-colors cursor-pointer"
              >
                {genre}
              </button>
            ))}
          </div>
        )}
        {extraOverlay ? (
          <div className="absolute top-2 right-2 z-10">
            {extraOverlay}
          </div>
        ) : (
          comic.rating && comic.rating !== '0.00' && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-[9px] text-white font-bold rounded flex items-center gap-1">
               ⭐ {comic.rating}
            </div>
          )
        )}
      </div>
      
      <div className="p-2 sm:p-3 flex-grow flex flex-col justify-between">
        <h3 className="text-[10px] sm:text-sm font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-hex-accent transition-colors">
          {comic.title}
        </h3>
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-[9px] sm:text-[11px] font-medium text-gray-500 bg-gray-50 px-1 sm:px-1.5 py-0.5 rounded border border-gray-100">
            {comic.chapter || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  </motion.div>
);

export default function App() {
  const [activeMenu, setActiveMenu] = useState('Home');
  const [view, setView] = useState<'home' | 'detail' | 'reader' | 'search' | 'bookmarks' | 'genres' | 'comic-list' | 'history' | 'about'>('home');
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [searchResults, setSearchResults] = useState<ComicData[]>([]);
  const [bookmarks, setBookmarks] = useState<ComicData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [genres, setGenres] = useState<{name: string, slug: string, count: string}[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<{ name: string; slug: string } | null>(null);
  const [genreComics, setGenreComics] = useState<ComicData[]>([]);
  const [genrePage, setGenrePage] = useState<number>(1);
  const [genreTotalPages, setGenreTotalPages] = useState<number>(1);
  const [genreTotalRecord, setGenreTotalRecord] = useState<number>(0);
  const [genreLoading, setGenreLoading] = useState<boolean>(false);
  const [genreSearchInput, setGenreSearchInput] = useState<string>('');
  const [currentComicUrl, setCurrentComicUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache Store
  const apiCache = React.useRef<Record<string, { data: any, timestamp: number }>>({});
  const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes cache

  const fetchWithCache = async (url: string) => {
    const now = Date.now();
    if (apiCache.current[url] && (now - apiCache.current[url].timestamp < CACHE_DURATION)) {
      return apiCache.current[url].data;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status) {
      apiCache.current[url] = { data, timestamp: now };
    }
    return data;
  };

  const [detailData, setDetailData] = useState<ComicDetail | null>(null);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(-1);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [chapterSortOrder, setChapterSortOrder] = useState<'desc' | 'asc'>('desc');
  const [popularPeriod, setPopularPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [chapterPage, setChapterPage] = useState<number>(1);
  const [chapterPageSize, setChapterPageSize] = useState<number>(50);
  const [chaptersLoading, setChaptersLoading] = useState<boolean>(false);
  const [chapterSearchQuery, setChapterSearchQuery] = useState<string>('');

  useEffect(() => {
    const savedBookmarks = localStorage.getItem('henkomiko-bookmarks');
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (e) {
        console.error('Failed to parse bookmarks', e);
      }
    }

    const savedHistory = localStorage.getItem('henkomiko-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await fetchWithCache('/api/home');
        
        if (result.status) {
          setHomeData(result.data);
        } else {
          setError(result.message || 'Gagal memuat data');
        }
      } catch (err) {
        setError('Terjadi kesalahan saat menghubungi server');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const result = await fetchWithCache('/api/genres');
      if (result.status) {
        setGenres(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch genres', err);
    }
  };

  const handleOpenGenrePage = () => {
    setView('genres');
    setActiveMenu('Daftar Genre');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGenre = async (slug: string, name?: string, page: number = 1) => {
    const found = genres.find(g => g.slug.toLowerCase() === slug.toLowerCase() || g.name.toLowerCase() === slug.toLowerCase());
    const genreName = name || (found ? found.name : slug);
    const genreSlug = found ? found.slug : slug;

    setSelectedGenre({ name: genreName, slug: genreSlug });
    setGenrePage(page);
    setView('genres');
    setActiveMenu('Daftar Genre');
    setGenreLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const result = await fetchWithCache(`/api/genres/${encodeURIComponent(genreSlug)}?page=${page}`);
      if (result.status) {
        setGenreComics(result.data || []);
        if (result.pagination) {
          setGenreTotalPages(result.pagination.total_pages || 1);
          setGenreTotalRecord(result.pagination.total_record || result.data?.length || 0);
        }
      } else {
        setGenreComics([]);
      }
    } catch (e) {
      console.error('Failed to load comics for genre', e);
      setGenreComics([]);
    } finally {
      setGenreLoading(false);
    }
  };

  const handleGenreTagClick = (genreName: string) => {
    const foundGenre = genres.find(g => g.name.toLowerCase() === genreName.toLowerCase() || g.slug.toLowerCase() === genreName.toLowerCase());
    const genreSlug = foundGenre ? foundGenre.slug : genreName.toLowerCase().replace(/\s+/g, '-');
    const displayName = foundGenre ? foundGenre.name : genreName;
    handleSelectGenre(genreSlug, displayName, 1);
  };

  const toggleBookmark = (comic: ComicData | null) => {
    if (!comic) return;
    
    setBookmarks((prev) => {
      const isBookmarked = prev.some((b) => b.url === comic.url);
      let newBookmarks;
      if (isBookmarked) {
        newBookmarks = prev.filter((b) => b.url !== comic.url);
      } else {
        newBookmarks = [...prev, comic];
      }
      localStorage.setItem('henkomiko-bookmarks', JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  };

  const addToHistory = (comic: ComicData) => {
    setHistory((prev) => {
      const filteredHistory = prev.filter(item => item.url !== comic.url);
      const newHistory = [{ ...comic, viewedAt: Date.now() }, ...filteredHistory].slice(0, 50);
      localStorage.setItem('henkomiko-history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('henkomiko-history');
  };

  const handleComicClick = async (url: string) => {
    try {
      setDetailLoading(true);
      setView('detail');
      setCurrentComicUrl(url);
      setChapterPage(1);
      setChapterSearchQuery('');
      window.scrollTo(0, 0);
      
      const result = await fetchWithCache(`/api/detail?url=${encodeURIComponent(url)}&page=1&page_size=${chapterPageSize}`);
      
      if (result.status) {
        setDetailData(result.data);
        
        // Add to history
        const comicToHistory: ComicData = {
          title: result.data.title,
          slug: result.data.slug,
          url: url,
          desc: result.data.synopsis,
          chapter: result.data.chapters[0]?.name || '',
          cover: result.data.cover,
          background: result.data.banner || result.data.cover,
          genres: result.data.genres,
          rating: result.data.rating
        };
        addToHistory(comicToHistory);
      } else {
        setError(result.message || 'Gagal memuat detail komik');
      }
    } catch (err) {
      setError('Gagal memuat detail komik');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleChapterPageChange = async (targetPage: number) => {
    if (!currentComicUrl || chaptersLoading) return;
    if (targetPage < 1) return;
    if (detailData?.pagination && targetPage > detailData.pagination.total_pages) return;
    
    try {
      setChaptersLoading(true);
      const url = `/api/chapters?url=${encodeURIComponent(currentComicUrl)}&page=${targetPage}&page_size=${chapterPageSize}`;
      const result = await fetchWithCache(url);
      if (result.status && result.data) {
        setDetailData((prev) => prev ? {
          ...prev,
          chapters: result.data.chapters,
          pagination: result.data.pagination
        } : null);
        setChapterPage(targetPage);
      }
    } catch (e) {
      console.error('Failed to change chapter page:', e);
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleChapterPageSizeChange = async (newSize: number) => {
    if (!currentComicUrl || chaptersLoading || newSize === chapterPageSize) return;
    try {
      setChaptersLoading(true);
      setChapterPageSize(newSize);
      const url = `/api/chapters?url=${encodeURIComponent(currentComicUrl)}&page=1&page_size=${newSize}`;
      const result = await fetchWithCache(url);
      if (result.status && result.data) {
        setDetailData((prev) => prev ? {
          ...prev,
          chapters: result.data.chapters,
          pagination: result.data.pagination
        } : null);
        setChapterPage(1);
      }
    } catch (e) {
      console.error('Failed to change chapter page size:', e);
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleChapterClick = async (chapter: Chapter, index: number) => {
    try {
      setReaderLoading(true);
      setView('reader');
      setCurrentChapterIndex(index);
      window.scrollTo(0, 0);

      const result = await fetchWithCache(`/api/chapter?url=${encodeURIComponent(chapter.url)}`);

      if (result.status) {
        setChapterData(result.data);
      } else {
        setError(result.message || 'Gagal memuat isi chapter');
      }
    } catch (err) {
      setError('Gagal memuat isi chapter');
    } finally {
      setReaderLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent | string) => {
    const query = typeof e === 'string' ? e : searchQuery;
    if (!query.trim()) return;
    
    if (typeof e !== 'string') e.preventDefault();

    try {
      setSearchLoading(true);
      setView('search');
      setActiveMenu('');
      window.scrollTo(0, 0);

      const result = await fetchWithCache(`/api/search?q=${encodeURIComponent(query)}`);

      if (result.status) {
        setSearchResults(result.data);
      } else {
        setError(result.message || 'Gagal mencari komik');
      }
    } catch (err) {
      setError('Gagal mencari komik');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNextChapter = () => {
    if (chapterData?.next_chapter?.url) {
      handleChapterClick({
        name: `Chapter ${chapterData.next_chapter.chapter_number}`,
        url: chapterData.next_chapter.url,
        slug: chapterData.next_chapter.url,
        date: ''
      }, -1);
      return;
    }
    if (detailData && currentChapterIndex > 0) {
      const nextIndex = currentChapterIndex - 1;
      handleChapterClick(detailData.chapters[nextIndex], nextIndex);
    }
  };

  const handlePrevChapter = () => {
    if (chapterData?.prev_chapter?.url) {
      handleChapterClick({
        name: `Chapter ${chapterData.prev_chapter.chapter_number}`,
        url: chapterData.prev_chapter.url,
        slug: chapterData.prev_chapter.url,
        date: ''
      }, -1);
      return;
    }
    if (detailData && currentChapterIndex >= 0 && currentChapterIndex < detailData.chapters.length - 1) {
      const prevIndex = currentChapterIndex + 1;
      handleChapterClick(detailData.chapters[prevIndex], prevIndex);
    }
  };

  const handleBackToDetail = () => {
    setView('detail');
    setChapterData(null);
  };

  // Navigation History Handling
  const isPopStateChange = React.useRef(false);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPopStateChange.current = true;
      if (event.state && event.state.view) {
        setView(event.state.view);
        if (event.state.detailData) setDetailData(event.state.detailData);
        if (event.state.readerData) setChapterData(event.state.readerData);
      } else {
        setView('home');
        setDetailData(null);
        setChapterData(null);
      }
      setTimeout(() => {
        isPopStateChange.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initial state
    window.history.replaceState({ view: 'home' }, '');

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state changes to history
  useEffect(() => {
    if (isPopStateChange.current) return;

    const currentState = window.history.state;
    if (currentState?.view !== view) {
      window.history.pushState({ 
        view, 
        detailData: view === 'detail' ? detailData : (view === 'reader' ? detailData : null),
        readerData: view === 'reader' ? chapterData : null
      }, '', view === 'home' ? '/' : `/${view}`);
    }
  }, [view]);

  const handleBackToHome = () => {
    setView('home');
    setDetailData(null);
    setChapterData(null);
    setError(null);
  };

  // Automatic slide interval for hero banner
  useEffect(() => {
    if (homeData?.slider && homeData.slider.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % Math.min(homeData.slider.length, 5));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [homeData]);

  const featuredComics = homeData?.slider || [];
  const latestComics = homeData?.latest || [];
  const popularComics = homeData?.popularToday || [];
  const activeFeatured = featuredComics[currentSlide];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hex-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-hex-accent animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Memuat Halaman</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hex-bg px-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops! Ada Masalah</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-hex-accent text-white font-semibold rounded hover:bg-hex-accent/90 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      {view !== 'reader' && (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center gap-2 cursor-pointer" onClick={handleBackToHome}>
                <div className="w-8 h-8 bg-hex-accent flex items-center justify-center rounded">
                  <span className="text-white font-bold text-lg">H</span>
                </div>
                <span className="text-2xl font-bold tracking-tighter text-gray-900">HENKOMIKO</span>
              </div>

              {/* Desktop Menu */}
              <div className="hidden lg:flex items-center space-x-8">
                {[
                  { name: 'Home', icon: HomeIcon, action: handleBackToHome },
                  { name: 'Daftar Genre', icon: LayoutGrid, action: handleOpenGenrePage },
                  { name: 'Bookmark', icon: Bookmark, action: () => { setView('bookmarks'); } },
                  { name: 'Riwayat', icon: Book, action: () => { setView('history'); } }
                ].map(({ name, icon: Icon, action }) => (
                  <button
                    key={name}
                    onClick={() => {
                      setActiveMenu(name);
                      action();
                    }}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      activeMenu === name ? 'text-hex-accent' : 'text-gray-500 hover:text-hex-accent'
                    }`}
                  >
                    <Icon size={18} />
                    {name}
                  </button>
                ))}
              </div>

              {/* Search Feature (Desktop) */}
              <div className="flex-1 max-w-md mx-8 hidden lg:block">
                <form onSubmit={handleSearch} className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-hex-accent transition-colors" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul komik..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-hex-accent focus:ring-4 focus:ring-hex-accent/10 transition-all shadow-inner"
                  />
                </form>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:gap-4">
                <button 
                  onClick={() => setShowMobileSearch(!showMobileSearch)}
                  className="lg:hidden text-hex-accent bg-gray-50 p-2.5 hover:bg-hex-accent/10 rounded-full transition-all"
                  aria-label="Toggle search"
                >
                  {showMobileSearch ? <X size={22} /> : <Search size={22} />}
                </button>
                <button 
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="lg:hidden text-gray-600 p-2.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {showMobileMenu ? <X size={24} /> : <MenuIcon size={24} />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Sidebar */}
            {showMobileMenu && (
              <div className="fixed inset-0 z-[100] lg:hidden">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowMobileMenu(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl p-6 pt-24 flex flex-col gap-6"
                >
                  {[
                    { name: 'Beranda', icon: HomeIcon, action: () => { handleBackToHome(); setShowMobileMenu(false); } },
                    { name: 'Daftar Genre', icon: LayoutGrid, action: () => { handleOpenGenrePage(); setShowMobileMenu(false); } },
                    { name: 'Bookmark', icon: Bookmark, action: () => { setView('bookmarks'); setShowMobileMenu(false); } },
                    { name: 'Riwayat', icon: Book, action: () => { setView('history'); setShowMobileMenu(false); } },
                    { name: 'Tentang', icon: AlertCircle, action: () => { setView('about'); setShowMobileMenu(false); } }
                  ].map((item) => (
                    <button
                      key={item.name}
                      onClick={item.action}
                      className="flex items-center gap-4 text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 text-left"
                    >
                      <item.icon size={22} className="text-hex-accent shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => setShowMobileMenu(false)}
                    className="mt-auto mb-8 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-400 rounded-xl font-bold text-sm"
                  >
                    <X size={18} />
                    Tutup Menu
                  </button>
                </motion.div>
              </div>
            )}

            {/* Mobile Search Input Expansion */}
            {showMobileSearch && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="lg:hidden pb-4 px-2"
              >
                <form onSubmit={(e) => {
                  handleSearch(e);
                  setShowMobileSearch(false);
                }} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul komik..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-hex-accent transition-all"
                  />
                </form>
              </motion.div>
            )}
          </div>
        </nav>
      )}

      <main className={`flex-grow ${view === 'reader' ? 'pt-0' : 'pt-6'}`}>
        {view === 'home' ? (
          <>
            {/* Hero Section - Panoramic Slider */}
            <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-4">
              <div className="relative w-full h-[220px] md:h-[300px] lg:h-[380px] bg-gray-900 overflow-hidden shadow-lg rounded-2xl group/slider">
                <AnimatePresence mode="wait">
                  {activeFeatured && (
                    <motion.div 
                      key={currentSlide}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.8 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(e, { offset, velocity }) => {
                        const swipe = offset.x;
                        if (swipe < -50) {
                          setCurrentSlide((prev) => (prev + 1) % Math.min(featuredComics.length, 5));
                        } else if (swipe > 50) {
                          setCurrentSlide((prev) => (prev - 1 + Math.min(featuredComics.length, 5)) % Math.min(featuredComics.length, 5));
                        }
                      }}
                      className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    >
                      {(activeFeatured.background || activeFeatured.cover) ? (
                        <img
                          src={getValidImgSrc(activeFeatured.background || activeFeatured.cover)}
                          alt={activeFeatured.title || "Featured"}
                          className="absolute inset-0 w-full h-full object-cover opacity-80 object-top"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-black/30" />
                      
                      <div className="relative h-full flex flex-col justify-center px-6 md:px-12 py-8 text-white">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="max-w-2xl"
                        >
                          <h1 className="text-2xl md:text-5xl font-bold mb-3 tracking-tight line-clamp-1">
                            {activeFeatured.title}
                          </h1>
                          <p className="text-gray-300 text-xs md:text-sm mb-6 line-clamp-2 max-w-lg leading-relaxed">
                            {activeFeatured.desc || "Baca petulangan seru hari ini di HENKOMIKO Reader."}
                          </p>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleComicClick(activeFeatured.url)}
                              className="px-4 py-1.5 sm:px-5 sm:py-2 bg-hex-accent hover:bg-hex-accent/90 text-white text-[11px] sm:text-xs font-bold rounded shadow-lg transition-all flex items-center gap-1.5"
                            >
                              Baca Sekarang
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Slider Controls */}
                <button 
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + Math.min(featuredComics.length, 5)) % Math.min(featuredComics.length, 5))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-black/50"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % Math.min(featuredComics.length, 5))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-black/50"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Slider Dots */}
                {featuredComics.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {featuredComics.slice(0, 5).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          idx === currentSlide ? 'bg-hex-accent w-5' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Featured Popular Today */}
            {popularComics.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 pt-12">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Populer Hari Ini</h2>
                    <div className="h-1 w-12 bg-hex-accent mt-1 rounded-full"></div>
                  </div>
                </div>

                <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide snap-x">
                  {popularComics.map((comic, index) => (
                    <ComicCard
                      key={index}
                      comic={comic}
                      index={index}
                      onClick={() => handleComicClick(comic.url)}
                      onGenreClick={handleGenreTagClick}
                      className="min-w-[140px] sm:min-w-[170px] snap-start"
                      showGenres={false}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Comic List Grid (Latest Update) */}
            <section className="max-w-7xl mx-auto px-4 py-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Komik Baru Update</h2>
                  <div className="h-1 w-12 bg-hex-accent mt-1 rounded-full"></div>
                </div>
                <button 
                  onClick={handleOpenGenrePage}
                  className="text-hex-accent text-sm font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Jelajahi Genre
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                {latestComics.map((comic, index) => (
                  <ComicCard
                    key={index}
                    comic={comic}
                    index={index}
                    onClick={() => handleComicClick(comic.url)}
                    onGenreClick={handleGenreTagClick}
                  />
                ))}
              </div>
            </section>

            {/* Serial Popular Section (Table Layout) */}
            {homeData?.popularSerial && (
              <section className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex flex-col items-center mb-10 gap-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Serial Populer</h2>
                    <div className="h-1 w-12 bg-hex-accent mt-1 rounded-full mx-auto"></div>
                  </div>
                  
                  {/* Period Selector Tabs */}
                  <div className="flex bg-gray-100 p-1.5 rounded-xl w-full max-w-sm">
                    {[
                      { id: 'weekly', label: 'Mingguan' },
                      { id: 'monthly', label: 'Bulanan' },
                      { id: 'alltime', label: 'Semua' }
                    ].map((period) => (
                      <button
                        key={period.id}
                        onClick={() => setPopularPeriod(period.id as any)}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                          popularPeriod === period.id 
                            ? 'bg-white text-hex-accent shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
                  {homeData.popularSerial[popularPeriod].map((comic, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleComicClick(comic.url)}
                      className="flex gap-4 group cursor-pointer border-b border-gray-50 pb-4 last:border-0"
                    >
                      <div className="flex-shrink-0 w-8 text-lg font-black text-gray-200 group-hover:text-hex-accent/20 transition-colors flex items-center justify-center">
                        {index + 1}
                      </div>
                      
                      <div className="w-16 sm:w-20 aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
                        <img 
                          src={getValidImgSrc(comic.cover)} 
                          alt={comic.title || "Comic"} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_COVER;
                          }}
                        />
                      </div>
                      
                      <div className="flex flex-col justify-center py-1">
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-hex-accent transition-colors leading-snug">
                          {comic.title}
                        </h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {comic.genres.slice(0, 2).map((genre, idx) => (
                            <span key={idx} className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                              {genre}{idx < 1 && comic.genres.length > 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-hex-accent bg-hex-accent/5 px-2 py-0.5 rounded-full w-fit">
                          <span>⭐</span>
                          <span>{comic.rating || '0.00'}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : view === 'search' ? (
          <section className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Hasil Pencarian: "{searchQuery}"</h2>
                <div className="h-1 w-12 bg-hex-accent mt-1 rounded-full"></div>
              </div>
              <button onClick={handleBackToHome} className="text-gray-500 hover:text-hex-accent font-medium text-sm">
                Kembali
              </button>
            </div>

            {searchLoading ? (
              <div className="min-h-[40vh] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-hex-accent animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Memuat Halaman</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                {searchResults.map((comic, index) => (
                  <ComicCard
                    key={index}
                    comic={comic}
                    index={index}
                    onClick={() => handleComicClick(comic.url)}
                    onGenreClick={handleGenreTagClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <AlertCircle className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-gray-500 font-bold">Komik tidak ditemukan</h3>
                <p className="text-gray-400 text-sm mt-1">Coba kata kunci lain atau periksa ejaanmu.</p>
                <button onClick={handleBackToHome} className="mt-6 text-hex-accent text-sm font-bold bg-white px-6 py-2 rounded-lg border border-hex-accent shadow-sm">Kembali ke Beranda</button>
              </div>
            )}
          </section>
        ) : view === 'detail' ? (
          <section className="max-w-7xl mx-auto px-4 py-8">
            {detailLoading ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-hex-accent animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Memuat Halaman</p>
              </div>
            ) : detailData ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <button 
                  onClick={handleBackToHome}
                  className="flex items-center gap-2 text-gray-400 hover:text-hex-accent transition-colors w-fit group mb-6"
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-bold uppercase tracking-widest">Kembali</span>
                </button>

                {/* Detail Hero */}
                <div className="relative rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
                  {/* Banner Background */}
                  <div className="absolute inset-0 h-48 md:h-64">
                    {(detailData.banner || detailData.cover) ? (
                      <img 
                        src={getValidImgSrc(detailData.banner || detailData.cover)} 
                        alt="Banner" 
                        className="w-full h-full object-cover opacity-20"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
                  </div>

                  {/* Info Content */}
                  <div className="relative pt-24 md:pt-32 pb-8 px-6 md:px-10 flex flex-col md:flex-row gap-8 items-start">
                    {/* Cover Photo */}
                    <div className="w-40 md:w-56 flex-shrink-0">
                      <div className="shadow-xl rounded-lg overflow-hidden border-4 border-white mb-4">
                        <img 
                          src={getValidImgSrc(detailData.cover)} 
                          alt={detailData.title || "Cover"} 
                          className="w-full aspect-[3/4] object-cover" 
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_COVER;
                          }}
                        />
                      </div>
                      
                      {/* Bookmark Button */}
                      <button 
                        onClick={() => {
                          // Construct a ComicData object for the bookmark list
                          const comicToBookmark: ComicData = {
                            title: detailData.title,
                            slug: detailData.slug,
                            url: currentComicUrl || '', 
                            desc: detailData.synopsis,
                            chapter: detailData.chapters[0]?.name || '',
                            cover: detailData.cover,
                            background: detailData.banner || detailData.cover,
                            genres: detailData.genres
                          };
                          toggleBookmark(comicToBookmark);
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                          bookmarks.some(b => b.title === detailData.title) 
                            ? 'bg-[#F8F8F8] text-gray-700 border border-gray-200' 
                            : 'bg-[#7A98BC] text-white hover:opacity-90 shadow-md shadow-[#7A98BC]/20'
                        }`}
                      >
                        {bookmarks.some(b => b.title === detailData.title) ? (
                          <Trash2 size={18} className="text-hex-accent" />
                        ) : (
                          <Bookmark size={18} fill="currentColor" />
                        )}
                        {bookmarks.some(b => b.title === detailData.title) ? 'Tersimpan' : 'Bookmark'}
                      </button>
                    </div>

                    {/* Meta Data */}
                    <div className="flex-grow">
                      <h1 className="text-2xl md:text-4xl font-bold mb-2 tracking-tight text-gray-900">{detailData.title}</h1>
                      <p className="text-gray-500 text-sm italic mb-4 leading-relaxed">{detailData.info.judul_alt}</p>
                      
                      <div className="flex flex-wrap gap-3 mb-6">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100">
                          ⭐ {detailData.rating}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100 uppercase">
                          {detailData.info.status}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100 uppercase">
                          {detailData.info.jenis_komik}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {detailData.genres.map((genre) => (
                          <button 
                            key={genre} 
                            onClick={() => handleGenreTagClick(genre)}
                            className="px-3 py-1 bg-hex-accent/5 hover:bg-hex-accent/10 transition-colors rounded-lg text-[11px] font-medium border border-hex-accent/10 text-hex-accent cursor-pointer"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Left Column: Synopsis & Info */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Synopsis */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-bold text-gray-900 mb-4 border-l-4 border-hex-accent pl-3">Sinopsis</h2>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                        {detailData.synopsis}
                      </p>
                    </div>

                    {/* Metadata Details */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Pengarang', value: detailData.info.pengarang },
                        { label: 'Artist', value: detailData.info.artist },
                        { label: 'Jenis', value: detailData.info.jenis_komik },
                        { label: 'Status', value: detailData.info.status }
                      ].map((item) => (
                        <div key={item.label} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">{item.label}</span>
                          <span className="text-sm font-semibold text-gray-700">{item.value || '-'}</span>
                        </div>
                      ))}
                    </div>

                     {/* Chapter List */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-hex-accent rounded-full" />
                          <div>
                            <h2 className="text-lg font-bold text-gray-900">Daftar Chapter</h2>
                            <p className="text-xs text-gray-400">
                              {detailData.pagination?.total_record
                                ? `Total ${detailData.pagination.total_record.toLocaleString('id-ID')} chapter`
                                : `${detailData.chapters.length} chapter`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Search Input for Chapter */}
                          <div className="relative flex-grow sm:flex-grow-0 min-w-[140px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                              type="text"
                              value={chapterSearchQuery}
                              onChange={(e) => setChapterSearchQuery(e.target.value)}
                              placeholder="Cari chapter..."
                              className="w-full pl-7 pr-6 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-hex-accent transition-colors"
                            />
                            {chapterSearchQuery && (
                              <button
                                onClick={() => setChapterSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {/* Page Size Selector */}
                          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 text-xs">
                            <button
                              onClick={() => handleChapterPageSizeChange(50)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                chapterPageSize === 50 ? 'bg-hex-accent text-white shadow-2xs' : 'text-gray-600 hover:text-hex-accent'
                              }`}
                              title="50 chapter per halaman"
                            >
                              50/hal
                            </button>
                            <button
                              onClick={() => handleChapterPageSizeChange(100)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                chapterPageSize === 100 ? 'bg-hex-accent text-white shadow-2xs' : 'text-gray-600 hover:text-hex-accent'
                              }`}
                              title="100 chapter per halaman"
                            >
                              100/hal
                            </button>
                          </div>

                          {/* Sort Order Toggle */}
                          <button 
                            onClick={() => setChapterSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-hex-accent text-gray-700 hover:text-hex-accent transition-colors rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                            title="Urutan chapter"
                          >
                            <ArrowUpDown size={13} />
                            <span>{chapterSortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Range / Jump Dropdown Bar if multi-page */}
                      {detailData.pagination && detailData.pagination.total_pages > 1 && (
                        <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-600">Rentang:</span>
                            <select
                              value={chapterPage}
                              onChange={(e) => handleChapterPageChange(Number(e.target.value))}
                              disabled={chaptersLoading}
                              className="bg-white border border-gray-200 font-medium text-gray-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-hex-accent cursor-pointer shadow-2xs"
                            >
                              {Array.from({ length: detailData.pagination.total_pages }, (_, i) => i + 1).map((pg) => {
                                const totalRec = detailData.pagination?.total_record || 0;
                                const startCh = Math.max(1, totalRec - (pg - 1) * chapterPageSize);
                                const endCh = Math.max(1, totalRec - pg * chapterPageSize + 1);
                                return (
                                  <option key={pg} value={pg}>
                                    Halaman {pg} (Ch. {startCh} - {endCh})
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="text-gray-500 font-medium text-[11px]">
                            Halaman <span className="font-bold text-hex-accent">{chapterPage}</span> dari{' '}
                            <span className="font-bold">{detailData.pagination.total_pages}</span>
                          </div>
                        </div>
                      )}

                      {/* Chapters List Body */}
                      <div className="relative">
                        {chaptersLoading && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center min-h-[200px]">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-100 text-xs font-bold text-hex-accent">
                              <Loader2 className="animate-spin" size={16} />
                              <span>Memuat chapter halaman {chapterPage}...</span>
                            </div>
                          </div>
                        )}

                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                          {(() => {
                            const filtered = detailData.chapters.filter((ch) => {
                              if (!chapterSearchQuery.trim()) return true;
                              return ch.name.toLowerCase().includes(chapterSearchQuery.toLowerCase());
                            });

                            const sorted = [...filtered].sort((a, b) => {
                              if (chapterSortOrder === 'desc') return 0;
                              return filtered.indexOf(b) - filtered.indexOf(a);
                            });

                            if (sorted.length === 0) {
                              return (
                                <div className="text-center py-12 text-gray-400 text-xs">
                                  Tidak ada chapter yang sesuai dengan &quot;{chapterSearchQuery}&quot;
                                </div>
                              );
                            }

                            return sorted.map((ch, idx) => (
                              <button 
                                key={ch.url || idx}
                                onClick={() => handleChapterClick(ch, detailData.chapters.indexOf(ch))}
                                className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-gray-50 transition-colors text-left group"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-md bg-gray-100 group-hover:bg-hex-accent/15 group-hover:text-hex-accent text-gray-500 text-[11px] font-bold flex items-center justify-center transition-colors">
                                    #
                                  </span>
                                  <span className="text-sm font-medium text-gray-700 group-hover:text-hex-accent transition-colors">
                                    {ch.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {ch.date && (
                                    <span className="text-[11px] font-medium text-gray-400">
                                      {ch.date}
                                    </span>
                                  )}
                                  <ChevronRight size={15} className="text-gray-300 group-hover:text-hex-accent group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </button>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Bottom Pagination Controls */}
                      {detailData.pagination && detailData.pagination.total_pages > 1 && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
                          {/* Left: First & Prev */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleChapterPageChange(1)}
                              disabled={chapterPage <= 1 || chaptersLoading}
                              className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-hex-accent hover:text-hex-accent disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                              title="Ke Halaman Pertama"
                            >
                              <ChevronsLeft size={14} />
                              <span className="hidden sm:inline">Pertama</span>
                            </button>
                            <button
                              onClick={() => handleChapterPageChange(chapterPage - 1)}
                              disabled={chapterPage <= 1 || chaptersLoading}
                              className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-hex-accent hover:text-hex-accent disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                              title="Halaman Sebelumnya"
                            >
                              <ChevronLeft size={14} />
                              <span className="hidden sm:inline">Sebelumnya</span>
                            </button>
                          </div>

                          {/* Center: Numerical Page Buttons */}
                          <div className="flex items-center gap-1 overflow-x-auto py-1">
                            {(() => {
                              const totalPages = detailData.pagination.total_pages;
                              const current = chapterPage;
                              const delta = 2;
                              const range: (number | string)[] = [];

                              for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
                                range.push(i);
                              }

                              if (current - delta > 2) {
                                range.unshift('...');
                              }
                              range.unshift(1);

                              if (current + delta < totalPages - 1) {
                                range.push('...');
                              }
                              if (totalPages > 1) {
                                range.push(totalPages);
                              }

                              return range.map((pg, idx) => {
                                if (pg === '...') {
                                  return (
                                    <span key={`dots-${idx}`} className="px-1 text-gray-400 text-xs">
                                      ...
                                    </span>
                                  );
                                }
                                const isCurrent = pg === current;
                                return (
                                  <button
                                    key={pg}
                                    onClick={() => handleChapterPageChange(Number(pg))}
                                    disabled={chaptersLoading}
                                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                                      isCurrent
                                        ? 'bg-hex-accent text-white shadow-md shadow-hex-accent/20'
                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-hex-accent hover:text-hex-accent'
                                    }`}
                                  >
                                    {pg}
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          {/* Right: Next & Last */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleChapterPageChange(chapterPage + 1)}
                              disabled={chapterPage >= detailData.pagination.total_pages || chaptersLoading}
                              className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-hex-accent hover:text-hex-accent disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                              title="Halaman Berikutnya"
                            >
                              <span className="hidden sm:inline">Berikutnya</span>
                              <ChevronRight size={14} />
                            </button>
                            <button
                              onClick={() => handleChapterPageChange(detailData.pagination.total_pages)}
                              disabled={chapterPage >= detailData.pagination.total_pages || chaptersLoading}
                              className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-hex-accent hover:text-hex-accent disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                              title="Ke Halaman Terakhir"
                            >
                              <span className="hidden sm:inline">Terakhir</span>
                              <ChevronsRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Sidebar */}
                  <div className="space-y-6">

                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-20">
                <AlertCircle className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-gray-500 font-bold">Data detail tidak ditemukan</h3>
                <button onClick={handleBackToHome} className="mt-4 text-hex-accent text-sm font-medium">Kembali ke Beranda</button>
              </div>
            )}
          </section>
        ) : view === 'bookmarks' ? (
          <section className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col gap-4">
              <button 
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-hex-accent transition-colors w-fit group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold uppercase tracking-widest">Kembali</span>
              </button>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Koleksi Bookmark</h2>
                <div className="h-1 w-12 bg-hex-accent mt-2 rounded-full"></div>
              </div>
            </div>

            {bookmarks.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                {bookmarks.map((comic, index) => (
                  <ComicCard
                    key={index}
                    comic={comic}
                    index={index}
                    onClick={() => handleComicClick(comic.url)}
                    onGenreClick={handleGenreTagClick}
                    extraOverlay={
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(comic);
                        }}
                        className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Bookmark className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-gray-500 font-bold">Belum ada komik tersimpan</h3>
                <p className="text-gray-400 text-sm mt-1">Komik yang kamu bookmark akan muncul di sini.</p>
                <button onClick={handleBackToHome} className="mt-6 text-hex-accent text-sm font-bold bg-white px-6 py-2 rounded-lg border border-hex-accent shadow-sm">Jelajahi Komik</button>
              </div>
            )}
          </section>
        ) : view === 'genres' || view === 'comic-list' ? (
          <section className="max-w-7xl mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8 flex flex-col gap-4">
              <button 
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-hex-accent transition-colors w-fit group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold uppercase tracking-widest">Kembali ke Beranda</span>
              </button>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-gray-900">Daftar Genre</h2>
                    <span className="px-3 py-1 bg-hex-accent/10 text-hex-accent text-xs font-bold rounded-full">
                      {genres.length} Kategori
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">
                    Klik slug atau genre di bawah untuk langsung melihat daftar komik terkait.
                  </p>
                  <div className="h-1 w-12 bg-hex-accent mt-3 rounded-full"></div>
                </div>

                {/* Search Genre Input */}
                <div className="relative min-w-[240px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={genreSearchInput}
                    onChange={(e) => setGenreSearchInput(e.target.value)}
                    placeholder="Cari genre... (misal: Action, Isekai)"
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-hex-accent focus:ring-2 focus:ring-hex-accent/10 transition-all shadow-2xs"
                  />
                  {genreSearchInput && (
                    <button
                      onClick={() => setGenreSearchInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Genre Directory Cards (Interactive Grid with Slugs) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <LayoutGrid size={14} className="text-hex-accent" />
                  Pilih Genre / Slug
                </span>
                {selectedGenre && (
                  <button
                    onClick={() => { setSelectedGenre(null); setGenreComics([]); }}
                    className="text-xs font-semibold text-hex-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Reset Pilihan
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                {genres
                  .filter((g) => {
                    if (!genreSearchInput.trim()) return true;
                    const q = genreSearchInput.toLowerCase();
                    return g.name.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q);
                  })
                  .map((g) => {
                    const isSelected = selectedGenre?.slug === g.slug;
                    return (
                      <button
                        key={g.slug}
                        onClick={() => handleSelectGenre(g.slug, g.name, 1)}
                        className={`group px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 border shadow-2xs cursor-pointer ${
                          isSelected
                            ? 'bg-hex-accent text-white border-hex-accent shadow-md shadow-hex-accent/20'
                            : 'bg-gray-50/70 hover:bg-white border-gray-100 hover:border-hex-accent text-gray-700 hover:text-hex-accent'
                        }`}
                      >
                        <span className="font-bold">{g.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-500 group-hover:bg-hex-accent/10 group-hover:text-hex-accent'
                        }`}>
                          #{g.slug}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Selected Genre Results Section */}
            {selectedGenre ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-hex-accent/10 via-hex-accent/5 to-transparent rounded-2xl border border-hex-accent/15">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-hex-accent text-white flex items-center justify-center font-bold shadow-md shadow-hex-accent/20">
                      #
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900">{selectedGenre.name}</h3>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-hex-accent/15 text-hex-accent font-semibold">
                          /{selectedGenre.slug}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {genreTotalRecord > 0 ? `Menampilkan ${genreTotalRecord.toLocaleString('id-ID')} komik` : 'Daftar komik berdasarkan genre ini'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => { setSelectedGenre(null); setGenreComics([]); }}
                    className="text-xs font-bold text-gray-600 hover:text-red-600 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-red-200 transition-colors w-fit cursor-pointer shadow-2xs"
                  >
                    Tutup Hasil
                  </button>
                </div>

                {genreLoading ? (
                  <div className="min-h-[40vh] flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-hex-accent animate-spin mb-4" />
                    <p className="text-gray-500 font-medium text-sm">Memuat komik genre {selectedGenre.name}...</p>
                  </div>
                ) : genreComics.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                      {genreComics.map((comic, index) => (
                        <ComicCard
                          key={index}
                          comic={comic}
                          index={index}
                          onClick={() => handleComicClick(comic.url)}
                          onGenreClick={handleGenreTagClick}
                        />
                      ))}
                    </div>

                    {/* Pagination for Genre Comics */}
                    {genreTotalPages > 1 && (
                      <div className="mt-12 flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSelectGenre(selectedGenre.slug, selectedGenre.name, genrePage - 1)}
                          disabled={genrePage <= 1 || genreLoading}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-hex-accent hover:text-hex-accent transition-all shadow-sm cursor-pointer"
                        >
                          Prev
                        </button>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const current = genrePage;
                            const total = genreTotalPages;
                            const pages = [];
                            for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
                              pages.push(i);
                            }
                            return pages.map((pageNum) => (
                              <button
                                key={pageNum}
                                onClick={() => handleSelectGenre(selectedGenre.slug, selectedGenre.name, pageNum)}
                                disabled={genreLoading}
                                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                                  current === pageNum
                                    ? 'bg-hex-accent text-white shadow-md shadow-hex-accent/20'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-hex-accent hover:text-hex-accent'
                                }`}
                              >
                                {pageNum}
                              </button>
                            ));
                          })()}
                        </div>
                        <button
                          onClick={() => handleSelectGenre(selectedGenre.slug, selectedGenre.name, genrePage + 1)}
                          disabled={genrePage >= genreTotalPages || genreLoading}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-hex-accent hover:text-hex-accent transition-all shadow-sm cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <AlertCircle className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-gray-500 font-bold">Tidak ada komik untuk genre ini</h3>
                    <p className="text-gray-400 text-sm mt-1">Coba klik slug genre lainnya pada daftar di atas.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <LayoutGrid className="mx-auto w-10 h-10 text-hex-accent/60 mb-3" />
                <h4 className="font-bold text-gray-700 text-base">Silakan pilih salah satu genre di atas</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  Klik pada nama genre atau tag slug untuk langsung menjelajahi seluruh koleksi komik dari kategori tersebut.
                </p>
              </div>
            )}
          </section>
        ) : view === 'history' ? (
          <section className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col gap-4">
              <button 
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-gray-400 hover:text-hex-accent transition-colors w-fit group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold uppercase tracking-widest">Kembali</span>
              </button>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Riwayat Membaca</h2>
                  <div className="h-1 w-12 bg-hex-accent mt-2 rounded-full"></div>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold transition-all border border-gray-100"
                  >
                    <Trash2 size={14} />
                    Hapus Riwayat
                  </button>
                )}
              </div>
            </div>

            {history.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                {history.map((comic, index) => (
                  <ComicCard
                    key={index}
                    comic={comic}
                    index={index}
                    onClick={() => handleComicClick(comic.url)}
                    onGenreClick={handleGenreTagClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <HomeIcon className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-gray-500 font-bold">Belum ada riwayat membaca</h3>
                <p className="text-gray-400 text-sm mt-1">Komik yang kamu baca akan muncul di sini secara otomatis.</p>
                <button onClick={handleBackToHome} className="mt-6 text-hex-accent text-sm font-bold bg-white px-6 py-2 rounded-lg border border-hex-accent shadow-sm hover:bg-hex-accent hover:text-white transition-all">Mulai Membaca</button>
              </div>
            )}
          </section>
        ) : view === 'about' ? (
          <section className="max-w-4xl mx-auto px-6 py-12">
            <button 
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-gray-500 hover:text-hex-accent transition-colors mb-8 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold text-sm">Kembali</span>
            </button>

            <div className="text-gray-800 leading-relaxed font-sans space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Tentang HENKOMIKO</h1>
                <p>
                  HENKOMIKO merupakan sebuah platform digital yang dididikasikan untuk menyajikan pengalaman membaca komik secara optimal bagi para penggemar literatur visual di Indonesia. Kami berkomitmen untuk menyediakan akses yang mudah, cepat, dan responsif terhadap berbagai koleksi komik terbaru dan populer yang diperbarui secara berkala.
                </p>
                <p className="mt-4">
                  Melalui antarmuka yang dirancang secara fungsional, HENKOMIKO berupaya memfasilitasi kebutuhan membaca melalui berbagai perangkat, baik komputer desktop maupun perangkat seluler. Fokus utama kami adalah pada kecepatan akses dan kenyamanan visual pembaca.
                </p>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Hak Cipta</h2>
                <p className="text-sm">
                  Segala konten visual berupa gambar, desain karakter, dan alur cerita yang tersedia di platform HENKOMIKO merupakan hak milik intelektual dari para kreator, penerbit, dan pihak ketiga terkait. Kami menghormati hak kekayaan intelektual dan hanya bertindak sebagai media penyedia akses publikasi digital. HENKOMIKO tidak memiliki lisensi atas konten tersebut dan penggunaan konten diluar platform ini sepenuhnya menjadi tanggung jawab pengguna.
                </p>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Developer</h2>
                <div className="flex flex-col gap-4">
                  <span className="text-xl font-bold text-gray-900">Henkaramazov</span>
                  <div className="flex items-center gap-4">
                    <a href="https://henkaramazov.dev" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded-full hover:bg-hex-accent hover:text-white transition-all">
                      <Globe size={18} />
                    </a>
                    <a href="https://facebook.com/henkaramazov" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded-full hover:bg-hex-accent hover:text-white transition-all">
                      <Facebook size={18} />
                    </a>
                    <a href="https://instagram.com/henkaramazov" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded-full hover:bg-hex-accent hover:text-white transition-all">
                      <Instagram size={18} />
                    </a>
                    <a href="https://tiktok.com/@henkaramazov" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 rounded-full hover:bg-hex-accent hover:text-white transition-all">
                      <Music2 size={18} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-hex-bg min-h-screen">
            {readerLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <Loader2 className="w-12 h-12 text-hex-accent animate-spin mb-4" />
                <p className="text-gray-500">Memuat Halaman</p>
              </div>
            ) : chapterData ? (
              <div className="flex flex-col">
                {/* Top Reader Navigation - Full Width Custom Header */}
                <div className="bg-white border-b border-gray-100 py-4 px-4">
                  <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-gray-900 leading-tight">
                        {detailData?.title} {chapterData.title || detailData?.chapters[currentChapterIndex]?.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleBackToDetail}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                        title="Kembali ke Detail"
                      >
                        <HomeIcon size={18} />
                      </button>
                       <button 
                        onClick={() => setShowChapterModal(true)}
                        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <LayoutGrid size={14} />
                        Chapter
                      </button>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={handlePrevChapter}
                          disabled={!chapterData.prev_chapter && (currentChapterIndex < 0 || currentChapterIndex >= (detailData?.chapters.length || 0) - 1)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 rounded-lg transition-all text-xs font-bold"
                        >
                          <ChevronRight className="rotate-180" size={16} />
                          Prev
                        </button>
                        <button 
                          onClick={handleNextChapter}
                          disabled={!chapterData.next_chapter && currentChapterIndex <= 0}
                          className="flex items-center gap-1 px-3 py-2 bg-hex-accent hover:opacity-90 text-white disabled:opacity-30 rounded-lg transition-all text-xs font-bold"
                        >
                          Next
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chapter Modal */}
                {showChapterModal && detailData && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setShowChapterModal(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">Pilih Chapter</h3>
                          {detailData.pagination?.total_record && (
                            <p className="text-[11px] text-gray-400">Total {detailData.pagination.total_record.toLocaleString('id-ID')} chapter</p>
                          )}
                        </div>
                        <button onClick={() => setShowChapterModal(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                        </button>
                      </div>

                      {detailData.pagination && detailData.pagination.total_pages > 1 && (
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Halaman:</span>
                          <select
                            value={chapterPage}
                            onChange={(e) => handleChapterPageChange(Number(e.target.value))}
                            disabled={chaptersLoading}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-hex-accent font-medium text-gray-800"
                          >
                            {Array.from({ length: detailData.pagination.total_pages }, (_, i) => i + 1).map((pg) => (
                              <option key={pg} value={pg}>
                                Halaman {pg}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="overflow-y-auto p-2">
                        {chaptersLoading ? (
                          <div className="py-8 flex items-center justify-center gap-2 text-xs font-bold text-hex-accent">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Memuat chapter...</span>
                          </div>
                        ) : (
                          detailData.chapters.map((ch, idx) => (
                            <button
                              key={ch.url || idx}
                              onClick={() => {
                                handleChapterClick(ch, idx);
                                setShowChapterModal(false);
                              }}
                              className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${
                                idx === currentChapterIndex 
                                  ? 'bg-hex-accent/10 text-hex-accent font-bold' 
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {ch.name}
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Images */}
                <div className="max-w-3xl mx-auto w-full py-4 space-y-0">
                  {chapterData.images
                    .filter((img) => typeof img === 'string' && img.trim() !== '')
                    .map((img, idx) => (
                      <img 
                        key={idx}
                        src={img.trim()}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                    ))}
                </div>

                {/* Bottom Navigation */}
                <div className="bg-white border-t border-gray-100 py-16 px-4">
                  <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handlePrevChapter}
                        disabled={!chapterData.prev_chapter && (currentChapterIndex < 0 || currentChapterIndex >= (detailData?.chapters.length || 0) - 1)}
                        className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all font-bold text-sm shadow-sm"
                      >
                        <ChevronRight className="rotate-180" size={18} />
                        Prev
                      </button>
                      <button 
                        onClick={() => setShowChapterModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all font-bold text-sm shadow-sm"
                      >
                        <LayoutGrid size={18} />
                        Chapter
                      </button>
                      <button 
                        onClick={handleNextChapter}
                        disabled={!chapterData.next_chapter && currentChapterIndex <= 0}
                        className="flex items-center gap-2 px-5 py-3 bg-hex-accent hover:opacity-90 text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all font-bold text-sm shadow-md shadow-hex-accent/20"
                      >
                        Next
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <button 
                      onClick={handleBackToDetail}
                      className="flex items-center gap-2 text-gray-400 hover:text-hex-accent text-sm font-semibold transition-colors"
                    >
                      <HomeIcon size={16} />
                      Kembali ke Detail
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-gray-500">Gagal memuat chapter</p>
                <button onClick={handleBackToDetail} className="text-hex-accent font-bold">Kembali</button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      {view !== 'reader' && !detailLoading && (
        <footer className="py-12 border-t border-gray-100 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 text-sm font-medium">
              &copy; 2026 Henkaramazov. All rights reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
