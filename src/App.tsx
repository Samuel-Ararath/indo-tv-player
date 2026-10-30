import { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  ArrowLeft, ArrowUpRight, Check, ChevronDown, ChevronRight,
  Clapperboard, Film, Heart, Info, Languages, Menu, MonitorPlay,
  Play, Radio, Search, Settings, Tv, Wifi, X,
} from 'lucide-react'

type Channel = {
  id: string
  name: string
  url: string
  logo?: string
  country?: string
  language?: string
  group?: string
  source: 'official' | 'community'
}

const playlists = [
  { url: 'https://iptv-org.github.io/iptv/countries/id.m3u', language: 'Indonesia' },
  { url: 'https://iptv-org.github.io/iptv/languages/eng.m3u', language: 'English' },
]

const officialChannels: Channel[] = [
  { id: 'tvri', name: 'TVRI Nasional', url: 'https://klik.tvri.go.id/detailchannel/TVRI_CH_00', country: 'Indonesia', language: 'Indonesia', group: 'Nasional', source: 'official' },
  { id: 'tvri-world', name: 'TVRI World', url: 'https://klik.tvri.go.id/', country: 'Indonesia', language: 'English', group: 'News', source: 'official' },
  { id: 'rcti-plus', name: 'RCTI+', url: 'https://www.rctiplus.com/tv/rcti', country: 'Indonesia', language: 'Indonesia', group: 'Entertainment', source: 'official' },
  { id: 'vidio', name: 'Vidio Live', url: 'https://www.vidio.com/live', country: 'Indonesia', language: 'Indonesia', group: 'Entertainment', source: 'official' },
  { id: 'cna', name: 'CNA', url: 'https://www.channelnewsasia.com/watch', country: 'Singapore', language: 'English', group: 'News', source: 'official' },
  { id: 'france24', name: 'France 24 English', url: 'https://www.france24.com/en/live', country: 'France', language: 'English', group: 'News', source: 'official' },
  { id: 'dw', name: 'DW English', url: 'https://www.dw.com/en/live-tv/s-100825', country: 'Germany', language: 'English', group: 'News', source: 'official' },
  { id: 'nhk', name: 'NHK World-Japan', url: 'https://www3.nhk.or.jp/nhkworld/en/live/', country: 'Japan', language: 'English', group: 'News', source: 'official' },
  { id: 'abc', name: 'ABC News Australia', url: 'https://www.abc.net.au/news/newschannel', country: 'Australia', language: 'English', group: 'News', source: 'official' },
]

const freeMovieSources = [
  { name: 'Plex Free Movies', detail: 'Film & serial gratis dengan iklan; katalog menyesuaikan wilayah.', url: 'https://watch.plex.tv/on-demand', icon: 'plex', kind: 'Movies & series' },
  { name: 'YouTube Official', detail: 'Cari film lengkap yang diunggah kanal resmi pemegang hak.', url: 'https://www.youtube.com/results?search_query=film+full+movie+official+free', icon: 'play', kind: 'Movies' },
  { name: 'Internet Archive', detail: 'Jelajahi film klasik dan koleksi yang dinyatakan tersedia publik.', url: 'https://archive.org/details/feature_films', icon: 'archive', kind: 'Classic films' },
]

