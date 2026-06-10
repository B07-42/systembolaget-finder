const API_KEY = '8d39a7340ee7439f8b4c1e995c8f3e4a';
const ARTICLE_ID = '1139232';

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
        // Get nearby stores
        const storeRes = await fetch(
          `https://api-extern.systembolaget.se/sb-api-ecommerce/v1/sitesearch/site/?lat=${lat}&lng=${lng}`,
          { headers: { 'Ocp-Apim-Subscription-Key': API_KEY } }
        );
        const stores = await storeRes.json();

        status.textContent = '📦 Kontrollerar lagerstatus...';

        // Check stock in each store
        const checks = await Promise.all(
          stores.slice(0, 15).map(async (store) => {
            const res = await fetch(
              `https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search?articleNumberOrBarCode=${ARTICLE_ID}&storeId=${store.siteId}`,
              { headers: { 'Ocp-Apim-Subscription-Key': API_KEY } }
            );
            const data = await res.json();
            const product = data?.products?.[0];
            if (!product) return null;

            return {
              name: store.name,
              address: `${store.address}, ${store.city}`,
              distance: store.distance,
              quantity: product.inventory?.inventoryLevel ?? '?',
              shelf: product.inventory?.shelf ?? '?',
              placement: product.inventory?.placement ?? '?',
            };
          })
        );

        const found = checks
          .filter(Boolean)
          .sort((a, b) => a.distance - b.distance);

        if (found.length === 0) {
          status.textContent = '😔 Arboga hittades inte i lager i närheten.';
          return;
        }

        status.textContent = `✅ Hittade ${found.length} butiker med Arboga i lager:`;
        results.innerHTML = found.map(s => `
          <div class="store-card">
            <h3>${s.name}</h3>
            <p>📍 ${s.address} — <strong>${s.distance.toFixed(1)} km</strong></p>
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

// Run automatically when page loads
window.addEventListener('load', findArboga);
