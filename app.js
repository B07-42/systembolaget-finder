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
          stores.slice(0, 15).map(async (store) => {
            try {
              const res = await fetch(
                proxyUrl(`https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search?articleNumberOrBarCode=${ARTICLE_ID}&storeId=${store.siteId}`)
              );
              const data = await res.json();
              const product = data?.products?.[0];
              if (!product) return null;

              return {
                name: store.alias,
                address: `${store.streetAddress}, ${store.postalCode} ${store.city}`,
                quantity: product.inventory?.inventoryLevel ?? '?',
                shelf: product.inventory?.shelf ?? '?',
                placement: product.inventory?.placement ?? '?',
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

        status.textContent = `✅ Hittade ${found.length} butiker med Arboga i lager:`;
        results.innerHTML = found.map(s => `
          <div class="store-card">
            <h3>${s.name}</h3>
            <p>📍 ${s.address}</p>
            <p>📦 Antal i lager: <strong>${s.quantity}</strong></p>
            <p>🗂 Hylla: <strong>${s.shelf}</strong> &nbsp;|&nbsp; Placering: <strong>${s.placement}</strong></p>
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
