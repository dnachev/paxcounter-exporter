const state = {
    availableDays: [],
    currentDate: null,
    data: [],
    chart: null
};

async function init() {
    console.log("Initializing dashboard...");
    
    if (typeof luxon === 'undefined') {
        console.error("Luxon library not loaded!");
        return;
    }
    const { DateTime } = luxon;
    
    if (typeof frappe === 'undefined') {
        console.error("Frappe Charts library not loaded!");
    }
    
    // Fetch available days
    try {
        const res = await fetch(`./data/days.json?t=${Date.now()}`);
        if (res.ok) {
            state.availableDays = await res.json();
        } else {
            console.warn("Could not fetch days.json");
        }
    } catch (e) {
        console.error(e);
    }

    const datePicker = document.getElementById('date-picker');
    
    if (state.availableDays.length > 0) {
        state.currentDate = state.availableDays[0];
        state.availableDays.forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            datePicker.appendChild(option);
        });
        datePicker.value = state.currentDate;
    } else {
        // Fallback if no days are listed
        const today = DateTime.now().toISODate();
        state.currentDate = today;
        const option = document.createElement('option');
        option.value = today;
        option.textContent = today;
        datePicker.appendChild(option);
    }

    // Event Listeners
    datePicker.addEventListener('change', (e) => {
        state.currentDate = e.target.value;
        fetchData();
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
        fetchData();
    });

    await fetchData();
}

async function fetchData() {
    if (!state.currentDate) return;
    const { DateTime } = luxon;
    
    console.log(`Fetching data for ${state.currentDate}...`);
    try {
        const url = `./data/device_counts_${state.currentDate}.json?t=${Date.now()}`;
        const response = await fetch(url);
        if (response.ok) {
            state.data = await response.json();
            console.log(`Successfully fetched ${state.data.length} records.`);
        } else {
            console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
            state.data = [];
        }
        updateDashboard();
    } catch (err) {
        console.error('Error fetching data:', err);
        state.data = [];
        updateDashboard();
    }
}

function updateDashboard() {
    const { DateTime } = luxon;
    const dailyData = state.data;
    console.log("Updating dashboard with raw data:", dailyData);

    // Update Last Updated from data
    if (dailyData.length > 0) {
        const lastEntry = dailyData[dailyData.length - 1];
        const lastTs = DateTime.fromISO(lastEntry.timestamp).toFormat('HH:mm');
        document.getElementById('last-updated').textContent = `Последно измерване: ${lastTs}`;
    } else {
        document.getElementById('last-updated').textContent = `Няма данни за избрания ден`;
    }
    
    // Filter data between 07:30 and 20:00
    const filteredData = dailyData.filter(entry => {
        const dt = DateTime.fromISO(entry.timestamp);
        const minutes = dt.hour * 60 + dt.minute;
        return minutes >= (7 * 60 + 30) && minutes <= (20 * 60);
    });
    
    // Update Totals (Only PAX for filtered data)
    const totals = filteredData.reduce((acc, curr) => ({
        pax: acc.pax + (parseInt(curr.pax) || 0)
    }), { pax: 0 });

    console.log("Calculated totals (07:30 - 20:00):", totals);
    document.getElementById('stat-pax').textContent = totals.pax;

    renderChart(filteredData);
}

function renderChart(data) {
    const { DateTime } = luxon;
    // Pre-fill 15-minute buckets from 07:30 to 20:00
    const buckets = {};
    for (let m = 7 * 60 + 30; m <= 20 * 60; m += 15) {
        const hour = Math.floor(m / 60).toString().padStart(2, '0');
        const min = (m % 60).toString().padStart(2, '0');
        buckets[`${hour}:${min}`] = { paxValues: [] };
    }
    
    data.forEach(entry => {
        const dt = DateTime.fromISO(entry.timestamp);
        const minute = Math.floor(dt.minute / 15) * 15;
        const bucketKey = dt.set({ minute, second: 0, millisecond: 0 }).toFormat('HH:mm');
        
        if (buckets.hasOwnProperty(bucketKey)) {
            buckets[bucketKey].paxValues.push(entry.pax || 0);
        }
    });

    const labels = Object.keys(buckets).sort();
    const paxData = labels.map(l => {
        const vals = buckets[l].paxValues;
        if (vals.length === 0) return 0;
        const sum = vals.reduce((a, b) => a + b, 0);
        return Math.round(sum / vals.length);
    });

    const chartData = {
        labels: labels,
        datasets: [
            { name: "Хора", type: "bar", values: paxData }
        ]
    };

    if (!state.chart) {
        state.chart = new frappe.Chart("#chart", {
            title: "Брой хора (15-мин интервали)",
            data: chartData,
            type: 'bar',
            height: 450,
            colors: ['#3498db']
        });
    } else {
        state.chart.update(chartData);
    }
}

init();
