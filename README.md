# RuangTV — Indo TV Player

A polished cross-platform live TV guide for Android phones and Windows PCs. The same responsive PWA can be installed from Chrome/Edge on Android and Windows; it currently uses official broadcaster pages plus HLS community stream links where browser playback is supported.

## Product direction

- Show official, free broadcaster streams first when publicly available.
- Offer IPTV-Org public playlist entries as a clearly labeled community fallback, fetched live from upstream rather than copied into this repository.
- Restrict the initial directory to Indonesian-language channels and English-language channels.
- Add search, categories, favorites, playback recovery, and external-player fallback.
- Never proxy, restream, decrypt, or bypass subscriptions/DRM. Availability and stability depend on each broadcaster's stream host.

## Stack and run locally

React + TypeScript + Vite, with hls.js for browser playback and a responsive installable PWA shell.

```sh
npm install
npm run dev
```

Use `npm run build` to produce the static site in `dist/`. Deploy `dist/` to any static host with HTTPS. To install, open the deployed site in Chrome/Edge and choose **Install app** or **Add to Home Screen**.

## Sources

- IPTV-Org: https://github.com/iptv-org/iptv
- IPTV-Org global playlist: https://iptv-org.github.io/iptv/index.m3u
- IPTV-Org Indonesian playlist: https://iptv-org.github.io/iptv/countries/id.m3u
- IPTV-Org English-language playlist: https://iptv-org.github.io/iptv/languages/eng.m3u
- Official sources should be linked to broadcaster-owned endpoints or official free live pages and labeled separately from community playlist entries.

Attribution and source references are documented in this repository. The application interface does not display third-party attribution. Channel names, logos, and streams remain attributable to their respective owners/providers. IPTV-Org provides user-submitted links and states that it does not host video files.

## Important limitation

“All Indonesian TV” and all live sports cannot be guaranteed for free. Some broadcasters do not publish open streams, and sports/cartoon rights are often paid or region-limited. IPTV-Org itself describes its entries as user-submitted links; each stream may be removed, geo-restricted, unavailable, or unstable.

## Development status

Early access. The channel directory is based on upstream playlists and should be treated as a convenience index, not as a promise that every channel works, is available in every territory, or carries a particular event. Official entries link to public broadcaster pages rather than attempting to extract protected player URLs.

## Attribution and rights

IPTV-Org is an independent open-source project and is not affiliated with RuangTV. We appreciate its maintainers and contributors. This application does not own, host, proxy, decrypt, record, or retransmit TV programming. Stream providers and broadcasters control availability and rights. If a link is broken or raises a rights concern, report it to the upstream source/provider; the app can hide a channel locally while upstream corrections are handled by its maintainers.

## License

Original RuangTV application code is provided under the MIT License. IPTV-Org's project and playlist data remain under the upstream license/terms; this repository does not copy or relicense their playlist files.

