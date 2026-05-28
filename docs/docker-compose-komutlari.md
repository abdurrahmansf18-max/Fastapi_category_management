# Docker Compose Komutlari

Bu dosya local gelistirme, local + tunnel ve production stack icin en cok kullanilan komutlari tek yerde tutar.

## Local Dev Stack

Frontend hot-reload, backend reload, MailHog, Postgres, Redis, Meilisearch, worker ve beat servislerini baslatir.

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml up -d --build
```

Durumu gormek icin:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml ps
```

Loglari izlemek icin:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml logs -f
```

Sadece frontend logu:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml logs -f frontend
```

Sadece backend logu:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml logs -f backend
```

Stack'i durdurmak icin:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml down
```

## Local Dev + Cloudflare Tunnel

Local dev stack ile birlikte Cloudflare quick tunnel'i de baslatir. Bu komutla `cloudflared` Docker'da gorunur.

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml -f docker-compose.tunnel.yml up -d --build
```

Tunnel URL'sini gormek icin:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml -f docker-compose.tunnel.yml logs -f cloudflared
```

Hazir kisa yol:

```powershell
.\scripts\start-local-tunnel.ps1
```

Sadece tunnel'i yeniden baslatmak icin:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml -f docker-compose.tunnel.yml up -d --no-deps cloudflared
```

Tunnel dahil tum local stack durumunu gormek icin:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml -f docker-compose.tunnel.yml ps
```

Tunnel dahil tum local stack'i durdurmak icin:

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml -f docker-compose.tunnel.yml down
```

Not: `trycloudflare.com` adresi gecicidir. `cloudflared` yeniden baslarsa URL degisebilir.

## Local Yardimci Adresler

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- MailHog: http://localhost:8025
- Meilisearch: http://localhost:7700

## Production Stack

Production icin `.env.production` dosyasindaki gercek degerler kullanilir. Ornek degisken listesi `.env.production.example` dosyasinda durur.

Production config'i kontrol etmek icin:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Production stack'i build edip baslatmak icin:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Production durumunu gormek icin:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Production loglarini izlemek icin:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

Sadece Caddy logu:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy
```

Sadece backend logu:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
```

Production stack'i yeniden baslatmak icin:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml restart
```

Production stack'i durdurmak icin:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

Restore kontrolunu calistirmak icin:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm restore-check
```

Not: Production stack'te public trafik Caddy uzerinden `80` ve `443` portlarindan gelir. Cloudflare kullanilacaksa normalde DNS `APP_DOMAIN` degerine baglanir; local quick tunnel production icin varsayilan yol degildir.

