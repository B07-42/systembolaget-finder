const API_KEY = 'cfc702aed3094c86b92d6d4ff7a54c84';

document.getElementById('search-btn').addEventListener('click', () => {
  const articleId = document.getElementById('article-id').value.trim();
  const status = document.getElementById('status');
  const results = document.getElementById('results');

  if (!articleId) {
    status.textContent = 'Ange ett artikelnummer.';
    return;
  }

  status.textContent = '📍 Hämtar din position...';
  results.innerHTML = '';

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const { latitude: lat, longitude: lng } = coords;
      status.textContent = '🔍 Söker butiker...';

      try {
        // Get nearby stores
        const storeRes = await fetch(
          `https://api-extern.systembolaget.se/site/v1/site?lat=${lat}&lng=${lng}`,
          { headers: { 'Ocp-Apim-Subscription-Key': API_KEY } }
        );
        const stores = await storeRes.json();

        status.textContent = '📦 Kontrollerar lagerstatus...';

        // Check stock in each store
        const checks = await Promise.all(
          stores.slice(0, 15).map(async (store) => {
            const res = await fetch(
              `https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search?articleNumberOrBarCode=${articleId}&storeId=${store.siteId}`,
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
              row: product.inventory?.placement ?? '?',
            };
          })
        );

        const found = checks
          .filter(Boolean)
          .sort((a, b) => a.distance - b.distance);

        if (found.length === 0) {
          status.textContent = 'Artikeln hittades inte i lager i närheten.';
          return;
        }

        status.textContent = `✅ Hittade ${found.length} butiker med artikeln i lager:`;
        results.innerHTML = found.map(s => `
          <div class="store-card">
            <h3>${s.name}</h3>
            <p>📍 ${s.address} — <strong>${s.distance.toFixed(1)} km</strong></p>
            <p>📦 Antal i lager: <strong>${s.quantity}</strong></p>
            <p>🗂 Hylla: <strong>${s.shelf}</strong> &nbsp;|&nbsp; Placering: <strong>${s.row}</strong></p>
          </div>
        `).join('');

      } catch (err) {
        status.textContent = '❌ Något gick fel. Kontrollera artikelnumret och försök igen.';
        console.error(err);
      }
    },
    () => {
      status.textContent = '❌ Kunde inte hämta din position. Tillåt platsåtkomst i webbläsaren.';
    }
  );
});