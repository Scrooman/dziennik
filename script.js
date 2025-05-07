document.addEventListener('DOMContentLoaded', () => {
    // --- Konfiguracja ---
    const dueDateString = '???'; // !! WAŻNE: Ustaw poprawną datę RRRR-MM-DD !!
    const dueDate = dueDateString === '???' ? null : new Date(dueDateString);
    const MAMA_ENTRIES_KEY = 'mamaPregnancyEntries_v2';
    const TATA_ENTRIES_KEY = 'tataPregnancyEntries_v2';
    const MILESTONE_ENTRIES_KEY = 'milestoneEntries_v1';

    // --- Elementy DOM ---
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
    const dueDateValueEl = document.getElementById('dueDateValue');
    const countdownHeaderEl = document.getElementById('countdownHeader');


    const hashedPasswords = {
        mama: [
            'be58125cfb6cd626d8f79032a6d0b60f10eb45aa8c15d466acfa85a3ade4e834',
            'dc17e593b2a82081904acb686bdb59c8974caafc3702c37e6c1671497e386d29',
            '3d6c91777c82c6f03068f5bdea36e7aa202ba6852756cd89ac0f0e74dcdac740'  
        ],
        tata: [
            '8273de434a89f11dda787187b6dc5845c240b3626283b885651b1d2ce432343e'
        ],
        milestone: [
            '927b135def08ee9019970eda2853e8fb6e0316b516b9aedb2e12ed148dd45bc3'
        ]
    };


    const hashPassword = async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    };
    
    const verifyPassword = async (type, callback) => {
        let password = prompt(`Podaj hasło, aby uzyskać dostęp do sekcji: ${type}`);
        if (!password) return;
    
        password = password.toLowerCase(); // Zamień wprowadzone hasło na małe litery
    
        const inputHash = await hashPassword(password);
        if (hashedPasswords[type].includes(inputHash)) {
            callback(); // Jeśli hasło jest poprawne, wykonaj przekazaną funkcję
        } else {
            alert("Nieprawidłowe hasło!");
        }
    };

    const statDefinitions = {
         mamaZmeczenie: { label: 'Zmęczenie', emoji: '😩' },
         mamaRozchwianie: { label: 'Rozchwianie', emoji: '🤪' },
         mamaPracowitosc: { label: 'Pracowitość', emoji: '🏃‍♀️' },
         mamaNajedzenie: { label: 'Najedzenie', emoji: '😋' },
         mamaWymiotowanie: { label: 'Mdłości', emoji: '🤮' },
         mamaSzczescie: { label: 'Szczęście', emoji: '😊' },
         mamaObawy: { label: 'Obawy', emoji: '😨' },
         tataWsparcie: { label: 'Wsparcie dla Andzi', emoji: '👨‍🔧' },
         tataOrganizacja: { label: 'Przygotowanie', emoji: '🛠️' },
         tataZmeczenie: { label: 'Zmęczenie', emoji: '😔' },
         tataSzczescie: { label: 'Szczęście', emoji: '😊' },
         tataObawy: { label: 'Obawy', emoji: '😱' },
         tataSpokoj: { label: 'Spokój wewnętrzny', emoji: '🧘‍♂️' },
    };

    const saveEntryToJSONFile = async (entry) => {
        const fileName = 'entries.json';
    
        try {
            // Sprawdź, czy plik istnieje i wczytaj istniejące wpisy
            let entriesDictionary = {};
            const fileHandle = await window.showOpenFilePicker({
                suggestedName: fileName,
                types: [
                    {
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    },
                ],
            });
    
            // Odczytaj istniejące dane, jeśli plik już istnieje
            try {
                const file = await fileHandle[0].getFile();
                const fileContent = await file.text();
                entriesDictionary = JSON.parse(fileContent);
            } catch (readError) {
                console.warn('Nie udało się odczytać istniejącego pliku. Tworzony nowy plik.');
            }
    
            // Dodaj nowy wpis do słownika, używając jego id jako klucza
            entriesDictionary[entry.id] = entry;
    
            // Zapisz dane do pliku
            const writableStream = await fileHandle[0].createWritable();
            await writableStream.write(JSON.stringify(entriesDictionary, null, 2));
            await writableStream.close();
        } catch (error) {
            console.error('Błąd zapisu JSON:', error);
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
        if (!dueDate) return '???'; // Jeśli brak daty, zwróć "???"
        const now = new Date(entryTimestamp);
        const diff = dueDate.getTime() - now.getTime();
        if (diff < 0) return `Termin minął ${Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))} dni temu`;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days} dni, ${hours} godzin do terminu`;
    };

    const calculateCurrentCountdown = () => {
        if (!dueDate) return '???'; // Jeśli brak daty, zwróć "???"
        const now = new Date();
        const diff = dueDate.getTime() - now.getTime();
        if (diff < 0) return `Termin minął ${Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))} dni temu`;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days} dni, ${hours} godzin`;
    };

    const loadEntries = (key) => {
        const entriesJson = localStorage.getItem(key);
        try {
            return entriesJson ? JSON.parse(entriesJson) : [];
        } catch (e) {
            console.error(`Błąd parsowania JSON z klucza ${key}:`, e);
            return [];
        }
    };

    const saveEntries = (key, entries) => {
        localStorage.setItem(key, JSON.stringify(entries));
    };

    const switchActiveForm = (formToShow) => {
        console.log(`Przełączanie na formularz: ${formToShow}`);
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.add('hidden'); // Dodaj klasę hidden do wszystkich sekcji
            section.style.display = 'none'; // Wymuś ukrycie sekcji
        });
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); // Usuń klasę active z przycisków
    
        // Pokaż wybrany formularz i ustaw aktywny przycisk
        if (formToShow === 'mama') {
            mamaFormContainer.classList.remove('hidden');
            mamaTabBtn.classList.add('active');
            mamaFormContainer.style.display = 'block'; // Wymuś widoczność
        } else if (formToShow === 'tata') {
            tataFormContainer.classList.remove('hidden'); // Usuń klasę hidden
            tataTabBtn.classList.add('active');
            tataFormContainer.style.display = 'block'; // Wymuś widoczność
        } else if (formToShow === 'milestone') {
            milestoneFormContainer.classList.remove('hidden'); // Usuń klasę hidden
            milestoneTabBtn.classList.add('active');
            milestoneFormContainer.style.display = 'block'; // Wymuś widoczność
        }
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

        // Jeśli kliknięto już zaznaczoną najwyższą wartość, odznacz wszystko
        if (clickedEmoji.classList.contains('selected') && value === parseInt(hiddenInput.value, 10)) {
             hiddenInput.value = ''; // Wyczyść wartość
             ratingContainer.querySelectorAll('.emoji-option').forEach(emoji => emoji.classList.remove('selected'));
        } else {
             hiddenInput.value = value; // Zapisz wartość w ukrytym polu
             const allEmojis = ratingContainer.querySelectorAll('.emoji-option');
             allEmojis.forEach(emoji => {
                 const emojiValue = parseInt(emoji.dataset.value, 10);
                 emoji.classList.toggle('selected', emojiValue <= value); // Zaznacz/odznacz
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

    // --- ZMODYFIKOWANA Obsługa formularza ---
    const handleFormSubmit = (event, userType) => {
        event.preventDefault();
        const form = event.target;
        const textInput = form.querySelector('textarea');
        const storageKey = userType === 'mama' ? MAMA_ENTRIES_KEY : TATA_ENTRIES_KEY;
    
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
            id: `${userType}-${timestamp}`, // Unikalny ID
            type: userType === 'mama' ? 'Andzia' : 'Kuba', // Rodzaj wpisu
            text: text,
            stats: stats,
            timestamp: timestamp,
            countdown: countdown // Wartość "Do terminu"
        };
    
        const currentEntries = loadEntries(storageKey);
        currentEntries.push(newEntry);
        saveEntries(storageKey, currentEntries);
    
        // Dodaj wywołanie funkcji zapisującej do pliku JSON
        saveEntryToJSONFile(newEntry);
    
        updateEntries(); // Aktualizuj wpisy po dodaniu nowego
        form.reset();
        resetEmojiRatings(form);
    };

    // Obsługa formularza Wydarzenia Milowego
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
            id: `milestone-${timestamp}`, // Unikalny ID
            type: 'Milestone', // Rodzaj wpisu
            image,
            name,
            date: new Date(date).getTime(),
            description,
            timestamp: timestamp,
            countdown: countdown // Wartość "Do terminu"
        };
    
        const currentMilestones = loadEntries(MILESTONE_ENTRIES_KEY);
        currentMilestones.push(newMilestone);
        saveEntries(MILESTONE_ENTRIES_KEY, currentMilestones);
    
        // Dodaj wywołanie funkcji zapisującej do pliku JSON
        saveEntryToJSONFile(newMilestone);
    
        updateEntries(); // Aktualizuj wpisy po dodaniu nowego
        milestoneForm.reset();
    });

    // --- Inicjalizacja ---
    dueDateValueEl.textContent = dueDate ? dueDate.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' }) : '???';
    countdownHeaderEl.textContent = calculateCurrentCountdown();
    setInterval(() => { countdownHeaderEl.textContent = calculateCurrentCountdown(); }, 60000);

    // Funkcja do wczytywania wpisów z pliku JSON
    const loadEntriesFromJSON = async () => {
        try {
            const response = await fetch('entries.json');
            if (!response.ok) {
                console.error('Nie udało się wczytać pliku JSON:', response.statusText);
                allEntriesContainer.innerHTML = '<p style="text-align: center;">Brak wpisów lub plik JSON nie istnieje.</p>';
                return;
            }

            const entries = await response.json();
            renderEntries(entries);
        } catch (error) {
            console.error('Błąd podczas wczytywania pliku JSON:', error);
            allEntriesContainer.innerHTML = '<p style="text-align: center;">Błąd podczas wczytywania wpisów.</p>';
        }
    };

    // Funkcja do renderowania wpisów na stronie
    const renderEntries = (entries) => {
        allEntriesContainer.innerHTML = ''; // Wyczyść kontener
    
        // Sortowanie wpisów według daty (dla Milestone używamy pola "date", dla innych "timestamp")
        const sortedEntries = Object.values(entries).sort((a, b) => {
            const dateA = a.type === 'Milestone' ? new Date(a.date).getTime() : a.timestamp;
            const dateB = b.type === 'Milestone' ? new Date(b.date).getTime() : b.timestamp;
            return dateB - dateA; // Sortowanie malejące
        });
    
        if (sortedEntries.length === 0) {
            allEntriesContainer.innerHTML = '<p style="text-align: center;">Brak wpisów.</p>';
            return;
        }
    
        sortedEntries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('entry');
    
            if (entry.type === 'Milestone') {
                entryDiv.classList.add('milestone-entry');
                entryDiv.innerHTML = `
                    <img src="${entry.image}" alt="${entry.name}" class="milestone-image">
                    <p class="milestone-date">${new Date(entry.date).toLocaleDateString('pl-PL')}</p>
                    <h3>${entry.name}</h3>
                    <p>${entry.description}</p>
                `;
            } else {
                // Renderowanie wpisu z sekcją statystyk
                const statsHtml = entry.stats
                    ? Object.entries(entry.stats)
                        .map(([statKey, value]) => {
                            const statDefinition = statDefinitions[`${entry.type === 'Andzia' ? 'mama' : 'tata'}${statKey.charAt(0).toUpperCase() + statKey.slice(1)}`];
                            if (!statDefinition) return ''; // Pomijamy statystyki bez definicji
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
                    <p class="entry-author">${entry.type === 'Andzia' ? 'Andzia (M)' : 'Kuba (T)'}</p>
                    <div class="entry-meta">
                        <span><strong>Data dodania:</strong> ${new Date(entry.timestamp).toLocaleDateString('pl-PL')}</span>
                        <span><strong>Do terminu:</strong> ${entry.countdown}</span>
                    </div>
                    <div class="entry-content">
                        <p>${entry.text.replace(/\n/g, '<br>')}</p>
                    </div>
                    ${statsHtml ? `<div class="entry-stats">${statsHtml}</div>` : ''}
                `;
            }
    
            allEntriesContainer.appendChild(entryDiv);
        });
    };

    // Funkcja do aktualizacji wpisów po dodaniu nowego
    const updateEntries = async () => {
        await loadEntriesFromJSON();
    };

    // Inicjalizacja - wczytaj wpisy przy załadowaniu strony
    loadEntriesFromJSON();

    // Nasłuchiwacze na przyciski zakładek (formularzy)
    mamaTabBtn.addEventListener('click', () => {
        verifyPassword('mama', () => switchActiveForm('mama'));
    });
    
    tataTabBtn.addEventListener('click', () => {
        verifyPassword('tata', () => switchActiveForm('tata'));
    });
    
    milestoneTabBtn.addEventListener('click', () => {
        verifyPassword('milestone', () => switchActiveForm('milestone'));
    });

    // Nasłuchiwacze na kliknięcia emotikon (delegacja zdarzeń)
    mamaForm.addEventListener('click', handleEmojiClick);
    tataForm.addEventListener('click', handleEmojiClick);

    // Nasłuchiwacze na wysłanie formularzy
    mamaForm.addEventListener('submit', (e) => handleFormSubmit(e, 'mama'));
    tataForm.addEventListener('submit', (e) => handleFormSubmit(e, 'tata'));

    // ZMIANA: Usuwamy poniższą linię, aby żaden formularz nie był aktywny na starcie
    // switchActiveForm('mama');

    // Dodajmy prosty styl dla podświetlenia błędu fieldset w CSS
    // (Możesz dodać to na końcu pliku style.css)
    /*
    fieldset.error-highlight {
        outline: 2px solid red;
        box-shadow: 0 0 5px red;
    }
    */

    document.addEventListener("DOMContentLoaded", () => {
        const pregnancyTab = document.getElementById("pregnancyTab");
        const nextStageTab = document.getElementById("nextStageTab");
        const pregnancyContent = document.getElementById("pregnancyContent");
        const nextStageContent = document.getElementById("nextStageContent");
    
        // Obsługa kliknięcia zakładki "Ciąża"
        pregnancyTab.addEventListener("click", () => {
            pregnancyTab.classList.add("active");
            nextStageTab.classList.remove("active");
            pregnancyContent.classList.remove("hidden");
            nextStageContent.classList.add("hidden");
        });
    
        // Obsługa kliknięcia zakładki "Kolejny etap..."
        nextStageTab.addEventListener("click", () => {
            if (!nextStageTab.classList.contains("disabled")) {
                nextStageTab.classList.add("active");
                pregnancyTab.classList.remove("active");
                nextStageContent.classList.remove("hidden");
                pregnancyContent.classList.add("hidden");
            }
        });
    });

});
