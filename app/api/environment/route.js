import { NextResponse } from 'next/server';

// Simple in-memory cache to prevent overloading Open-Meteo public API
// TTL: 30 minutes
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 mins in ms

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');

    // Default to Berlin center coordinates if missing
    const lat = latParam ? parseFloat(latParam) : 52.5200;
    const lon = lonParam ? parseFloat(lonParam) : 13.4050;

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Invalid latitude or longitude coordinates' }, { status: 400 });
    }

    // Round coordinates to 2 decimal places (~1.1km accuracy) for efficient cache keys
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
      console.log(`[Environment API] Serving cached results for: ${cacheKey}`);
      return NextResponse.json(cachedEntry.data);
    }

    const apiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ammonia,uv_index,uv_index_clear_sky,birch_pollen,grass_pollen,ragweed_pollen,olive_pollen&timezone=auto`;

    console.log(`[Environment API] Fetching fresh data from Open-Meteo: lat=${lat}, lon=${lon}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Parse current indices (using the first hour of forecast or current hour index)
    const currentHourIdx = new Date().getHours();
    
    const current = {
      pm2_5: data.hourly?.pm2_5?.[currentHourIdx] || 0,
      pm10: data.hourly?.pm10?.[currentHourIdx] || 0,
      carbon_monoxide: data.hourly?.carbon_monoxide?.[currentHourIdx] || 0,
      nitrogen_dioxide: data.hourly?.nitrogen_dioxide?.[currentHourIdx] || 0,
      sulphur_dioxide: data.hourly?.sulphur_dioxide?.[currentHourIdx] || 0,
      ammonia: data.hourly?.ammonia?.[currentHourIdx] || 0,
      uv_index: data.hourly?.uv_index?.[currentHourIdx] || 0,
      uv_index_clear_sky: data.hourly?.uv_index_clear_sky?.[currentHourIdx] || 0,
      birch_pollen: data.hourly?.birch_pollen?.[currentHourIdx] || 0,
      grass_pollen: data.hourly?.grass_pollen?.[currentHourIdx] || 0,
      ragweed_pollen: data.hourly?.ragweed_pollen?.[currentHourIdx] || 0,
      olive_pollen: data.hourly?.olive_pollen?.[currentHourIdx] || 0,
    };

    const payload = {
      latitude: lat,
      longitude: lon,
      timezone: data.timezone,
      current,
      hourly: {
        time: data.hourly?.time || [],
        pm2_5: data.hourly?.pm2_5 || [],
        pm10: data.hourly?.pm10 || [],
        uv_index: data.hourly?.uv_index || [],
        uv_index_clear_sky: data.hourly?.uv_index_clear_sky || [],
        birch_pollen: data.hourly?.birch_pollen || [],
        grass_pollen: data.hourly?.grass_pollen || []
      }
    };

    // Store in cache
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: payload
    });

    return NextResponse.json(payload);

  } catch (error) {
    console.error('[Environment API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
