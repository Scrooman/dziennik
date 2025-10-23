# Mechanika dodawania wpisów codziennych - Dokumentacja

## Przegląd systemu

System wpisów codziennych (`dailyEntries_v1`) obsługuje hierarchiczną strukturę wpisów organizowanych w **wątki** (threads) z możliwością **powiązań** między wpisami. Wpisy są wyświetlane w układzie hierarchicznym z najnowszymi wpisami na górze.

## Struktura danych wpisu

```javascript
{
  "id": "daily-{userType}-{timestamp}",
  "type": "Andzia" | "Kuba",
  "text": "Treść wpisu",
  "category": "Dom|Praca|Hobby|Znajomi|Zdrowie|Inne",
  "entryType": "Pozytywny|Negatywny|Neutralny",
  "relatedTo": null | [
    {
      "id": "id_powiązanego_wpisu",
      "relationOrder": 0
    }
  ],
  "thread": [
    {
      "threadId": 1,
      "positionInThread": 0
    }
  ],
  "timestamp": 1758743100000,
  "renewalDatetime": 1758743700000,
  "tab": "daily"
}
```

## Algorytm dodawania nowego wpisu

### Scenariusz 1: Wpis niezależny (brak powiązania)

**Warunki:**
- Pole `relatedEntry` w formularzu jest puste
- Tworzy się nowy wątek

**Proces:**
1. Znajdź największy `threadId` w bazie danych za pomocą `getMaxThreadId()`
2. Utwórz nowy wpis z:
   - `threadId: maxThreadId + 1`
   - `positionInThread: 0`
   - `relatedTo: null`
3. Zapisz lokalnie lub do Firebase w zależności od środowiska
4. Zapisz do pliku JSON (tylko środowisko lokalne)

**Przykład:**
```javascript
// Istniejący maxThreadId = 1
// Nowy wpis:
{
  "id": "daily-mama-1729037500000",
  "thread": [{"threadId": 2, "positionInThread": 0}],
  "relatedTo": null,
  "timestamp": 1729037500000,
  "renewalDatetime": 1729037500000
}
```

### Scenariusz 2: Wpis powiązany (odpowiedź na istniejący wpis)

**Warunki:**
- Pole `relatedEntry` zawiera ID istniejącego wpisu
- Dołącza do istniejącego wątku

**Proces:**
1. Pobierz wpis źródłowy (`relatedEntry`)
2. **Aktualizuj wpis źródłowy:**
   - Dodaj nowy obiekt do tablicy `relatedTo`
   - Ustaw `relationOrder` jako długość obecnej tablicy
   - Zaktualizuj `renewalDatetime` na aktualny timestamp
3. **Utwórz nowy wpis:**
   - Skopiuj `threadId` z wpisu źródłowego
   - Ustaw `positionInThread = wpis_źródłowy.positionInThread + 1`
   - Ustaw `relatedTo: null`
4. Wykonaj atomową aktualizację (Firebase) lub zapis lokalny
5. Zapisz do pliku JSON (tylko środowisko lokalne)

**Przykład:**
```javascript
// Wpis źródłowy przed aktualizacją:
{
  "id": "daily-mama-1729037400000",
  "thread": [{"threadId": 2, "positionInThread": 0}],
  "relatedTo": null,
  "renewalDatetime": 1729037400000
}

// Wpis źródłowy po aktualizacji:
{
  "id": "daily-mama-1729037400000",
  "thread": [{"threadId": 2, "positionInThread": 0}],
  "relatedTo": [
    {"id": "daily-tata-1729037500000", "relationOrder": 0}
  ],
  "renewalDatetime": 1729037500000
}

// Nowy wpis:
{
  "id": "daily-tata-1729037500000",
  "thread": [{"threadId": 2, "positionInThread": 1}],
  "relatedTo": null,
  "timestamp": 1729037500000,
  "renewalDatetime": 1729037500000
}
```

## System wyświetlania wpisów

### Organizacja wątków
- Wpisy są grupowane według `threadId` za pomocą `organizeEntriesIntoThreads()`
- Wątki są sortowane według najnowszej daty wpisu w wątku (malejąco)
- Wewnątrz wątku wpisy są sortowane według `positionInThread` (malejąco - najnowsze na górze)

### Struktura hierarchii
- **Poziom N (najwyższy):** Najnowsze odpowiedzi (`positionInThread: max`)
- **Poziom 1:** Bezpośrednie odpowiedzi (`positionInThread: 1`)
- **Poziom 0 (najniższy):** Wpisy główne (`positionInThread: 0`)

### Przykład hierarchii w wątku (widok od góry):
```
ThreadId: 2 (wyświetlany od góry do dołu)
├── [2] entry_789 (Kuba: "odpowiedź na odpowiedź") ← NAJNOWSZY
├── [1] entry_456 (Andzia: "odpowiedź 1")
├── [1] entry_321 (Kuba: "odpowiedź 2")
└── [0] entry_123 (Andzia: "wpis główny") ← NAJSTARSZY
```

## Klasy CSS i struktura DOM

