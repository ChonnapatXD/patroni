import { Elysia } from "elysia";
import { Pool } from "pg";
import Redis from "ioredis";

const pool = new Pool ({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});



const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error", err);
});



const app = new Elysia();

app.get("/", () => {
    return { 
        status: "ok",
        message: "Backend is running RN ON FIREEEE🔥"
    };
});


app.get("/health/db", async () => {
    try {
        const result = await pool.query("SELECT 1");
        return { db: "connected", result: result.rows }; 
    } catch (err: any) {
        return { ab: "error", message: err.message };
    }
});


app.get("/brands", async () => {
  const cacheKey = "brands:active";

  // 1️⃣ Redis first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log("🟢 Redis HIT /brands");
    return JSON.parse(cached);
  }

  console.log("🟡 Redis MISS /brands → DB");

  // 2️⃣ Query DB
  const { rows } = await pool.query(
    "SELECT * FROM brand WHERE isactive = true"
  );

  // 3️⃣ Save to Redis (TTL 60s)
  await redis.set(cacheKey, JSON.stringify(rows), "EX", 60);

  return rows;
});


app.get("/sku", async () => {
  const cacheKey = "sku:list";

  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log("🟢 Redis HIT /sku");
    return JSON.parse(cached);
  }

  console.log("🟡 Redis MISS /sku → DB");

  const { rows } = await pool.query(
    "SELECT skuid, productname, price FROM sku"
  );

  await redis.set(cacheKey, JSON.stringify(rows), "EX", 60);

  return rows;
});


app.listen(3000);

console.log("Server is running at http://localhost:3000 OMG!");