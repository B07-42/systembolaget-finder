const ARTICLE_ID = '1139232';

function proxyUrl(url) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

async function findArboga() {
  const status = document.getElementById('status');
  const results = document.getElementById('results');

  status.textContent = '📍 Hämtar din position...';
  results.innerHTML = '';

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const { latitude: lat, longitude: lng } = coords;
      status.textContent = '🔍 Söker butiker...';

      try {
        const storeRes = await fetch(
          proxyUrl(`https://api-extern.systembolaget.se/sb-api-ecommerce/v1/sitesearch/site/?lat=${lat}&lng=${lng}`)
        );
        const storesData = await storeRes.json();
        const stores = storesData.siteSearchResults || [];

        if (stores.length === 0) {
          status.textContent = '😔 Inga butiker hittades i närheten.';
          return;
        }

        status.textContent = `📦 Hittade ${stores.length} butiker, kontrollerar lager...`;

        const checks = await Promise.all(
          stores.slice(0, 20).map(async (store) => {
            try {
              const res = await fetch(
                proxyUrl(`https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search?articleNumberOrBarCode=${ARTICLE_ID}&selectedSite=${store.siteId}`)
              );
              const data = await res.json();

              return {
                name: store.alias,
                address: `${store.streetAddress}, ${store.postalCode} ${store.city}`,
                quantity: '?',
                shelf: '?',
                placement: '?',
                debug: JSON.stringify(data).slice(0, 400)
              };
            } catch (e) {
              return null;
            }
          })
        );

        const found = checks.filter(Boolean);

        if (found.length === 0) {
          status.textContent = '😔 Arboga hittades inte i lager i närheten.';
          return;
        }

        status.textContent = `✅ Hittade ${found.length} butiker:`;
        results.innerHTML = found.map(s => `
          <div class="store-card">
            <h3>${s.name}</h3>
            <p>📍 ${s.address}</p>
            <p>📦 Antal: <strong>${s.quantity}</strong></p>
            <p>🗂 Hylla: <strong>${s.shelf}</strong></p>
            <p>🔍 ${s.debug}</p>
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
