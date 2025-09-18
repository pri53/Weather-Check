const statusEl = document.getElementById('status');
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const useLocationBtn = document.getElementById('use-location');

const placeEl = document.getElementById('place');
const summaryEl = document.getElementById('summary');
const dateEl = document.getElementById('datetime');
const tempEl = document.getElementById('temp');
const feelsEl = document.getElementById('feels');
const windEl = document.getElementById('wind');
const humidityEl = document.getElementById('humidity');
const iconEl = document.getElementById('icon');
const forecastEl = document.getElementById('forecast');

function setStatus(text){
  statusEl.textContent = text || '';
}

function codeToIcon(code){
  // Open-Meteo weather codes
  if([0].includes(code)) return '☀️';
  if([1,2].includes(code)) return '🌤️';
  if([3].includes(code)) return '☁️';
  if([45,48].includes(code)) return '🌫️';
  if([51,53,55,56,57].includes(code)) return '🌦️';
  if([61,63,65].includes(code)) return '🌧️';
  if([66,67].includes(code)) return '🌧️';
  if([71,73,75,77,85,86].includes(code)) return '🌨️';
  if([80,81,82].includes(code)) return '🌧️';
  if([95,96,99].includes(code)) return '⛈️';
  return '☁️';
}

function codeToBgClass(code){
  if([0].includes(code)) return 'bg-clear';
  if([1,2].includes(code)) return 'bg-partly';
  if([3].includes(code)) return 'bg-cloudy';
  if([45,48].includes(code)) return 'bg-fog';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'bg-rain';
  if([71,73,75,77,85,86].includes(code)) return 'bg-snow';
  if([95,96,99].includes(code)) return 'bg-thunder';
  return '';
}

function formatDay(iso){
  const date = new Date(iso);
  return date.toLocaleDateString(undefined,{ weekday:'short'});
}

function formatNowWithTimezone(timezone){
  const now = new Date();
  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: '2-digit', year: 'numeric', timeZone: timezone
  });
  return fmt.format(now);
}

async function geocode(query){
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const res = await fetch(url);
  if(!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if(!data.results || data.results.length === 0) throw new Error('No results');
  const r = data.results[0];
  return { lat:r.latitude, lon:r.longitude, name:`${r.name}${r.country ? ', ' + r.country : ''}` };
}

async function reverseGeocode(lat, lon){
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const res = await fetch(url);
  if(!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  if(!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return `${r.name || r.admin1 || 'Location'}${r.country ? ', ' + r.country : ''}`;
}

async function fetchWeather(lat, lon){
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function renderCurrent(place, current, timezone){
  placeEl.textContent = place;
  if(timezone){
    dateEl.textContent = formatNowWithTimezone(timezone);
  }
  tempEl.textContent = `${Math.round(current.temperature_2m)}°`;
  feelsEl.textContent = `Feels like ${Math.round(current.apparent_temperature)}°`;
  windEl.textContent = `Wind: ${Math.round(current.wind_speed_10m)} km/h`;
  humidityEl.textContent = `Humidity: ${Math.round(current.relative_humidity_2m)}%`;
  iconEl.textContent = codeToIcon(current.weather_code);
  // update background class
  const classes = ['bg-clear','bg-partly','bg-cloudy','bg-rain','bg-snow','bg-fog','bg-thunder'];
  document.body.classList.remove(...classes);
  const bg = codeToBgClass(current.weather_code);
  if(bg) document.body.classList.add(bg);
  const summaryMap = {
    0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Heavy showers',82:'Violent showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm hail',99:'Thunderstorm heavy hail'
  };
  summaryEl.textContent = summaryMap[current.weather_code] || 'Weather';
}

function renderForecast(daily){
  forecastEl.innerHTML = '';
  const days = daily.time.map((dateStr, i) => ({
    day: formatDay(dateStr),
    code: daily.weather_code[i],
    tmax: Math.round(daily.temperature_2m_max[i]),
    tmin: Math.round(daily.temperature_2m_min[i])
  })).slice(0, 7);
  for(const d of days){
    const div = document.createElement('div');
    div.className = 'day';
    div.innerHTML = `<div><strong>${d.day}</strong><br><small>${d.tmin}° / ${d.tmax}°</small></div><div class="icon">${codeToIcon(d.code)}</div>`;
    forecastEl.appendChild(div);
  }
}

async function loadByQuery(query){
  try{
    setStatus('Searching…');
    const {lat, lon, name} = await geocode(query);
    setStatus('Loading weather…');
    const data = await fetchWeather(lat, lon);
    renderCurrent(name, data.current, data.timezone);
    renderForecast(data.daily);
    setStatus('');
  }catch(err){
    setStatus(err.message || 'Something went wrong');
  }
}

async function loadByLocation(){
  if(!navigator.geolocation){
    setStatus('Geolocation not supported.');
    return;
  }
  setStatus('Getting your location…');
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    try{
      const {latitude, longitude} = pos.coords;
      setStatus('Loading weather…');
      const [data, placeName] = await Promise.all([
        fetchWeather(latitude, longitude),
        reverseGeocode(latitude, longitude).catch(()=>null)
      ]);
      const place = placeName || 'Your location';
      renderCurrent(place, data.current, data.timezone);
      renderForecast(data.daily);
      setStatus('');
    }catch(err){
      setStatus(err.message || 'Failed to load weather');
    }
  }, (err)=>{
    setStatus(err.message || 'Failed to get location');
  });
}

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const q = input.value.trim();
  if(q) loadByQuery(q);
});
useLocationBtn.addEventListener('click', ()=>{
  loadByLocation();
});

// Load default city on first run
loadByQuery('New York');


