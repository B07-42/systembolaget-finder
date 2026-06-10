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
          status.textContent = '😔 Inga butiker hittades. Data: ' + JSON.stringify(storesData).slice(0, 200);
          return;
        }

        // Show raw store object so we can see field names
        status.textContent = '🔍 ' + JSON.stringify(stores[0]).slice(0, 400);
        return;

      } catch (err) {
        status.textContent = '❌ Fel: ' + err.message;
        console.error(err);
      }
    },
    () => {
      status.textContent = '❌ Kunde inte hämta din position.';
    }
  );
}

window.addEventListener('load', findArboga);
