import React, { useEffect, useState } from 'react';

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
    </section>
  );
}


