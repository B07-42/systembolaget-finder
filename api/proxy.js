export default async function handler(req, res) {
  const { url } = req.query;
  
  const response = await fetch(decodeURIComponent(url), {
    headers: {
      'Ocp-Apim-Subscription-Key': '8d39a7340ee7439f8b4c1e995c8f3e4a',
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
}
