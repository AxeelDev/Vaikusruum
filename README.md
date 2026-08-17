# Vaikusruum

Eestikeelne kundalini jooga ja lõõgastuse leht Miinale. Sisu tuleb Supabase’ist; visuaal on hallatav haldusliidesest.

## Kohalik käivitus

```bash
pnpm install
pnpm dev
```

Avaleht: http://localhost:3000  
Haldus: http://localhost:3000/admin

Kui haldureid veel ei ole, saab esimese konto luua `/admin` lehel (e-post + parool). Pärast seda on seal ainult sisselogimine.

## Keskkonnamuutujad

Kopeeri `.env.example` ja täida väärtused. Salasõnu ära commit’i.

Verceli importfaili uuendamine:

```bash
pnpm env:vercel
```

See kirjutab gitignore’itud `.env.vercel` faili olemasolevast `.env` failist.

## Andmebaas ja sisu

```bash
pnpm db:migrate
pnpm seed
pnpm seed:media
```

`pnpm db:migrate` rakendab `supabase/migrations` failid järjekorras ja jätab meelde, mis juba tehtud. Uuesti käivitamine on ohutu.

Seed on idempotentne (upsert slugide/võtmete järgi).

## Testid

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```
