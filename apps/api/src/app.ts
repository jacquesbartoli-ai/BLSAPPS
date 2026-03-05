import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { enforceHttps, errorHandler, notFoundHandler } from "./middleware/security.js";
import { publicRouter } from "./routes/public.routes.js";
import { protectedRouter } from "./routes/protected.routes.js";

export function createApp() {
  const app = express();
  const secretBasePath = `/${env.APP_SECRET_PATH}`;

  app.set("trust proxy", 1);
  app.use(enforceHttps);
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(
    cors({
      origin: env.APP_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(secretBasePath, publicRouter);
  app.use(`${secretBasePath}/api`, requireAuth, protectedRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
