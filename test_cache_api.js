const http = require("http");

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "localhost",
      port: 4000,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const start = Date.now();
    const req = http.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        const duration = Date.now() - start;
        try {
          resolve({
            statusCode: res.statusCode,
            data: responseBody ? JSON.parse(responseBody) : null,
            duration,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            rawData: responseBody,
            duration,
          });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing Backend Cache Middleware ===");

  try {
    // 1. Initial GET request (should be a Cache Miss)
    console.log("\n1. Sending first GET request to /api/item-group...");
    const res1 = await makeRequest("GET", "/api/item-group");
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Duration: ${res1.duration}ms`);
    console.log(`Groups found: ${res1.data?.data?.length ?? 0}`);

    // 2. Second GET request (should be a Cache Hit, taking close to 0-5ms)
    console.log("\n2. Sending second GET request (should be CACHE HIT)...");
    const res2 = await makeRequest("GET", "/api/item-group");
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Duration: ${res2.duration}ms`);
    if (res2.duration < res1.duration) {
      console.log(`✅ Success! Cache hit was faster: ${res2.duration}ms vs ${res1.duration}ms`);
    } else {
      console.log(`⚠️ Warning: Cache hit duration (${res2.duration}ms) not significantly faster than cache miss (${res1.duration}ms).`);
    }

    // 3. Create a unique new item group (should invalidate cache)
    const testGroupName = `Test Group ${Date.now()}`;
    console.log(`\n3. Sending POST request to create "${testGroupName}" (should INVALIDATE cache)...`);
    const postRes = await makeRequest("POST", "/api/item-group", { groupName: testGroupName });
    console.log(`Status: ${postRes.statusCode}`);
    console.log(`Created group code: ${postRes.data?.data?.GROUP_CODE}`);

    // 4. Third GET request (should be a Cache Miss due to invalidation, fetching latest data)
    console.log("\n4. Sending third GET request (should be CACHE MISS & fetch new group)...");
    const res3 = await makeRequest("GET", "/api/item-group");
    console.log(`Status: ${res3.statusCode}`);
    console.log(`Duration: ${res3.duration}ms`);
    const newlyCreated = res3.data?.data?.find(g => g.GROUP_NAME === testGroupName);
    if (newlyCreated) {
      console.log(`✅ Success! Newly created group was found in list: ${newlyCreated.GROUP_CODE}`);
    } else {
      console.log(`❌ Error: Newly created group was NOT found in list.`);
    }

    // 5. Fourth GET request (should be a Cache Hit again)
    console.log("\n5. Sending fourth GET request (should be CACHE HIT again)...");
    const res4 = await makeRequest("GET", "/api/item-group");
    console.log(`Status: ${res4.statusCode}`);
    console.log(`Duration: ${res4.duration}ms`);
    if (res4.duration < res3.duration) {
      console.log(`✅ Success! Cache hit was faster: ${res4.duration}ms vs ${res3.duration}ms`);
    }

    console.log("\n=== Cache Middleware Tests Complete ===");
  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

runTests();
