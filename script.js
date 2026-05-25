// DOM Element Selectors
const allInputs = document.querySelectorAll('.numeric-input');
const tHours = document.getElementById('time-hours');
const tMinutes = document.getElementById('time-minutes');
const tSeconds = document.getElementById('time-seconds');
const distVal = document.getElementById('distance-val');
const distUnit = document.getElementById('distanceUnit');
const pMinutes = document.getElementById('pace-minutes');
const pSeconds = document.getElementById('pace-seconds');
const pUnit = document.getElementById('paceUnit');
const radios = document.querySelectorAll('input[name="calculationTarget"]');

const KM_TO_MILES = 0.621371;

// Configuration object mapping race preset string keys to metric kilometers
const PRESETS = {
    'marathon': 42.195,
    'half-marathon': 21.0975,
    '10k': 10,
    '5k': 5
};

// Helper function to handle dynamic text padding conversions (e.g. 4 -> "04")
function formatValue(val, shouldPad) {
    if (!shouldPad) return val.toString();
    return val.toString().padStart(2, '0');
}

// --- CORE MATHEMATICS ENGINE ---
function updateCalculations() {
    const activeTarget = document.querySelector('input[name="calculationTarget"]:checked').value;

    const th = parseInt(tHours.value, 10) || 0;
    const tm = parseInt(tMinutes.value, 10) || 0;
    const ts = parseInt(tSeconds.value, 10) || 0;
    const totalSeconds = (th * 3600) + (tm * 60) + ts;

    let distance = parseFloat(distVal.value) || 0;

    const pm = parseInt(pMinutes.value, 10) || 0;
    const ps = parseInt(pSeconds.value, 10) || 0;
    const paceSecondsPerUnit = (pm * 60) + ps;

    // Standardize baseline values to generic Metric kilometers
    let distanceInKm = distance;
    const dUnit = distUnit.value;

    if (PRESETS[dUnit]) {
        distanceInKm = PRESETS[dUnit];
    } else if (dUnit === 'miles') {
        distanceInKm = distance / KM_TO_MILES;
    }

    // Determine target tracking distance relative to chosen pace metric scale
    let targetDistanceUnits = distanceInKm;
    if (pUnit.value === '/mile') {
        targetDistanceUnits = distanceInKm * KM_TO_MILES;
    }

    // 1. CALCULATE TARGET: PACE
    if (activeTarget === 'pace') {
        if (totalSeconds <= 0 || targetDistanceUnits <= 0) {
            pMinutes.value = "00"; pSeconds.value = "00"; return;
        }
        const secPerUnit = totalSeconds / targetDistanceUnits;
        pMinutes.value = formatValue(Math.floor(secPerUnit / 60), true);
        pSeconds.value = formatValue(Math.round(secPerUnit % 60), true);
    }

    // 2. CALCULATE TARGET: DISTANCE
    else if (activeTarget === 'distance') {
        if (totalSeconds <= 0 || paceSecondsPerUnit <= 0) {
            distVal.value = "0"; return;
        }
        let calculatedKm = (totalSeconds / paceSecondsPerUnit);
        if (pUnit.value === '/mile') {
            calculatedKm = calculatedKm / KM_TO_MILES;
        }

        // Output conversion rules based on selection settings
        if (dUnit === 'miles') {
            distVal.value = (Math.round((calculatedKm * KM_TO_MILES) * 10000) / 10000);
        } else {
            distVal.value = (Math.round(calculatedKm * 10000) / 10000);
        }
    }

    // 3. CALCULATE TARGET: TOTAL TIME
    else if (activeTarget === 'time') {
        if (targetDistanceUnits <= 0 || paceSecondsPerUnit <= 0) {
            tHours.value = "00"; tMinutes.value = "00"; tSeconds.value = "00"; return;
        }
        const targetTotalSeconds = paceSecondsPerUnit * targetDistanceUnits;
        const hours = Math.floor(targetTotalSeconds / 3600);
        const minutes = Math.floor((targetTotalSeconds % 3600) / 60);
        const seconds = Math.round(targetTotalSeconds % 60);

        tHours.value = formatValue(hours, true);
        tMinutes.value = formatValue(minutes, true);
        tSeconds.value = formatValue(seconds, true);
    }
}

