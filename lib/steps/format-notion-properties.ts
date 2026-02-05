import { generateObject, gateway } from "ai"
import { z } from "zod"
import { markdownToNotionBlocks, type NotionBlock } from "@/lib/md-to-notion"

// ---------------------------------------------------------------------------
// Properties extraction (for Notion DB column updates)
// ---------------------------------------------------------------------------

const NOTION_PROPERTIES_SYSTEM_PROMPT = `You are a data extraction assistant. Your job is to extract structured information from company analysis text and format it as Notion API-compatible property values.

Extract the following information:
- Industry: Primary industry/vertical (e.g., "Retail / Fashion", "SaaS", "Healthcare")
- Region: HQ region (e.g., "Europe", "North America", "Asia")
- Website: Official company website URL
- ARR (k€): Estimated annual revenue in thousands of euros (number, nullable)

Only include properties that can be determined with reasonable confidence. Omit properties that are uncertain or unavailable.`

const notionPropertiesSchema = z.object({
  Industry: z
    .object({
      select: z.object({ name: z.string() }).nullable(),
    })
    .optional(),
  Region: z
    .object({
      select: z.object({ name: z.string() }).nullable(),
    })
    .optional(),
  Website: z
    .object({
      url: z.string().url().nullable(),
    })
    .optional(),
  "ARR (k€)": z
    .object({
      number: z.number().nullable(),
    })
    .optional(),
})

/**
 * Filters out null / empty values from Notion properties to avoid
 * overwriting existing data with blanks.
 */
function filterNullProperties(
  properties: z.infer<typeof notionPropertiesSchema>
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue

    if ("select" in value && value.select === null) continue
    if ("url" in value && value.url === null) continue
    if ("number" in value && value.number === null) continue

    filtered[key] = value
  }

  return filtered
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

/**
 * Formats the full company analysis into:
 *   - `blocks`      – Notion block objects covering ALL analysis content,
 *                      ready to be appended to the page body.
 *   - `properties`  – Structured DB-column values extracted via AI
 *                      (Industry, Region, Website, ARR).
 */
export async function formatNotionPropertiesStep(input: {
  analysisText: string
  model?: string
}): Promise<{
  properties: Record<string, unknown>
  blocks: NotionBlock[]
}> {
  "use step"

  // Handle empty analysis text
  if (!input.analysisText || input.analysisText.trim().length === 0) {
    return { properties: {}, blocks: [] }
  }

  // 1. Convert the FULL analysis markdown → Notion blocks (deterministic)
  const blocks = markdownToNotionBlocks(input.analysisText)

  // 2. Extract structured properties for DB column updates (AI)
  const modelId = input.model || "openai/gpt-4o-mini"
  const model = gateway(modelId)

  let properties: Record<string, unknown> = {}
  try {
    const result = await generateObject({
      model,
      schema: notionPropertiesSchema,
      system: NOTION_PROPERTIES_SYSTEM_PROMPT,
      prompt: input.analysisText,
    })
    properties = filterNullProperties(result.object)
  } catch (error) {
    console.error("Failed to extract Notion properties:", error)
  }

  return { properties, blocks }
}
