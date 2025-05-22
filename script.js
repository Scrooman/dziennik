document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Firebase app
    const app = firebase.initializeApp(firebaseConfig);

    // 2. Initialize App Check
    const appCheck = firebase.appCheck();
    appCheck.activate(
        new firebase.appCheck.ReCaptchaV3Provider('6LcsTjMrAAAAANwi1epDdGxFldFurLuYopby_5G7'), // Zamień na swój klucz witryny reCAPTCHA
        true // Włącz automatyczne odświeżanie tokenów
    );

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
            '0552fdcc043c89f832d07392272d8dc639859f97a61bbe33ae878624b96e3219' 
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
        let promptMessage;

        // Ustaw odpowiedni komunikat w zależności od typu
        if (type === 'mama') {
            promptMessage = `Aby upewnić się, że jesteś Andzią, dokończ wyrażenie: "Andzia ......"`;
        } else if (type === 'tata') {
            promptMessage = `Ah Ah Ah! You didn't say the magic word!`;
        } else if (type === 'milestone') {
            promptMessage = `Ah Ah Ah! You didn't say the magic word!`;
        }
        let password = prompt(promptMessage); // Wyświetl odpowiedni komunikat
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

    const saveEntryToFirebase = async (entry) => {
        try {
            const entriesRef = firebase.database().ref('entries');
            const newEntryRef = entriesRef.push(); // Tworzy nowy wpis w bazie danych
            await newEntryRef.set(entry);
            console.log('Wpis zapisany pomyślnie do Firebase!');
        } catch (error) {
            console.error('Błąd podczas zapisywania wpisu do Firebase:', error);
            throw error; // Rzuć błąd, aby można było go obsłużyć w `catch`
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
        return `${days} dni, ${hours} godzin`;
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
        event.preventDefault(); // Zapobiega przeładowaniu strony
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
            countdown: countdown
        };
        console.log('Nowy wpis:', newEntry);
        saveEntryToFirebase(newEntry) // Zapisz wpis do Firebase
            .then(() => {
                form.reset(); // Zresetuj formularz po zapisaniu
                resetEmojiRatings(form); // Zresetuj oceny emoji
                console.log('Wpis zapisany pomyślnie.');
    
                // Ukryj sekcję formularza po zapisaniu
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
            id: `milestone-${timestamp}`,
            type: 'Milestone',
            image,
            name,
            date: new Date(date).getTime(),
            description,
            timestamp: timestamp,
            countdown: countdown
        };
    
        saveEntryToFirebase(newMilestone)
            .then(() => {
                milestoneForm.reset(); // Zresetuj formularz po zapisaniu
                milestoneFormContainer.classList.add('hidden'); // Ukryj sekcję formularza
                milestoneFormContainer.style.display = 'none';
            })
            .catch((error) => {
                console.error('Błąd podczas zapisywania wpisu:', error);
                alert('Nie udało się zapisać wpisu. Spróbuj ponownie.');
            });
    });

    // --- Inicjalizacja ---
    dueDateValueEl.textContent = dueDate ? dueDate.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' }) : '???';
    countdownHeaderEl.textContent = calculateCurrentCountdown();
    setInterval(() => { countdownHeaderEl.textContent = calculateCurrentCountdown(); }, 60000);

    // Funkcja do wczytywania wpisów z pliku JSON w Firebase
    const loadEntriesFromFirebase = async () => {
        try {
            const entriesRef = firebase.database().ref('entries'); // Użyj globalnego obiektu firebase.database
            entriesRef.on('value', (snapshot) => {
                const entries = snapshot.val();
                if (entries) {
                    renderEntries(entries);
                } else {
                    allEntriesContainer.innerHTML = '<p style="text-align: center;">Brak wpisów.</p>';
                }
            });
        } catch (error) {
            console.error('Błąd podczas wczytywania danych z Firebase:', error);
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
                    <p style="text-align: left;">${entry.description.replace(/\n/g, '<br>')}</p>
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
        await loadEntriesFromFirebase();
    };

    // Inicjalizacja - wczytaj wpisy przy załadowaniu strony
    loadEntriesFromFirebase();

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
    
    // Zlicz wpisy po autorze
    const allEntries = document.querySelectorAll('.entry');
    let andziaCount = 0;
    let kubaCount = 0;
    
    allEntries.forEach(entry => {
      const authorText = entry.querySelector('.entry-author')?.textContent.trim();
      if (authorText?.startsWith('Andzia')) andziaCount++;
      else if (authorText?.startsWith('Kuba')) kubaCount++;
    });
    
    // Wstaw JSON tylko z licznikami
    const counters = {
      Andzia: andziaCount,
      Kuba: kubaCount
    };
    
    const scriptTag = document.createElement('script');
    scriptTag.id = 'entries-json';
    scriptTag.type = 'application/json';
    scriptTag.textContent = JSON.stringify(counters);
    document.body.appendChild(scriptTag);
    
    
});
