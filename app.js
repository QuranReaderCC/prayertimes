let isReady = false;

let lat = null;
let lng = null;
let locationName = null;

async function initLocation() {
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            
            isReady = true;
        },
        (error) => {
            console.error("Error getting location:", error);

            lat = -37.8647;
            lng = 145.2844;

            isReady = true;
        }
    );
    
    locationName = await getLocationName(lat, lng);
}

initLocation();

async function getLocationName(lat, lng) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    const data = await res.json();

    const city =
        data.address.city ||
        data.address.town ||
        data.address.state;

    const country = data.address.country;

    return `${city}, ${country}`;
}

let cachedDate = null;
let currentPrayer = null;
let nextPrayer = null;

const prayers = {
    fajr: {},
    wusta: {},
    isha: {}
};

SunCalc.addTime(-16, 'fajr', null);
SunCalc.addTime(-4, null, 'isha');

function formatTime(d) {
    return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function to12Hour(time24) {
    let [hour, minute] = time24.split(":").map(Number);

    const ampm = hour >= 12 ? "pm" : "am";

    hour = hour % 12;
    hour = hour === 0 ? 12 : hour;

    return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(d) {
    return d.toLocaleDateString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatDateLong(dateStr) {
    const [day, month, year] = dateStr.split("/").map(Number);

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
    ];

    return `${day} ${months[month - 1]} ${year}`;
}

function getCurrentPrayer(d) {
    const current = d.getHours() * 60 + d.getMinutes();

    for (const key of ["fajr", "wusta", "isha"]) {
        const prayer = prayers[key];

        const start = toMinutes(prayer.start);
        const end = toMinutes(prayer.end);

        // normal + overnight handling
        if (end < start) {
            if (current >= start || current < end) {
                return key;
            }
        } else {
            if (current >= start && current < end) {
                return key;
            }
        }
    }

    return null;
}

function getNextPrayer(date) {
    const now = date.getHours() * 60 + date.getMinutes();

    const order = ["fajr", "wusta", "isha"];

    for (const key of order) {
        const prayer = prayers[key];
        if (!prayer) continue;

        const start = toMinutes(prayer.start);

        if (start > now) {
            return key; // next prayer today
        }
    }

    // if none left today → next is tomorrow's Fajr
    return "fajr";
}

function timeTillEnd(currentTime, prayer) {
    const now = toMinutes(currentTime);
    const end = toMinutes(prayers[prayer].end);

    let diff = end - now;

    // handle overnight (e.g. crosses midnight)
    if (diff < 0) diff += 24 * 60;

    return formatDuration(diff);
}

function timeTillStart(currentTime, prayer) {
    const now = toMinutes(currentTime);
    const start = toMinutes(prayers[prayer].start);

    let diff = start - now;

    // handle overnight (e.g. crosses midnight)
    if (diff < 0) diff += 24 * 60;

    return formatDuration(diff);
}

function formatDuration(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
}

function toMinutes(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

function capitaliseFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**-----**/
//const locationNameText = document.querySelector(".location-name");
//const clock = document.querySelector(".clock");
//const dateDisplay = document.querySelector(".date-display");

const currentPrayerName = document.querySelector(".current-prayer-name");
const startTimeInfo = document.querySelector(".time-left-state");
//const nextPrayerName = document.querySelector(".next-prayer-name");
//const endsIn = document.querySelector(".ends-in");
//const endsAt = document.querySelector(".end-at");

const fajrStart = document.getElementById("fajr-start");
//const fajrEnd = document.getElementById("fajr-end");
const wustaStart = document.getElementById("wusta-start");
//const wustaEnd = document.getElementById("wusta-end");
const ishaStart = document.getElementById("isha-start");
//const ishaEnd = document.getElementById("isha-end");
/**-----**/


window.setInterval(() => {
    if (!isReady) return;

    //locationNameText.textContent = locationName;

    const date = new Date();

    if (cachedDate === null || formatDate(cachedDate) !== formatDate(date)) {
        cachedDate = date;
        const times = SunCalc.getTimes(date, lat, lng);

        prayers.fajr = { start: formatTime(times.fajr), end: formatTime(times.sunrise) };
        prayers.wusta = { start: formatTime(times.solarNoon), end: formatTime(times.isha) };
        prayers.isha = { start: formatTime(times.isha), end: formatTime(times.nadir) };

        fajrStart.textContent = to12Hour(prayers.fajr.start);
        //fajrEnd.textContent = to12Hour(prayers.fajr.end);
        wustaStart.textContent = to12Hour(prayers.wusta.start);
        //wustaEnd.textContent = to12Hour(prayers.wusta.end);
        ishaStart.textContent = to12Hour(prayers.isha.start);
        //ishaEnd.textContent = to12Hour(prayers.isha.end);

        //dateDisplay.textContent = formatDateLong(formatDate(date));
    }

    if (currentPrayer === null || formatTime(cachedDate) !== formatTime(date)) {
        //clock.textContent = to12Hour(formatTime(date));

        const yieldedCurrentPrayer = getCurrentPrayer(date);
        const yieldedNextPrayer = getNextPrayer(date);

        if (yieldedCurrentPrayer) {
            currentPrayer = yieldedCurrentPrayer;
            currentPrayerName.textContent = capitaliseFirst(currentPrayer);
            startTimeInfo.textContent = to12Hour(prayers[currentPrayer].start);
            //nextPrayerName.textContent = "";
            //endsIn.textContent = `Ends in ${timeTillEnd(formatTime(date), currentPrayer)}`;
            //endsAt.innerHTML = `at <span>${to12Hour(prayers[currentPrayer].end)}</span>`;
        }
        else if (yieldedNextPrayer) {
            nextPrayer = yieldedNextPrayer;
            currentPrayerName.textContent = "";
            startTimeInfo.textContent = "";
            //nextPrayerName.textContent = capitaliseFirst(nextPrayer);
            //endsIn.textContent = `Starts in ${timeTillStart(formatTime(date), nextPrayer)}`;
            //endsAt.innerHTML = `at <span>${to12Hour(prayers[nextPrayer].start)}</span>`;
        }
    }
}, 1000);

function displayPage(id) {
    const currentPage = document.querySelector(".page.active");
    currentPage.classList.remove("active");
    const newPage = document.getElementById(`${id}-page`);
    newPage.classList.add("active");
}
