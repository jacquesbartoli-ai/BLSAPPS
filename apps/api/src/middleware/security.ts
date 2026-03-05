import type { NextFunction, Request, Response } from "express";

export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isSecure = req.secure || forwardedProto === "https";

  if (process.env.NODE_ENV === "production" && !isSecure) {
    return res.status(426).json({
      message: "HTTPS requis."
    });
  }

  return next();
}

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({ message: "Ressource introuvable." });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  return res.status(500).json({ message: "Erreur serveur inattendue." });
}
