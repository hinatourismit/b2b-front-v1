import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_CLIENT_URL: z.string().url().default("http://localhost:3000"),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration. Copy .env.example to .env and fill it in.\n${parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n")}`,
  );
}

export const env = parsed.data;
