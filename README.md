# Family Shopping — MVP

Prosta aplikacja Angular + Supabase do rodzinnej listy zakupów.

Funkcje MVP:
- Angular standalone app.
- Logowanie magic linkiem przez e-mail.
- Jedna grupa = jedna lista zakupów.
- Link zaproszeniowy dla gościa bez konta.
- Produkty: nazwa, ilość, notatka, kupione/niekupione.
- Realtime refresh po zmianach w `shopping_items`.
- Proste i18n: PL/EN.
- Szkielet PWA manifestu. Service worker/push zostawione na kolejny etap.

---

## 0. Co będzie potrzebne

Na Windows 11 zainstaluj:

1. **Node.js LTS**
   - Pobierz wersję LTS z nodejs.org.
   - Po instalacji sprawdź w PowerShell:

```powershell
node -v
npm -v
```

2. **Git**
   - Pobierz z git-scm.com.
   - Sprawdź:

```powershell
git --version
```

3. **Angular CLI**

```powershell
npm install -g @angular/cli
ng version
```

4. Konto Supabase
   - Wejdź na supabase.com.
   - Zaloguj się przez GitHub albo załóż konto na mail, np. `kp.softdev@gmail.com`.

5. Opcjonalnie konto GitHub
   - Przyda się do wrzucenia kodu i deployu na Vercel/Netlify/Cloudflare Pages.

---

## 1. Uruchomienie projektu lokalnie

Rozpakuj ZIP, wejdź do katalogu:

```powershell
cd family-shopping
npm install
npm start
```

Aplikacja ruszy lokalnie pod:

```txt
http://localhost:4200
```

Na tym etapie zobaczysz UI, ale funkcje bazy i logowania zadziałają dopiero po konfiguracji Supabase.

---

## 2. Założenie projektu Supabase

1. Wejdź na Supabase Dashboard.
2. Kliknij **New project**.
3. Wybierz organizację albo utwórz nową.
4. Ustaw:
   - Project name: `family-shopping`
   - Database password: wygeneruj mocne hasło i zapisz w menedżerze haseł.
   - Region: najbliższy, np. EU.
5. Kliknij **Create new project**.
6. Poczekaj, aż projekt się utworzy.

---

## 3. Wgranie bazy danych

1. W Supabase otwórz projekt `family-shopping`.
2. Przejdź do **SQL Editor**.
3. Kliknij **New query**.
4. Wklej całość z pliku:

```txt
supabase/schema.sql
```

5. Kliknij **Run**.

Ten skrypt utworzy:
- `groups`
- `group_members`
- `shopping_items`
- funkcje RPC dla tworzenia grupy i obsługi listy przez link zaproszeniowy
- podstawowe RLS

---

## 4. Włączenie Realtime

W Supabase:

1. Otwórz **Database**.
2. Wejdź w **Replication** albo **Realtime / Publications** — nazwa może się lekko różnić w dashboardzie.
3. Znajdź publikację `supabase_realtime`.
4. Włącz tabelę:

```txt
shopping_items
```

Bez tego aplikacja dalej działa, ale zmiany u innych użytkowników mogą wymagać ręcznego odświeżenia.

---

## 5. Konfiguracja magic link

W Supabase:

1. Wejdź w **Authentication > Providers**.
2. Upewnij się, że **Email** jest włączony.
3. Włącz logowanie magic linkiem / OTP, jeżeli jest osobna opcja.
4. Wejdź w **Authentication > URL Configuration**.
5. Dla lokalnego developmentu dodaj:

```txt
http://localhost:4200
```

6. W **Redirect URLs** dodaj:

```txt
http://localhost:4200
http://localhost:4200/**
```

Po deployu dodasz tam też produkcyjny adres, np.:

```txt
https://family-shopping.vercel.app
https://family-shopping.vercel.app/**
```

---

## 6. Wklejenie kluczy Supabase do Angulara

W Supabase otwórz:

```txt
Project Settings > API
```

Skopiuj:
- Project URL
- anon public key

Otwórz plik:

```txt
src/app/core/environment.ts
```

Podmień:

```ts
export const environment = {
  supabaseUrl: 'PASTE_SUPABASE_PROJECT_URL_HERE',
  supabaseAnonKey: 'PASTE_SUPABASE_ANON_KEY_HERE',
};
```

