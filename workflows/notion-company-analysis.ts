import { analyzeCompanyStep } from "@/lib/steps/analyze-company"
import { formatNotionPropertiesStep } from "@/lib/steps/format-notion-properties"
import { appendToNotionPageStep } from "@/lib/steps/append-to-notion"

export async function notionCompanyAnalysisWorkflow(body: any) {
  "use workflow"

  // 1. Extract company name and page ID from the Notion webhook body
  if (!body?.data?.properties?.["Account Name"]?.title?.[0]?.plain_text) {
    throw new Error("Missing or invalid 'Account Name' in webhook body")
  }
  const companyName = body.data.properties["Account Name"].title[0].plain_text
  const pageId = body.data.id as string

  // 2. Analyze the company
  const { analysis } = await analyzeCompanyStep({ companyName })

  // 3. Format analysis into Notion blocks (all items) + DB properties
  const { properties, blocks } = await formatNotionPropertiesStep({
    analysisText: analysis,
  })

  // 4. Append the full analysis as content to the Notion page
  await appendToNotionPageStep({ pageId, blocks })

  return { properties, pageId }
}
