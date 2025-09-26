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
        const newEntry = {
            id: `daily-${userType}-${timestamp}`,
            type: userType === 'mama' ? 'Andzia' : 'Kuba',
            text: text,
            category: category,
            entryType: type,
            relatedTo: relatedEntryId || null,
            timestamp: timestamp,
            tab: 'daily'
        };

        this.appCore.saveEntryToFirebase(newEntry, this.DAILY_ENTRIES_KEY)
            .then(() => {
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
            })
            .catch((error) => {
                console.error('Błąd podczas zapisywania wpisu:', error);
                alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
            });
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
                container.innerHTML = '<p style="text-align: center;">Brak wpisów codziennych.</p>';
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

    organizeEntriesIntoThreads(entries) {
        const entryArray = Object.entries(entries).map(([id, entry]) => ({...entry, entryId: id}));
        const threadsMap = new Map();

        // Grupuj wpisy według threadId
        entryArray.forEach(entry => {
            if (entry.thread && entry.thread.length > 0) {
                const threadInfo = entry.thread[0];
                const threadId = threadInfo.threadId;
                
                if (!threadsMap.has(threadId)) {
                    threadsMap.set(threadId, {
                        threadId: threadId,
                        entries: []
                    });
                }
                
                threadsMap.get(threadId).entries.push({
                    ...entry,
                    positionInThread: threadInfo.positionInThread
                });
            }
        });

        return Array.from(threadsMap.values());
    }

    createThreadsColumnLayout(threads) {
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 30px;
            width: 100%;
        `;

        threads.forEach(thread => {
            const threadContainer = this.createThreadColumn(thread);
            mainContainer.appendChild(threadContainer);
        });

        return mainContainer;
    }

    createThreadColumn(thread) {
        const threadDiv = document.createElement('div');
        threadDiv.classList.add('daily-thread-container');
        threadDiv.style.cssText = `
            border: 2px solid #2c3e50;
            border-radius: 8px;
            background: #34495e;
            overflow: hidden;
        `;

        // Header wątku
        const threadHeader = document.createElement('div');
        threadHeader.style.cssText = `
            background: #2c3e50;
            color: white;
            padding: 10px 15px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
        `;
        threadHeader.textContent = `ThreadId ${thread.threadId}`;
        threadDiv.appendChild(threadHeader);

        // Kontener z poziomym scrollem dla wpisów
        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = `
            overflow-x: auto;
            overflow-y: hidden;
            padding: 20px;
            background: #34495e;
            min-height: 200px;
        `;

        // Zbuduj strukturę hierarchiczną wpisów
        const hierarchyStructure = this.buildHierarchyStructure(thread.entries);
        
        // Kontener dla wszystkich poziomów
        const levelsContainer = document.createElement('div');
        levelsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 20px;
            min-width: max-content;
        `;

        // Renderuj każdy poziom hierarchii
        hierarchyStructure.forEach((level, levelIndex) => {
            const levelDiv = this.createHierarchyLevel(level, levelIndex);
            levelsContainer.appendChild(levelDiv);
        });

        scrollContainer.appendChild(levelsContainer);
        threadDiv.appendChild(scrollContainer);

        return threadDiv;
    }

    buildHierarchyStructure(entries) {
        // Stwórz mapę wpisów dla łatwego dostępu
        const entriesMap = new Map();
        entries.forEach(entry => {
            entriesMap.set(entry.id, entry);
        });

        // Znajdź wpisy główne (nie powiązane z innymi)
        const rootEntries = entries.filter(entry => {
            return !entry.relatedTo || entry.relatedTo.length === 0;
        });

        // Sortuj wpisy główne według positionInThread
        rootEntries.sort((a, b) => a.positionInThread - b.positionInThread);

        const levels = [];
        let currentLevel = rootEntries.map(entry => ({
            entry: entry,
            children: []
        }));

        levels.push(currentLevel);

        // Buduj kolejne poziomy hierarchii
        while (currentLevel.length > 0) {
            const nextLevel = [];
            
            currentLevel.forEach(parentNode => {
                // Znajdź wpisy powiązane z tym wpisem
                const children = entries.filter(entry => {
                    return entry.relatedTo && entry.relatedTo.some(rel => rel.id === parentNode.entry.id);
                });

                // Sortuj dzieci według relationOrder
                children.sort((a, b) => {
                    const relA = a.relatedTo.find(rel => rel.id === parentNode.entry.id);
                    const relB = b.relatedTo.find(rel => rel.id === parentNode.entry.id);
                    return (relA?.relationOrder || 0) - (relB?.relationOrder || 0);
                });

                children.forEach(child => {
                    const childNode = {
                        entry: child,
                        parent: parentNode.entry,
                        children: []
                    };
                    parentNode.children.push(childNode);
                    nextLevel.push(childNode);
                });
            });

            if (nextLevel.length > 0) {
                levels.push(nextLevel);
            }
            currentLevel = nextLevel;
        }

        return levels;
    }

    createHierarchyLevel(level, levelIndex) {
        const levelDiv = document.createElement('div');
        levelDiv.style.cssText = `
            display: flex;
            align-items: flex-start;
            gap: 15px;
            position: relative;
            min-height: 120px;
        `;

        level.forEach((node, nodeIndex) => {
            const entryElement = this.createSingleDailyEntryElement(node.entry);
            entryElement.style.cssText += `
                width: 300px;
                flex-shrink: 0;
                position: relative;
            `;

            // Dodaj połączenia wizualne dla poziomów poniżej pierwszego
            if (levelIndex > 0 && node.parent) {
                entryElement.style.cssText += `
                    margin-top: 20px;
                `;
                
                // Dodaj linię łączącą z rodzicem
                const connector = document.createElement('div');
                connector.style.cssText = `
                    position: absolute;
                    top: -20px;
                    left: 50%;
                    width: 2px;
                    height: 20px;
                    background: #bdc3c7;
                    transform: translateX(-50%);
                `;
                entryElement.appendChild(connector);
            }

            levelDiv.appendChild(entryElement);
        });

        return levelDiv;
    }

    createSingleDailyEntryElement(entry) {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('daily-entry');

        const typeColors = {
            'Pozytywny': '#d4edda',
            'Negatywny': '#f8d7da',
            'Neutralny': '#e2e3e5'
        };

        const typeEmojis = {
            'Pozytywny': '😊',
            'Negatywny': '😔',
            'Neutralny': '😐'
        };

        entryDiv.style.cssText = `
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid ${typeColors[entry.entryType] || '#e2e3e5'};
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;

        entryDiv.innerHTML = `
            <div class="daily-entry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="daily-entry-author" style="font-weight: bold; color: #333;">${entry.type}</span>
                <div style="font-size: 12px; color: #666;">
                    <div>${new Date(entry.timestamp).toLocaleDateString('pl-PL')}</div>
                    <div>${new Date(entry.timestamp).toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}</div>
                </div>
            </div>
            <div class="daily-entry-meta" style="margin-bottom: 8px;">
                <span class="daily-entry-category" style="background: #f0f0f0; padding: 2px 6px; border-radius: 12px; font-size: 11px; color: #666;">#${entry.category}</span>
                <span class="daily-entry-type" style="margin-left: 8px; font-size: 12px;">${typeEmojis[entry.entryType]} ${entry.entryType}</span>
            </div>
            <div class="daily-entry-content">
                <p style="margin: 0; line-height: 1.4; color: #333; font-size: 14px;">${entry.text.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #999; text-align: center;">
                ${entry.id}
            </div>
        `;

        // Hover effect
        entryDiv.addEventListener('mouseenter', () => {
            entryDiv.style.transform = 'translateY(-2px)';
            entryDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });

        entryDiv.addEventListener('mouseleave', () => {
            entryDiv.style.transform = 'translateY(0)';
            entryDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

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
}

// Dla kompatybilności z obecnym kodem
window.DailyDiary = DailyDiary;