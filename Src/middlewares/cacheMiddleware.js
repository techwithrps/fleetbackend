const jwt = require("jsonwebtoken");

// Simple in-memory cache store
const cacheStore = new Map();

/**
 * Get a unique cache key based on route path, sorted query parameters (ignoring cache-busters),
 * and the user's active terminal ID.
 */
function getCacheKey(req) {
  let terminalId = "";
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token);
      if (decoded && decoded.terminalId) {
        terminalId = decoded.terminalId;
      }
    }
  } catch (err) {
    // Silently ignore decode errors
  }

  // Construct path without trailing slash
  const pathName = (req.baseUrl + req.path).replace(/\/$/, "");

  // Build query string excluding cache-busting "_" parameter
  const queryObj = { ...req.query };
  delete queryObj._;

  // Sort keys to ensure order-insensitivity
  const sortedKeys = Object.keys(queryObj).sort();
  const queryParts = sortedKeys.map((key) => `${key}=${queryObj[key]}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

  return `${pathName}${queryString}:${terminalId}`;
}

/**
 * Map request URL paths to a specific cache tag for targeted invalidation.
 */
function getCacheTag(urlPath) {
  const path = urlPath.split("?")[0].toLowerCase();
  
  if (path.includes("/item-group")) return "item-group";
  if (path.includes("/items")) return "items";
  if (path.includes("/vendors")) return "vendors";
  if (path.includes("/drivers")) return "drivers";
  if (path.includes("/locations")) return "locations";
  if (path.includes("/vehicles")) return "vehicles";
  if (path.includes("/equipment")) return "equipment";
  if (path.includes("/tires")) return "tires";
  if (path.includes("/beds")) return "beds";
  if (path.includes("/inventory-report")) return "inventory";
  if (path.includes("/company")) return "company";
  if (path.includes("/transporterlist")) return "transporterlist";
  if (path.includes("/services")) return "services";
  if (path.includes("/transporter")) return "transporter";
  
  return null;
}

/**
 * Middleware to cache successful GET request JSON payloads in-memory.
 * @param {number} ttlSeconds Time to live in seconds (default: 5 minutes)
 */
const cacheMiddleware = (ttlSeconds = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const tag = getCacheTag(req.originalUrl || req.url);
    if (!tag) {
      return next();
    }

    const key = getCacheKey(req);
    const cached = cacheStore.get(key);

    if (cached && cached.expiry > Date.now()) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Cache Hit] Key: ${key} | Tag: ${tag}`);
      }
      return res.status(200).json(cached.data);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Cache Miss] Key: ${key} | Tag: ${tag}`);
    }

    // Override res.json to capture output payload
    const originalJson = res.json;
    res.json = function (body) {
      // Only cache successful JSON responses with success: true
      if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success) {
        const expiry = Date.now() + ttlSeconds * 1000;
        cacheStore.set(key, {
          data: body,
          expiry,
          tag,
        });
      }
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to invalidate cached keys based on modified tags when a POST/PUT/DELETE succeeds.
 */
const invalidateCache = (tagsToInvalidate = []) => {
  return (req, res, next) => {
    // Listen for the finish event to run invalidation only after successful DB operations
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
          let tags = [...tagsToInvalidate];
          if (tags.length === 0) {
            const tag = getCacheTag(req.originalUrl || req.url);
            if (tag) tags = [tag];
          }

          // Invalidate inventory report if items change
          if (tags.includes("items") && !tags.includes("inventory")) {
            tags.push("inventory");
          }

          if (tags.length > 0) {
            let invalidatedCount = 0;
            for (const [key, val] of cacheStore.entries()) {
              if (tags.includes(val.tag)) {
                cacheStore.delete(key);
                invalidatedCount++;
              }
            }
            if (invalidatedCount > 0 && process.env.NODE_ENV !== "production") {
              console.log(`[Cache Invalidation] Invalidated ${invalidatedCount} keys for tags: [${tags.join(", ")}]`);
            }
          }
        }
      }
    });

    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cacheStore,
};
