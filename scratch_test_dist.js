const test = async () => {
  const coords1 = { lat: 28.6139, lon: 77.2090 }; // Delhi
  const coords2 = { lat: 26.4609, lon: 80.3218 }; // Kanpur

  // Test 1: router.projectosrm.org (No hyphen)
  try {
    const url1 = `https://router.projectosrm.org/route/v1/driving/${coords1.lon},${coords1.lat};${coords2.lon},${coords2.lat}?overview=false`;
    console.log("Testing router.projectosrm.org (no hyphen):", url1);
    const res1 = await fetch(url1);
    console.log("Res1 status:", res1.status);
    const data1 = await res1.json();
    console.log("Res1 distance:", data1.routes?.[0]?.distance / 1000, "km");
  } catch (e) {
    console.error("Test 1 failed:", e.message);
  }

  // Test 2: router.project-osrm.org (With hyphen)
  try {
    const url2 = `https://router.project-osrm.org/route/v1/driving/${coords1.lon},${coords1.lat};${coords2.lon},${coords2.lat}?overview=false`;
    console.log("Testing router.project-osrm.org (with hyphen):", url2);
    const res2 = await fetch(url2);
    console.log("Res2 status:", res2.status);
    const data2 = await res2.json();
    console.log("Res2 distance:", data2.routes?.[0]?.distance / 1000, "km");
  } catch (e) {
    console.error("Test 2 failed:", e.message);
  }
};
test();
