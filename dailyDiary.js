class DailyDiary {
    constructor(appCore) {
        this.appCore = appCore;
        this.DAILY_ENTRIES_KEY = 'dailyEntries_v1';
        this.dailyCategories = ['Dom', 'Praca', 'Hobby', 'Znajomi', 'Zdrowie', 'Inne'];
        this.dailyTypes = ['Pozytywny', 'Negatywny', 'Neutralny'];
        
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.dailyMamaTabBtn = document.getElementById('dailyMamaTabBtn');
        this.dailyTataTabBtn = document.getElementById('dailyTataTabBtn');
        this.dailyMamaFormContainer = document.getElementById('dailyMamaFormContainer');
        this.dailyTataFormContainer = document.getElementById('dailyTataFormContainer');
        this.dailyMamaForm = document.getElementById('dailyMamaForm');
        this.dailyTataForm = document.getElementById('dailyTataForm');
        this.dailyAllEntriesContainer = document.getElementById('dailyAllEntries');
    }

    bindEvents() {
        // Nasłuchiwacze na przyciski zakładek
        if (this.dailyMamaTabBtn) {
            this.dailyMamaTabBtn.addEventListener('click', () => {
                this.appCore.verifyPassword('mama', () => this.switchDailyForm('mama'));
            });
        }
        
        if (this.dailyTataTabBtn) {
            this.dailyTataTabBtn.addEventListener('click', () => {
                this.appCore.verifyPassword('tata', () => this.switchDailyForm('tata'));
            });
        }

        // Nasłuchiwacze na wysłanie formularzy
        if (this.dailyMamaForm) {
            this.dailyMamaForm.addEventListener('submit', (e) => this.handleDailyFormSubmit(e, 'mama'));
        }
        if (this.dailyTataForm) {
            this.dailyTataForm.addEventListener('submit', (e) => this.handleDailyFormSubmit(e, 'tata'));
        }
    }

    switchDailyForm(formToShow) {
        console.log(`Przełączanie na formularz wydarzeń codziennych: ${formToShow}`);
        
        if (!this.dailyMamaFormContainer || !this.dailyTataFormContainer) return;
        
        // Ukryj wszystkie formularze z animacją
        [this.dailyMamaFormContainer, this.dailyTataFormContainer].forEach(container => {
            if (!container.classList.contains('hidden')) {
                container.classList.add('form-fade-out');
                setTimeout(() => {
                    container.classList.add('hidden');
                    container.style.display = 'none';
                    container.classList.remove('form-fade-out');
                }, 200);
            } else {
                container.classList.add('hidden');
                container.style.display = 'none';
            }
        });
        
        // Usuń aktywne klasy z przycisków
        if (this.dailyMamaTabBtn) this.dailyMamaTabBtn.classList.remove('active');
        if (this.dailyTataTabBtn) this.dailyTataTabBtn.classList.remove('active');

        // Pokaż wybrany formularz z animacją po opóźnieniu
        setTimeout(() => {
            if (formToShow === 'mama') {
                this.dailyMamaFormContainer.classList.remove('hidden');
                this.dailyMamaFormContainer.classList.add('form-section', 'form-fade-in');
                if (this.dailyMamaTabBtn) this.dailyMamaTabBtn.classList.add('active');
                this.dailyMamaFormContainer.style.display = 'block';
                this.populateRelatedEntriesSelect('dailyRelatedEntry');
            } else if (formToShow === 'tata') {
                this.dailyTataFormContainer.classList.remove('hidden');
                this.dailyTataFormContainer.classList.add('form-section', 'form-fade-in');
                if (this.dailyTataTabBtn) this.dailyTataTabBtn.classList.add('active');
                this.dailyTataFormContainer.style.display = 'block';
                this.populateRelatedEntriesSelect('dailyTataRelatedEntry');
            }
        }, 250);
    }

    populateRelatedEntriesSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Wyczyść obecne opcje
        select.innerHTML = '<option value="">-- Brak powiązania --</option>';

        // Pobierz wszystkie wpisy codzienne
        if (this.appCore.isLocalHost) {
            const dailyData = this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] || {};
            const dailyEntries = dailyData.dailyEntries || {};
            this.populateSelectOptions(select, dailyEntries);
        } else {
            // Dla Firebase
            firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries').once('value', (snapshot) => {
                const entries = snapshot.val() || {};
                this.populateSelectOptions(select, entries);
            });
        }
    }

    populateSelectOptions(select, entries) {
        const sortedEntries = Object.entries(entries)
            .sort(([,a], [,b]) => b.timestamp - a.timestamp)
            .slice(0, 20);

        sortedEntries.forEach(([id, entry]) => {
            const option = document.createElement('option');
            option.value = id;
            const date = new Date(entry.timestamp).toLocaleDateString('pl-PL');
            const author = entry.type === 'Andzia' ? 'A' : 'K';
            const preview = entry.text.length > 30 ? entry.text.substring(0, 30) + '...' : entry.text;
            option.textContent = `[${date}] ${author}: ${preview}`;
            select.appendChild(option);
        });
    }

    handleDailyFormSubmit(event, userType) {
        event.preventDefault();
        const form = event.target;
        const textInput = form.querySelector('textarea');
        const text = textInput.value.trim();
        const category = form.querySelector('select[name="category"]').value;
        const type = form.querySelector('select[name="type"]').value;
        const relatedEntryId = form.querySelector('select[name="relatedEntry"]').value;

        if (!text) {
            alert('Treść wpisu nie może być pusta.');
            textInput.focus();
            return;
        }

        if (!category || !type) {
            alert('Kategoria i rodzaj wpisu są wymagane.');
            return;
        }

        const timestamp = Date.now();
        const newEntryId = `daily-${userType}-${timestamp}`;

        // Sprawdź czy jest powiązanie z innym wpisem
        if (relatedEntryId) {
            this.addRelatedEntry(newEntryId, userType, text, category, type, relatedEntryId, timestamp, form);
        } else {
            this.addStandaloneEntry(newEntryId, userType, text, category, type, timestamp, form);
        }
    }

    async addRelatedEntry(newEntryId, userType, text, category, type, relatedEntryId, timestamp, form) {
        try {
            if (this.appCore.isLocalHost) {
                await this.addRelatedEntryLocal(newEntryId, userType, text, category, type, relatedEntryId, timestamp);
            } else {
                await this.addRelatedEntryFirebase(newEntryId, userType, text, category, type, relatedEntryId, timestamp);
            }

            this.resetFormAndReload(form, userType);
        } catch (error) {
            console.error('Błąd podczas zapisywania powiązanego wpisu:', error);
            alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
        }
    }

    async addStandaloneEntry(newEntryId, userType, text, category, type, timestamp, form) {
        try {
            // Pobierz największy threadId
            let maxThreadId = 0;
            
            if (this.appCore.isLocalHost) {
                const dailyData = this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] || {};
                const entries = dailyData.dailyEntries || {};
                maxThreadId = this.getMaxThreadId(entries);

                const newEntry = {
                    id: newEntryId,
                    type: userType === 'mama' ? 'Andzia' : 'Kuba',
                    text: text,
                    category: category,
                    entryType: type,
                    relatedTo: null,
                    thread: [{
                        threadId: maxThreadId + 1,
                        positionInThread: 0
                    }],
                    timestamp: timestamp,
                    renewalDatetime: timestamp,
                    tab: 'daily'
                };

                // Zapisz wpis lokalnie
                entries[this.generateEntryKey(newEntryId)] = newEntry;
                dailyData.dailyEntries = entries;
                this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] = dailyData;
                
                // Zapisz lokalną bazę danych
                localStorage.setItem('diaryData', JSON.stringify(this.appCore.localDatabase));
                
                // Zapisz do pliku JSON
                this.saveToJsonFile(this.appCore.localDatabase);
            } else {
                const snapshot = await firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries').once('value');
                const entries = snapshot.val() || {};
                maxThreadId = this.getMaxThreadId(entries);

                const newEntry = {
                    id: newEntryId,
                    type: userType === 'mama' ? 'Andzia' : 'Kuba',
                    text: text,
                    category: category,
                    entryType: type,
                    relatedTo: null,
                    thread: [{
                        threadId: maxThreadId + 1,
                        positionInThread: 0
                    }],
                    timestamp: timestamp,
                    renewalDatetime: timestamp,
                    tab: 'daily'
                };

                await this.appCore.saveEntryToFirebase(newEntry, this.DAILY_ENTRIES_KEY);
            }

            this.resetFormAndReload(form, userType);
        } catch (error) {
            console.error('Błąd podczas zapisywania wpisu:', error);
            alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
        }
    }

    async addRelatedEntryLocal(newEntryId, userType, text, category, type, relatedEntryId, timestamp) {
        const dailyData = this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] || {};
        const entries = dailyData.dailyEntries || {};
        
        // Znajdź wpis, do którego się odnosimy
        const relatedEntry = entries[relatedEntryId];
        if (!relatedEntry) {
            throw new Error('Nie znaleziono wpisu, do którego chcesz się odnieść');
        }

        // Aktualizuj wpis powiązany
        if (!relatedEntry.relatedTo) {
            relatedEntry.relatedTo = [];
        }
        
        const nextRelationOrder = relatedEntry.relatedTo.length;
        relatedEntry.relatedTo.push({
            id: newEntryId,
            relationOrder: nextRelationOrder
        });
        relatedEntry.renewalDatetime = timestamp;

        // Utwórz nowy wpis
        const newEntry = {
            id: newEntryId,
            type: userType === 'mama' ? 'Andzia' : 'Kuba',
            text: text,
            category: category,
            entryType: type,
            relatedTo: null,
            thread: [{
                threadId: relatedEntry.thread[0].threadId,
                positionInThread: relatedEntry.thread[0].positionInThread + 1
            }],
            timestamp: timestamp,
            renewalDatetime: timestamp,
            tab: 'daily'
        };

        // Zapisz oba wpisy
        entries[relatedEntryId] = relatedEntry;
        entries[this.generateEntryKey(newEntryId)] = newEntry;
        
        dailyData.dailyEntries = entries;
        this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] = dailyData;
        
        // Zapisz lokalną bazę danych
        localStorage.setItem('diaryData', JSON.stringify(this.appCore.localDatabase));
        
        // Zapisz do pliku JSON
        this.saveToJsonFile(this.appCore.localDatabase);
    }

    async addRelatedEntryFirebase(newEntryId, userType, text, category, type, relatedEntryId, timestamp) {
        // Pobierz wpis powiązany
        const relatedSnapshot = await firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries/' + relatedEntryId).once('value');
        const relatedEntry = relatedSnapshot.val();
        
        if (!relatedEntry) {
            throw new Error('Nie znaleziono wpisu, do którego chcesz się odnieść');
        }

        // Przygotuj aktualizacje dla wpisu powiązanego
        const relatedTo = relatedEntry.relatedTo || [];
        const nextRelationOrder = relatedTo.length;
        
        relatedTo.push({
            id: newEntryId,
            relationOrder: nextRelationOrder
        });

        // Utwórz nowy wpis
        const newEntry = {
            id: newEntryId,
            type: userType === 'mama' ? 'Andzia' : 'Kuba',
            text: text,
            category: category,
            entryType: type,
            relatedTo: null,
            thread: [{
                threadId: relatedEntry.thread[0].threadId,
                positionInThread: relatedEntry.thread[0].positionInThread + 1
            }],
            timestamp: timestamp,
            renewalDatetime: timestamp,
            tab: 'daily'
        };

        // Wykonaj batch update
        const updates = {};
        updates[`${this.DAILY_ENTRIES_KEY}/dailyEntries/${relatedEntryId}/relatedTo`] = relatedTo;
        updates[`${this.DAILY_ENTRIES_KEY}/dailyEntries/${relatedEntryId}/renewalDatetime`] = timestamp;
        updates[`${this.DAILY_ENTRIES_KEY}/dailyEntries/${this.generateEntryKey(newEntryId)}`] = newEntry;

        await firebase.database().ref().update(updates);
    }

    getMaxThreadId(entries) {
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
    }

    generateEntryKey(entryId) {
        // Generuj klucz podobny do istniejących w bazie
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 11);
        return `entry_${timestamp}_${randomString}`;
    }

    resetFormAndReload(form, userType) {
        form.reset();
        console.log('Wpis codzienny zapisany pomyślnie.');

        if (userType === 'mama') {
            this.dailyMamaFormContainer.classList.add('hidden');
            this.dailyMamaFormContainer.style.display = 'none';
        } else if (userType === 'tata') {
            this.dailyTataFormContainer.classList.add('hidden');
            this.dailyTataFormContainer.style.display = 'none';
        }

        this.loadDailyEntries();
    }

    loadDailyEntries() {
        if (this.appCore.isLocalHost) {
            const dailyData = this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] || {};
            const entries = dailyData.dailyEntries || {};
            this.renderDailyEntries(entries);
        } else {
            firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries').on('value', (snapshot) => {
                const entries = snapshot.val() || {};
                this.renderDailyEntries(entries);
            });
        }
    }

    renderDailyEntries(entries) {
        const container = this.dailyAllEntriesContainer;
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"></div>';

        setTimeout(() => {
            container.innerHTML = '';
            
            if (Object.keys(entries).length === 0) {
                container.innerHTML = '<p class="no-entries-message">Brak wpisów codziennych.</p>';
                return;
            }

            // Organizuj wpisy w wątki
            const threads = this.organizeEntriesIntoThreads(entries);
            
            // Sortuj wątki według najnowszej daty wpisu w wątku (malejąco)
            const sortedThreads = threads.sort((a, b) => {
                const latestA = Math.max(...a.entries.map(entry => entry.timestamp));
                const latestB = Math.max(...b.entries.map(entry => entry.timestamp));
                return latestB - latestA;
            });

            console.log('Threads organized:', sortedThreads);

            // Renderuj wszystkie wątki jako kolumny
            const threadsContainer = this.createThreadsColumnLayout(sortedThreads);
            container.appendChild(threadsContainer);

            container.classList.add('entries-loaded');
        }, 1000);
    }

    createThreadsColumnLayout(threads) {
        const mainContainer = document.createElement('div');
        mainContainer.className = 'entries-container';
        mainContainer.id = 'dailyEntriesContainer';

        threads.forEach((thread, index) => {
            const threadContainer = this.createThreadColumn(thread, index);
            mainContainer.appendChild(threadContainer);
        });

        return mainContainer;
    }

    createThreadColumn(thread, threadIndex) {
        const threadDiv = document.createElement('div');
        threadDiv.className = 'thread-container daily-thread-container';
        threadDiv.id = `thread-${thread.threadId}`;

        // Header wątku
        const threadHeader = document.createElement('div');
        threadHeader.className = 'thread-header';
        threadHeader.textContent = `Wątek ${thread.threadId}`;
        threadDiv.appendChild(threadHeader);

        // Kontener z poziomym scrollem dla wpisów
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'thread-scroll-container';

        // Zbuduj strukturę hierarchiczną wpisów
        const hierarchyStructure = this.buildHierarchyStructure(thread.entries);
        
        // Kontener dla wszystkich poziomów
        const levelsContainer = document.createElement('div');
        levelsContainer.className = 'hierarchy-levels-container';
        

        // Renderuj każdy poziom hierarchii w odwrotnej kolejności (największy level na górze)
        for (let levelIndex = hierarchyStructure.length - 1; levelIndex >= 0; levelIndex--) {
            const level = hierarchyStructure[levelIndex];
            const levelDiv = this.createHierarchyLevel(level, levelIndex);
            levelsContainer.appendChild(levelDiv);
        }

        scrollContainer.appendChild(levelsContainer);
        threadDiv.appendChild(scrollContainer);

        return threadDiv;
    }

    createHierarchyLevel(level, levelIndex) {
        const levelDiv = document.createElement('div');
        levelDiv.className = `hierarchy-level level-${levelIndex}`;

        level.forEach((node, nodeIndex) => {
            const entryElement = this.createSingleDailyEntryElement(node.entry, levelIndex, nodeIndex);

            // Dodaj spacer dla poziomu
            const spacer = document.createElement('div');
            spacer.className = 'entry-spacer';
            levelDiv.appendChild(spacer);

            // Dodaj wrapper dla połączeń wizualnych
            const entryWrapper = document.createElement('div');
            entryWrapper.className = 'entry-wrapper';
            
            // Dodaj połączenia wizualne dla poziomów poniżej pierwszego
            if (levelIndex > 0 && node.parent) {
                spacer.classList.add('has-parent');
                
                // Dodaj linię łączącą z rodzicem
                const connector = document.createElement('div');
                connector.className = 'entry-connector';
                spacer.appendChild(connector);
            }

            entryWrapper.appendChild(entryElement);
            spacer.appendChild(entryWrapper);
        });

        return levelDiv;
    }

    createSingleDailyEntryElement(entry, levelIndex = 0, nodeIndex = 0) {
        const entryDiv = document.createElement('div');
        entryDiv.className = `entry daily-entry entry-${entry.entryType.toLowerCase()}`;
        entryDiv.id = `entry-${entry.id}`;
        entryDiv.setAttribute('data-entry-type', entry.entryType);
        entryDiv.setAttribute('data-author', entry.type);
        entryDiv.setAttribute('data-category', entry.category);

        const typeEmojis = {
            'Pozytywny': '😊',
            'Negatywny': '😔',
            'Neutralny': '😐'
        };

        entryDiv.innerHTML = `
            <div class="entry-header daily-entry-header">
                <span class="entry-author daily-entry-author">${entry.type}</span>
                <div class="entry-timestamp">
                    <div class="entry-date">${new Date(entry.timestamp).toLocaleDateString('pl-PL')}</div>
                    <div class="entry-time">${new Date(entry.timestamp).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}</div>
                </div>
            </div>
            <div class="entry-meta daily-entry-meta">
                <span class="entry-category daily-entry-category">#${entry.category}</span>
                <span class="entry-type daily-entry-type">${typeEmojis[entry.entryType]} ${entry.entryType}</span>
            </div>
            <div class="entry-content daily-entry-content">
                <p class="entry-text">${entry.text.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="entry-footer">
                <span class="entry-id">${entry.id}</span>
            </div>
        `;

        return entryDiv;
    }

    loadDiaryStatistics() {
        if (this.appCore.isLocalHost) {
            const dailyData = this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] || {};
            const entries = dailyData.dailyEntries || {};
            this.appCore.updateStatistics(entries, 'daily');
        } else {
            firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries').once('value', (snapshot) => {
                const entries = snapshot.val() || {};
                this.appCore.updateStatistics(entries, 'daily');
            });
        }
    }

    saveToJsonFile(data) {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `local_diary_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            console.log('Plik JSON został pobrany pomyślnie');
        } catch (error) {
            console.error('Błąd podczas zapisywania pliku JSON:', error);
        }
    }

    organizeEntriesIntoThreads(entries) {
        const threads = new Map();
        
        // Iteruj przez wszystkie wpisy i grupuj je według threadId
        Object.values(entries).forEach(entry => {
            if (!entry.thread || !entry.thread[0]) {
                console.warn('Entry without thread data:', entry);
                return;
            }
            
            const threadId = entry.thread[0].threadId;
            
            if (!threads.has(threadId)) {
                threads.set(threadId, {
                    threadId: threadId,
                    entries: []
                });
            }
            
            threads.get(threadId).entries.push(entry);
        });
        
        // Sortuj wpisy w każdym wątku według positionInThread (malejąco - najnowsze na górze)
        threads.forEach(thread => {
            thread.entries.sort((a, b) => {
                const posA = a.thread[0].positionInThread || 0;
                const posB = b.thread[0].positionInThread || 0;
                return posB - posA; // Zmienione z posA - posB na posB - posA
            });
        });
        
        return Array.from(threads.values());
    }

    buildHierarchyStructure(entries) {
        // Mapa przechowująca wpisy według pozycji w wątku
        const entriesByPosition = new Map();
        const maxPosition = Math.max(...entries.map(entry => entry.thread[0].positionInThread || 0));
        
        // Grupuj wpisy według pozycji w wątku
        entries.forEach(entry => {
            const position = entry.thread[0].positionInThread || 0;
            if (!entriesByPosition.has(position)) {
                entriesByPosition.set(position, []);
            }
            entriesByPosition.get(position).push({
                entry: entry,
                parent: null,
                children: []
            });
        });
        
        // Zbuduj hierarchię - każdy poziom zawiera węzły z danej pozycji
        const hierarchy = [];
        
        for (let level = 0; level <= maxPosition; level++) {
            const levelNodes = entriesByPosition.get(level) || [];
            
            // Jeśli to nie pierwszy poziom, ustaw relacje rodzic-dziecko
            if (level > 0 && hierarchy[level - 1]) {
                levelNodes.forEach((node, index) => {
                    // Znajdź odpowiedniego rodzica w poprzednim poziomie
                    // Dla uproszczenia, łącz z pierwszym dostępnym rodzicem
                    const parentLevel = hierarchy[level - 1];
                    if (parentLevel.length > 0) {
                        const parentIndex = Math.min(index, parentLevel.length - 1);
                        node.parent = parentLevel[parentIndex];
                        parentLevel[parentIndex].children.push(node);
                    }
                });
            }
            
            if (levelNodes.length > 0) {
                hierarchy.push(levelNodes);
            }
        }
        
        return hierarchy;
    }
}

// Dla kompatybilności z obecnym kodem
window.DailyDiary = DailyDiary;