// --- DYNAMIC VIEW ROLES LOCKS AND VISUAL STATE HIGHLIGHTS ---
function handleTargetChange() {
    const target = document.querySelector('input[name="calculationTarget"]:checked').value;

    // Reset background styles and strip previous constraints across rows
    document.querySelectorAll('.picker-section').forEach(sec => {
        sec.classList.remove('target-active');
    });
    allInputs.forEach(i => i.removeAttribute('readonly'));

    // Enable all dropdown options by default
    Array.from(distUnit.options).forEach(option => option.disabled = false);

    // Reapply calculated read-only state conditions and flag view styling classes
    if (target === 'pace') {
        document.getElementById('section-pace').classList.add('target-active');
        pMinutes.setAttribute('readonly', true); pSeconds.setAttribute('readonly', true);
    } else if (target === 'distance') {
        document.getElementById('section-distance').classList.add('target-active');
        distVal.setAttribute('readonly', true);

        // FIX: Force dropdown to "km" and disable preset options
        distUnit.value = 'km';
        Array.from(distUnit.options).forEach(option => {
            if (PRESETS[option.value]) {
                option.disabled = true;
            }
        });
    } else if (target === 'time') {
        document.getElementById('section-time').classList.add('target-active');
        tHours.setAttribute('readonly', true); tMinutes.setAttribute('readonly', true); tSeconds.setAttribute('readonly', true);
    }
    updateCalculations();
}

// --- INTERCEPT WRITTEN INPUT AND CLICK LOGIC ARROWS ---
allInputs.forEach(input => {
    const max = parseInt(input.getAttribute('data-max'), 10);
    const shouldPad = input.getAttribute('data-pad') === 'true';
    const isIntegerOnly = input.classList.contains('integer-only');

    const wrapper = input.parentElement;
    const upBtn = wrapper.querySelector('.up');
    const downBtn = wrapper.querySelector('.down');

    input.addEventListener('input', (e) => {
        if (input.hasAttribute('readonly')) return;

        let cleanVal;
        if (isIntegerOnly) {
            cleanVal = e.target.value.replace(/[^0-9]/g, '');
        } else {
            // Decimal support rule for standard Distance value field
            cleanVal = e.target.value.replace(/[^0-9.]/g, '');
            const parts = cleanVal.split('.');
            if (parts.length > 2) {
                cleanVal = parts[0] + '.' + parts.slice(1).join('');
            }
        }

        if (cleanVal !== '') {
            let num = parseFloat(cleanVal);
            if (!isNaN(num) && num > max) num = max;
            e.target.value = cleanVal.endsWith('.') ? cleanVal : (isNaN(num) ? '' : cleanVal);
        } else {
            e.target.value = '';
        }
        updateCalculations();
    });

    input.addEventListener('blur', (e) => {
        if (input.hasAttribute('readonly')) return;
        let num = parseFloat(e.target.value);
        if (isNaN(num)) num = 0;
        e.target.value = formatValue(num, shouldPad);
        updateCalculations();
    });

    upBtn.addEventListener('click', () => {
        if (input.hasAttribute('readonly')) return;
        let current = parseFloat(input.value) || 0;
        let next = current + 1;
        if (next > max) next = 0;
        input.value = formatValue(next, shouldPad);
        updateCalculations();
    });

    downBtn.addEventListener('click', () => {
        if (input.hasAttribute('readonly')) return;
        let current = parseFloat(input.value) || 0;
        let next = current - 1;
        if (next < 0) next = max;
        input.value = formatValue(next, shouldPad);
        updateCalculations();
    });
});

// Event handlers for option selections
distUnit.addEventListener('change', () => {
    const unitType = distUnit.value;
    if (PRESETS[unitType]) {
        distVal.value = PRESETS[unitType];
    }
    updateCalculations();
});

radios.forEach(radio => radio.addEventListener('change', handleTargetChange));
pUnit.addEventListener('change', updateCalculations);

// Initialize initial layout routines
handleTargetChange();
