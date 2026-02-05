import { analyzeCompanyStep } from "@/lib/steps/analyze-company"
import { formatNotionPropertiesStep } from "@/lib/steps/format-notion-properties"

export async function notionCompanyAnalysisWorkflow(body: any) {
  "use workflow"

  // 1. Extract company name from the Notion webhook body
  // Validate that the expected structure exists
  if (!body?.data?.properties?.["Account Name"]?.title?.[0]?.plain_text) {
    throw new Error("Missing or invalid 'Account Name' in webhook body")
  }
  const companyName = body.data.properties["Account Name"].title[0].plain_text

  // 2. Analyze the company
  const { analysis } = await analyzeCompanyStep({ companyName })

  // 3. Format analysis into Notion-digestable properties
  const { properties } = await formatNotionPropertiesStep({
    analysisText: analysis,
  })

  return { properties }
}
