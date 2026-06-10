const PRODUCT_ID = '61248715';
const API_KEY = '8d39a7340ee7439f8b4c1e995c8f3e4a';

function proxyUrl(url) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function findArboga() {
  const status = document.getElementById('status');
  const results = document.getElementById('results');

  status.textContent = '📍 Hämtar din position...';
  results.innerHTML = '';

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const { latitude: lat, longitude: lng } = coords;
      status.textContent = '🔍 Hämtar butiker...';

      try {
        // Get all stores
        const storeRes = await fetch(
          proxyUrl(`https://api-extern.systembolaget.se/sb-api-ecommerce/v1/sitesearch/site/?lat=${lat}&lng=${lng}`),
        );
        const storesData = await storeRes.json();
        const stores = storesData.siteSearchResults || [];

        if (stores.length === 0) {
          status.textContent = '😔 Inga butiker hittades.';
          return;
        }

        status.textContent = `📦 Kontrollerar lager i ${stores.length} butiker...`;

        // Check stock in each store
        const checks = await Promise.all(
          stores.slice(0, 50).map(async (store) => {
            try {
              const res = await fetch(
                proxyUrl(`https://api-extern.systembolaget.se/sb-api-ecommerce/v1/stockbalance/store/${store.siteId}/${PRODUCT_ID}/`)
              );
              const data = await res.json();

              if (!data.stock || data.stock <= 0) return null;

              // Get full store info for address and coordinates
              const storeRes = await fetch(
                proxyUrl(`https://api-extern.systembolaget.se/sb-api-ecommerce/v1/site/store/${store.siteId}`)
              );
              const storeData = await storeRes.json();

              const distance = storeData.position
                ? calcDistance(lat, lng, storeData.position.latitude, storeData.position.longitude)
                : null;

              return {
                name: storeData.alias,
                address: `${storeData.address}, ${storeData.postalCode} ${storeData.city}`,
                distance,
                stock: data.stock,
                shelf: data.shelf,
              };
            } catch (e) {
              return null;
            }
          })
        );

        const found = checks
          .filter(Boolean)
          .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

        if (found.length === 0) {
          status.textContent = '😔 Arboga hittades inte i lager i närheten.';
          return;
        }

        status.textContent = `✅ Hittade ${found.length} butiker med Arboga i lager:`;
        results.innerHTML = found.map(s => `
          <div class="store-card">
            <h3>${s.name}</h3>
            <p>📍 ${s.address}${s.distance ? ` — <strong>${s.distance.toFixed(1)} km</strong>` : ''}</p>
            <p>📦 Antal i lager: <strong>${s.stock} st</strong></p>
            <p>🗂 Hylla: <strong>${s.shelf}</strong></p>
          </div>
        `).join('');

      } catch (err) {
        status.textContent = '❌ Fel: ' + err.message;
        console.error(err);
      }
    },
    () => {
      status.textContent = '❌ Kunde inte hämta din position. Tillåt platsåtkomst i webbläsaren.';
    }
  );
}

window.addEventListener('load', findArboga);