function parsePlaylist(text: string, language: string): Channel[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const result: Channel[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line.startsWith('#EXTINF')) continue
    const url = lines.slice(i + 1).find((row) => row.trim() && !row.trim().startsWith('#'))?.trim()
    if (!url || !/^https?:\/\//i.test(url)) continue
    const name = line.match(/,(.*)$/)?.[1]?.trim() || 'Live channel'
    const attr = (key: string) => line.match(new RegExp(`${key}="([^"]*)"`, 'i'))?.[1]
    result.push({
      id: attr('tvg-id') || `${name}-${url}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name, url, logo: attr('tvg-logo'), country: attr('tvg-country'),
      language: attr('tvg-language') || language,
      group: attr('group-title') || 'Live TV', source: 'community',
    })
    i += 1
  }
  return result
}

function categoryOf(channel: Channel) {
  const value = `${channel.group} ${channel.name}`.toLowerCase()
  if (/sport|football|soccer|cricket|nba|fifa|liga|match/.test(value)) return 'Sports'
  if (/kid|cartoon|junior|animation/.test(value)) return 'Kids'
  if (/movie|cinema|film|drama|series/.test(value)) return 'Movies'
  if (/music|radio|mtv/.test(value)) return 'Music'
  if (/news|berita|cna|dw |france 24|cnn|bbc|tvri world/.test(value)) return 'News'
  return 'Entertainment'
}

function dateText(date: Date) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

function greeting(hour: number) {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export default function App() {
  const [page, setPage] = useState<'home' | 'tv' | 'movies'>('home')
  const [channels, setChannels] = useState<Channel[]>(officialChannels)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('ruangtv-favorites') || '[]'))
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('Semua bahasa')
  const [category, setCategory] = useState('Semua')
  const [showFavorites, setShowFavorites] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  const [online, setOnline] = useState(navigator.onLine)
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [failedLogos, setFailedLogos] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 15_000)
    const setConnection = () => setOnline(navigator.onLine)
    window.addEventListener('online', setConnection)
    window.addEventListener('offline', setConnection)
    return () => { window.clearInterval(timer); window.removeEventListener('online', setConnection); window.removeEventListener('offline', setConnection) }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all(playlists.map(async (list) => {
      try {
        const response = await fetch(list.url)
        if (!response.ok) return []
        return parsePlaylist(await response.text(), list.language)
      } catch { return [] }
    })).then((lists) => {
      if (cancelled) return
      const officialNames = new Set(officialChannels.map((channel) => channel.name.toLowerCase()))
      const unique = new Map<string, Channel>()
      lists.flat().forEach((channel) => {
        const key = `${channel.name.toLowerCase()}|${channel.url}`
        if (!officialNames.has(channel.name.toLowerCase()) && !unique.has(key)) unique.set(key, channel)
      })
      setChannels([...officialChannels, ...unique.values()])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => { localStorage.setItem('ruangtv-favorites', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => () => hlsRef.current?.destroy(), [])

  useEffect(() => {
    const video = videoRef.current
    hlsRef.current?.destroy()
    hlsRef.current = null
    if (!video || !selected || selected.source !== 'community') return
    video.pause(); video.removeAttribute('src'); video.load()
    if (Hls.isSupported()) {
      const player = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 20, maxBufferLength: 25, capLevelToPlayerSize: true })
      hlsRef.current = player
      player.loadSource(selected.url); player.attachMedia(video)
      player.on(Hls.Events.MANIFEST_PARSED, () => { void video.play().catch(() => undefined) })
      player.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) setNotice('Siaran tidak bisa dibuka. Mungkin sedang offline atau dibatasi wilayah.') })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = selected.url; void video.play().catch(() => undefined)
    } else setNotice('Browser ini belum mendukung format stream tersebut.')
    return () => { hlsRef.current?.destroy(); hlsRef.current = null }
  }, [selected])

  const visibleChannels = useMemo(() => channels.filter((channel) => {
    const matchesLanguage = language === 'Semua bahasa' || (language === 'Indonesia' ? /indones/i.test(channel.language || '') || channel.country === 'Indonesia' : /english/i.test(channel.language || ''))
    const matchesCategory = category === 'Semua' || categoryOf(channel) === category
    const matchesSearch = `${channel.name} ${channel.group} ${channel.country} ${channel.language}`.toLowerCase().includes(search.toLowerCase())
    const matchesFavorites = !showFavorites || favorites.includes(channel.id)
    return matchesLanguage && matchesCategory && matchesSearch && matchesFavorites
  }), [channels, language, category, search, showFavorites, favorites])

  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  const goBack = () => { setPage('home'); setSelected(null); setNotice(''); setShowFavorites(false) }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === 'Escape' || event.key === 'Backspace' || event.key === 'BrowserBack') && page !== 'home') { event.preventDefault(); goBack(); return }
      if (event.key === 'Enter' && page === 'home' && !document.activeElement?.closest('button,a')) document.querySelector<HTMLButtonElement>('.home-tile')?.focus()
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return
      const current = document.activeElement
      if (!(current instanceof HTMLElement) || !current.matches('button,a,[tabindex="0"]')) return
      const direction = event.key.replace('Arrow', '').toLowerCase()
      const currentRect = current.getBoundingClientRect()
      const cx = currentRect.left + currentRect.width / 2
      const cy = currentRect.top + currentRect.height / 2
      const candidates = [...document.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]')]
        .filter((item) => item !== current && item.getClientRects().length > 0 && getComputedStyle(item).visibility !== 'hidden')
        .map((item) => {
          const rect = item.getBoundingClientRect()
          const dx = rect.left + rect.width / 2 - cx
          const dy = rect.top + rect.height / 2 - cy
          const primary = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy
          const cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
          return { item, primary, score: primary + cross * 2.4 }
        }).filter((candidate) => candidate.primary > 0)
        .sort((a, b) => a.score - b.score)
      if (candidates[0]) { event.preventDefault(); candidates[0].item.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page])

  const toggleFullscreen = async () => {
    const target = document.querySelector('.tv-player')
    if (!document.fullscreenElement && target instanceof HTMLElement) await target.requestFullscreen()
    else if (document.fullscreenElement) await document.exitFullscreen()
  }

  const apps = [
    { title: 'Televisi', eyebrow: 'SIARAN LANGSUNG', icon: <Tv />, theme: 'app-tv', action: () => setPage('tv') },
    { title: 'Film gratis', eyebrow: 'FILM & SERIAL', icon: <Clapperboard />, theme: 'app-cinema', action: () => setPage('movies') },
    { title: 'Favorit', eyebrow: `${favorites.length} TERSIMPAN`, icon: <Heart />, theme: 'app-favorite', action: () => { setPage('tv'); setCategory('Semua'); setSearch(''); setShowFavorites(true) } },
    { title: 'Plex', eyebrow: 'FILM GRATIS', icon: <span className="plex-mark">plex</span>, theme: 'app-plex', action: () => window.open('https://watch.plex.tv/on-demand', '_blank', 'noopener,noreferrer') },
    { title: 'YouTube', eyebrow: 'KANAL RESMI', icon: <Play fill="currentColor" />, theme: 'app-youtube', action: () => window.open('https://www.youtube.com/results?search_query=film+full+movie+official+free', '_blank', 'noopener,noreferrer') },
  ]

  return (
    <div className="tv-home">
      <div className="ambient ambient-a" /><div className="ambient ambient-b" />
      <header className="tv-topbar">
        <button className="tv-brand" onClick={goBack} aria-label="Beranda RuangTV"><span className="brand-icon"><Tv size={21} /></span><span>ruang<span>tv</span></span></button>
        <nav className={`tv-nav${mobileMenu ? ' is-open' : ''}`} aria-label="Navigasi utama">
          <button className={page === 'home' ? 'current' : ''} onClick={goBack}><span>⌂</span> Beranda</button>
          <button className={page === 'tv' && !showFavorites ? 'current' : ''} onClick={() => { setPage('tv'); setShowFavorites(false) }}><Tv size={17} /> Televisi</button>
          <button className={page === 'movies' ? 'current' : ''} onClick={() => setPage('movies')}><Film size={17} /> Film & serial</button>
        </nav>
        <div className="top-status"><span className={online ? 'wifi-dot online' : 'wifi-dot'}><Wifi size={17} /></span><span>{online ? 'Terhubung' : 'Offline'}</span><button aria-label="Pengaturan" onClick={() => setNotice('Pilihan bahasa dan favorit tersimpan otomatis di perangkat ini.')}><Settings size={18} /></button><button className="mobile-menu" onClick={() => setMobileMenu((value) => !value)} aria-label="Menu"><Menu size={20} /></button></div>
      </header>

      {page === 'home' && <main className="home-content">
        <section className="welcome-row">
          <div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-line" /> RUANG KELUARGA ANDA</div><p className="greeting">{greeting(clock.getHours())}</p><div className="home-clock" aria-label="Waktu saat ini">{new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(clock)}</div><div className="home-date">{dateText(clock)}</div></div>
          <div className="welcome-art" aria-hidden="true"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-screen"><Tv size={58}/><span>YOUR NEXT<br/>GOOD WATCH</span></div><div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✧</div></div>
          <div className="daily-note"><span className="note-icon"><Radio size={18}/></span><div><span>SIARAN PUBLIK</span><strong>Temukan tontonan<br/>pilihanmu hari ini.</strong></div><ChevronRight size={18}/></div>
        </section>

        <section className="app-launcher" aria-labelledby="launcher-title">
          <div className="launcher-heading"><div><span className="eyebrow">PILIHAN ANDA</span><h1 id="launcher-title">Apa yang ingin ditonton?</h1></div><span className="launcher-hint">PILIH DENGAN REMOTE <span>↵</span></span></div>
          <div className="launcher-rail">{apps.map((app, index) => <button key={app.title} className={`home-tile ${app.theme} tile-${index + 1}`} onClick={app.action}><span className="tile-art"><span className="tile-symbol">{app.icon}</span><span className="tile-glow"/></span><span className="tile-caption"><span>{app.eyebrow}</span><strong>{app.title}</strong></span><span className="tile-arrow"><ArrowUpRight size={17}/></span></button>)}</div>
        </section>

        <section className="continue-row"><div className="continue-title"><span className="eyebrow">MULAI MENJELAJAH</span><p>Siaran resmi dan pilihan komunitas dalam satu layar.</p></div><button onClick={() => setPage('tv')}>Buka panduan TV <ChevronRight size={17}/></button><button onClick={() => setPage('movies')}>Film & serial <ChevronRight size={17}/></button></section>
        <footer className="home-footer"><span>RUANG<span>TV</span></span><span>Hiburan publik, satu ruang.</span><span>{online ? 'ONLINE' : 'OFFLINE'} <i className={online ? 'status-on' : ''}/></span></footer>
      </main>}

      {page === 'tv' && <main className="browse-page">
        <button className="back-link" onClick={goBack}><ArrowLeft size={17}/> Beranda</button>
        <div className="browse-heading"><div><span className="eyebrow">{showFavorites ? 'TERSIMPAN DI PERANGKAT' : 'SIARAN LANGSUNG'}</span><h1>{showFavorites ? 'Favorit' : 'Televisi'}<span>.</span></h1><p>{showFavorites ? 'Kanal yang Anda simpan untuk ditonton lagi.' : 'Kanal berbahasa Indonesia dan Inggris, dari halaman resmi dan playlist terbuka.'}</p></div><button className="language-toggle" onClick={() => setLanguage((value) => value === 'Semua bahasa' ? 'Indonesia' : value === 'Indonesia' ? 'English' : 'Semua bahasa')}><Languages size={16}/>{language}<ChevronDown size={15}/></button></div>
        <div className="browse-layout">
          <section className="channel-browser">
            <label className="search-box"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kanal, berita, olahraga…"/></label>
            <div className="genre-tabs">{['Semua','News','Sports','Kids','Entertainment','Movies','Music'].map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
            <div className="channel-grid">{visibleChannels.slice(0, 100).map((channel) => <article className="channel-card" key={`${channel.source}-${channel.id}`}><button className="channel-select" onClick={() => { setSelected(channel); if (channel.source === 'official') window.open(channel.url, '_blank', 'noopener,noreferrer') }}><span className="channel-logo">{channel.logo && !failedLogos.includes(channel.id) ? <img src={channel.logo} alt="" onError={() => setFailedLogos((old) => [...old, channel.id])}/> : channel.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</span><span className="channel-copy"><strong>{channel.name}</strong><small>{channel.language || 'International'} · {categoryOf(channel)}</small></span><span className="source-dot" title={channel.source === 'official' ? 'Sumber resmi' : 'Playlist komunitas'}/></button><button className={`favorite-button${favorites.includes(channel.id) ? ' chosen' : ''}`} aria-label="Simpan favorit" onClick={() => toggleFavorite(channel.id)}><Heart size={18} fill={favorites.includes(channel.id) ? 'currentColor' : 'none'}/></button></article>)}</div>
            {visibleChannels.length === 0 && <div className="empty-state">Belum ada kanal yang cocok. Coba kata pencarian atau bahasa lain.</div>}
          </section>
          <aside className="tv-player-panel"><div className="player-head"><span><span className="live-pulse"/> SEKARANG DIPILIH</span><button onClick={toggleFullscreen} aria-label="Layar penuh"><MonitorPlay size={18}/></button></div><div className="tv-player">{selected?.source === 'community' ? <video ref={videoRef} controls playsInline onError={() => setNotice('Stream gagal diputar. Coba kanal lain.')}/> : <div className="player-placeholder"><span className="screen-icon"><Tv size={34}/></span><strong>{selected?.name || 'Pilih kanal untuk mulai'}</strong><small>{selected ? 'Halaman resmi akan dibuka di tab baru.' : 'Pilih salah satu kanal dari daftar.'}</small></div>}</div>{notice && <div className="notice-bar"><Info size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Tutup"><X size={15}/></button></div>}<div className="player-foot"><span>{selected?.name || 'Panduan kanal'}</span><span>{selected ? (selected.source === 'official' ? 'RESMI' : 'STREAM') : `${channels.length} KANAL`}</span></div></aside>
        </div>
      </main>}

      {page === 'movies' && <main className="browse-page movies-page">
        <button className="back-link" onClick={goBack}><ArrowLeft size={17}/> Beranda</button>
        <section className="movies-hero"><div className="movies-copy"><span className="eyebrow"><span className="eyebrow-line"/> MALAM FILM</span><h1>Cerita bagus,<br/><em>tanpa ribet.</em></h1><p>Jelajahi katalog film dan serial gratis dari layanan resmi. Ketersediaan judul bisa berbeda menurut negara.</p><button className="primary-movie" onClick={() => window.open('https://watch.plex.tv/on-demand', '_blank', 'noopener,noreferrer')}><Play size={16} fill="currentColor"/> Jelajahi film gratis <ArrowUpRight size={16}/></button></div><div className="movie-poster-art" aria-hidden="true"><div className="poster-sun"/><div className="poster-hill hill-back"/><div className="poster-hill hill-front"/><span>TONIGHT<br/><b>IS A<br/>MOVIE NIGHT</b></span></div></section>
        <section className="catalog-section"><div className="catalog-head"><div><span className="eyebrow">SUMBER TERPILIH</span><h2>Film & serial gratis</h2><p>Tekan kartu untuk membuka katalog layanan sumber.</p></div><span className="free-badge"><Check size={14}/> GRATIS</span></div><div className="catalog-grid">{freeMovieSources.map((source,index) => <a className={`catalog-card catalog-${source.icon}`} href={source.url} target="_blank" rel="noreferrer" key={source.name}><span className="catalog-number">0{index+1}</span><span className="catalog-icon">{source.icon === 'play' ? <Play fill="currentColor"/> : source.icon === 'plex' ? <span className="plex-mark">plex</span> : <Film/>}</span><span className="catalog-kind">{source.kind}</span><strong>{source.name}</strong><p>{source.detail}</p><span className="catalog-open">BUKA KATALOG <ArrowUpRight size={15}/></span></a>)}</div><div className="legal-note"><Info size={17}/><p>RuangTV hanya mengarahkan ke katalog resmi dan film yang dinyatakan tersedia untuk publik. Situs seperti Idlix yang menayangkan film tanpa izin tidak dapat dijadikan sumber pemutar. Saya bisa menambahkan sumber baru jika sumber tersebut legal dan mengizinkan pemutaran publik.</p></div></section>
      </main>}
      {notice && page === 'home' && <div className="toast-note"><Info size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Tutup"><X size={15}/></button></div>}
      <div className="remote-help"><span>↑ ↓ ← →</span> NAVIGASI <i/> <span>ENTER</span> PILIH <i/> <span>ESC</span> KEMBALI</div>
    </div>
  )
}
