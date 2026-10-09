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

`pnpm test:e2e` käivitab avaliku lehe testid. Sisselogitud testid (`e2e/admin.spec.ts`) jooksevad ainult siis, kui on antud
`E2E_ADMIN_EMAIL` ja `E2E_ADMIN_PASSWORD` (soovitavalt eraldi test-Supabase’i projekt). Mobiilitestideks on vaja WebKitti:
`pnpm exec playwright install webkit`.

`pnpm test:rls` kontrollib andmebaasi õigusi avaliku võtmega.

## Avaldamine (Vercel)

Keskkonnamuutujad (vt `.env.example`): Supabase’i võtmed, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM`
(kinnitatud domeenilt, nt `Vaikusruum <teavitus@vaikusruum.ee>`), `CRON_SECRET` ja `IP_HASH_SALT` (juhuslikud stringid).

Andmebaasi muudatuste järjekord, kui migratsioon nõuab uut koodi:

1. `pnpm db:migrate --until <versioon>` – lisavad muudatused, mis vana koodiga ka töötavad.
2. Deploy.
3. `pnpm db:migrate` – ülejäänud (nt `20261009150000`, mis keelab vormide otse sisestamise avaliku võtmega).

Avalikud lehed on eelrenderdatud ja vahemälus; halduses salvestamine värskendab neid kohe, lisaks kord tunnis.

## Igapäevane hooldus

`vercel.json` käivitab igal ööl `/api/cron/daily`:

- kustutab üle 12 kuu vanad vormisõnumid (vt `/privaatsus`);
- salvestab kogu sisu JSON-varukoopiana privaatsesse Supabase’i `backups` hoidlasse (alles 30 viimast).

Taastamiseks laadi fail Supabase’i Storage’ist alla; seal on iga tabeli read.

## Jälgimine

Serveri vead logitakse Verceli logidesse reaga `[server-error]`, e-kirjade vead `[mail]`, vormid `[form]`,
salvestamine `[editor]` ja hooldus `[cron]`. Seadista Vercelis logihoiatus nende märksõnade peale.

## Halduse turvalisus

- Supabase’i Auth seadetes peab avalik registreerumine olema välja lülitatud (kasutajaid lisab omanik halduses).
- Hoia vähemalt kaks omaniku kontot, et ühe kaotamisel pääseks ikka ligi.
- Editor salvestab ainult muutunud read ühe tehinguna. Kui keegi teine on vahepeal salvestanud, keeldutakse
  ja pakutakse editori uuesti laadimist, et kellegi tööd üle ei kirjutataks.
