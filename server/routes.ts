import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { queryNearbyEpaFacilities } from "./epaQuery";

// Initialize OpenAI with Replit AI Integrations env vars
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy-key",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Pins API
  app.get(api.pins.list.path, async (req, res) => {
    const pins = await storage.getPins();
    res.json(pins);
  });

  app.post(api.pins.create.path, async (req, res) => {
    try {
      const input = api.pins.create.input.parse(req.body);
      const pin = await storage.createPin(input);
      res.status(201).json(pin);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Analysis API
  app.post(api.analysis.analyze.path, async (req, res) => {
    try {
      const { lat, lng } = api.analysis.analyze.input.parse(req.body);

      // Query real EPA facility data for this location
      const epaData = await queryNearbyEpaFacilities(lat, lng, 10);
      console.log(`EPA query for (${lat}, ${lng}): ${epaData.totalFacilities} facilities found`);
      
      // Build context about nearby facilities
      let facilityContext = "";
      if (epaData.totalFacilities > 0) {
        facilityContext = `
REAL EPA DATA (within 10 miles):
- Total regulated facilities: ${epaData.totalFacilities}
- Major emitters: ${epaData.majorFacilities}
- Facilities with violations: ${epaData.facilitiesWithViolations}
- Industry breakdown: ${Object.entries(epaData.industryBreakdown).map(([k, v]) => `${k}: ${v}`).join(", ")}
- Nearest facilities: ${epaData.nearbyFacilities.slice(0, 5).map(f => `${f.name} (${f.type}, ${f.distance.toFixed(1)} mi${f.hasViolation ? ", HAS VIOLATIONS" : ""})`).join("; ")}

Use this real data to inform your pollution and air quality scores. More facilities, major emitters, and violations should lower scores.`;
      } else {
        facilityContext = `
EPA DATA: No regulated industrial facilities found within 10 miles. This is a positive indicator for pollution/air quality scores.`;
      }
      
      const prompt = `
Analyze the environmental quality for the location at Latitude: ${lat}, Longitude: ${lng}.
If you don't know the exact specific street location, estimate based on the general area (city/region).
${facilityContext}

Provide a JSON response with the following fields:
- location: A readable name for the location (e.g., "Central Park, NY")
- summary: A 2-3 sentence summary of the environmental vibe. If EPA facilities were found, mention the industrial context.
- scores: An object with numeric scores (0-100) for:
  - airQuality (100 is best) - factor in nearby major emitters
  - waterQuality (100 is best)
  - walkability (100 is best)
  - greenSpace (100 is best)
  - pollution (100 is cleanest/least pollution) - directly affected by EPA facility count and violations
- scoreDetails: An object with detailed breakdown for each score category. Each has:
  - value: the score (same as in scores)
  - factors: array of 2-4 brief reasons affecting this score (e.g., "Heavy industrial activity within 5 miles", "Multiple EPA facilities with violations")
  - tips: array of 1-2 suggestions for improvement or things to be aware of
  
Example scoreDetails entry:
"airQuality": {
  "value": 45,
  "factors": ["73 major emitters within 10 miles", "Petrochemical industry presence", "Highway traffic corridor"],
  "tips": ["Check daily AQI before outdoor activities", "Consider indoor air filtration"]
}

Return ONLY valid JSON.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: "You are an environmental data analyst. Use the provided EPA data to generate accurate, data-driven scores. Return JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from AI");

      const aiData = JSON.parse(content);
      
      // Build deterministic epaContext from actual EPA query results
      const topIndustries = Object.entries(epaData.industryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([industry]) => industry);
      
      const epaContext = {
        totalFacilities: epaData.totalFacilities,
        majorEmitters: epaData.majorFacilities,
        facilitiesWithViolations: epaData.facilitiesWithViolations,
        topIndustries,
      };
      
      // Merge AI response with server-computed EPA data
      res.json({
        ...aiData,
        epaContext,
      });

    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Failed to analyze location" });
    }
  });

  // Ask Question API
  app.post(api.analysis.askQuestion.path, async (req, res) => {
    try {
      const { lat, lng, location, question } = api.analysis.askQuestion.input.parse(req.body);

      const prompt = `
        The user is asking about the location "${location}" (Latitude: ${lat}, Longitude: ${lng}).
        
        User question: "${question}"
        
        Provide a helpful, informative answer about this location related to the question.
        Focus on environmental, geographic, cultural, or practical information.
        Keep your answer concise (2-4 sentences) but informative.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: "You are a helpful environmental and geographic expert. Provide informative answers about locations." },
          { role: "user", content: prompt }
        ],
      });

      const answer = response.choices[0].message.content || "I couldn't find information about that.";
      
      res.json({ answer });

    } catch (error) {
      console.error("Ask question error:", error);
      res.status(500).json({ message: "Failed to get answer" });
    }
  });

  // Initial Seed
  const existingPins = await storage.getPins();
  if (existingPins.length === 0) {
    console.log("Seeding database...");
    await storage.createPin({
      lat: 40.785091,
      lng: -73.968285,
      type: "trail",
      description: "Great walking path around the reservoir.",
    });
    await storage.createPin({
      lat: 40.7812,
      lng: -73.9665,
      type: "animal",
      description: "Saw a red-tailed hawk here!",
    });
    await storage.createPin({
      lat: 40.779,
      lng: -73.969,
      type: "pollution",
      description: "Overflowing trash can.",
    });
    console.log("Database seeded.");
  }

  return httpServer;
}
