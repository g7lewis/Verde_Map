import { db } from "./db";
import { pins, emailSubscribers, type InsertPin, type Pin, type InsertEmailSubscriber, type EmailSubscriber } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getPins(): Promise<Pin[]>;
  createPin(pin: InsertPin): Promise<Pin>;
  createEmailSubscriber(subscriber: InsertEmailSubscriber): Promise<EmailSubscriber>;
  getEmailSubscriberByEmail(email: string): Promise<EmailSubscriber | null>;
}

export class DatabaseStorage implements IStorage {
  async getPins(): Promise<Pin[]> {
    return await db.select().from(pins);
  }

  async createPin(insertPin: InsertPin): Promise<Pin> {
    const [pin] = await db.insert(pins).values(insertPin).returning();
    return pin;
  }

  async createEmailSubscriber(subscriber: InsertEmailSubscriber): Promise<EmailSubscriber> {
    const [sub] = await db.insert(emailSubscribers).values(subscriber).returning();
    return sub;
  }

  async getEmailSubscriberByEmail(email: string): Promise<EmailSubscriber | null> {
    const results = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email));
    return results[0] || null;
  }
}

export const storage = new DatabaseStorage();
