import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
let manifest = await readFile(manifestPath, 'utf8')

if (!manifest.includes('android.software.leanback')) {
  manifest = manifest.replace(
    /(<manifest\b[^>]*>)/,
    '$1\n    <uses-feature android:name="android.software.leanback" android:required="false" />\n    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />',
  )
}
if (!manifest.includes('android:banner=')) {
  manifest = manifest.replace(/(<application\b[^>]*)(>)/, '$1 android:banner="@drawable/tv_banner"$2')
}
manifest = manifest.replace(/<activity\b(?=[^>]*android:name="\.MainActivity")[^>]*>/, (activity) =>
  activity.includes('android:screenOrientation=') ? activity : activity.replace(/>$/, ' android:screenOrientation="landscape">'),
)
if (!manifest.includes('android.intent.category.LEANBACK_LAUNCHER')) {
  manifest = manifest.replace(
    /(<category\s+android:name="android\.intent\.category\.LAUNCHER"\s*\/>)/,
    '$1\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />',
  )
}
await writeFile(manifestPath, manifest)

const bannerPath = 'android/app/src/main/res/drawable/tv_banner.xml'
await mkdir(dirname(bannerPath), { recursive: true })
await writeFile(bannerPath, `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="320dp" android:height="180dp" android:viewportWidth="320" android:viewportHeight="180">
    <path android:fillColor="#19181D" android:pathData="M0,0h320v180h-320z" />
    <path android:fillColor="#1D1A20" android:pathData="M154,0h166v180h-166z" />
    <path android:fillColor="#F4C2D0" android:pathData="M48,54h88a12,12 0,0 1,12 12v48a12,12 0,0 1,-12 12h-88a12,12 0,0 1,-12 -12v-48a12,12 0,0 1,12 -12z" />
    <path android:fillColor="#30252D" android:pathData="M52,62h80v56h-80z" />
    <path android:fillColor="#F4C2D0" android:pathData="M77,132h30v5h-30zM88,137h8v8h-8z" />
    <path android:fillColor="#E8A4B9" android:pathData="M196,59h74v5h-74zM196,73h94v3h-94zM196,84h82v3h-82z" />
    <path android:fillColor="#F4C2D0" android:pathData="M196,104h44a8,8 0,0 1,8 8v8h-52z" />
</vector>
`)
console.log('Configured Android TV manifest and launcher banner.')
