# Kali Gravka – evidence zakázek (PWA)

Mobilní aplikace pro evidenci zakázek: aktivní zakázky, archiv, statistiky, nastavení typů výrobků.
Data jsou v zařízení **šifrovaná 4místným PINem** a volitelně se synchronizují přes **Supabase**.
Aplikaci lze nainstalovat na telefon i počítač a funguje i bez internetu.

## Rychlý start

Potřebujete [Node.js](https://nodejs.org) 18 nebo novější.

```bash
npm install
npm run dev        # vývoj na http://localhost:5173
npm run build      # produkční sestavení do složky dist/
npm run preview    # vyzkoušení sestavené verze (PWA a offline režim fungují jen zde / v produkci)
```

Service worker a instalace aplikace se zapínají **jen v produkčním sestavení** (`npm run build`), ne ve vývojovém režimu.
Instalace na telefon vyžaduje **HTTPS** (nebo `localhost`).

## Nasazení

Obsah složky `dist/` nahrajte na libovolný statický hosting s HTTPS (Netlify, Vercel, Cloudflare Pages, GitHub Pages, vlastní server).
Cesty jsou relativní (`base: './'`), takže aplikace běží i v podsložce.

Po nasazení otevřete adresu v telefonu:
- **Android / Chrome:** menu → *Nainstalovat aplikaci*.
- **iPhone / Safari:** tlačítko Sdílet → *Přidat na plochu*.
- **Počítač (Chrome, Edge):** ikona instalace v adresním řádku.

Při vydání nové verze změňte `VERSION` v `public/sw.js` (např. na `v2`), aby se stará offline kopie vyměnila.

## PIN a šifrování

- Při prvním spuštění aplikace vyžádá vytvoření 4místného PINu (zadává se dvakrát, odmítne triviální PINy jako 1234 nebo 0000).
- Při každém dalším otevření je PIN potřeba. Po 5 minutách na pozadí se aplikace zamkne sama, zamknout lze i tlačítkem se zámkem v záhlaví.
- PIN se **nikde neukládá**, ani jako hash. Z PINu se pomocí PBKDF2-SHA256 (600 000 iterací) a náhodné soli odvodí klíč AES-GCM 256 bit. Správnost PINu se pozná tak, že se podaří dešifrovat krátký ověřovací text.
- Zakázky, typy výrobků i přihlašovací relace do Supabase jsou v `localStorage` uložené jen jako šifrovaný text. Klíč je pouze v paměti a po zamknutí zmizí.
- Dokud není zadán správný PIN, aplikace nenačte data a **ani nevytvoří klienta Supabase**, takže nemůže proběhnout žádné volání API.
- Po 5 špatných pokusech se vstup na 30 s zamkne (a čas se při dalších chybách zdvojnásobuje, nejvýše na 15 minut). Zapomenutý PIN nejde obnovit: volba „Zapomenutý PIN“ smaže data v tomto zařízení. Data, která jste stihli synchronizovat do Supabase, zůstávají v cloudu a po novém přihlášení se stáhnou.

### Důležité o bezpečnosti

4místný PIN má jen 10 000 možností. Šifrování v prohlížeči i omezení pokusů chrání před náhodným pohledem a běžným zvědavcem, ale **někdo, kdo by si zkopíroval úložiště zařízení, by PIN mohl zkoušet offline** (600 000 iterací to zpomalí, nezastaví). Opravdu silná ochrana dat v cloudu je přihlášení do Supabase (e-mail a silné heslo) spolu s pravidly RLS ze `supabase/schema.sql`. Doporučení: na zařízení mějte zámek obrazovky a pro Supabase účet silné heslo.

`SUPABASE_ANON_KEY` je ze své podstaty veřejný (je vidět v každé webové aplikaci). Data chrání pravidla RLS a přihlášení, ne utajení klíče. Nikdy do aplikace nevkládejte klíč `service_role`.

## Supabase

Údaje projektu jsou v `src/lib/supabase.js`. Lze je přepsat souborem `.env` (viz `.env.example`).

1. V Supabase otevřete **SQL Editor**, vložte obsah `supabase/schema.sql` a spusťte. Vytvoří tabulky `orders` a `product_types` a zapne pravidla RLS (každý uživatel vidí jen své řádky, anonymní klíč nevidí nic).
2. V **Authentication → Users** vytvořte uživatele (*Add user*, e-mail a heslo, zaškrtněte automatické potvrzení).
3. V **Authentication → Sign In / Providers** vypněte **Allow new users to sign up**, aby se nemohl registrovat nikdo cizí.
4. V aplikaci otevřete **Nastavení → Cloud (Supabase)**, přihlaste se a synchronizace se spustí.

Jak synchronizace funguje:
- Aplikace pracuje primárně lokálně (rychle a offline), změny se odesílají krátce po úpravě, po návratu online a každých 90 s.
- Při konfliktu vyhrává novější změna (`updated_at`).
- Smazané zakázky se v cloudu jen označí (`deleted_at`), aby se smazání přeneslo na ostatní zařízení.
- Pokud dvě zařízení vytvoří offline zakázku se stejným číslem, jedna z nich dostane automaticky další volné číslo.
- Výrobky zakázky jsou uložené jako JSON ve sloupci `items`.

## Struktura projektu

```
index.html              vstupní stránka (manifest, ikony, písma)
package.json            závislosti a skripty
vite.config.js          sestavení (Vite + React)
tailwind.config.js      Tailwind CSS
public/
  manifest.json         PWA manifest (display: standalone)
  sw.js                 service worker, offline cache
  favicon.png
  icons/                icon-192, icon-512, maskable, apple-touch-icon, icon.svg
src/
  main.jsx              start, PIN zámek, motiv, registrace service workeru
  App.jsx               hlavní aplikace
  components/           obrazovky a prvky UI
  lib/
    crypto.js           Web Crypto (PBKDF2, AES-GCM)
    vault.js            PIN, zámek po pokusech, šifrované ukládání
    supabase.js         inicializace Supabase (až po odemčení)
    sync.js, useCloud.js   synchronizace
supabase/schema.sql     tabulky a pravidla RLS
scripts/generate-icons.py   znovu vygeneruje ikony z src/assets/logo.png (Python + Pillow)
```

## Ikony

Vytvořené z loga `src/assets/logo.png` na tmavém pozadí. Chcete-li logo změnit, nahraďte soubor a spusťte `pip install pillow && npm run icons`.

## Poznámka k ověření

Projekt byl složen bez přístupu k npm registru, takže `npm install` a `npm run build` nebyly v prostředí, kde vznikl, spuštěny. Kód byl ověřen samostatným sestavením (esbuild) a testem v prohlížeči. Pokud by první `npm run build` hlásil chybu, pošlete mi její text a opravím ji.
