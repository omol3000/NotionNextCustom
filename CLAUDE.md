# CLAUDE.md

Kommuniziere auf Deutsch, es sei denn, Niels schreibt auf Englisch.

## Projekt

Blog **ai.growhuman.io**: ein Fork von [NotionNext](https://github.com/notionnext-org/NotionNext) (Remote `upstream`) mit dem Theme `nobelst` und der Sprache `de-DE`. Die Inhalte kommen aus Notion, die Seiten erzeugt Next.js per ISR, gehostet wird auf Vercel (Hobby-Plan). Code-Kommentare aus dem Upstream sind chinesisch. Neue Kommentare folgen dem Stil der umgebenden Datei.

## Vercel

- Team `omol3000's projects`: `team_sfSTYCX3L1rpMn1MCN7dz9ae`
- **Live-Projekt `notion-next-custom`**: `prj_HZIcONXiktKraANgAKI1Rec2aXUk`, deployt aus `main`
- Am selben Repo hängt ein zweites Projekt, `notion-ai-consulting` (`prj_vz40OwnaM3mDtxSj0hpG9sda9yWm`). Es hat weder Traffic noch Logs. Wer dort nach Fehlern sucht, findet nichts und zieht daraus falsche Schlüsse.
- Preview-Deployments liegen hinter Vercel SSO. Prüfen lässt sich darum nur über Build- und Runtime-Logs oder nach dem Production-Deploy direkt auf ai.growhuman.io.
- Ein Push auf `main` löst den Production-Build aus. Beim Build werden alle veröffentlichten Artikel vorgerendert.

## Konfiguration: Notion überstimmt `blog.config.js`

`siteConfig(KEY, …)` liest zuerst aus der Notion-Tabelle „🔧 Config - Backup“ und erst danach aus `blog.config.js` bzw. `conf/*.js`.
- Page `29d13e6e-6069-800e-91c0-ef607644ac40`, Datenquelle `collection://29d13e6e-6069-81de-881a-000b4c763170`
- Spalten: `配置名` (Key), `配置值` (Wert), `启用` (aktiv)

**Vor jeder Änderung an einem `siteConfig`-Key** in dieser Tabelle prüfen, ob der Key dort aktiv gesetzt ist. Sonst bleibt die Code-Änderung wirkungslos. Dort aktiv gesetzt sind u. a. `POST_LIST_PREVIEW=false` und `NOBELIUM_MENU_RSS=false`.

## Last, Caching, ISR

- `NEXT_REVALIDATE_SECOND` = 21600 (6 h). Vercel arbeitet mit stale-while-revalidate: Der erste Aufruf nach Ablauf bekommt die alte Seite, im Hintergrund wird neu gebaut.
- Fast der gesamte Traffic stammt von einem **UptimeRobot-Monitor** im 4-Stunden-Takt. Sein Intervall ist der größte Hebel auf die Fluid-CPU-Last. Steigt die Last unerwartet, zuerst das Monitor-Intervall prüfen, dann erst den Code. Wer das ISR-Intervall senkt, vervielfacht die Last.
- Frische Inhalte erzwingt Niels über `/api/revalidate` (Secret `REVALIDATE_SECRET` in den Vercel-Env-Vars), per Bookmarklet für den aktuellen Pfad plus Startseite.
- RSS, Sitemap und `robots.txt` entstehen nur beim Build. Die Middleware blockt Scanner-Anfragen.
- **Bewusst nicht gebaut** (Stand 2026-09):
  1. Persistenter Cache über Upstash-Redis. `lib/cache/cache_manager.js` nimmt Redis automatisch, sobald `REDIS_URL` gesetzt ist.
  2. Stale-Fallback bei HTTP 429 von Notion.

  Beides erst angehen, wenn in den Runtime-Errors wieder nennenswert `429 Too Many Requests` von `app.notion.com/api/v3/queryCollection` auftaucht.

## Bilder

- Eigene Bilder liegen auf IONOS S3 (`data-growhuman.s3-eu-central-1.ionoscloud.com`).
- Bilder, die direkt in Notion hochgeladen wurden, laufen über den Notion-Proxy `www.notion.so/image/…`, Dateien/PDF/Video/Audio über `notion.so/signed/…`. Beide signieren bei jedem Aufruf neu.
- `getPage` wird deshalb mit `signFileUrls: false` aufgerufen (`lib/db/notion/getPostBlocks.js`). Die signierten `file.notion.com`-Links laufen nach etwa 8 h ab (HTTP 419) und waren in ISR-Seiten eingefroren: Bilder fehlten bis zum Reload. Diese Signierung **nicht wieder einschalten**.
- Der Proxy antwortet Node-`fetch` mit 403 (Cloudflare-Bot-Schutz). Browser bekommen 200. Tests deshalb mit `curl` und Browser-User-Agent machen.

## Notion-API

`API_BASE_URL` ist `https://app.notion.com/api/v3`, weil Notion die API im August 2026 von `www.notion.so` umgezogen hat. Die Anfragen brauchen einen Browser-User-Agent (`lib/db/notion/getNotionAPI.js`).

## Claude-Routinen

- Täglicher Health Check: `trig_01Kr1gMs7PYQqg9Aqbak1XtY`, `50 6 * * *` UTC
- Analytics-Wochenbericht: `trig_01JDe9LKvzGF1YEzX7ugL8oA`, `0 4 * * 1` UTC
- Beide nutzen die Cloud-Umgebung `env_01LBzEMP8y22LSrgLoxgwa9a`, mit `VERCEL_TOKEN` und Network access „Custom“ (`api.vercel.com`, `*.vercel.com` plus Paket-Registries). Bearbeiten lässt sich die Umgebung nur über das Wolken-Symbol über dem Eingabefeld auf claude.ai/code.
- `get_web_analytics` des Vercel-Connectors liefert für dieses Projekt fälschlich 404. Die REST-API funktioniert mit `VERCEL_TOKEN`. Speed Insights gibt es nur per CLI: `npx vercel@latest metrics …`.
- `RemoteTrigger update` mit `job_config` **ersetzt** das gesamte job_config. Prompt, Modell, Sources und allowed_tools deshalb immer komplett mitschicken.

## MCP-Server in Cloud-Sessions

`.mcp.json` definiert `s3-upload-cloud` und `n8n-cloud`. Die Werte kommen aus Umgebungsvariablen der Cloud-Umgebung: `S3_UPLOAD_AUTH` (der komplette Authorization-Header), `N8N_API_URL` und `N8N_API_KEY`. Lokal sind beide deaktiviert, weil dort die gleichnamigen globalen Server ohne `-cloud` laufen. Secrets niemals committen.
