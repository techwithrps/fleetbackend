const https = require("https");

const getHttps = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

const LOCATION_MAPPING = {
  "gdl": "Garhi Harsaru, Gurugram, Haryana, India",
  "tkd": "ICD Tughlakabad, Delhi, India",
  "actl": "ACTL Faridabad, Sector 59, Faridabad, Haryana, India",
  "hindpalwal": "Hind Terminals, Palwal, Haryana, India",
  "khatuas": "Khatuawas, Neemrana, Rajasthan, India",
  "pyala": "Pyala, Faridabad, Haryana, India",
  "patli": "Patli, Gurugram, Haryana, India",
  "bawal": "Bawal, Haryana, India",
  "rewari": "Rewari, Haryana, India",
  "dadri": "ICD Dadri, Uttar Pradesh, India",
  "loni": "ICD Loni, Ghaziabad, Uttar Pradesh, India",
  "bombay": "Mumbai, Maharashtra, India",
  "panthnagar": "Pantnagar, Uttarakhand, India",
  "kashipur": "Kashipur, Uttarakhand, India",
  "moradabad": "Moradabad, Uttar Pradesh, India",
  "modinagar": "Modinagar, Uttar Pradesh, India",
  "jaipur": "Jaipur, Rajasthan, India",
  "jodhpur": "Jodhpur, Rajasthan, India",
  "mundra": "Mundra Port, Gujarat, India",
  "pali": "Pali, Rajasthan, India"
};

async function run() {
  for (const [key, q] of Object.entries(LOCATION_MAPPING)) {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
      const res = await getHttps(url);
      if (res && res.features && res.features.length > 0) {
        const feat = res.features[0];
        console.log(`✅ "${key}" -> "${q}" -> ${feat.geometry.coordinates[1]}, ${feat.geometry.coordinates[0]} (${feat.properties.name || feat.properties.city})`);
      } else {
        console.log(`❌ "${key}" -> "${q}" -> no results`);
      }
    } catch (e) {
      console.log(`⚠️ "${key}" -> Error: ${e.message}`);
    }
  }
}

run();
