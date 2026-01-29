import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Play, 
  Info, 
  ChevronRight, 
  ChevronLeft, 
  Tv, 
  Download, 
  Menu, 
  X,
  Star,
  Clock,
  LayoutGrid,
  TrendingUp,
  Activity,
  Zap,
  ShieldCheck,
  List,
  Tags,
  Filter,
  SortAsc
} from 'lucide-react';

// Konfigurasi API
const API_BASE = 'https://dramabos.asia/api/tensei';

/**
 * Komponen Utama Aplikasi
 */
export default function App() {
  // State Navigasi
  const [currentView, setCurrentView] = useState('home'); // home, detail, watch, search, animeList, genres, genreDetail
  const [selectedSlug, setSelectedSlug] = useState('');
  const [selectedEpisodeSlug, setSelectedEpisodeSlug] = useState('');
  const [selectedGenre, setSelectedGenre] = useState({ slug: '', name: '' });
  
  // State Halaman (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  
  // State Data
  const [homeData, setHomeData] = useState([]);
  const [ongoingData, setOngoingData] = useState([]);
  const [animeListData, setAnimeListData] = useState([]); 
  const [genreAnimeData, setGenreAnimeData] = useState([]); // Anime berdasarkan genre
  const [animeDetail, setAnimeDetail] = useState(null);
  const [watchData, setWatchData] = useState(null);
  const [streamData, setStreamData] = useState([]);
  const [activeStreamUrl, setActiveStreamUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [genres, setGenres] = useState([]);
  
  // State UI
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [usePlayerMode, setUsePlayerMode] = useState('direct'); 

  /**
   * Fungsi pembantu untuk menghapus data duplikat dan mengurutkan secara alfabetis.
   * Diperbaiki untuk menangani data yang mungkin tidak memiliki properti 'title' (seperti Genre).
   */
  const processData = (dataArray, shouldSort = false) => {
    if (!dataArray || !Array.isArray(dataArray)) return [];
    
    // Hapus duplikat berdasarkan slug, pastikan item memiliki slug
    const unique = Array.from(
      new Map(
        dataArray
          .filter(item => item && item.slug)
          .map(item => [item.slug, item])
      ).values()
    );
    
    // Urutkan jika shouldSort bernilai true
    if (shouldSort) {
      return unique.sort((a, b) => {
        // Gunakan title jika ada, jika tidak gunakan name (untuk genre), atau string kosong sebagai fallback
        const valA = (a.title || a.name || "").toString();
        const valB = (b.title || b.name || "").toString();
        return valA.localeCompare(valB);
      });
    }
    
    return unique;
  };

  /**
   * Fungsi Fetch Data Generik dengan dukungan Pagination
   */
  const fetchData = async (endpoint, page = null) => {
    setLoading(true);
    try {
      const url = page ? `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}` : `${API_BASE}${endpoint}`;
      const response = await fetch(url);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Fetch error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load Data Awal
   */
  useEffect(() => {
    const loadInitialData = async () => {
      const [home, ongoing, genreList] = await Promise.all([
        fetchData('/home'),
        fetchData('/ongoing'),
        fetchData('/genres')
      ]);
      
      if (home?.data) setHomeData(processData(home.data, false));
      if (ongoing?.data) setOngoingData(processData(ongoing.data, false));
      
      // Daftar Genre diurutkan A-Z menggunakan properti 'name'
      if (genreList?.data) setGenres(processData(genreList.data, true));
    };
    
    loadInitialData();
  }, []);

  /**
   * Efek untuk memuat ulang data saat halaman atau tampilan berubah
   */
  useEffect(() => {
    if (currentView === 'home') {
      fetchData('/home', currentPage).then(res => res && setHomeData(processData(res.data, false)));
    } else if (currentView === 'animeList') {
      fetchData('/anime', currentPage).then(res => res && setAnimeListData(processData(res.data, true)));
    } else if (currentView === 'search') {
      fetchData(`/search?q=${searchQuery}`, currentPage).then(res => res && setSearchResults(processData(res.data, true)));
    } else if (currentView === 'genreDetail') {
      fetchData(`/anime?genre=${selectedGenre.slug}`, currentPage).then(res => res && setGenreAnimeData(processData(res.data, true)));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, currentView, selectedGenre.slug]);

  /**
   * Navigasi & Handler
   */
  const changeView = (view) => {
    setCurrentView(view);
    setCurrentPage(1);
    setMobileMenuOpen(false);
  };

  const navigateToGenreDetail = (genre) => {
    setSelectedGenre(genre);
    setCurrentView('genreDetail');
    setCurrentPage(1);
    setMobileMenuOpen(false);
  };

  const navigateToDetail = async (slug) => {
    setCurrentView('detail');
    setSelectedSlug(slug);
    const detail = await fetchData(`/detail/${slug}`);
    if (detail?.data) setAnimeDetail(detail.data);
    window.scrollTo(0, 0);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setCurrentView('search');
    setCurrentPage(1);
    setMobileMenuOpen(false);
  };

  const navigateToWatch = async (epSlug) => {
    setCurrentView('watch');
    setSelectedEpisodeSlug(epSlug);
    const [watch, stream] = await Promise.all([
      fetchData(`/watch/${epSlug}`),
      fetchData(`/stream/${epSlug}`)
    ]);
    if (watch?.data) setWatchData(watch.data);
    if (stream?.data && stream.data.length > 0) {
      setStreamData(stream.data);
      setActiveStreamUrl(stream.data[0].url);
      setUsePlayerMode('direct'); 
    } else {
      setUsePlayerMode('embed');
    }
    window.scrollTo(0, 0);
  };

  /**
   * Komponen UI Pagination
   */
  const Pagination = () => (
    <div className="flex items-center justify-center gap-4 mt-12 pb-8">
      <button 
        disabled={currentPage === 1 || loading}
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-gray-400 transition-all shadow-lg"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Halaman</span>
        <div className="px-5 py-2 bg-indigo-600 rounded-xl text-white font-black shadow-lg shadow-indigo-500/20">
          {currentPage}
        </div>
      </div>

      <button 
        disabled={loading}
        onClick={() => setCurrentPage(prev => prev + 1)}
        className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-indigo-400 disabled:opacity-30 transition-all shadow-lg"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );

  const SkeletonCard = () => (
    <div className="animate-pulse bg-gray-800 rounded-lg aspect-[3/4] w-full mb-4"></div>
  );

  const AnimeCard = ({ anime, onClick }) => (
    <div 
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-gray-900 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20"
      onClick={() => onClick(anime.slug)}
    >
      <div className="aspect-[3/4] w-full relative">
        <img 
          src={anime.img} 
          alt={anime.title}
          className="h-full w-full object-cover transition-opacity group-hover:opacity-60"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/247x350?text=Tanpa+Gambar'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {anime.status && <span className="px-2 py-0.5 bg-indigo-600 text-[10px] font-bold text-white rounded uppercase">{anime.status}</span>}
          {anime.type && <span className="px-2 py-0.5 bg-gray-700 text-[10px] font-bold text-white rounded uppercase">{anime.type}</span>}
        </div>
        {anime.episode && <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] font-bold text-indigo-400">{anime.episode}</div>}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors">{anime.title}</h3>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-200 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0f1117]/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => changeView('home')}>
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Play className="w-6 h-6 text-white fill-current" />
              </div>
              <span className="text-xl font-black tracking-tighter text-white">
                TENSEI<span className="text-indigo-500">ANIME</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <button onClick={() => changeView('home')} className={`hover:text-indigo-400 transition-colors ${currentView === 'home' ? 'text-indigo-500' : ''}`}>Beranda</button>
              <button onClick={() => changeView('animeList')} className={`hover:text-indigo-400 transition-colors ${currentView === 'animeList' ? 'text-indigo-500' : ''}`}>Daftar Anime</button>
              <button onClick={() => changeView('genres')} className={`hover:text-indigo-400 transition-colors flex items-center gap-1 ${currentView === 'genres' || currentView === 'genreDetail' ? 'text-indigo-500' : ''}`}>
                Genre
              </button>
            </div>

            <div className="hidden md:block flex-1 max-w-sm mx-8">
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  placeholder="Cari anime..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-3 top-2.5 text-gray-500 hover:text-indigo-500">
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="flex items-center gap-4 md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 p-4 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <input type="text" placeholder="Cari anime..." className="w-full bg-gray-800 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <button type="submit" className="absolute right-3 top-2.5"><Search className="w-4 h-4" /></button>
            </form>
            <div className="flex flex-col gap-4 text-sm font-semibold">
              <button onClick={() => changeView('home')}>Beranda</button>
              <button onClick={() => changeView('animeList')}>Daftar Anime</button>
              <button onClick={() => changeView('genres')}>Genre</button>
            </div>
          </div>
        )}
      </nav>

      {/* Konten Utama */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* BERANDA */}
        {currentView === 'home' && (
          <div className="space-y-12">
            {ongoingData.length > 0 && currentPage === 1 && (
              <section className="relative h-[400px] rounded-3xl overflow-hidden group">
                <img src={ongoingData[0].img} className="absolute inset-0 w-full h-full object-cover blur-[2px] scale-110 opacity-40" alt="hero" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
                <div className="relative h-full flex flex-col justify-center px-8 md:px-16 max-w-2xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <TrendingUp className="w-4 h-4" /> SEDANG TREN
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">{ongoingData[0].title}</h1>
                  <p className="text-gray-400 line-clamp-3">Nikmati pengalaman menonton tanpa iklan yang mengganggu dengan fitur Direct Play kami.</p>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => navigateToDetail(ongoingData[0].slug)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold flex items-center gap-2 transition-transform active:scale-95">
                      <Play className="w-5 h-5 fill-current" /> Tonton Sekarang
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-500" /><h2 className="text-2xl font-bold text-white uppercase tracking-wider">Anime Ongoing</h2></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {loading && ongoingData.length === 0 ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />) : ongoingData.slice(0, 12).map(anime => (<AnimeCard key={anime.slug} anime={anime} onClick={navigateToDetail} />))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2"><Clock className="w-6 h-6 text-indigo-500" /><h2 className="text-2xl font-bold text-white uppercase tracking-wider">Rilis Terbaru</h2></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {loading && homeData.length === 0 ? [...Array(12)].map((_, i) => <SkeletonCard key={i} />) : homeData.map(anime => (<AnimeCard key={anime.slug} anime={anime} onClick={navigateToDetail} />))}
              </div>
              <Pagination />
            </section>
          </div>
        )}

        {/* DAFTAR GENRE */}
        {currentView === 'genres' && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 mb-6">
              <Tags className="w-6 h-6 text-indigo-500" />
              <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Jelajahi Berdasarkan Genre</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {genres.map(g => (
                <button 
                  key={g.slug} 
                  onClick={() => navigateToGenreDetail(g)}
                  className="p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:bg-indigo-600 hover:border-indigo-500 transition-all text-center group shadow-lg"
                >
                  <span className="text-sm font-bold group-hover:text-white transition-colors uppercase tracking-tight">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DETAIL GENRE (LIST ANIME BY GENRE) */}
        {currentView === 'genreDetail' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-6 h-6 text-indigo-500" />
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Genre: <span className="text-indigo-500">{selectedGenre.name}</span></h2>
              </div>
              <button onClick={() => changeView('genres')} className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-1 transition-colors">
                KEMBALI KE SEMUA GENRE <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {loading && genreAnimeData.length === 0 ? [...Array(12)].map((_, i) => <SkeletonCard key={i} />) : 
                genreAnimeData.length > 0 ? genreAnimeData.map(anime => (
                  <AnimeCard key={anime.slug} anime={anime} onClick={navigateToDetail} />
                )) : (
                  <div className="col-span-full py-20 text-center text-gray-500">
                    Tidak ada anime ditemukan dalam genre ini.
                  </div>
                )
              }
            </div>
            {genreAnimeData.length > 0 && <Pagination />}
          </div>
        )}

        {/* DAFTAR ANIME (LENGKAP) */}
        {currentView === 'animeList' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <List className="w-6 h-6 text-indigo-500" />
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Daftar Anime A-Z</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
                <SortAsc className="w-3 h-3" /> TERURUT ALFABETIS
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {loading && animeListData.length === 0 ? [...Array(18)].map((_, i) => <SkeletonCard key={i} />) : animeListData.map(anime => (<AnimeCard key={anime.slug} anime={anime} onClick={navigateToDetail} />))}
            </div>
            <Pagination />
          </div>
        )}

        {/* PENCARIAN */}
        {currentView === 'search' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Hasil Pencarian: <span className="text-indigo-500">"{searchQuery}"</span></h2>
            {loading && searchResults.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">{[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">{searchResults.map(anime => (<AnimeCard key={anime.slug} anime={anime} onClick={navigateToDetail} />))}</div>
                <Pagination />
              </>
            ) : <div className="text-center py-20 bg-gray-900/50 rounded-3xl border border-dashed border-gray-800"><Search className="w-16 h-16 mx-auto text-gray-700 mb-4" /><p className="text-gray-500">Tidak ada hasil ditemukan.</p></div>}
          </div>
        )}

        {/* DETAIL */}
        {currentView === 'detail' && animeDetail && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/4 shrink-0">
                <img src={animeDetail.img} alt={animeDetail.title} className="w-full rounded-2xl shadow-2xl border border-gray-800" />
                <div className="mt-6 space-y-3">
                   <div className="flex justify-between p-3 bg-gray-900/50 rounded-lg"><span className="text-gray-500 text-xs">Rating</span><span className="text-yellow-500 text-xs font-bold flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {animeDetail.rating?.replace('Rating ', '')}</span></div>
                   <div className="flex justify-between p-3 bg-gray-900/50 rounded-lg"><span className="text-gray-500 text-xs">Status</span><span className="text-indigo-400 text-xs font-bold">{animeDetail.status}</span></div>
                </div>
              </div>
              <div className="flex-1 space-y-8">
                <div>
                  <h1 className="text-4xl font-black text-white mb-2">{animeDetail.title}</h1>
                  <p className="text-gray-500 italic mb-6">{animeDetail.altTitle}</p>
                  <div className="flex flex-wrap gap-2 mb-8">{animeDetail.genres?.map(genreName => {
                    const genreObj = genres.find(g => g.name === genreName);
                    return (
                      <span 
                        key={genreName} 
                        onClick={() => genreObj && navigateToGenreDetail(genreObj)}
                        className="px-3 py-1 bg-gray-800 hover:bg-indigo-600 rounded-full text-xs transition-colors cursor-pointer"
                      >
                        {genreName}
                      </span>
                    )
                  })}</div>
                  <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-800"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-indigo-500" /> Sinopsis</h3><p className="text-gray-400 text-sm leading-relaxed">{animeDetail.synopsis}</p></div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-500" /> Daftar Episode</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {animeDetail.episodes?.map(ep => (
                      <button key={ep.slug} onClick={() => navigateToWatch(ep.slug)} className="flex items-center justify-between p-4 bg-gray-900 hover:bg-indigo-900/40 border border-gray-800 rounded-xl transition-all group">
                        <span className="text-sm font-medium group-hover:text-indigo-400">Episode {ep.ep}</span><ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NONTON (WATCH) */}
        {currentView === 'watch' && watchData && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <button onClick={() => changeView('home')} className="hover:text-indigo-400">Beranda</button><ChevronRight className="w-4 h-4" />
                <button onClick={() => navigateToDetail(watchData.animeSlug)} className="hover:text-indigo-400">Detail Anime</button><ChevronRight className="w-4 h-4" />
                <span className="text-indigo-400 font-medium">{watchData.title}</span>
              </div>
              
              <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-full border border-gray-800">
                <button onClick={() => setUsePlayerMode('direct')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${usePlayerMode === 'direct' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><ShieldCheck className="w-3 h-3" /> BEBAS IKLAN</button>
                <button onClick={() => setUsePlayerMode('embed')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${usePlayerMode === 'embed' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Tv className="w-3 h-3" /> SERVER EMBED</button>
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-2xl md:text-3xl font-black text-white">{watchData.title}</h1>
              <div className="aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800 relative">
                {usePlayerMode === 'direct' && activeStreamUrl ? (
                  <video key={activeStreamUrl} src={activeStreamUrl} className="w-full h-full object-contain" controls autoPlay controlsList="nodownload"></video>
                ) : (
                  <iframe key={watchData.servers[0]?.embed} src={watchData.servers[0]?.embed} className="w-full h-full" frameBorder="0" allowFullScreen sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"></iframe>
                )}
                {usePlayerMode === 'direct' && (
                   <div className="absolute top-4 right-4 bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1"><Zap className="w-3 h-3 fill-current" /> DIRECT PLAY (TANPA IKLAN)</div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-gray-900 rounded-full border border-gray-800">
                      {usePlayerMode === 'direct' ? (
                        streamData.map((stream, idx) => (<button key={idx} onClick={() => setActiveStreamUrl(stream.url)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${activeStreamUrl === stream.url ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-800 text-gray-400'}`}>{stream.quality}</button>))
                      ) : (
                        watchData.servers.map((srv, idx) => (<button key={idx} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${idx === 0 ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-800 text-gray-400'}`}>{srv.name}</button>))
                      )}
                    </div>
                    {watchData.next && <button onClick={() => navigateToWatch(watchData.next)} className="ml-auto px-6 py-3 bg-gray-900 hover:bg-indigo-600 border border-gray-800 rounded-full text-xs font-bold flex items-center gap-2 transition-all">Selanjutnya <ChevronRight className="w-4 h-4" /></button>}
                  </div>
                  <div className="p-6 bg-gray-900 rounded-2xl border border-gray-800">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Download className="w-5 h-5 text-indigo-500" /> Link Unduh</h3>
                    <div className="flex flex-wrap gap-2">{watchData.downloads.map((dl, idx) => (<a key={idx} href={dl.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border border-gray-700">{dl.quality} <ChevronRight className="w-3 h-3" /></a>))}</div>
                  </div>
                </div>
                <div className="p-6 bg-indigo-900/20 rounded-2xl border border-indigo-500/20">
                   <h4 className="font-bold text-white mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Mode Ad-Blocker</h4>
                   <p className="text-[11px] text-gray-400 leading-relaxed">Fitur <strong>Direct Play</strong> memungkinkan Anda menonton langsung dari sumber file video tanpa melalui iklan dari pihak ketiga.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-gray-900 bg-[#0a0c10] py-12 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => changeView('home')}><div className="p-1.5 bg-indigo-600 rounded-lg"><Play className="w-5 h-5 text-white fill-current" /></div><span className="text-lg font-black tracking-tighter text-white">TENSEI<span className="text-indigo-500">ANIME</span></span></div>
          <p className="text-xs text-gray-500 max-w-sm">TenseiAnime menyediakan fitur tanpa iklan melalui Direct Stream API.</p>
        </div>
      </footer>

      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><span className="text-sm font-bold text-indigo-400 tracking-widest animate-pulse uppercase">Memuat...</span></div>
        </div>
      )}
    </div>
  );
}