### Główne kontenery
```html
<div class="entries-container" id="dailyEntriesContainer">
  <div class="thread-container daily-thread-container" id="thread-{threadId}">
    <div class="thread-header">Wątek {threadId}</div>
    <div class="thread-scroll-container">
      <div class="hierarchy-levels-container">
        <div class="hierarchy-level level-{levelIndex}">
          <div class="entry-wrapper">
            <div class="entry-connector"></div> <!-- dla poziomów > 0 -->
            <div class="entry daily-entry entry-{entryType}"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Klasy wpisów
- `.daily-entry`: Podstawowa klasa wpisu
- `.entry-pozytywny`, `.entry-negatywny`, `.entry-neutralny`: Kolorowanie według typu
- `.daily-entry-header`, `.daily-entry-meta`, `.daily-entry-content`: Sekcje wpisu

## Obsługa środowisk

### Lokalne (localStorage + plik JSON)
```javascript
// Funkcja addStandaloneEntry / addRelatedEntryLocal
// 1. Aktualizacja lokalnej bazy danych
entries[this.generateEntryKey(newEntryId)] = newEntry;
dailyData.dailyEntries = entries;
this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] = dailyData;

// 2. Zapis do localStorage
localStorage.setItem('diaryData', JSON.stringify(this.appCore.localDatabase));

// 3. Automatyczne pobranie pliku JSON
this.saveToJsonFile(this.appCore.localDatabase);
```

### Firebase
```javascript
// Funkcja addRelatedEntryFirebase
// Batch update dla atomowości operacji
const updates = {};
updates[`${this.DAILY_ENTRIES_KEY}/dailyEntries/${relatedEntryId}/relatedTo`] = relatedTo;
updates[`${this.DAILY_ENTRIES_KEY}/dailyEntries/${relatedEntryId}/renewalDatetime`] = timestamp;
updates[`${this.DAILY_ENTRIES_KEY}/dailyEntries/${this.generateEntryKey(newEntryId)}`] = newEntry;
await firebase.database().ref().update(updates);
```

## Funkcje pomocnicze

### `getMaxThreadId(entries)`
```javascript
// Skanuje wszystkie wpisy i znajduje największy używany threadId
let maxThreadId = 0;
Object.values(entries).forEach(entry => {
    if (entry.thread && entry.thread.length > 0) {
        const threadId = entry.thread[0].threadId;
        if (threadId > maxThreadId) {
            maxThreadId = threadId;
        }
    }
});
return maxThreadId;
```

### `generateEntryKey(entryId)`
```javascript
// Generuje unikalny klucz dla wpisu
const timestamp = Date.now();
const randomString = Math.random().toString(36).substring(2, 11);
return `entry_${timestamp}_${randomString}`;
```

### `populateRelatedEntriesSelect(selectId)`
Wypełnia dropdown ostatnimi 20 wpisami, sortowanymi chronologicznie (najnowsze pierwsze).

### `saveToJsonFile(data)`
```javascript
// Automatyczne pobieranie pliku JSON z aktualną datą
const jsonString = JSON.stringify(data, null, 2);
const blob = new Blob([jsonString], { type: 'application/json' });
const link = document.createElement('a');
link.download = `local_diary_${new Date().toISOString().split('T')[0]}.json`;
```

### `organizeEntriesIntoThreads(entries)`
- Grupuje wpisy według `threadId`
- Sortuje wpisy w wątku według `positionInThread` (malejąco)
- Zwraca tablicę obiektów wątków

### `buildHierarchyStructure(entries)`
- Buduje strukturę hierarchiczną dla poziomów wyświetlania
- Grupuje wpisy według `positionInThread`
- Ustala relacje rodzic-dziecko

## Mechanizm relationOrder

`relationOrder` zapewnia kolejność odpowiedzi w ramach jednego wpisu:
- Pierwsza odpowiedź: `relationOrder: 0`
- Druga odpowiedź: `relationOrder: 1`
- Trzecia odpowiedź: `relationOrder: 2`
- Itd.

```javascript
// Dodawanie nowej relacji
const nextRelationOrder = relatedEntry.relatedTo.length;
relatedEntry.relatedTo.push({
    id: newEntryId,
    relationOrder: nextRelationOrder
});
```

## Obsługa błędów

System obsługuje następujące błędy:
- **Brak wpisu źródłowego:** `throw new Error('Nie znaleziono wpisu, do którego chcesz się odnieść')`
- **Problemy z zapisem:** `console.error('Błąd podczas zapisywania wpisu:', error)`
- **Błędy walidacji:** Sprawdzanie pustych pól i wymaganych wartości
- **Problemy z Firebase:** Try-catch z odpowiednimi komunikatami

Wszystkie błędy są logowane do konsoli i wyświetlane użytkownikowi przez `alert()`.

## Flow dodawania wpisu

1. **Walidacja formularza** → `handleDailyFormSubmit()`
2. **Sprawdzenie powiązania** → `relatedEntryId` pusty?
3. **Tak (niezależny)** → `addStandaloneEntry()`
4. **Nie (powiązany)** → `addRelatedEntry()` → `addRelatedEntryLocal()` lub `addRelatedEntryFirebase()`
5. **Reset formularza** → `resetFormAndReload()`
6. **Odświeżenie listy** → `loadDailyEntries()` → `renderDailyEntries()`