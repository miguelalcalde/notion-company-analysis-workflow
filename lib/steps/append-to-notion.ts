import { Client } from "@notionhq/client"

/**
 * Appends an array of Notion block objects to the body of a Notion page.
 *
 * Uses the @notionhq/client SDK (already in deps) to call the
 * "Append block children" endpoint. Blocks are sent in batches of 100
 * to respect the Notion API limit.
 *
 * Requires the NOTION_API_KEY env var.
 */
export async function appendToNotionPageStep(input: {
  pageId: string
  blocks: Array<Record<string, unknown>>
}): Promise<{ success: boolean }> {
  "use step"

  if (!input.blocks || input.blocks.length === 0) {
    return { success: true }
  }

  const auth = process.env.NOTION_API_KEY
  if (!auth) {
    throw new Error(
      "NOTION_API_KEY environment variable is required to append content to a Notion page"
    )
  }

  const notion = new Client({ auth })
  const BATCH_SIZE = 100

  for (let i = 0; i < input.blocks.length; i += BATCH_SIZE) {
    const batch = input.blocks.slice(i, i + BATCH_SIZE)

    await notion.blocks.children.append({
      block_id: input.pageId,
      // The SDK expects BlockObjectRequestWithoutChildren[] but our plain
      // objects conform to the shape at runtime – cast through `any`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: batch as any,
    })
  }

  return { success: true }
}
