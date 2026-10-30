# RuangTV

RuangTV is a TV-first live channel guide with a calm, cinematic home screen and remote-friendly navigation. It brings together official broadcaster pages and publicly indexed community streams for Indonesian and English-language viewing.

## Download

[Open the latest GitHub Actions build](https://github.com/Samuel-Ararath/indo-tv-player/actions/workflows/build.yml) and select the newest successful run. Under **Artifacts**, download:

- `ruangtv-android-tv-debug-apk` for Android TV. Extract the ZIP to get the APK.
- `ruangtv-web-dist` for the Windows web app files.

The APK is a debug build for sideloading, not a Play Store release. The Windows artifact is a static web build; host its contents over HTTPS to use it as an installable PWA.

## What it does

- TV-style home screen with a live clock, large focusable cards, and directional remote/keyboard navigation.
- Indonesian and English live channel directory, searchable and filterable by category.
- HLS playback for streams that allow browser playback; official broadcaster choices open their own pages.
- Local favorites and free movie/series discovery links.
- Responsive layout for testing in a desktop browser and smaller screens.

## Free movie sources

The movie page links to Plex's ad-supported catalog, YouTube search for official rights-holder uploads, and Internet Archive classic-film collections. Catalog availability and viewing rights vary by location and title. RuangTV does not scrape or connect to unauthorized streaming sites such as Idlix, bypass DRM, or rehost video.

## Run and build

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

The static site is written to `dist/`. Host it over HTTPS to make browser installation available where the browser supports installable web apps. The web build is also wrapped as an Android TV app in GitHub Actions. Each successful build stores an unsigned debug APK as the `ruangtv-android-tv-debug-apk` workflow artifact for sideloading. It is not a Play Store release or a signed release APK.

## Sources and attribution

Community channel entries are loaded at runtime from the upstream IPTV-Org Indonesian and English-language playlists:

- Project: https://github.com/iptv-org/iptv
- Indonesian channels: https://iptv-org.github.io/iptv/countries/id.m3u
- English-language channels: https://iptv-org.github.io/iptv/languages/eng.m3u

IPTV-Org is an independent project and is not affiliated with RuangTV. Its playlist entries are community-submitted links; IPTV-Org does not host the video files. This source credit and the upstream links are documented here in the GitHub repository. Broadcaster names, marks, programs, and streams remain the property of their respective owners.

Official broadcaster entries point to public pages owned by the broadcaster. An official page may require an account, subscription, or region access, and a link in this guide does not guarantee that a particular stream is free or available.

## Limitations and rights

This guide cannot guarantee that every Indonesian TV channel, sports event, or cartoon is available for free. Community links can be removed, geo-restricted, or unavailable, and playback smoothness depends on the broadcaster/stream host and your connection. The app does not proxy, decrypt, record, or retransmit programming.

## License

Original RuangTV application code is provided under the MIT License in `LICENSE`. IPTV-Org project data remains subject to upstream terms and is fetched at runtime rather than copied into this repository.

