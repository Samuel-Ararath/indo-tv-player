import { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  ArrowDownToLine, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clapperboard, Clock3, Globe2, Heart, Info, Languages, ListFilter, LoaderCircle,
  Menu, MonitorPlay, Play, Radio, Search, ShieldCheck, Sparkles, Tv, X,
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
  homepage?: string
}

type OfficialChannel = Omit<Channel, 'source'>

const communityLists = [
  { label: 'Indonesia', url: 'https://iptv-org.github.io/iptv/countries/id.m3u', language: 'Indonesia' },
  { label: 'English', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u', language: 'English' },
]

// Entries are official free live pages, not extracted player/DRM URLs.
const officialChannels: OfficialChannel[] = [
  { id: 'tvri-nasional', name: 'TVRI Nasional', url: 'https://klik.tvri.go.id/detailchannel/TVRI_CH_00', country: 'Indonesia', language: 'Indonesia', group: 'Nasional', homepage: 'https://tvri.go.id/' },
  { id: 'tvri-world', name: 'TVRI World', url: 'https://klik.tvri.go.id/', country: 'Indonesia', language: 'English', group: 'News', homepage: 'https://tvri.go.id/' },
  { id: 'rcti-plus', name: 'RCTI+', url: 'https://www.rctiplus.com/tv/rcti', country: 'Indonesia', language: 'Indonesia', group: 'Entertainment', homepage: 'https://www.rctiplus.com/' },
  { id: 'vidio-live', name: 'Vidio Live TV', url: 'https://www.vidio.com/live', country: 'Indonesia', language: 'Indonesia', group: 'Entertainment', homepage: 'https://www.vidio.com/' },
  { id: 'vision-plus', name: 'VISION+', url: 'https://www.visionplus.id/webclient/userpremium/go/live.html', country: 'Indonesia', language: 'Indonesia', group: 'Entertainment', homepage: 'https://www.visionplus.id/' },
  { id: 'trans-tv-live', name: 'Trans TV Live', url: 'https://www.transtv.co.id/live/streaming-tv/rcti', country: 'Indonesia', language: 'Indonesia', group: 'Entertainment', homepage: 'https://www.transtv.co.id/' },
  { id: 'cna', name: 'CNA', url: 'https://www.channelnewsasia.com/watch', country: 'Singapore', language: 'English', group: 'News', homepage: 'https://www.channelnewsasia.com/' },
  { id: 'france24-en', name: 'France 24 English', url: 'https://www.france24.com/en/live', country: 'France', language: 'English', group: 'News', homepage: 'https://www.france24.com/' },
  { id: 'dw-en', name: 'DW English', url: 'https://www.dw.com/en/live-tv/s-100825', country: 'Germany', language: 'English', group: 'News', homepage: 'https://www.dw.com/' },
  { id: 'nhk-world', name: 'NHK World-Japan', url: 'https://www3.nhk.or.jp/nhkworld/en/live/', country: 'Japan', language: 'English', group: 'News', homepage: 'https://www3.nhk.or.jp/nhkworld/' },
  { id: 'abc-australia', name: 'ABC Australia', url: 'https://www.abc.net.au/news/newschannel', country: 'Australia', language: 'English', group: 'News', homepage: 'https://www.abc.net.au/' },
]

const genres = ['All channels', 'News', 'Entertainment', 'Sports', 'Kids', 'Movies', 'Music']
const toId = (name: string, url: string) => `${name}-${url}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function parseM3U(source: string, language: string): Channel[] {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/)
  const channels: Channel[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line.startsWith('#EXTINF')) continue
    const url = lines.slice(index + 1).find((candidate) => candidate.trim() && !candidate.trim().startsWith('#'))?.trim()
    if (!url || !/^https?:\/\//i.test(url)) continue
    const name = line.match(/,(.*)$/)?.[1]?.trim() || 'Untitled channel'
    const attr = (key: string) => line.match(new RegExp(`${key}="([^"]*)"`, 'i'))?.[1]
    const group = attr('group-title') || 'General'
    channels.push({
      id: attr('tvg-id') || toId(name, url), name, url,
      logo: attr('tvg-logo'), country: attr('tvg-country') || (language === 'Indonesia' ? 'Indonesia' : undefined),
      language: attr('tvg-language') || language, group, source: 'community',
    })
    index += 1
  }
  return channels
}

