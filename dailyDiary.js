class DailyDiary {
    constructor(appCore) {
        this.appCore = appCore;
        this.DAILY_ENTRIES_KEY = 'dailyEntries_v1';
        this.dailyCategories = [];
        this.dailyTypes = ['Pozytywny', 'Negatywny', 'Neutralny'];
        
        this.initElements();
        this.bindEvents();
        // Dodaj automatyczne ładowanie wpisów
        this.loadDailyEntries();
        // Dodaj ładowanie kategorii
        this.loadExistingCategories();
    }

    // Nowa metoda do ładowania istniejących kategorii
    loadExistingCategories() {
        if (this.appCore.isLocalHost) {
            const dailyData = this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] || {};
            const entries = dailyData.dailyEntries || {};
            this.updateCategoryLists(entries);
        } else {
            firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries')
                .once('value', (snapshot) => {
                    const entries = snapshot.val() || {};
                    this.updateCategoryLists(entries);
                })
                .catch((error) => {
                    console.error('Error loading categories:', error);
                    this.createDefaultCategorySelects();
                });
        }
    }

    // Nowa metoda do aktualizacji list kategorii
    updateCategoryLists(entries) {
        // Pobierz unikalne kategorie z istniejących wpisów
        const existingCategories = new Set();
        Object.values(entries).forEach(entry => {
            if (entry.category) {
                existingCategories.add(entry.category);
            }
        });
        console.log('Existing categories found:', Array.from(existingCategories));

        // Połącz z domyślnymi kategoriami
        const allCategories = [...new Set([...this.dailyCategories, ...existingCategories])];
        allCategories.sort(); // Posortuj alfabetycznie

        // Utwórz selekty dla obu formularzy
        this.createCategorySelect('dailyMamaCategory', allCategories);
        this.createCategorySelect('dailyTataCategory', allCategories);
    }

    // Nowa metoda do tworzenia selecta z kategoriami
    createCategorySelect(selectId, categories) {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`Select ${selectId} not found`);
            return;
        }

        // Wyczyść obecne opcje
        select.innerHTML = '';

        // Dodaj opcję domyślną
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Wybierz kategorię --';
        select.appendChild(defaultOption);

        // Dodaj istniejące kategorie
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });

        // Dodaj opcję "Inna"
        const customOption = document.createElement('option');
        customOption.value = '__custom__';
        customOption.textContent = '+ Dodaj nową kategorię';
        select.appendChild(customOption);

        // Usuń poprzedni event listener jeśli istnieje
        const clonedSelect = select.cloneNode(true);
        select.parentNode.replaceChild(clonedSelect, select);

        // Dodaj event listener dla opcji custom
        clonedSelect.addEventListener('change', (e) => {
            this.handleCategorySelectChange(e, selectId);
        });
    }

    // Nowa metoda do obsługi zmiany w selekcie kategorii
    handleCategorySelectChange(event, selectId) {
        const select = event.target;
        const selectedValue = select.value;

        if (selectedValue === '__custom__') {
            // Utwórz input dla własnej kategorii
            this.showCustomCategoryInput(select, selectId);
        }
    }

    // Nowa metoda do pokazania inputa dla własnej kategorii
    showCustomCategoryInput(select, selectId) {
        // Sprawdź czy input już istnieje
        const existingInput = document.getElementById(selectId + '_custom');
        if (existingInput) {
            existingInput.focus();
            return;
        }

        // Utwórz kontener dla custom input
        const container = document.createElement('div');
        container.className = 'custom-category-container';
        container.style.marginTop = '10px';

        // Utwórz input
        const input = document.createElement('input');
        input.type = 'text';
        input.id = selectId + '_custom';
        input.name = 'customCategory';
        input.placeholder = 'Wpisz nową kategorię...';
        input.className = 'custom-category-input';
        input.style.marginRight = '10px';

        // Utwórz przycisk zatwierdzenia
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.textContent = 'Dodaj';
        confirmBtn.className = 'btn-confirm-category';

        // Utwórz przycisk anulowania
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Anuluj';
        cancelBtn.className = 'btn-cancel-category';
        cancelBtn.style.marginLeft = '5px';

        // Event listenery dla przycisków
        confirmBtn.addEventListener('click', () => {
            const customCategory = input.value.trim();
            if (customCategory) {
                this.addCustomCategory(customCategory, select, selectId);
                container.remove();
            } else {
                alert('Nazwa kategorii nie może być pusta');
                input.focus();
            }
        });

        cancelBtn.addEventListener('click', () => {
            select.value = '';
            container.remove();
        });

        // Event listener dla Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });

        // Dodaj elementy do kontenera
        container.appendChild(input);
        container.appendChild(confirmBtn);
        container.appendChild(cancelBtn);

        // Wstaw kontener po selekcie
        select.parentNode.insertBefore(container, select.nextSibling);
        input.focus();
    }

    // Nowa metoda do dodawania własnej kategorii
    addCustomCategory(categoryName, select, selectId) {
        // Sprawdź czy kategoria już istnieje
        const existingOptions = Array.from(select.options);
        const categoryExists = existingOptions.some(option => 
            option.value === categoryName && option.value !== '__custom__'
        );

        if (categoryExists) {
            // Jeśli istnieje, po prostu ją wybierz
            select.value = categoryName;
            return;
        }

        // Dodaj nową opcję przed opcją "__custom__"
        const newOption = document.createElement('option');
        newOption.value = categoryName;
        newOption.textContent = categoryName;

        // Znajdź opcję "__custom__" i wstaw przed nią
        const customOption = select.querySelector('option[value="__custom__"]');
        select.insertBefore(newOption, customOption);

        // Wybierz nową kategorię
        select.value = categoryName;

        // Zapisz kategorię do localStorage/Firebase dla przyszłego użytku
        this.saveCustomCategory(categoryName);
    }

    // Nowa metoda do zapisywania własnej kategorii
    async saveCustomCategory(categoryName) {
        try {
            if (this.appCore.isLocalHost) {
                // Zapisz do localStorage
                const savedCategories = JSON.parse(localStorage.getItem('customDailyCategories') || '[]');
                if (!savedCategories.includes(categoryName)) {
                    savedCategories.push(categoryName);
                    localStorage.setItem('customDailyCategories', JSON.stringify(savedCategories));
                }
            } else {
                // Zapisz do Firebase
                const categoriesRef = firebase.database().ref('customDailyCategories');
                const snapshot = await categoriesRef.once('value');
                const categories = snapshot.val() || [];
                
                if (!categories.includes(categoryName)) {
                    categories.push(categoryName);
                    await categoriesRef.set(categories);
                }
            }
            
            console.log(`Kategoria "${categoryName}" została zapisana`);
        } catch (error) {
            console.error('Błąd podczas zapisywania kategorii:', error);
        }
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
                this.loadExistingCategories();

            } else if (formToShow === 'tata') {
                this.dailyTataFormContainer.classList.remove('hidden');
                this.dailyTataFormContainer.classList.add('form-section', 'form-fade-in');
                if (this.dailyTataTabBtn) this.dailyTataTabBtn.classList.add('active');
                this.dailyTataFormContainer.style.display = 'block';
                this.populateRelatedEntriesSelect('dailyTataRelatedEntry');
                this.loadExistingCategories();
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


        // Zmieniony sposób pobierania kategorii
        let category = form.querySelector('select[name="category"]').value;
        const customCategoryInput = form.querySelector('input[name="customCategory"]');
        
        // Jeśli wybrano custom i jest input, użyj wartości z inputa
        if (category === '__custom__' && customCategoryInput && customCategoryInput.value.trim()) {
            category = customCategoryInput.value.trim();
        } else if (category === '__custom__') {
            alert('Wybierz kategorię lub dodaj nową');
            return;
        }

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

    // Dodaj metodę fallback dla tworzenia domyślnych selectów
    createDefaultCategorySelects() {
        this.createCategorySelect('dailyMamaCategory', this.dailyCategories);
        this.createCategorySelect('dailyTataCategory', this.dailyCategories);
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
                // ZMIANA: Użyj tej samej struktury co dla lokalnych
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

                // ZMIANA: Zapisz bezpośrednio do Firebase używając tej samej struktury co lokalnie
                const entryKey = this.generateEntryKey(newEntryId);
                await firebase.database().ref(`${this.DAILY_ENTRIES_KEY}/dailyEntries/${entryKey}`).set(newEntry);
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

        // Oblicz relationOrder na podstawie konkretnego poziomu w wątku
        const currentThreadId = relatedEntry.thread[0].threadId;
        const currentPositionInThread = relatedEntry.thread[0].positionInThread;
        const relationOrder = this.calculateRelationOrderForLevel(entries, currentThreadId, (currentPositionInThread + 1));

        // Aktualizuj wpis powiązany
        if (!relatedEntry.relatedTo) {
            relatedEntry.relatedTo = [];
        }
        
        relatedEntry.relatedTo.push({
            id: newEntryId,
            relationOrder: relationOrder
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
        // Pobierz wszystkie wpisy aby móc obliczyć relationOrder
        const allEntriesSnapshot = await firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries').once('value');
        const allEntries = allEntriesSnapshot.val() || {};
        
        // Pobierz wpis powiązany
        const relatedSnapshot = await firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries/' + relatedEntryId).once('value');
        const relatedEntry = relatedSnapshot.val();
        
        if (!relatedEntry) {
            throw new Error('Nie znaleziono wpisu, do którego chcesz się odnieść');
        }

        // Oblicz relationOrder na podstawie konkretnego poziomu w wątku
        const currentThreadId = relatedEntry.thread[0].threadId;
        const currentPositionInThread = relatedEntry.thread[0].positionInThread;
        const relationOrder = this.calculateRelationOrderForLevel(allEntries, currentThreadId, currentPositionInThread);

        // Przygotuj aktualizacje dla wpisu powiązanego
        const relatedTo = relatedEntry.relatedTo || [];
        
        relatedTo.push({
            id: newEntryId,
            relationOrder: relationOrder
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

    calculateRelationOrderForLevel(entries, currentThreadId, currentPositionInThread) {
        // Policz wpisy na bieżącym poziomie positionInThread w tym wątku
        const currentLevelCount = Object.values(entries).filter(entry => 
            entry.thread && 
            entry.thread[0] && 
            entry.thread[0].threadId === currentThreadId &&
            entry.thread[0].positionInThread === currentPositionInThread
        ).length;
        
        // Policz wpisy na następnym poziomie (positionInThread + 1) w tym wątku
        const nextLevelCount = Object.values(entries).filter(entry => 
            entry.thread && 
            entry.thread[0] && 
            entry.thread[0].threadId === currentThreadId &&
            entry.thread[0].positionInThread === (currentPositionInThread + 1)
        ).length;
        let relationOrder;
        // Oblicz relationOrder: różnica + 1
        if (currentLevelCount !== nextLevelCount) {
            relationOrder = nextLevelCount - currentLevelCount + 1;
        } else {
            relationOrder = currentLevelCount + 1;

        }

        return relationOrder;
    }

    calculateRelationOrder(entries, currentThreadId) {
        // Znajdź wpis powiązany, aby uzyskać jego positionInThread
        const relatedEntryId = Object.keys(entries).find(key => {
            const entry = entries[key];
            return entry.thread && entry.thread[0] && entry.thread[0].threadId === currentThreadId;
        });
        
        if (!relatedEntryId) return 1;
        
        const relatedEntry = entries[relatedEntryId];
        const currentPositionInThread = relatedEntry.thread[0].positionInThread;
        
        // Policz wpisy na bieżącym poziomie positionInThread w tym wątku
        const currentLevelCount = Object.values(entries).filter(entry => 
            entry.thread && 
            entry.thread[0] && 
            entry.thread[0].threadId === currentThreadId &&
            entry.thread[0].positionInThread === currentPositionInThread
        ).length;
        
        // Policz wpisy na następnym poziomie (positionInThread + 1) w tym wątku
        const nextLevelCount = Object.values(entries).filter(entry => 
            entry.thread && 
            entry.thread[0] && 
            entry.thread[0].threadId === currentThreadId &&
            entry.thread[0].positionInThread === (currentPositionInThread + 1)
        ).length;
        
        // Oblicz relationOrder: różnica + 1
        const relationOrder = currentLevelCount - nextLevelCount + 1;
        
        return relationOrder;
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
        // Usuń custom category inputy jeśli istnieją
        const customContainers = form.querySelectorAll('.custom-category-container');
        customContainers.forEach(container => container.remove());
            

        console.log('Wpis codzienny zapisany pomyślnie.');

        if (userType === 'mama') {
            this.dailyMamaFormContainer.classList.add('hidden');
            this.dailyMamaFormContainer.style.display = 'none';
        } else if (userType === 'tata') {
            this.dailyTataFormContainer.classList.add('hidden');
            this.dailyTataFormContainer.style.display = 'none';
        }

        this.loadExistingCategories();
        this.loadDailyEntries();
    }

    loadDailyEntries() {
        console.log('Loading daily entries, isLocalHost:', this.appCore.isLocalHost);
        console.log('DAILY_ENTRIES_KEY:', this.DAILY_ENTRIES_KEY);
        
        if (this.appCore.isLocalHost) {
            const dailyData = this.appCore.localDatabase[this.DAILY_ENTRIES_KEY] || {};
            const entries = dailyData.dailyEntries || {};
            this.renderDailyEntries(entries);
        } else {
            console.log('Attempting to load from Firebase...');
            // ZMIANA: Dodaj pełną ścieżkę jak w lokalnym
            console.log('Firebase path:', this.DAILY_ENTRIES_KEY + '/dailyEntries');
        
            firebase.database().ref(this.DAILY_ENTRIES_KEY + '/dailyEntries')
            .once('value', (snapshot) => {
                console.log('Firebase data received:', snapshot.val());
                const entries = snapshot.val() || {};
                console.log('Processed entries:', entries);
                this.renderDailyEntries(entries);
            })
            .catch((error) => {
                console.error('Firebase load error:', error);
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


            // Renderuj wszystkie wątki jako kolumny
            const threadsContainer = this.createThreadsColumnLayout(sortedThreads, entries);
            container.appendChild(threadsContainer);

            container.classList.add('entries-loaded');
            // Wywołaj centerScrollContainers po wyrenderowaniu wszystkich elementów
            setTimeout(() => {
                centerScrollContainers();
            }, 150); // Daj czas na wyrenderowanie DOM
            
        }, 1000);
    }

    createThreadsColumnLayout(threads, dailyEntries) {
        const mainContainer = document.createElement('div');
        mainContainer.className = 'entries-container';
        mainContainer.id = 'dailyEntriesContainer';

        threads.forEach((thread, index) => {
            const threadContainer = this.createThreadColumn(thread, index, dailyEntries);
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

        // Utwórz mapę dailyEntries dla tego wątku
        const threadDailyEntries = {};
        thread.entries.forEach(entry => {
            const entryKey = `entry_${entry.timestamp}_${Math.random().toString(36).substring(2, 11)}`;
            threadDailyEntries[entryKey] = entry;
        });

        // Renderuj każdy poziom hierarchii w odwrotnej kolejności (największy level na górze)
        for (let levelIndex = hierarchyStructure.length - 1; levelIndex >= 0; levelIndex--) {
            const level = hierarchyStructure[levelIndex];
            const levelDiv = this.createHierarchyLevel(level, levelIndex, threadDailyEntries);
            levelsContainer.appendChild(levelDiv);
        }

        scrollContainer.appendChild(levelsContainer);
        threadDiv.appendChild(scrollContainer);

        return threadDiv;
    }

    createHierarchyLevel(level, levelIndex, dailyEntries) {
        const levelDiv = document.createElement('div');
        levelDiv.className = `hierarchy-level level-${levelIndex}`;

        level.forEach((node, nodeIndex) => {
            // Pobierz dane wpisu z dailyEntries
            const entryKey = Object.keys(dailyEntries).find(key => 
                dailyEntries[key].id === node.entry.id
            );
            const entryData = entryKey ? dailyEntries[entryKey] : node.entry;
            
            // Dodaj spacer dla poziomu
            const spacer = document.createElement('div');
            spacer.className = 'entry-spacer';
            levelDiv.appendChild(spacer);

            // Utwórz wrapper dla wpisu
            const entryWrapper = document.createElement('div');
            entryWrapper.className = 'entry-wrapper';
            entryWrapper.setAttribute('data-entry-id', entryData.id);
            entryWrapper.setAttribute('data-level', levelIndex);
            entryWrapper.setAttribute('data-position', nodeIndex);

            // Utwórz główny div z danymi wpisu
            const entryDiv = document.createElement('div');
            entryDiv.className = `entry daily-entry entry-${entryData.entryType.toLowerCase()}`;
            entryDiv.id = `entry-${entryData.id}`;
            entryDiv.setAttribute('data-entry-type', entryData.entryType);
            entryDiv.setAttribute('data-author', entryData.type);
            entryDiv.setAttribute('data-category', entryData.category);
            entryDiv.setAttribute('data-related-to-position', entryData.relatedTo ? entryData.relatedTo.map(rel => rel.relationOrder).join(',') : 'none');
            entryDiv.setAttribute('data-previous-hierarchy-level-related-to-position-values', levelIndex > 0 && node.parent && node.parent.entry.relatedTo ? node.parent.entry.relatedTo.map(rel => rel.relationOrder).join(',') : 'none');

            const typeEmojis = {
                'Pozytywny': '😊',
                'Negatywny': '😔',
                'Neutralny': '😐'
            };

            entryDiv.innerHTML = `
                <div class="entry-header daily-entry-header">
                    <span class="entry-author daily-entry-author">${entryData.type}</span>
                    <div class="entry-timestamp">
                        <div class="entry-date">${new Date(entryData.timestamp).toLocaleDateString('pl-PL')}</div>
                        <div class="entry-time">${new Date(entryData.timestamp).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}</div>
                    </div>
                </div>
                <div class="entry-meta daily-entry-meta">
                    <span class="entry-category daily-entry-category">#${entryData.category}</span>
                    <span class="entry-type daily-entry-type">${typeEmojis[entryData.entryType]} ${entryData.entryType}</span>
                </div>
                <div class="entry-content daily-entry-content">
                    <p class="entry-text">${entryData.text.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="entry-footer">
                    <span class="entry-id">${entryData.id}</span>
                </div>
            `;

            // Dodaj połączenia wizualne dla poziomów poniżej pierwszego
            if (levelIndex > 0 && node.parent) {
                spacer.classList.add('has-parent');
                
                // Dodaj linię łączącą z rodzicem
                const connector = document.createElement('div');
                connector.className = 'entry-connector';
                spacer.appendChild(connector);
            }

            // Dodaj entry div do wrapper
            entryWrapper.appendChild(entryDiv);
            
            // Dodaj wrapper do poziomu
            spacer.appendChild(entryWrapper);
            // Ustaw szerokość spacera na podstawie atrybutów danych
            let positions = [];
            let positionValue;
            let nextPositionValue;
            let spacerWidth;
            if (entryDiv.dataset.previousHierarchyLevelRelatedToPositionValues) {
                positions = entryDiv.dataset.previousHierarchyLevelRelatedToPositionValues.split(',').map(val => parseInt(val, 10));
                
            } if (positions && positions.length > 0) {
                // Pobierz wartość z positions wskazaną przez data-position
                const posIndex = parseInt(entryWrapper.dataset.position, 10);
                positionValue = (!isNaN(posIndex) && Array.isArray(positions) && posIndex >= 0 && posIndex < positions.length)
                    ? positions[posIndex]
                    : undefined;
                const nextPosIndex = posIndex + 1;
                nextPositionValue = (!isNaN(nextPosIndex) && Array.isArray(positions) && nextPosIndex >= 0 && nextPosIndex < positions.length)
                    ? positions[nextPosIndex]
                    : undefined;
            }
            if (nextPositionValue !== undefined && positionValue !== undefined && nextPositionValue > (positionValue + 1)) {
                spacerWidth = (nextPositionValue - positionValue - 1) * 615; // Przykładowa szerokość na jednostkę
                spacer.style.width = `${spacerWidth}px`;
                spacer.style.display = 'flex';
                spacer.style.justifyContent = 'flex-end';

            } else {
            }
            if (positions.length > 2) {
                const additionalWidth = (positions.length - 2) * 290;
                spacerWidth += additionalWidth;
                spacer.style.width = `${spacerWidth}px`;
            }

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

function centerScrollContainers() {
    const scrollContainers = document.querySelectorAll('.thread-scroll-container');
    console.log('Found scroll containers:', scrollContainers);
    
    scrollContainers.forEach(container => {
        // Poczekaj, aż zawartość się załaduje
        setTimeout(() => {
            const scrollWidth = container.scrollWidth;
            const clientWidth = container.clientWidth;
            
            // Oblicz pozycję środka
            const centerPosition = (scrollWidth - clientWidth) / 2;
            
            // Ustaw scroll na środku
            container.scrollLeft = centerPosition;
        }, 100); // Krótkie opóźnienie dla pewności
    });
}



// Dla kompatybilności z obecnym kodem
window.DailyDiary = DailyDiary;