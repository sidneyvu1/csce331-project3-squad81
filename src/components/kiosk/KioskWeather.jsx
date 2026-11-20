import React, { useEffect, useState } from 'react';

function getWeatherKind(icon) {
  const code = (icon || '').slice(0, 2);
  const night = (icon || '').endsWith('n');
  if (code === '01') return night ? 'night' : 'sunny';
  if (code === '02') return night ? 'night-cloudy' : 'partly';
  if (code === '03' || code === '04') return 'cloudy';
  if (code === '09' || code === '10') return 'rain';
  if (code === '11') return 'storm';
  if (code === '13') return 'snow';
  if (code === '50') return 'mist';
  return 'cloudy';
}

const CLOUD = 'M20 46h26a10 10 0 0 0 1.6-19.9A14 14 0 0 0 20.5 24 11 11 0 0 0 20 46Z';

function WeatherIcon({ icon }) {
  const kind = getWeatherKind(icon);
  const sun = (cx, cy) => (
    <g className="wx-sun">
      <circle cx={cx} cy={cy} r="11" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1={cx} y1={cy - 17} x2={cx} y2={cy - 23}
          transform={`rotate(${angle} ${cx} ${cy})`}
        />
      ))}
    </g>
  );
  const moon = <path className="wx-moon" d="M44 12a18 18 0 1 0 12 30A15 15 0 0 1 44 12Z" />;

  return (
    <svg className="kiosk-weather-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {kind === 'sunny' && sun(32, 32)}
      {kind === 'night' && moon}
      {kind === 'partly' && <>{sun(24, 24)}<path className="wx-cloud" d={CLOUD} transform="translate(4 4)" /></>}
      {kind === 'night-cloudy' && <>{moon}<path className="wx-cloud" d={CLOUD} transform="translate(4 4)" /></>}
      {['cloudy', 'rain', 'storm', 'snow', 'mist'].includes(kind) && (
        <path className="wx-cloud" d={CLOUD} transform={kind === 'cloudy' ? 'translate(0 4)' : 'translate(0 -4)'} />
      )}
      {kind === 'rain' && (
        <g className="wx-rain">
          <line x1="24" y1="46" x2="21" y2="54" /><line x1="34" y1="46" x2="31" y2="54" /><line x1="44" y1="46" x2="41" y2="54" />
        </g>
      )}
      {kind === 'storm' && <path className="wx-bolt" d="M35 40 28 52h6l-3 10 10-14h-6l3-8Z" />}
      {kind === 'snow' && (
        <g className="wx-snow">
          <circle cx="24" cy="50" r="2" /><circle cx="34" cy="54" r="2" /><circle cx="44" cy="50" r="2" />
        </g>
      )}
      {kind === 'mist' && (
        <g className="wx-mist">
          <line x1="16" y1="46" x2="48" y2="46" /><line x1="22" y1="54" x2="54" y2="54" />
        </g>
      )}
    </svg>
  );
}

export default function KioskWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        const response = await fetch(`/api/weather`);

        const contentType = response.headers.get('content-type');

        if (!contentType?.includes('application/json')) {
          throw new Error('Invalid response from weather service.');
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'Unable to load weather.'
          );
        }

        if (active){
            setWeather(data.weather);
            setError('');
        }
        
      } catch (failure) {
          setError(failure.message || 'Unable to load weather.');
      } finally { setLoading(false); }
    }

    loadWeather();

  }, []);

  if (loading) {
    return <p role="status">Loading weather…</p>;
  }

  if (error) {
    return (
      <p className="menu-error" role="alert">
        {error}
      </p>
    );
  }

  if (!weather) {
    return <p>Weather is unavailable.</p>;
  }

  return (
   <section className="kiosk-weather" aria-labelledby="kiosk-weather-title">
      <WeatherIcon icon={weather.icon} />
      <div className="kiosk-weather-body">
        <h2 id="kiosk-weather-title">Weather Today in College Station</h2>

        <p className="kiosk-weather-temperature">
          <strong>
            {Math.round(Number(weather.temperature))}°F
          </strong>
          <span> {weather.description}</span>
        </p>

        <div className="kiosk-weather-details">
          <span>
            Feels like{' '}
            {Math.round(Number(weather.feels_like))}°F
          </span>

          <span>Humidity: {weather.humidity}%</span>
        </div>
      </div>
    </section>
  );
}