function categoryOf(channel: Channel) {
  const text = `${channel.group || ''} ${channel.name}`.toLowerCase()
  if (/sport|football|soccer|cricket|tennis|nba|fifa|premier|liga|match|arena/.test(text)) return 'Sports'
  if (/kid|cartoon|junior|children|animation|baby/.test(text)) return 'Kids'
  if (/movie|cinema|film|drama|series/.test(text)) return 'Movies'
  if (/music|radio|mtv|hits/.test(text)) return 'Music'
  if (/news|berita|cna|dw |france 24|al jazeera|cnn|bbc|tvri world/.test(text)) return 'News'
  if (/entertain|general|variety|family|lifestyle|documentary/.test(text)) return 'Entertainment'
  return channel.group || 'General'
}

function ChannelTile({ channel, active, favorite, onSelect, onFavorite }: {
  channel: Channel; active: boolean; favorite: boolean; onSelect: () => void; onFavorite: () => void
}) {
  const [failedLogo, setFailedLogo] = useState(false)
  const initials = channel.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return (
    <article className={`channel-card${active ? ' is-active' : ''}`}>
      <button className="channel-select" onClick={onSelect} aria-label={`Pilih ${channel.name}`}>
        <span className={`channel-logo ${channel.source === 'official' ? 'official-logo' : ''}`}>
          {channel.logo && !failedLogo ? <img src={channel.logo} alt="" loading="lazy" onError={() => setFailedLogo(true)} /> : <span>{initials || <Tv size={22} />}</span>}
        </span>
        <span className="channel-copy">
          <span className="channel-name">{channel.name}</span>
          <span className="channel-meta">{channel.language || 'International'} <i /> {categoryOf(channel)}</span>
        </span>
        <span className={`source-pill ${channel.source}`}>{channel.source === 'official' ? <><ShieldCheck size={12} /> Official</> : 'Community'}</span>
      </button>
      <button className={`favorite-button${favorite ? ' selected' : ''}`} onClick={onFavorite} aria-label={favorite ? 'Remove favorite' : 'Add favorite'}>
        <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}

export default function App() {
  const [channels, setChannels] = useState<Channel[]>(officialChannels.map((channel) => ({ ...channel, source: 'official' })))
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(false)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('Indonesia + English')
  const [category, setCategory] = useState('All channels')
  const [activeSection, setActiveSection] = useState('Discover')
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('ruangtv-favorites') || '[]'))
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<Hls | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadLists() {
      const loaded = await Promise.all(communityLists.map(async (list) => {
        try {
          const response = await fetch(list.url)
          if (!response.ok) throw new Error(`Playlist returned ${response.status}`)
          return parseM3U(await response.text(), list.language)
        } catch {
          return []
        }
      }))
      if (cancelled) return
      const community = loaded.flat()
      const officialIds = new Set(officialChannels.map((channel) => channel.name.toLowerCase()))
      const dedupedCommunity = new Map<string, Channel>()
      for (const channel of community) {
        const key = `${channel.name.toLowerCase()}|${channel.url}`
        if (!officialIds.has(channel.name.toLowerCase()) && !dedupedCommunity.has(key)) dedupedCommunity.set(key, channel)
      }
      const merged = [...officialChannels.map((channel) => ({ ...channel, source: 'official' as const })), ...dedupedCommunity.values()]
      setChannels(merged)
      setListError(community.length === 0)
      setLoading(false)
      if (!selected && merged.length) setSelected(merged[0])
    }
    void loadLists()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !selected || selected.source === 'official') return
    playerRef.current?.destroy()
    playerRef.current = null
    video.pause()
    video.removeAttribute('src')
    video.load()
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 30, maxBufferLength: 30, capLevelToPlayerSize: true })
      playerRef.current = hls
      hls.loadSource(selected.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => { void video.play().catch(() => undefined) })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setNotice('Stream ini tidak merespons. Coba kualitas/jaringan lain atau buka situs sumbernya.')
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = selected.url
      video.play().catch(() => undefined)
    } else {
      setNotice('Browser ini belum mendukung pemutaran stream tersebut.')
    }
    return () => { playerRef.current?.destroy(); playerRef.current = null }
  }, [selected])

  useEffect(() => { localStorage.setItem('ruangtv-favorites', JSON.stringify(favorites)) }, [favorites])
  useEffect(() => () => playerRef.current?.destroy(), [])

  const filtered = useMemo(() => channels.filter((channel) => {
    const matchesLanguage = language === 'Indonesia + English' || (language === 'Indonesia' ? channel.language?.toLowerCase().includes('indones') || channel.country === 'Indonesia' : channel.language?.toLowerCase().includes('english'))
    const matchesSearch = `${channel.name} ${channel.group} ${channel.country} ${channel.language}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'All channels' || categoryOf(channel) === category
    const matchesSection = activeSection !== 'Favorites' || favorites.includes(channel.id)
    return matchesLanguage && matchesSearch && matchesCategory && matchesSection
  }), [channels, language, search, category, activeSection, favorites])

  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const selectChannel = (channel: Channel) => { setSelected(channel); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goToNext = (direction: number) => {
    if (!selected || !filtered.length) return
    const current = filtered.findIndex((channel) => channel.id === selected.id)
    const next = filtered[(current + direction + filtered.length) % filtered.length]
    if (next) selectChannel(next)
  }
  const toggleFullscreen = async () => {
    const el = document.querySelector('.player-shell')
    if (!document.fullscreenElement && el instanceof HTMLElement) { await el.requestFullscreen(); setFullscreen(true) }
    else { await document.exitFullscreen(); setFullscreen(false) }
  }
  const handlePlay = (channel: Channel) => {
    setSelected(channel)
    if (channel.source === 'official') window.open(channel.url, '_blank', 'noopener,noreferrer')
    else setNotice('Memuat siaran komunitas…')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileMenu ? ' open' : ''}`}>
        <a href="#home" className="brand"><span className="brand-mark"><Tv size={20} /></span><span>ruang<span>tv</span><small>TELEVISION, GATHERED</small></span></a>
        <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Tutup menu"><X /></button>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav">
          <button className={activeSection === 'Discover' ? 'active' : ''} onClick={() => { setActiveSection('Discover'); setMobileMenu(false) }}><Sparkles size={17} /> Discover <span className="nav-shortcut">⌘ 1</span></button>
          <button className={activeSection === 'Favorites' ? 'active' : ''} onClick={() => { setActiveSection('Favorites'); setMobileMenu(false) }}><Heart size={17} /> Favorites <span className="nav-count">{favorites.length || ''}</span></button>
          <button onClick={() => { setCategory('News'); setActiveSection('Discover'); setMobileMenu(false) }}><Globe2 size={17} /> News</button>
          <button onClick={() => { setCategory('Sports'); setActiveSection('Discover'); setMobileMenu(false) }}><Radio size={17} /> Sports</button>
          <button onClick={() => { setCategory('Kids'); setActiveSection('Discover'); setMobileMenu(false) }}><Clapperboard size={17} /> Kids & family</button>
        </nav>
        <div className="sidebar-language">
          <div className="sidebar-label">LANGUAGE</div>
          <button className="language-select" onClick={() => setLanguage((current) => current === 'Indonesia + English' ? 'Indonesia' : current === 'Indonesia' ? 'English' : 'Indonesia + English')}><Languages size={16} /><span>{language}</span><ChevronDown size={15} /></button>
        </div>
        <div className="sidebar-bottom">
          <div className="community-credit"><span className="credit-icon"><Tv size={17} /></span><div><strong>Your channels, in one place</strong><p>Discover free live television across languages.</p></div></div>
          <button className="about-link" onClick={() => setNotice('Install RuangTV from your browser menu to keep it close.')}>Install RuangTV <ArrowDownToLine size={14} /></button>
          <div className="sidebar-version">RUANGTV <span>EARLY ACCESS · 0.1</span></div>
        </div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Tutup menu" />}

      <main className="main-content" id="home">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)} aria-label="Buka menu"><Menu /></button>
          <div className="breadcrumbs"><span>Home</span><ChevronRight size={14} /><strong>{activeSection}</strong></div>
          <div className="topbar-right"><span className="online-dot" /> PUBLIC STREAMS <button className="install-button" onClick={() => setNotice('Gunakan menu browser → Install app / Add to Home Screen untuk memasang RuangTV.') }><ArrowDownToLine size={15} /> Install app</button></div>
        </header>

        <section className="feature-area">
          <div className="feature-heading"><div className="live-kicker"><span className="live-pulse" /> CURATED LIVE TV <i /> INDONESIA & ENGLISH</div><div className="feature-arrows"><button onClick={() => goToNext(-1)} aria-label="Previous channel"><ChevronLeft size={18} /></button><button onClick={() => goToNext(1)} aria-label="Next channel"><ChevronRight size={18} /></button></div></div>
          <div className={`player-shell${fullscreen ? ' fullscreen' : ''}`}>
            <div className="player-backdrop" />
            <div className="player-topline"><span><span className="live-pulse" /> {selected?.source === 'official' ? 'OFFICIAL SOURCE' : 'COMMUNITY STREAM'}</span><button onClick={toggleFullscreen} aria-label="Toggle fullscreen"><MonitorPlay size={17} /></button></div>
            {selected?.source === 'community' ? <video ref={videoRef} className="video-element" controls playsInline onError={() => setNotice('Stream gagal diputar. Link mungkin sedang offline atau dibatasi wilayah.')} /> : <div className="player-poster"><div className="poster-orbit orbit-one" /><div className="poster-orbit orbit-two" /><div className="poster-logo"><Tv size={32} /></div><p>PUBLIC LIVE TELEVISION</p><strong>{selected?.name || 'Choose a channel'}</strong><span>Open the broadcaster’s official live page to watch</span></div>}
            <div className="player-control-row"><button className="round-control" onClick={() => selected && handlePlay(selected)} aria-label="Play selected channel"><Play size={15} fill="currentColor" /></button><div className="now-playing"><strong>{selected?.name || 'Select a channel'}</strong><span>{selected?.source === 'official' ? 'Official free stream page' : `${selected?.group || 'Live'} · Community directory`}</span></div><div className="player-live-label"><span className="live-pulse" /> LIVE</div><button className="skip-control" onClick={() => goToNext(1)} aria-label="Next channel"><ChevronRight size={18} /></button></div>
          </div>
          {notice && <div className="notice-bar"><Info size={15} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
          <div className="player-disclaimer"><Radio size={14} /><span>Some channels open on their broadcaster’s site. Stream availability can vary by channel and region.</span></div>
        </section>

        <section className="channel-section" aria-labelledby="channel-heading">
          <div className="section-title-row"><div><div className="section-overline">THE CHANNEL GUIDE <span>·</span> {loading ? 'SYNCING' : `${filtered.length} AVAILABLE`}</div><h1 id="channel-heading">{activeSection === 'Favorites' ? 'Your favorites' : 'Find something to watch'}<span>.</span></h1><p>Free public streams, gathered with care. Choose a channel to open or play.</p></div><div className="last-updated"><Clock3 size={14} /> LIVE DIRECTORY <span className="refresh-status">{loading ? <LoaderCircle size={13} className="spin" /> : <Check size={13} />}</span></div></div>
          <div className="toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search channels, sports, cartoons…" /><kbd>⌘ K</kbd></label><button className="filter-button" onClick={() => setCategory((current) => current === 'All channels' ? 'News' : current === 'News' ? 'Entertainment' : 'All channels')}><ListFilter size={16} /> <span>{category === 'All channels' ? 'All categories' : category}</span><ChevronDown size={14} /></button><button className="language-chip" onClick={() => setLanguage((current) => current === 'Indonesia + English' ? 'Indonesia' : current === 'Indonesia' ? 'English' : 'Indonesia + English')}><Languages size={15} /> {language}</button></div>
          <div className="genre-tabs">{genres.map((genre) => <button key={genre} className={category === genre ? 'selected' : ''} onClick={() => setCategory(genre)}>{genre}</button>)}</div>
          {listError && <div className="notice-bar list-error"><Info size={15} /><span>Community playlists could not be reached right now. Official links remain available; retry after checking your connection.</span></div>}
          {filtered.length ? <div className="channel-grid">{filtered.slice(0, 150).map((channel) => <ChannelTile key={`${channel.source}-${channel.id}`} channel={channel} active={selected?.id === channel.id} favorite={favorites.includes(channel.id)} onSelect={() => selectChannel(channel)} onFavorite={() => toggleFavorite(channel.id)} />)}</div> : <div className="empty-state"><Tv size={28} /><strong>No channels found</strong><span>Try another search or language filter.</span></div>}
          {filtered.length > 150 && <p className="results-limit">Showing 150 channels. Search to narrow down the directory.</p>}
        </section>

        <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark"><Tv size={18} /></span><span>ruang<span>tv</span></span></a><span>A thoughtful guide to free public television.</span><span>© 2026 RUANGTV</span></footer>
      </main>
    </div>
  )
}