Na przykład:

```ts
export const environment = {
  supabaseUrl: 'https://xxxxx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
};
```

`anon key` może być w frontendzie. Bezpieczeństwo robią RLS/policies/funkcje w bazie. Nigdy nie wrzucaj do frontendu `service_role key`.

---

## 7. Pierwszy test aplikacji

1. Uruchom:

```powershell
npm start
```

2. Wejdź na:

```txt
http://localhost:4200/login
```

3. Wpisz swój mail, np.:

```txt
kp.softdev@gmail.com
```

4. Kliknij **Wyślij magic link**.
5. Otwórz mail i kliknij link.
6. Po powrocie do aplikacji przejdź do:

```txt
http://localhost:4200/group
```

7. Utwórz grupę, np. `Rodzinka`.
8. Skopiuj link zaproszeniowy.
9. Otwórz go w innej przeglądarce albo trybie incognito.
10. Dodaj produkt jako gość.
11. W pierwszej przeglądarce lista powinna się odświeżyć.

---

## 8. Jak działa konto przy magic linku?

Supabase tworzy użytkownika w `auth.users` na podstawie maila. Użytkownik nie ma hasła. Loguje się przez jednorazowy link wysłany na e-mail.

Sesja jest zapisywana przez Supabase client w przeglądarce. Po ponownym wejściu do aplikacji użytkownik zwykle dalej jest zalogowany, dopóki sesja nie wygaśnie albo nie kliknie wylogowania.

Dane aplikacji nie siedzą w koncie Angulara, tylko w bazie Supabase:
- konto: `auth.users`
- grupa: `public.groups`
- członkostwo: `public.group_members`
- lista: `public.shopping_items`

---

## 9. Jak działa użytkownik bez konta?

Gość otwiera link:

```txt
/join/TUTAJ_KOD_ZAPROSZENIA
```

Aplikacja zapisuje kod zaproszenia w `localStorage` i używa funkcji RPC w Supabase do czytania/dodawania/zmieniania produktów.

To jest świadomy kompromis MVP: każdy, kto ma link, może zmieniać listę. Dla rodziny jest to wygodne. W wersji produkcyjnej możesz dodać:
- wygasanie linku,
- regenerowanie linku,
- role i zaproszenia e-mail,
- tryb tylko do odczytu.

---

## 10. Deploy — najprościej Vercel

1. Utwórz repo na GitHub, np. `family-shopping`.
2. W katalogu projektu:

```powershell
git init
git add .
git commit -m "Initial family shopping MVP"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/family-shopping.git
git push -u origin main
```

3. Wejdź na vercel.com.
4. Zaloguj się GitHubem.
5. Kliknij **Add New > Project**.
6. Wybierz repo `family-shopping`.
7. Framework powinien wykryć Angular.
8. Build command:

```txt
npm run build
```

9. Output directory:

```txt
dist/family-shopping/browser
```

10. Po deployu skopiuj adres produkcyjny, np.:

```txt
https://family-shopping.vercel.app
```

11. W Supabase dodaj go w:

```txt
Authentication > URL Configuration > Redirect URLs
```

Dodaj:

```txt
https://family-shopping.vercel.app
https://family-shopping.vercel.app/**
```

---

## 11. Co jest następnym krokiem po MVP

Najważniejsze następne kroki:

1. Dodać prawdziwe PWA przez Angular CLI:

```powershell
ng add @angular/pwa
```

2. Dodać Firebase Cloud Messaging albo Web Push dla powiadomień, gdy aplikacja jest zamknięta.
3. Dodać edycję produktu.
4. Dodać sortowanie: niekupione na górze, kupione na dole.
5. Dodać kategorie: warzywa, nabiał, chemia itd.
6. Dodać regenerowanie linku zaproszeniowego.
7. Dodać testy dla serwisów i komponentów.

---

## 12. Ważna uwaga o bezpieczeństwie

Ten projekt jest celowo prosty. Link zaproszeniowy działa jak klucz do listy. Nie publikuj go publicznie.

Do prywatnego rodzinnego użycia MVP jest OK, ale przed większym publicznym udostępnieniem warto dopracować:
- role użytkowników,
- usuwanie członków,
- rotację invite code,
- limity requestów,
- lepsze RLS bez szerokiego dostępu przez invite RPC.
