# AdKalkan

A privacy-first, open source ad blocker for Chrome. No data collection, no
telemetry, no remote code. Filtering runs entirely in the browser's
`declarativeNetRequest` engine; your browsing data never touches this
extension's code.

Gizlilik öncelikli, açık kaynak Chrome reklam engelleyici. Veri toplama yok,
telemetri yok, uzaktan kod yok. Filtreleme tamamen tarayıcının
`declarativeNetRequest` motorunda çalışır.

## How it works / Nasıl çalışır

| Mode | Permission prompt | Network blocking | Cosmetic hiding |
|---|---|---|---|
| Default | **none** | all sites | granted sites only |
| Site granted ("Bu siteyi koru") | per site | all sites | granted sites |
| Full access (optional) | once, all sites | all sites | all sites |

MV3 `declarativeNetRequest` rules do **not** require host permissions, so
network-level ad and tracker blocking works out of the box with a
permission-free install. Cosmetic (element hiding) filtering is enabled per
site when you grant it, or everywhere if you opt in to full access.

## Filter lists

Compiled at build time (never fetched at runtime):

- [EasyList](https://easylist.to) — global ad rules
- [EasyPrivacy](https://easylist.to) — tracker rules
- [AdGuard Turkish filter](https://adguard.com/kb/general/ad-filtering/adguard-filters/) — Turkish ad rules
- [Peter Lowe's List](https://pgl.yoyo.org/adservers/) — ad/tracking hosts

## Build

```
npm run build      # downloads lists, converts to DNR, bumps version (0.1.0 -> 0.1.1)
npm run build:dev  # same, without the version bump (local iterations)
npm test           # rule matching + over-blocking checks
npm run pack       # dist/adkalkan-<version>.zip, ready for Chrome Web Store
```

`npm run build` bumps the patch version in `package.json` and
`extension/manifest.json`, because the Web Store rejects re-uploads with an
unchanged version. Use `build:dev` while iterating so you do not burn version
numbers.

The build fails (rather than producing a broken extension) if any rule would be
rejected by Chrome: non-ASCII filters, invalid RE2 regexes, `||*` filters,
malformed domains, duplicate ids, more than 1000 regex rules, or unbalanced
cosmetic selectors.

Loads unpacked at `chrome://extensions` from the `extension/` folder after a
build.

## License

MIT
