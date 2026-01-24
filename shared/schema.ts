import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export chat models from integration if needed, but for now we focus on pins
// export * from "./models/chat"; 

export const pins = pgTable("pins", {
  id: serial("id").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  type: text("type").notNull(), // 'pollution', 'animal', 'trail', 'other'
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPinSchema = createInsertSchema(pins).omit({ id: true, createdAt: true });

export type Pin = typeof pins.$inferSelect;
export type InsertPin = z.infer<typeof insertPinSchema>;

// Score detail schema for expandable rating information
export const scoreDetailSchema = z.object({
  value: z.number(),
  factors: z.array(z.string()),
  tips: z.array(z.string()).optional(),
});

export const analysisResponseSchema = z.object({
  location: z.string(),
  summary: z.string(),
  scores: z.object({
    airQuality: z.number(),
    waterQuality: z.number(),
    walkability: z.number(),
    greenSpace: z.number(),
    pollution: z.number(),
  }),
  scoreDetails: z.object({
    airQuality: scoreDetailSchema,
    waterQuality: scoreDetailSchema,
    walkability: scoreDetailSchema,
    greenSpace: scoreDetailSchema,
    pollution: scoreDetailSchema,
  }).optional(),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
