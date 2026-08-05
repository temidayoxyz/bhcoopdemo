import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import { apiRouter } from "./src/server/api";
import { initDb } from "./src/db/initDb";

async function startServer() {
  await initDb();
  const app = express();
  const PORT = Number(process.env.PORT) || 3010;
  
  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(cookieParser());

  // Health check route required by infrastructure
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // The express version here is 4.x (4.21.2) based on package.json, so app.get('*') works.
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
