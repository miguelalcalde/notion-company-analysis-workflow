import { generateObject, gateway } from "ai"
import { z } from "zod"

const NOTION_PROPERTIES_SYSTEM_PROMPT = `You are a data extraction assistant. Your job is to extract structured information from company analysis text and format it as Notion API-compatible properties.

Extract the following information:
- Industry: Primary industry/vertical (e.g., "Retail / Fashion", "SaaS", "Healthcare")
- Region: HQ region (e.g., "Europe", "North America", "Asia")
- Website: Official company website URL
- ARR (k€): Estimated annual revenue in thousands of euros (number, nullable)
- Notes: Concise summary from the analysis (max 2000 characters)

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
  Notes: z
    .object({
      rich_text: z.array(
        z.object({
          type: z.literal("text"),
          text: z.object({ content: z.string().max(2000) }),
        })
      ),
    })
    .optional(),
})

/**
 * Filters out null values from Notion properties to avoid overwriting existing data.
 */
function filterNullProperties(
  properties: z.infer<typeof notionPropertiesSchema>
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) {
      continue
    }

    // Check for null values in nested structures
    if ("select" in value && value.select === null) {
      continue
    }
    if ("url" in value && value.url === null) {
      continue
    }
    if ("number" in value && value.number === null) {
      continue
    }
    if (
      "rich_text" in value &&
      (!value.rich_text || value.rich_text.length === 0)
    ) {
      continue
    }

    filtered[key] = value
  }

  return filtered
}

export async function formatNotionPropertiesStep(input: {
  analysisText: string
  model?: string
}): Promise<{ properties: Record<string, unknown> }> {
  "use step"

  // Handle empty analysis text
  if (!input.analysisText || input.analysisText.trim().length === 0) {
    return { properties: {} }
  }

  // Create model instance via Vercel AI Gateway
  const modelId = input.model || "openai/gpt-4o-mini"
  const model = gateway(modelId)

  try {
    // Generate structured object from analysis text
    const result = await generateObject({
      model,
      schema: notionPropertiesSchema,
      system: NOTION_PROPERTIES_SYSTEM_PROMPT,
      prompt: input.analysisText,
    })

    // Filter out null values
    const filteredProperties = filterNullProperties(result.object)

    return { properties: filteredProperties }
  } catch (error) {
    // If generation fails, return empty properties object
    // Log error for debugging but don't fail the workflow
    console.error("Failed to format Notion properties:", error)
    return { properties: {} }
  }
}
