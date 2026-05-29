import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.ts";
import { subscriptionRoutes } from "./routes/subscription.ts";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
});

app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (req, body, done) => {
    const url = req.url ?? "";
    if (url.startsWith("/subscription/webhook/")) {
      done(null, body);
      return;
    }
    try {
      done(null, body.length === 0 ? {} : JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

await app.register(cookie, { secret: process.env.COOKIE_SECRET ?? "dev-secret" });
await app.register(cors, {
  origin: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(","),
  credentials: true,
});
await app.register(rateLimit, {
  global: false,
  max: 100,
  timeWindow: "1 minute",
});

await app.register(authRoutes);
await app.register(subscriptionRoutes);

app.get("/health", async () => ({ ok: true, service: "saas-backend" }));

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
app.log.info(`SaaS backend listening on http://${host}:${port}`);
