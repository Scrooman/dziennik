document.addEventListener('DOMContentLoaded', () => {

    // Sprawdzenie czy strona jest uruchamiana lokalnie
    const isLocalHost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.protocol === 'file:';

    console.log('Tryb lokalny:', isLocalHost);

    // 1. Initialize Firebase app (tylko jeśli nie w trybie lokalnym)
    let app, appCheck;
    if (!isLocalHost) {
        app = firebase.initializeApp(firebaseConfig);

        // 2. Initialize App Check
        appCheck = firebase.appCheck();
        appCheck.activate(
            new firebase.appCheck.ReCaptchaV3Provider('6LcsTjMrAAAAANwi1epDdGxFldFurLuYopby_5G7'),
            true
        );
    }

    // --- Konfiguracja ---
    const dueDateString = '???';
    const dueDate = dueDateString === '???' ? null : new Date(dueDateString);

    const conceptionDateString = '???'; 
    
    // Klucze dla różnych zakładek
    const PREGNANCY_ENTRIES_KEY = 'pregnancyEntries_v1';
    const NEXT_STAGE_ENTRIES_KEY = 'nextStageEntries_v1';

    // Zmienna do śledzenia aktywnej zakładki
    let currentTab = 'nextStage';

    // Lokalna baza danych (dla trybu lokalnego)
    let localDatabase = {
        entries: {},
        pregnancyEntries_v1: {},
        nextStageEntries_v1: {}
    };

    // Funkcja do wczytywania lokalnej bazy danych
    const loadLocalDatabase = async () => {
        try {
            const response = await fetch('./local_diary.json');
            if (response.ok) {
                const data = await response.json();
                localDatabase = data;
                console.log('Załadowano lokalną bazę danych:', localDatabase);
            } else {
                console.log('Nie znaleziono pliku local_diary.json, używam pustej bazy');
            }
        } catch (error) {
            console.log('Błąd wczytywania lokalnej bazy danych:', error);
        }
    };

    // Funkcja do zapisywania lokalnej bazy danych
    const saveLocalDatabase = async () => {
        try {
            // W trybie lokalnym nie możemy zapisywać plików z przeglądarki
            // Wyświetlamy dane w konsoli do ręcznego skopiowania
            console.log('=== LOKALNA BAZA DANYCH DO ZAPISANIA ===');
            console.log(JSON.stringify(localDatabase, null, 2));
            console.log('=== KONIEC DANYCH ===');
            
            // Opcjonalnie: pokaż alert z informacją
            const shouldDownload = confirm('Wpis dodany do lokalnej bazy! Czy chcesz pobrać zaktualizowany plik JSON?');
            if (shouldDownload) {
                downloadLocalDatabase();
            }
        } catch (error) {
            console.error('Błąd podczas zapisywania lokalnej bazy danych:', error);
        }
    };

    // Funkcja do pobrania lokalnej bazy danych jako plik
    const downloadLocalDatabase = () => {
        const dataStr = JSON.stringify(localDatabase, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'local_diary.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    // --- Elementy DOM dla zakładki Ciąża ---
    const mamaTabBtn = document.getElementById('mamaTabBtn');
    const tataTabBtn = document.getElementById('tataTabBtn');
    const milestoneTabBtn = document.getElementById('milestoneTabBtn');
    const mamaFormContainer = document.getElementById('mamaFormContainer');
    const tataFormContainer = document.getElementById('tataFormContainer');
    const milestoneFormContainer = document.getElementById('milestoneFormContainer');
    const mamaForm = document.getElementById('mamaForm');
    const tataForm = document.getElementById('tataForm');
    const milestoneForm = document.getElementById('milestoneForm');
    const allEntriesContainer = document.getElementById('allEntries');
    const countdownFromInitialDateEl = document.getElementById('countdownFromInitialDate');
    const countdownFromFirstCommitDateEl = document.getElementById('countdownFromFirstCommitDate');


    // --- Elementy DOM dla zakładki Następny etap ---
    const nextStageMamaTabBtn = document.getElementById('nextStageMamaTabBtn');
    const nextStageTataTabBtn = document.getElementById('nextStageTataTabBtn');
    const nextStageMilestoneTabBtn = document.getElementById('nextStageMilestoneTabBtn');
    const nextStageMamaFormContainer = document.getElementById('nextStageMamaFormContainer');
    const nextStageTataFormContainer = document.getElementById('nextStageTataFormContainer');
    const nextStageMilestoneFormContainer = document.getElementById('nextStageMilestoneFormContainer');
    const nextStageMamaForm = document.getElementById('nextStageMamaForm');
    const nextStageTataForm = document.getElementById('nextStageTataForm');
    const nextStageMilestoneForm = document.getElementById('nextStageMilestoneForm');
    const nextStageAllEntriesContainer = document.getElementById('nextStageAllEntries');
    const nextStageDueDateDisplay = document.getElementById('nextStageDueDateDisplay');
    const dueDateValueEl = nextStageDueDateDisplay ? nextStageDueDateDisplay.querySelector('#dueDateValue') : null;
    const countdownHeaderEl = nextStageDueDateDisplay ? nextStageDueDateDisplay.querySelector('#countdownHeader') : null;

    const hashedPasswords = {
        mama: ['0552fdcc043c89f832d07392272d8dc639859f97a61bbe33ae878624b96e3219'],
        tata: ['8273de434a89f11dda787187b6dc5845c240b3626283b885651b1d2ce432343e'],
        milestone: ['927b135def08ee9019970eda2853e8fb6e0316b516b9aedb2e12ed148dd45bc3']
    };

    const hashPassword = async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    };
    
    const verifyPassword = async (type, callback) => {
        let promptMessage;
        if (type === 'mama') {
            promptMessage = `Aby upewnić się, że jesteś Andzią, dokończ wyrażenie: "Andzia ......"`;
        } else if (type === 'tata') {
            promptMessage = `Ah Ah Ah! You didn't say the magic word!`;
        } else if (type === 'milestone') {
            promptMessage = `Ah Ah Ah! You didn't say the magic word!`;
        }
        let password = prompt(promptMessage);
        if (!password) return;
    
        password = password.toLowerCase();
        const inputHash = await hashPassword(password);
        if (hashedPasswords[type].includes(inputHash)) {
            callback();
        } else {
            alert("Nieprawidłowe hasło!");
        }
    };

    // Funkcja przełączania między zakładkami (zaktualizowana)
    function switchMainTab(tabName) {
        const currentContent = document.querySelector('.tab-content:not(.hidden)');
        
        
        // Animacja wyjścia dla aktualnej zakładki
        if (currentContent) {
            currentContent.classList.add('fade-out');
            setTimeout(() => {
                // Ukryj wszystkie zakładki
                document.getElementById('homeContent').classList.add('hidden');
                document.getElementById('pregnancyContent').classList.add('hidden');
                document.getElementById('nextStageContent').classList.add('hidden');
                
                // Usuń klasy animacji
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('fade-out', 'fade-in');
                });
                
                showNewTab(tabName);
            }, 300);
        } else {
            showNewTab(tabName);
        }
    }

    function showNewTab(tabName) {

        if (tabName !== "home") {
            document.querySelector('.tabs').style.removeProperty("display");
        } else {
            document.querySelector('.tabs').style.display = "none";
        }
        // Usuń aktywną klasę ze wszystkich zakładek
        document.getElementById('homeTab').classList.remove('active');
        document.getElementById('pregnancyTab').classList.remove('active');
        document.getElementById('nextStageTab').classList.remove('active');
        
        let targetContent;
        
        if (tabName === 'home') {
            targetContent = document.getElementById('homeContent');
            document.getElementById('homeTab').classList.add('active');
            currentTab = 'home';
            document.body.style.backgroundColor = '#fdfaf6';
            
            targetContent.classList.remove('hidden');
            targetContent.classList.add('fade-in');
            
            setTimeout(() => {
                loadHomeStatistics();
            }, 200);
            
        } else if (tabName === 'pregnancy') {
            targetContent = document.getElementById('pregnancyContent');
            document.getElementById('pregnancyTab').classList.add('active');
            currentTab = 'pregnancy';
            document.body.style.backgroundColor = '#fdfaf6';
            
            targetContent.classList.remove('hidden');
            targetContent.classList.add('fade-in');
            
            setTimeout(() => {
                loadEntriesFromFirebase(null, allEntriesContainer);
            }, 200);
            
        } else if (tabName === 'nextStage') {
            targetContent = document.getElementById('nextStageContent');
            document.getElementById('nextStageTab').classList.add('active');
            currentTab = 'nextStage';
            document.body.style.backgroundColor = '#fdfaf6';
            
            targetContent.classList.remove('hidden');
            targetContent.classList.add('fade-in');
            
            setTimeout(() => {
                loadEntriesFromFirebase(NEXT_STAGE_ENTRIES_KEY, nextStageAllEntriesContainer);
            }, 200);
        }
    }

    // Funkcja ładowania statystyk na stronie głównej
    const loadHomeStatistics = () => {
        // Załaduj statystyki dla "Nasz Dziennik"
        loadDiaryStatistics(null, 'pregnancy');
        
        // Załaduj statystyki dla "Ciąża"
        loadDiaryStatistics(NEXT_STAGE_ENTRIES_KEY, 'nextStage');
    };

    // Funkcja ładowania statystyk dla konkretnego dziennika (zaktualizowana)
    const loadDiaryStatistics = (entriesKey, diaryType) => {
        console.log(`Ładowanie statystyk dla dziennika: ${diaryType}`);
        
        if (isLocalHost) {
            // Tryb lokalny
            if (entriesKey === null) {
                // Dla "Nasz Dziennik"
                const allEntries = localDatabase.entries || {};
                const pregnancyEntries = localDatabase.pregnancyEntries_v1 || {};

                const filteredEntries = {};
                Object.keys(allEntries).forEach(key => {
                    const entry = allEntries[key];
                    if (!entry.tab || entry.tab === '') {
                        filteredEntries[key] = entry;
                    }
                });

                const combinedEntries = { ...filteredEntries, ...pregnancyEntries };
                updateStatistics(combinedEntries, diaryType);
            } else {
                // Dla innych dzienników
                const entries = localDatabase[entriesKey] || {};
                updateStatistics(entries, diaryType);
            }
        } else {
            // Tryb Firebase
            if (entriesKey === null) {
                Promise.all([
                    new Promise(resolve => firebase.database().ref('entries').once('value', resolve)),
                    new Promise(resolve => firebase.database().ref('pregnancyEntries_v1').once('value', resolve))
                ]).then(([entriesSnap, pregnancySnap]) => {
                    const allEntries = entriesSnap.val() || {};
                    const pregnancyEntries = pregnancySnap.val() || {};

                    const filteredEntries = {};
                    Object.keys(allEntries).forEach(key => {
                        const entry = allEntries[key];
                        if (!entry.tab || entry.tab === '') {
                            filteredEntries[key] = entry;
                        }
                    });

                    const combinedEntries = { ...filteredEntries, ...pregnancyEntries };
                    updateStatistics(combinedEntries, diaryType);
                });
            } else {
                firebase.database().ref(entriesKey).once('value', (snapshot) => {
                    const entries = snapshot.val() || {};
                    updateStatistics(entries, diaryType);
                });
            }
        }
    };

    const updateStatistics = (entries, diaryType) => {
        const stats = {
            andzia: 0,
            kuba: 0,
            milestone: 0,
            total: 0
        };

        Object.values(entries).forEach(entry => {
            if (entry.type === 'Andzia') {
                stats.andzia++;
            } else if (entry.type === 'Kuba') {
                stats.kuba++;
            } else if (entry.type === 'Milestone') {
                stats.milestone++;
            }
            stats.total++;
        });

        // Aktualizuj elementy DOM z zabezpieczeniem
        const andziaEl = document.getElementById(`${diaryType}AndziaCount`);
        const kubaEl = document.getElementById(`${diaryType}KubaCount`);
        const milestoneEl = document.getElementById(`${diaryType}MilestoneCount`);
        const totalEl = document.getElementById(`${diaryType}TotalCount`);

        if (andziaEl) andziaEl.textContent = stats.andzia;
        if (kubaEl) kubaEl.textContent = stats.kuba;
        if (milestoneEl) milestoneEl.textContent = stats.milestone;
        if (totalEl) totalEl.textContent = stats.total;

        // Debug - sprawdź czy elementy istnieją
        console.log(`Statystyki dla ${diaryType}:`, stats);
        console.log(`Elementy DOM:`, { andziaEl, kubaEl, milestoneEl, totalEl });
    };

    // Event listenery dla przycisków głównych zakładek
    document.getElementById('homeTab').addEventListener('click', () => switchMainTab('home'));
    document.getElementById('pregnancyTab').addEventListener('click', () => switchMainTab('pregnancy'));
    document.getElementById('nextStageTab').addEventListener('click', () => switchMainTab('nextStage'));

    // Event listenery dla przycisków na stronie głównej
    document.getElementById('goToPregnancyBtn').addEventListener('click', () => switchMainTab('pregnancy'));
    document.getElementById('goToNextStageBtn').addEventListener('click', () => switchMainTab('nextStage'));

    const statDefinitions = {
         mamaZmeczenie: { label: 'Zmęczenie', emoji: '😩' },
         mamaRozchwianie: { label: 'Rozchwianie', emoji: '🤪' },
         mamaPracowitosc: { label: 'Pracowitość', emoji: '🏃‍♀️' },
         mamaNajedzenie: { label: 'Najedzenie', emoji: '😋' },
         mamaWymiotowanie: { label: 'Mdłości', emoji: '🤮' },
         mamaSzczescie: { label: 'Szczęście', emoji: '😊' },
         mamaObawy: { label: 'Obawy', emoji: '😨' },
         mamaAdaptacja: { label: 'Adaptacja', emoji: '🤪' },
         mamaEnergia: { label: 'Energia', emoji: '🏃‍♀️' },
         mamaZadowolenie: { label: 'Zadowolenie', emoji: '😋' },
         mamaSamopoczucie: { label: 'Samopoczucie', emoji: '🤮' },
         tataWsparcie: { label: 'Wsparcie dla Andzi', emoji: '👨‍🔧' },
         tataOrganizacja: { label: 'Przygotowanie', emoji: '🛠️' },
         tataZmeczenie: { label: 'Zmęczenie', emoji: '😔' },
         tataSzczescie: { label: 'Szczęście', emoji: '😊' },
         tataObawy: { label: 'Obawy', emoji: '😱' },
         tataSpokoj: { label: 'Spokój wewnętrzny', emoji: '🧘‍♂️' },
    };

    // Funkcja zapisywania wpisu (zaktualizowana)
    const saveEntryToFirebase = async (entry, tabKey) => {
        try {
            if (isLocalHost) {
                // Tryb lokalny - zapisz do lokalnej bazy danych
                if (!localDatabase[tabKey]) {
                    localDatabase[tabKey] = {};
                }
                
                const entryId = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localDatabase[tabKey][entryId] = entry;
                
                console.log('Wpis zapisany lokalnie:', entry);
                await saveLocalDatabase();
            } else {
                // Tryb Firebase
                const entriesRef = firebase.database().ref(tabKey);
                const newEntryRef = entriesRef.push();
                await newEntryRef.set(entry);
                console.log('Wpis zapisany pomyślnie do Firebase!');
            }
        } catch (error) {
            console.error('Błąd podczas zapisywania wpisu:', error);
            throw error;
        }
    };
    
    // --- Funkcje Pomocnicze ---
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('pl-PL', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const calculateCountdown = (entryTimestamp) => {
        if (!dueDate) return '???';
        const now = new Date(entryTimestamp);
        const diff = dueDate.getTime() - now.getTime();
        if (diff < 0) return `Termin minął ${Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))} dni temu`;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days} dni, ${hours} godzin`;
    };

    const calculateCurrentCountdown = () => {
        if (!dueDate) return '???';
        const now = new Date();
        const diff = dueDate.getTime() - now.getTime();
        if (diff < 0) return `Termin minął ${Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))} dni temu`;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days} dni, ${hours} godzin`;
    };

    const calculateCountdownFromRelationshipBeginning = (otherDate = null) => {
        const relationshipStartDateEl = document.getElementById('relationshipStartDate');
        let startDate;
        if (!relationshipStartDateEl || !relationshipStartDateEl.textContent) return '???';
        const [day, month, year] = relationshipStartDateEl.textContent.split('-').map(Number);
        if (!day || !month || !year) return '???';
        startDate = new Date(year, month - 1, day);

        let endDate;
        if (otherDate) {
            endDate = new Date(otherDate);
        } else {
            endDate = new Date();
        }

        const diff = endDate.getTime() - startDate.getTime();
        if (diff < 0) return `Rozpoczęcie za ${Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))} dni`;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return `${days} dni`;
    };
    
    const calculateCountdownFromFirstCommit = () => {
        const firstCommitDateEl = document.getElementById('firstCommitDate');
        let startDate;
        if (!firstCommitDateEl || !firstCommitDateEl.textContent) return '???';
        // Zakładamy format "DD-MM-YYYY"
        const [day, month, year] = firstCommitDateEl.textContent.split('-').map(Number);
        if (!day || !month || !year) return '???';
        startDate = new Date(year, month - 1, day);
        
        let endDate;
        endDate = new Date();

        const diff = endDate.getTime() - startDate.getTime();
        if (diff < 0) return `Rozpoczęcie za ${Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))} dni`;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return `${days} dni`;
    };
    

    // Funkcja przełączania formularzy dla zakładki Ciąża
    const switchActiveForm = (formToShow) => {
        console.log(`Przełączanie na formularz: ${formToShow}`);
        
        if (!mamaFormContainer || !tataFormContainer || !milestoneFormContainer) return;
        
        // Ukryj wszystkie formularze z animacją
        [mamaFormContainer, tataFormContainer, milestoneFormContainer].forEach(container => {
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
        if (mamaTabBtn) mamaTabBtn.classList.remove('active');
        if (tataTabBtn) tataTabBtn.classList.remove('active');
        if (milestoneTabBtn) milestoneTabBtn.classList.remove('active');

        // Pokaż wybrany formularz z animacją po opóźnieniu
        setTimeout(() => {
            if (formToShow === 'mama') {
                mamaFormContainer.classList.remove('hidden');
                mamaFormContainer.classList.add('form-section', 'form-fade-in');
                if (mamaTabBtn) mamaTabBtn.classList.add('active');
                mamaFormContainer.style.display = 'block';
            } else if (formToShow === 'tata') {
                tataFormContainer.classList.remove('hidden');
                tataFormContainer.classList.add('form-section', 'form-fade-in');
                if (tataTabBtn) tataTabBtn.classList.add('active');
                tataFormContainer.style.display = 'block';
            } else if (formToShow === 'milestone') {
                milestoneFormContainer.classList.remove('hidden');
                milestoneFormContainer.classList.add('form-section', 'form-fade-in');
                if (milestoneTabBtn) milestoneTabBtn.classList.add('active');
                milestoneFormContainer.style.display = 'block';
            }
        }, 250);
    };

    // Funkcja przełączania formularzy dla zakładki Następny etap
    const switchNextStageForm = (formToShow) => {
        console.log(`Przełączanie na formularz następnego etapu: ${formToShow}`);
        
        if (!nextStageMamaFormContainer || !nextStageTataFormContainer || !nextStageMilestoneFormContainer) return;
        
        // Ukryj wszystkie formularze z animacją
        [nextStageMamaFormContainer, nextStageTataFormContainer, nextStageMilestoneFormContainer].forEach(container => {
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
        if (nextStageMamaTabBtn) nextStageMamaTabBtn.classList.remove('active');
        if (nextStageTataTabBtn) nextStageTataTabBtn.classList.remove('active');
        if (nextStageMilestoneTabBtn) nextStageMilestoneTabBtn.classList.remove('active');

        // Pokaż wybrany formularz z animacją po opóźnieniu
        setTimeout(() => {
            if (formToShow === 'mama') {
                nextStageMamaFormContainer.classList.remove('hidden');
                nextStageMamaFormContainer.classList.add('form-section', 'form-fade-in');
                if (nextStageMamaTabBtn) nextStageMamaTabBtn.classList.add('active');
                nextStageMamaFormContainer.style.display = 'block';
            } else if (formToShow === 'tata') {
                nextStageTataFormContainer.classList.remove('hidden');
                nextStageTataFormContainer.classList.add('form-section', 'form-fade-in');
                if (nextStageTataTabBtn) nextStageTataTabBtn.classList.add('active');
                nextStageTataFormContainer.style.display = 'block';
            } else if (formToShow === 'milestone') {
                nextStageMilestoneFormContainer.classList.remove('hidden');
                nextStageMilestoneFormContainer.classList.add('form-section', 'form-fade-in');
                if (nextStageMilestoneTabBtn) nextStageMilestoneTabBtn.classList.add('active');
                nextStageMilestoneFormContainer.style.display = 'block';
            }
        }, 250);
    };

    // --- Obsługa Emotikon ---
    const handleEmojiClick = (event) => {
        if (!event.target.classList.contains('emoji-option')) return;

        const clickedEmoji = event.target;
        const ratingContainer = clickedEmoji.closest('.emoji-rating');
        const hiddenInput = ratingContainer.nextElementSibling;
        const value = parseInt(clickedEmoji.dataset.value, 10);

        if (!hiddenInput || !hiddenInput.classList.contains('stat-value')) {
             console.error("Nie znaleziono ukrytego inputu dla oceny emoji:", ratingContainer);
             return;
        }

        if (clickedEmoji.classList.contains('selected') && value === parseInt(hiddenInput.value, 10)) {
             hiddenInput.value = '';
             ratingContainer.querySelectorAll('.emoji-option').forEach(emoji => emoji.classList.remove('selected'));
        } else {
             hiddenInput.value = value;
             const allEmojis = ratingContainer.querySelectorAll('.emoji-option');
             allEmojis.forEach(emoji => {
                 const emojiValue = parseInt(emoji.dataset.value, 10);
                 emoji.classList.toggle('selected', emojiValue <= value);
             });
        }
        hiddenInput.dispatchEvent(new Event('input'));
    };

    const resetEmojiRatings = (formElement) => {
         const ratingContainers = formElement.querySelectorAll('.emoji-rating');
         ratingContainers.forEach(container => {
             const hiddenInput = container.nextElementSibling;
             if (hiddenInput) hiddenInput.value = '';
             container.querySelectorAll('.emoji-option').forEach(emoji => {
                 emoji.classList.remove('selected');
             });
         });
    };

    // Obsługa formularza dla zakładki Ciąża
    const handleFormSubmit = (event, userType) => {
        event.preventDefault();
        const form = event.target;
        const textInput = form.querySelector('textarea');
        const text = textInput.value.trim();
    
        if (!text) {
            alert('Treść wpisu nie może być pusta.');
            textInput.focus();
            return;
        }
    
        const stats = {};
        const hiddenInputs = form.querySelectorAll('.stat-value');
        hiddenInputs.forEach(input => {
            if (input.value) {
                const value = parseInt(input.value, 10);
                if (!isNaN(value) && value >= 1 && value <= 5) {
                    let statName = input.id;
                    if (userType === 'mama' && statName.startsWith('mama')) {
                        statName = statName.substring(4).toLowerCase();
                    } else if (userType === 'tata' && statName.startsWith('tata')) {
                        statName = statName.substring(4).toLowerCase();
                    }
                    stats[statName] = value;
                }
            }
        });
    
        const timestamp = Date.now();
        const countdown = calculateCountdown(timestamp);
        const newEntry = {
            id: `${userType}-${timestamp}`,
            type: userType === 'mama' ? 'Andzia' : 'Kuba',
            text: text,
            stats: stats,
            timestamp: timestamp,
            countdown: countdown,
            tab: 'pregnancy'
        };
        
        saveEntryToFirebase(newEntry, PREGNANCY_ENTRIES_KEY)
            .then(() => {
                form.reset();
                resetEmojiRatings(form);
                console.log('Wpis zapisany pomyślnie.');
    
                if (userType === 'mama') {
                    mamaFormContainer.classList.add('hidden');
                    mamaFormContainer.style.display = 'none';
                } else if (userType === 'tata') {
                    tataFormContainer.classList.add('hidden');
                    tataFormContainer.style.display = 'none';
                }
            })
            .catch((error) => {
                console.error('Błąd podczas zapisywania wpisu:', error);
                alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
            });
    };

    function calculateFetusWeek() {
        const currentDate = new Date();
        const conceptionDate = new Date(conceptionDateString);
        if (isNaN(conceptionDate)) return '???';
        const weeksPregnant = Math.floor((currentDate - conceptionDate) / (1000 * 60 * 60 * 24 * 7));
        return weeksPregnant;
    }

    // Obsługa formularza dla zakładki Następny etap (ciąża)
    const handleNextStageFormSubmit = (event, userType) => {
        event.preventDefault();
        const form = event.target;
        const textInput = form.querySelector('textarea');
        const text = textInput.value.trim();
    
        if (!text) {
            alert('Treść wpisu nie może być pusta.');
            textInput.focus();
            return;
        }
    
        const stats = {};
        const hiddenInputs = form.querySelectorAll('.stat-value');
        hiddenInputs.forEach(input => {
            if (input.value) {
                const value = parseInt(input.value, 10);
                if (!isNaN(value) && value >= 1 && value <= 5) {
                    let statName = input.id;
                    if (userType === 'mama' && statName.startsWith('nextStageMama')) {
                        statName = statName.substring(13).toLowerCase();
                    } else if (userType === 'tata' && statName.startsWith('nextStageTata')) {
                        statName = statName.substring(13).toLowerCase();
                    }
                    stats[statName] = value;
                }
            }
        });
    
        const timestamp = Date.now();
        const countdown = calculateCountdown(timestamp);
        const newEntry = {
            id: `${userType}-${timestamp}`,
            type: userType === 'mama' ? 'Andzia' : 'Kuba',
            text: text,
            stats: stats,
            timestamp: timestamp,
            countdown: countdown,
            mamaWeight: form.querySelector('#mamaWeight') ? form.querySelector('#mamaWeight').value.trim(): '',
            fetusWeek: calculateFetusWeek(),
            tab: 'nextStage'
        };
        
        saveEntryToFirebase(newEntry, NEXT_STAGE_ENTRIES_KEY)
            .then(() => {
                form.reset();
                resetEmojiRatings(form);
                console.log('Wpis zapisany pomyślnie.');
    
                if (userType === 'mama') {
                    nextStageMamaFormContainer.classList.add('hidden');
                    nextStageMamaFormContainer.style.display = 'none';
                } else if (userType === 'tata') {
                    nextStageTataFormContainer.classList.add('hidden');
                    nextStageTataFormContainer.style.display = 'none';
                }
            })
            .catch((error) => {
                console.error('Błąd podczas zapisywania wpisu:', error);
                alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
            });
    };
    
    // Obsługa formularza Wydarzenia Milowego dla zakładki Ciąża
    if (milestoneForm) {
        milestoneForm.addEventListener('submit', (event) => {
            event.preventDefault();
        
            const image = document.getElementById('milestoneImage').value.trim();
            const name = document.getElementById('milestoneName').value.trim();
            const date = document.getElementById('milestoneDate').value;
            const description = document.getElementById('milestoneDescription').value.trim();
        
            if (!image || !name || !date || !description) {
                alert('Wszystkie pola są wymagane!');
                return;
            }
        
            const timestamp = Date.now();
            const countdown = calculateCountdown(timestamp);
            const newMilestone = {
                id: `milestone-${timestamp}`,
                type: 'Milestone',
                image,
                name,
                date: new Date(date).getTime(),
                description,
                timestamp: timestamp,
                countdown: countdown,
                tab: 'pregnancy'
            };
        
            saveEntryToFirebase(newMilestone, PREGNANCY_ENTRIES_KEY)
                .then(() => {
                    milestoneForm.reset();
                    milestoneFormContainer.classList.add('hidden');
                    milestoneFormContainer.style.display = 'none';
                })
                .catch((error) => {
                    console.error('Błąd podczas zapisywania wpisu:', error);
                    alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
                });
        });
    }

    // Obsługa formularza Wydarzenia Milowego dla zakładki Następny etap
    if (nextStageMilestoneForm) {
        nextStageMilestoneForm.addEventListener('submit', (event) => {
            event.preventDefault();
        
            const image = document.getElementById('nextStageMilestoneImage').value.trim();
            const name = document.getElementById('nextStageMilestoneName').value.trim();
            const date = document.getElementById('nextStageMilestoneDate').value;
            const description = document.getElementById('nextStageMilestoneDescription').value.trim();
        
            if (!image || !name || !date || !description) {
                alert('Wszystkie pola są wymagane!');
                return;
            }
        
            const timestamp = Date.now();
            const countdown = calculateCountdown(timestamp);
            const newMilestone = {
                id: `milestone-${timestamp}`,
                type: 'Milestone',
                image,
                name,
                date: new Date(date).getTime(),
                description,
                timestamp: timestamp,
                countdown: countdown,
                tab: 'nextStage'
            };
        
            saveEntryToFirebase(newMilestone, NEXT_STAGE_ENTRIES_KEY)
                .then(() => {
                    nextStageMilestoneForm.reset();
                    nextStageMilestoneFormContainer.classList.add('hidden');
                    nextStageMilestoneFormContainer.style.display = 'none';
                })
                .catch((error) => {
                    console.error('Błąd podczas zapisywania wpisu:', error);
                    alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
                });
        });
    }

    // --- Inicjalizacja liczników ---
    if (dueDateValueEl) {
        dueDateValueEl.textContent = dueDate ? dueDate.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' }) : '???';
    }
    if (countdownHeaderEl) {
        countdownHeaderEl.textContent = calculateCurrentCountdown();
        setInterval(() => { countdownHeaderEl.textContent = calculateCurrentCountdown(); }, 60000);
    }

    if (countdownFromInitialDateEl) {
        countdownFromInitialDateEl.textContent = calculateCountdownFromRelationshipBeginning();
    }

    if (countdownFromFirstCommitDateEl) {
        countdownFromFirstCommitDateEl.textContent = calculateCountdownFromFirstCommit();
    }

    // Funkcja do wczytywania wpisów (zaktualizowana)
    const loadEntriesFromFirebase = async (entriesKey, container) => {
        try {
            if (isLocalHost) {
                // Tryb lokalny
                if (entriesKey === null) {
                    const allEntries = localDatabase.entries || {};
                    const nextStageEntries = localDatabase.pregnancyEntries_v1 || {};

                    const filteredEntries = {};
                    Object.keys(allEntries).forEach(key => {
                        const entry = allEntries[key];
                        if (!entry.tab || entry.tab === '') {
                            filteredEntries[key] = entry;
                        }
                    });

                    const combinedEntries = { ...filteredEntries, ...nextStageEntries };

                    if (Object.keys(combinedEntries).length > 0) {
                        renderEntries(entriesKey, combinedEntries, container);
                    } else {
                        container.innerHTML = '<p style="text-align: center;">Brak wpisów.</p>';
                    }
                } else {
                    const entries = localDatabase[entriesKey] || {};
                    if (Object.keys(entries).length > 0) {
                        renderEntries(entriesKey, entries, container);
                    } else {
                        container.innerHTML = '<p style="text-align: center;">Brak wpisów.</p>';
                    }
                }
            } else {
                // Tryb Firebase
                if (entriesKey === null) {
                    const entriesRef = firebase.database().ref('entries');
                    const nextStageRef = firebase.database().ref('pregnancyEntries_v1');

                    Promise.all([
                        new Promise(resolve => entriesRef.once('value', resolve)),
                        new Promise(resolve => nextStageRef.once('value', resolve))
                    ]).then(([entriesSnap, nextStageSnap]) => {
                        const allEntries = entriesSnap.val() || {};
                        const nextStageEntries = nextStageSnap.val() || {};

                        const filteredEntries = {};
                        Object.keys(allEntries).forEach(key => {
                            const entry = allEntries[key];
                            if (!entry.tab || entry.tab === '') {
                                filteredEntries[key] = entry;
                            }
                        });

                        const combinedEntries = { ...filteredEntries, ...nextStageEntries };

                        if (Object.keys(combinedEntries).length > 0) {
                            renderEntries(entriesKey, combinedEntries, container);
                        } else {
                            container.innerHTML = '<p style="text-align: center;">Brak wpisów.</p>';
                        }
                    }).catch(() => {
                        container.innerHTML = '<p style="text-align: center;">Błąd podczas wczytywania wpisów.</p>';
                    });
                } else {
                    const entriesRef = firebase.database().ref(entriesKey);
                    entriesRef.on('value', (snapshot) => {
                        const entries = snapshot.val();
                        if (entries) {
                            renderEntries(entriesKey, entries, container);
                        } else {
                            container.innerHTML = '<p style="text-align: center;">Brak wpisów.</p>';
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Błąd podczas wczytywania danych:', error);
            container.innerHTML = '<p style="text-align: center;">Błąd podczas wczytywania wpisów.</p>';
        }
    };

    // Funkcja do renderowania wpisów na stronie
    const renderEntries = (entryKey, entries, container) => {
        const relationshipStartDateEl = document.getElementById('relationshipStartDate');
        container.innerHTML = '<div class="loading-spinner"></div>';
    
        // Symulacja ładowania dla lepszego efektu wizualnego
        setTimeout(() => {
            container.innerHTML = '';
            container.classList.remove('entries-loaded');
        
            const sortedEntries = Object.values(entries).sort((a, b) => {
                const dateA = a.type === 'Milestone' ? new Date(a.date).getTime() : a.timestamp;
                const dateB = b.type === 'Milestone' ? new Date(b.date).getTime() : b.timestamp;
                return dateB - dateA;
            });
        
            if (sortedEntries.length === 0) {
                container.innerHTML = '<p style="text-align: center;">Brak wpisów.</p>';
                return;
            }

            sortedEntries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('entry');
                if (entryKey === PREGNANCY_ENTRIES_KEY || entryKey === null) {
                    if (entry.type === 'Milestone') {
                        entryDiv.classList.add('milestone-entry');
                        entryDiv.innerHTML = `
                            <img src="${entry.image}" alt="${entry.name}" class="milestone-image">
                            <p class="milestone-date">${new Date(entry.date).toLocaleDateString('pl-PL')}</p>
                            <h3>${entry.name}</h3>
                            <p style="text-align: left;">${entry.description ? entry.description.replace(/\n/g, '<br>') : ''}</p>
                        `;
                    } else {
                        const statsHtml = entry.stats
                            ? Object.entries(entry.stats)
                                .map(([statKey, value]) => {
                                    const statDefinition = statDefinitions[`${entry.type === 'Andzia' ? 'mama' : 'tata'}${statKey.charAt(0).toUpperCase() + statKey.slice(1)}`];
                                    if (!statDefinition) return '';
                                    const emojis = statDefinition.emoji.repeat(value);
                                    return `
                                        <div class="stat-item">
                                            <span class="stat-label">${statDefinition.label}:</span>
                                            <span class="stat-emojis">${emojis}</span>
                                        </div>
                                    `;
                                })
                                .join('')
                            : '';
            
                        entryDiv.innerHTML = `
                            <p class="entry-author">${entry.type === 'Andzia' ? 'Andzia' : 'Kuba'}</p>
                            <div class="entry-meta">
                                <span><strong>Data dodania:</strong> ${new Date(entry.timestamp).toLocaleDateString('pl-PL')}</span>
                                <span><strong>Dni razem:</strong> ${calculateCountdownFromRelationshipBeginning(entry.timestamp)}</span>
                            </div>
                            <div class="entry-content">
                                <p>${entry.text ? entry.text.replace(/\n/g, '<br>') : ''}</p>
                            </div>
                            ${statsHtml ? `<div class="entry-stats">${statsHtml}</div>` : ''}
                        `;
                    }
                } else if (entryKey === NEXT_STAGE_ENTRIES_KEY) {
                    if (entry.type === 'Milestone') {
                        entryDiv.classList.add('milestone-entry');
                        entryDiv.innerHTML = `
                            <img src="${entry.image}" alt="${entry.name}" class="milestone-image">
                            <p class="milestone-date">${new Date(entry.date).toLocaleDateString('pl-PL')}</p>
                            <h3>${entry.name}</h3>
                            <p style="text-align: left;">${entry.description ? entry.description.replace(/\n/g, '<br>') : ''}</p>
                        `;
                    } else {
                        const statsHtml = entry.stats
                            ? Object.entries(entry.stats)
                                .map(([statKey, value]) => {
                                    const statDefinition = statDefinitions[`${entry.type === 'Andzia' ? 'mama' : 'tata'}${statKey.charAt(0).toUpperCase() + statKey.slice(1)}`];
                                    if (!statDefinition) return '';
                                    const emojis = statDefinition.emoji.repeat(value);
                                    return `
                                        <div class="stat-item">
                                            <span class="stat-label">${statDefinition.label}:</span>
                                            <span class="stat-emojis">${emojis}</span>
                                        </div>
                                    `;
                                })
                                .join('')
                            : '';
            
                        entryDiv.innerHTML = `
                            <p class="entry-author">${entry.type === 'Andzia' ? 'Andzia' : 'Kuba'}</p>
                            <div class="entry-meta">
                                <span><strong>Data dodania:</strong> ${new Date(entry.timestamp).toLocaleDateString('pl-PL')}</span>
                                ${entry.type === 'Andzia' && entry.mamaWeight && /\d+/.test(entry.mamaWeight) ? `<span><strong>Mamusiowe ciałko:</strong> ${entry.mamaWeight} kg</span>` : ''}
                                ${entry.type === 'Andzia' ? `<span><strong>Tydzień ciąży:</strong> ${entry.fetusWeek}</span>` : ''}
                            </div>
                            <div class="entry-content">
                                <p>${entry.text ? entry.text.replace(/\n/g, '<br>') : ''}</p>
                            </div>
                            ${statsHtml ? `<div class="entry-stats">${statsHtml}</div>` : ''}
                        `;
                    }
                }
                container.appendChild(entryDiv);
            });
            // Uruchom animacje po krótkim opóźnieniu
            setTimeout(() => {
                container.classList.add('entries-loaded');
            }, 100);
        }, 2000);
    };

    // Nasłuchiwacze na przyciski zakładek (formularzy) dla Ciąży
    if (mamaTabBtn) {
        mamaTabBtn.addEventListener('click', () => {
            verifyPassword('mama', () => switchActiveForm('mama'));
        });
    }
    
    if (tataTabBtn) {
        tataTabBtn.addEventListener('click', () => {
            verifyPassword('tata', () => switchActiveForm('tata'));
        });
    }
    
    if (milestoneTabBtn) {
        milestoneTabBtn.addEventListener('click', () => {
            verifyPassword('milestone', () => switchActiveForm('milestone'));
        });
    }

    // Nasłuchiwacze na przyciski zakładek (formularzy) dla Następnego etapu
    if (nextStageMamaTabBtn) {
        nextStageMamaTabBtn.addEventListener('click', () => {
            verifyPassword('mama', () => switchNextStageForm('mama'));
        });
    }
    
    if (nextStageTataTabBtn) {
        nextStageTataTabBtn.addEventListener('click', () => {
            verifyPassword('tata', () => switchNextStageForm('tata'));
        });
    }
    
    if (nextStageMilestoneTabBtn) {
        nextStageMilestoneTabBtn.addEventListener('click', () => {
            verifyPassword('milestone', () => switchNextStageForm('milestone'));
        });
    }

    // Nasłuchiwacze na kliknięcia emotikon
    if (mamaForm) mamaForm.addEventListener('click', handleEmojiClick);
    if (tataForm) tataForm.addEventListener('click', handleEmojiClick);
    if (nextStageMamaForm) nextStageMamaForm.addEventListener('click', handleEmojiClick);
    if (nextStageTataForm) nextStageTataForm.addEventListener('click', handleEmojiClick);

    // Nasłuchiwacze na wysłanie formularzy dla Ciąży
    if (mamaForm) mamaForm.addEventListener('submit', (e) => handleFormSubmit(e, 'mama'));
    if (tataForm) tataForm.addEventListener('submit', (e) => handleFormSubmit(e, 'tata'));

    // Nasłuchiwacze na wysłanie formularzy dla Następnego etapu
    if (nextStageMamaForm) nextStageMamaForm.addEventListener('submit', (e) => handleNextStageFormSubmit(e, 'mama'));
    if (nextStageTataForm) nextStageTataForm.addEventListener('submit', (e) => handleNextStageFormSubmit(e, 'tata'));

    // Inicjalizacja - wczytaj lokalną bazę danych jeśli w trybie lokalnym
    if (isLocalHost) {
        loadLocalDatabase().then(() => {
            console.log('Lokalna baza danych załadowana');
            // Ustaw domyślną zakładkę po załadowaniu danych
            setTimeout(() => {
                switchMainTab('home');
            }, 200);
        });
    } else {
        // Ustaw domyślną zakładkę "Strona Główna" po załadowaniu strony
        setTimeout(() => {
            switchMainTab('home');
        }, 200);
    }
    
});
