/**
 * Markdown to Notion blocks converter.
 *
 * Converts markdown text into Notion API block objects suitable for
 * appending to a Notion page via the blocks/children endpoint.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotionRichText = {
  type: "text"
  text: { content: string; link?: { url: string } | null }
  annotations?: {
    bold?: boolean
    italic?: boolean
    strikethrough?: boolean
    underline?: boolean
    code?: boolean
    color?: string
  }
}

export type NotionBlock = {
  object: "block"
  type: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Notion API limit: max characters per rich_text element */
const NOTION_TEXT_LIMIT = 2000

// ---------------------------------------------------------------------------
// Inline formatting
// ---------------------------------------------------------------------------

/**
 * Splits text content into chunks that respect the Notion 2000-char limit,
 * preserving annotations and link on every chunk.
 */
function splitRichText(
  content: string,
  annotations?: NotionRichText["annotations"],
  link?: { url: string }
): NotionRichText[] {
  if (content.length === 0) {
    return [{ type: "text", text: { content: "" } }]
  }

  const items: NotionRichText[] = []
  for (let i = 0; i < content.length; i += NOTION_TEXT_LIMIT) {
    const chunk = content.slice(i, i + NOTION_TEXT_LIMIT)
    const item: NotionRichText = {
      type: "text",
      text: { content: chunk },
    }
    if (link) {
      item.text.link = link
    }
    if (annotations && Object.keys(annotations).length > 0) {
      item.annotations = annotations
    }
    items.push(item)
  }
  return items
}

/**
 * Parses inline markdown formatting into an array of Notion rich-text items.
 *
 * Supported: **bold**, *italic*, ~~strikethrough~~, `code`,
 * [link text](url), and bare https:// URLs.
 */
export function parseInlineFormatting(text: string): NotionRichText[] {
  if (!text || text.trim().length === 0) {
    return [{ type: "text", text: { content: text || "" } }]
  }

  const items: NotionRichText[] = []

  // Order matters: bold before italic, markdown links before bare URLs.
  const pattern =
    /(\*\*(.+?)\*\*|~~(.+?)~~|`(.+?)`|\[(.+?)\]\((.+?)\)|\*(.+?)\*|(https?:\/\/[^\s)]+))/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // Plain text preceding this match
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index)
      if (plain) items.push(...splitRichText(plain))
    }

    if (match[2] !== undefined) {
      // **bold**
      items.push(...splitRichText(match[2], { bold: true }))
    } else if (match[3] !== undefined) {
      // ~~strikethrough~~
      items.push(...splitRichText(match[3], { strikethrough: true }))
    } else if (match[4] !== undefined) {
      // `code`
      items.push(...splitRichText(match[4], { code: true }))
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // [text](url)
      items.push({
        type: "text",
        text: { content: match[5], link: { url: match[6] } },
      })
    } else if (match[7] !== undefined) {
      // *italic*
      items.push(...splitRichText(match[7], { italic: true }))
    } else if (match[8] !== undefined) {
      // bare URL
      items.push({
        type: "text",
        text: { content: match[8], link: { url: match[8] } },
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Trailing plain text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    if (remaining) items.push(...splitRichText(remaining))
  }

  return items.length > 0 ? items : [{ type: "text", text: { content: text } }]
}

// ---------------------------------------------------------------------------
// Block-level parsing helpers
// ---------------------------------------------------------------------------

/**
 * Collect nested list children that have a deeper indent than `parentIndent`.
 * Returns the collected child blocks and the next line index to resume from.
 */
function collectNestedListItems(
  lines: string[],
  startIndex: number,
  parentIndent: number
): { children: NotionBlock[]; nextIndex: number } {
  const children: NotionBlock[] = []
  let i = startIndex

  while (i < lines.length) {
    const line = lines[i]

    // Skip blank lines but peek ahead – only continue if the next non-blank
    // line is still indented deeper than the parent.
    if (line.trim() === "") {
      if (i + 1 < lines.length) {
        const next = lines[i + 1]
        const nextBullet = next.match(/^(\s*)[*\-]\s/)
        const nextNum = next.match(/^(\s*)\d+\.\s/)
        const nextMatch = nextBullet || nextNum
        if (nextMatch && nextMatch[1].length > parentIndent) {
          i++
          continue
        }
      }
      break
    }

    const bulletMatch = line.match(/^(\s*)[*\-]\s(.*)/)
    const numMatch = line.match(/^(\s*)\d+\.\s(.*)/)
    const match = bulletMatch || numMatch

    if (!match || match[1].length <= parentIndent) {
      break
    }

    const content = bulletMatch ? bulletMatch[2] : numMatch![2]
    const blockType = bulletMatch ? "bulleted_list_item" : "numbered_list_item"

    children.push({
      object: "block",
      type: blockType,
      [blockType]: { rich_text: parseInlineFormatting(content) },
    } as NotionBlock)

    i++
  }

  return { children, nextIndex: i }
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

/**
 * Converts a markdown string into an array of Notion API block objects.
 *
 * Supported block types:
 *   # / ## / ### headings, bulleted & numbered lists (one level of nesting),
 *   code fences, horizontal rules, and paragraphs.
 */
export function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const lines = markdown.split("\n")
  const blocks: NotionBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === "") {
      i++
      continue
    }

    // ---- Headings ----
    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: parseInlineFormatting(line.slice(4)) },
      })
      i++
      continue
    }
    if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: parseInlineFormatting(line.slice(3)) },
      })
      i++
      continue
    }
    if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: parseInlineFormatting(line.slice(2)) },
      })
      i++
      continue
    }

    // ---- Horizontal rule ----
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ object: "block", type: "divider", divider: {} })
      i++
      continue
    }

    // ---- Fenced code block ----
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim() || "plain text"
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing ```
      blocks.push({
        object: "block",
        type: "code",
        code: {
          rich_text: splitRichText(codeLines.join("\n")),
          language: lang,
        },
      })
      continue
    }

    // ---- Numbered list ----
    const numMatch = line.match(/^(\s*)\d+\.\s(.*)/)
    if (numMatch) {
      const indent = numMatch[1].length
      const content = numMatch[2]
      const nested = collectNestedListItems(lines, i + 1, indent)

      const block: Record<string, unknown> = {
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: { rich_text: parseInlineFormatting(content) },
      }
      if (nested.children.length > 0) {
        ;(block.numbered_list_item as Record<string, unknown>).children =
          nested.children
      }
      blocks.push(block as NotionBlock)
      i = nested.nextIndex
      continue
    }

    // ---- Bulleted list ----
    const bulletMatch = line.match(/^(\s*)[*\-]\s(.*)/)
    if (bulletMatch) {
      const indent = bulletMatch[1].length
      const content = bulletMatch[2]
      const nested = collectNestedListItems(lines, i + 1, indent)

      const block: Record<string, unknown> = {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: parseInlineFormatting(content) },
      }
      if (nested.children.length > 0) {
        ;(block.bulleted_list_item as Record<string, unknown>).children =
          nested.children
      }
      blocks.push(block as NotionBlock)
      i = nested.nextIndex
      continue
    }

    // ---- Paragraph (fallback) ----
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: parseInlineFormatting(line) },
    })
    i++
  }

  return blocks
}
