import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import ExcelJS from "exceljs"
import { fileTypeFromBuffer } from "file-type"
import { unzipSync } from "fflate"
import { parse as parseCsv } from "csv-parse/sync"
import sharp from "sharp"

import type { EvidenceLocator } from "@/lib/criteriaforge/contracts"

export const EVIDENCE_LIMITS = {
  workspaceBytes: 2 * 1024 * 1024 * 1024,
  documentBytes: 50 * 1024 * 1024,
  pdfPages: 500,
  videoBytes: 1024 * 1024 * 1024,
  videoSeconds: 30 * 60,
  imagePixels: 40_000_000,
  spreadsheetCells: 100_000,
  gitFiles: 20_000,
  gitBytes: 500 * 1024 * 1024,
  zipEntries: 10_000,
  zipExpandedBytes: 250 * 1024 * 1024,
  zipCompressionRatio: 1_000,
} as const

export type EvidenceKind =
  | "text"
  | "markdown"
  | "pdf"
  | "docx"
  | "pptx"
  | "csv"
  | "xlsx"
  | "image"
  | "video"
  | "git"

export type NormalizedEvidenceSegment = {
  ordinal: number
  content: string
  contentHash: string
  locator: EvidenceLocator
  readable: boolean
  failureReason?: string
}

export type NormalizedEvidence = {
  kind: EvidenceKind
  displayName: string
  detectedMime: string
  originalHash: string
  byteSize: number
  state: "ready" | "partial" | "needs_client_processing"
  metadata: Record<string, unknown>
  segments: NormalizedEvidenceSegment[]
  warnings: string[]
}

export class EvidenceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly recovery: string
  ) {
    super(message)
  }
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex")
}

function safeDisplayName(filename: string): string {
  const basename = path.basename(filename).replaceAll("\u0000", "").trim()
  if (!basename || basename === "." || basename === "..") {
    throw new EvidenceError(
      "invalid_filename",
      "The evidence filename is invalid.",
      "Rename the file and try again."
    )
  }
  return basename.slice(0, 240)
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replace(/&#([0-9]+);/gu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replace(/&#x([a-f0-9]+);/giu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
}

function decodeText(bytes: Uint8Array): {
  text: string
  encoding: string
  warnings: string[]
} {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      text: new TextDecoder("utf-16le").decode(bytes.subarray(2)),
      encoding: "utf-16le",
      warnings: [],
    }
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(bytes.length - 2)
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      swapped[index - 2] = bytes[index + 1]
      swapped[index - 1] = bytes[index]
    }
    return {
      text: new TextDecoder("utf-16le").decode(swapped),
      encoding: "utf-16be",
      warnings: [],
    }
  }
  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      encoding: "utf-8",
      warnings: [],
    }
  } catch {
    return {
      text: new TextDecoder("shift_jis").decode(bytes),
      encoding: "shift_jis",
      warnings: [
        "UTF-8 decoding failed; Shift_JIS was used and should be confirmed.",
      ],
    }
  }
}

function textSegments(text: string): NormalizedEvidenceSegment[] {
  const lines = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n")
  const segments: NormalizedEvidenceSegment[] = []
  const chunkSize = 80
  for (let start = 0; start < lines.length; start += chunkSize) {
    const content = lines.slice(start, start + chunkSize).join("\n")
    if (!content.trim()) continue
    const contentHash = sha256(content)
    segments.push({
      ordinal: segments.length,
      content,
      contentHash,
      locator: {
        kind: "document",
        startLine: start + 1,
        endLine: Math.min(lines.length, start + chunkSize),
        startCharacter: 0,
        endCharacter: content.length,
        textHash: contentHash,
      },
      readable: true,
    })
  }
  return segments
}

type ZipEntry = {
  name: string
  compressedSize: number
  expandedSize: number
}

function inspectZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const entries: ZipEntry[] = []
  let offset = 0
  while (offset + 46 <= bytes.length) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      offset += 1
      continue
    }
    const compressedSize = view.getUint32(offset + 20, true)
    const expandedSize = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const nameStart = offset + 46
    const nameEnd = nameStart + nameLength
    if (nameEnd > bytes.length) {
      throw new EvidenceError(
        "invalid_zip",
        "The Office file has a malformed ZIP directory.",
        "Export the document again and retry."
      )
    }
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameEnd))
    if (
      name.startsWith("/") ||
      name.startsWith("\\") ||
      name.split(/[\\/]/u).includes("..")
    ) {
      throw new EvidenceError(
        "zip_path_traversal",
        "The Office archive contains an unsafe path.",
        "Remove the unsafe entry or export the document again."
      )
    }
    entries.push({ name, compressedSize, expandedSize })
    offset = nameEnd + extraLength + commentLength
  }

  const compressed = entries.reduce(
    (total, entry) => total + entry.compressedSize,
    0
  )
  const expanded = entries.reduce(
    (total, entry) => total + entry.expandedSize,
    0
  )
  if (entries.length === 0 || entries.length > EVIDENCE_LIMITS.zipEntries) {
    throw new EvidenceError(
      "zip_entry_limit",
      "The Office archive has no readable directory or too many entries.",
      "Export a smaller document or select a narrower source."
    )
  }
  if (expanded > EVIDENCE_LIMITS.zipExpandedBytes) {
    throw new EvidenceError(
      "zip_expansion_limit",
      "The expanded Office document exceeds the safety limit.",
      "Export a smaller document or select a narrower source."
    )
  }
  if (
    compressed > 0 &&
    expanded / compressed > EVIDENCE_LIMITS.zipCompressionRatio
  ) {
    throw new EvidenceError(
      "zip_compression_ratio",
      "The Office archive has an unsafe compression ratio.",
      "Export the document again without extreme compression."
    )
  }
  return entries
}

function unzipOffice(bytes: Uint8Array): Record<string, Uint8Array> {
  inspectZip(bytes)
  return unzipSync(bytes)
}

function xmlTextRuns(xml: string, element: string): string[] {
  const expression = new RegExp(
    `<${element}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${element}>`,
    "gu"
  )
  return [...xml.matchAll(expression)]
    .map((match) => decodeXmlEntities(match[1].replace(/<[^>]+>/gu, "")))
    .filter((value) => value.length > 0)
}

function normalizeDocx(
  filename: string,
  bytes: Uint8Array
): Omit<NormalizedEvidence, "originalHash" | "byteSize"> {
  const entries = unzipOffice(bytes)
  const document = entries["word/document.xml"]
  if (!document) {
    throw new EvidenceError(
      "invalid_docx",
      "The DOCX package does not contain word/document.xml.",
      "Open and export the document as DOCX again."
    )
  }
  const xml = new TextDecoder().decode(document)
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gu)]
  const segments = paragraphs.flatMap((paragraph, paragraphIndex) => {
    const content = xmlTextRuns(paragraph[1], "w:t").join("")
    if (!content.trim()) return []
    const contentHash = sha256(content)
    return [
      {
        ordinal: paragraphIndex,
        content,
        contentHash,
        locator: {
          kind: "document" as const,
          paragraph: paragraphIndex + 1,
          startLine: paragraphIndex + 1,
          endLine: paragraphIndex + 1,
          startCharacter: 0,
          endCharacter: content.length,
          textHash: contentHash,
        },
        readable: true,
      },
    ]
  })
  return {
    kind: "docx",
    displayName: filename,
    detectedMime:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    state: segments.length > 0 ? "ready" : "partial",
    metadata: {
      paragraphCount: paragraphs.length,
      tableCount: (xml.match(/<w:tbl(?:\s|>)/gu) ?? []).length,
      macrosExecuted: false,
      externalLinksOpened: false,
    },
    segments:
      segments.length > 0
        ? segments
        : [
            {
              ordinal: 0,
              content: "",
              contentHash: sha256(""),
              locator: {
                kind: "unavailable",
                reason: "No readable paragraph text was found.",
                recovery: "Export a text-searchable DOCX or PDF.",
              },
              readable: false,
              failureReason: "No readable paragraph text was found.",
            },
          ],
    warnings: [],
  }
}

function normalizePptx(
  filename: string,
  bytes: Uint8Array
): Omit<NormalizedEvidence, "originalHash" | "byteSize"> {
  const entries = unzipOffice(bytes)
  const slides = Object.entries(entries)
    .filter(([name]) => /^ppt\/slides\/slide[0-9]+\.xml$/u.test(name))
    .sort(([left], [right]) =>
      left.localeCompare(right, undefined, { numeric: true })
    )
  if (slides.length === 0) {
    throw new EvidenceError(
      "invalid_pptx",
      "The PPTX package does not contain slides.",
      "Open and export the presentation as PPTX again."
    )
  }
  const segments: NormalizedEvidenceSegment[] = slides.map(
    ([name, slideBytes], index) => {
      const xml = new TextDecoder().decode(slideBytes)
      const content = xmlTextRuns(xml, "a:t").join("\n")
      const contentHash = sha256(content)
      const elementIds = [
        ...xml.matchAll(/<p:cNvPr[^>]*\bid="([^"]+)"/gu),
      ].map((match) => match[1])
      return {
        ordinal: index,
        content,
        contentHash,
        locator: {
          kind: "slide",
          slide: index + 1,
          elementId: elementIds.join(",") || path.basename(name),
        },
        readable: Boolean(content.trim()),
        failureReason: content.trim()
          ? undefined
          : "No readable text was found on this slide.",
      }
    }
  )
  return {
    kind: "pptx",
    displayName: filename,
    detectedMime:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    state: segments.every((segment) => segment.readable) ? "ready" : "partial",
    metadata: {
      slideCount: slides.length,
      notesPresent: Object.keys(entries).some((name) =>
        name.startsWith("ppt/notesSlides/")
      ),
      macrosExecuted: false,
      externalLinksOpened: false,
    },
    segments,
    warnings: [],
  }
}

function columnName(column: number): string {
  let current = column
  let name = ""
  while (current > 0) {
    current -= 1
    name = String.fromCharCode(65 + (current % 26)) + name
    current = Math.floor(current / 26)
  }
  return name
}

async function normalizeXlsx(
  filename: string,
  bytes: Uint8Array
): Promise<Omit<NormalizedEvidence, "originalHash" | "byteSize">> {
  inspectZip(bytes)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Uint8Array.from(bytes).buffer)
  let nonEmptyCells = 0
  const hiddenSheets: string[] = []
  const segments: NormalizedEvidenceSegment[] = []

  for (const worksheet of workbook.worksheets) {
    if (worksheet.state !== "visible") {
      hiddenSheets.push(worksheet.name)
      continue
    }
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: Array<{
        address: string
        display: string
        formula?: string
        savedValue?: unknown
      }> = []
      let firstColumn = Number.POSITIVE_INFINITY
      let lastColumn = 0
      row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        nonEmptyCells += 1
        if (nonEmptyCells > EVIDENCE_LIMITS.spreadsheetCells) {
          throw new EvidenceError(
            "spreadsheet_cell_limit",
            "The spreadsheet exceeds the 100,000 non-empty-cell limit.",
            "Select fewer sheets or export only the relevant range."
          )
        }
        firstColumn = Math.min(firstColumn, columnNumber)
        lastColumn = Math.max(lastColumn, columnNumber)
        const formulaValue =
          cell.value &&
          typeof cell.value === "object" &&
          "formula" in cell.value
            ? cell.value
            : null
        cells.push({
          address: cell.address,
          display: cell.text,
          formula: formulaValue ? String(formulaValue.formula) : undefined,
          savedValue: formulaValue?.result,
        })
      })
      if (cells.length === 0) return
      const content = JSON.stringify(cells)
      const displayValueHash = sha256(
        cells.map((cell) => cell.display).join("\u001f")
      )
      const formulaHash = cells.some((cell) => cell.formula)
        ? sha256(cells.map((cell) => cell.formula ?? "").join("\u001f"))
        : undefined
      segments.push({
        ordinal: segments.length,
        content,
        contentHash: sha256(content),
        locator: {
          kind: "spreadsheet",
          sheet: worksheet.name,
          cellRange: `${worksheet.name}!${columnName(firstColumn)}${rowNumber}:${columnName(lastColumn)}${rowNumber}`,
          formulaHash,
          displayValueHash,
        },
        readable: true,
      })
    })
  }
  return {
    kind: "xlsx",
    displayName: filename,
    detectedMime:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    state: "ready",
    metadata: {
      visibleSheets: workbook.worksheets
        .filter((sheet) => sheet.state === "visible")
        .map((sheet) => sheet.name),
      hiddenSheets,
      nonEmptyCells,
      formulasExecuted: false,
    },
    segments,
    warnings:
      hiddenSheets.length > 0
        ? [
            "Hidden sheets are listed but excluded from evaluation evidence by default.",
          ]
        : [],
  }
}

function detectCsvDelimiter(firstLine: string): string {
  const candidates = [",", "\t", ";", "|"]
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: firstLine.split(delimiter).length - 1,
    }))
    .sort((left, right) => right.count - left.count)[0].delimiter
}

function normalizeCsv(
  filename: string,
  bytes: Uint8Array
): Omit<NormalizedEvidence, "originalHash" | "byteSize"> {
  const decoded = decodeText(bytes)
  const firstLine = decoded.text.split(/\r?\n/u)[0] ?? ""
  const delimiter = detectCsvDelimiter(firstLine)
  const rows = parseCsv(decoded.text, {
    delimiter,
    bom: true,
    relax_column_count: true,
    skip_empty_lines: false,
  }) as string[][]
  let nonEmptyCells = 0
  const segments = rows.flatMap((row, rowIndex) => {
    nonEmptyCells += row.filter((cell) => cell !== "").length
    if (nonEmptyCells > EVIDENCE_LIMITS.spreadsheetCells) {
      throw new EvidenceError(
        "spreadsheet_cell_limit",
        "The CSV exceeds the 100,000 non-empty-cell limit.",
        "Select a narrower row or column range."
      )
    }
    if (row.every((cell) => cell === "")) return []
    const content = JSON.stringify(row)
    return [
      {
        ordinal: rowIndex,
        content,
        contentHash: sha256(content),
        locator: {
          kind: "spreadsheet" as const,
          sheet: "CSV",
          cellRange: `CSV!A${rowIndex + 1}:${columnName(row.length)}${rowIndex + 1}`,
          displayValueHash: sha256(row.join("\u001f")),
        },
        readable: true,
      },
    ]
  })
  return {
    kind: "csv",
    displayName: filename,
    detectedMime: "text/csv",
    state: "ready",
    metadata: {
      encoding: decoded.encoding,
      delimiter: delimiter === "\t" ? "tab" : delimiter,
      rowCount: rows.length,
      nonEmptyCells,
    },
    segments,
    warnings: decoded.warnings,
  }
}

async function normalizePdf(
  filename: string,
  bytes: Uint8Array
): Promise<Omit<NormalizedEvidence, "originalHash" | "byteSize">> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
  })
  const document = await loadingTask.promise
  if (document.numPages > EVIDENCE_LIMITS.pdfPages) {
    await loadingTask.destroy()
    throw new EvidenceError(
      "pdf_page_limit",
      "The PDF exceeds the 500-page limit.",
      "Select a page range or split the PDF."
    )
  }
  const segments: NormalizedEvidenceSegment[] = []
  const imageOnlyPages: number[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const textItems = textContent.items.filter(
      (item): item is (typeof textContent.items)[number] & { str: string } =>
        "str" in item
    )
    const content = textItems.map((item) => item.str).join(" ").trim()
    const contentHash = sha256(content)
    if (!content) imageOnlyPages.push(pageNumber)
    segments.push({
      ordinal: pageNumber - 1,
      content,
      contentHash,
      locator: {
        kind: "pdf",
        page: pageNumber,
        rectangle: [0, 0, page.view[2], page.view[3]],
        textHash: contentHash,
      },
      readable: Boolean(content),
      failureReason: content
        ? undefined
        : "Image-only page; OCR has not been approved or completed.",
    })
    page.cleanup()
  }
  await loadingTask.destroy()
  return {
    kind: "pdf",
    displayName: filename,
    detectedMime: "application/pdf",
    state: imageOnlyPages.length > 0 ? "partial" : "ready",
    metadata: {
      pageCount: segments.length,
      imageOnlyPages,
      scriptsExecuted: false,
      externalLinksOpened: false,
    },
    segments,
    warnings:
      imageOnlyPages.length > 0
        ? [
            `OCR is required for ${imageOnlyPages.length} image-only page(s); those pages are not used as text evidence.`,
          ]
        : [],
  }
}

async function normalizeImage(
  filename: string,
  bytes: Uint8Array,
  extension: string
): Promise<Omit<NormalizedEvidence, "originalHash" | "byteSize">> {
  const image = sharp(bytes, {
    limitInputPixels: EVIDENCE_LIMITS.imagePixels,
    failOn: "error",
  })
  const metadata = await image.metadata()
  const pixels = (metadata.width ?? 0) * (metadata.height ?? 0)
  if (pixels > EVIDENCE_LIMITS.imagePixels) {
    throw new EvidenceError(
      "image_pixel_limit",
      "The image exceeds the 40-megapixel limit.",
      "Resize the image or select a smaller export."
    )
  }
  const safeRasterHash =
    extension === ".svg"
      ? sha256(await image.png({ compressionLevel: 9 }).toBuffer())
      : undefined
  const content = JSON.stringify({
    width: metadata.width,
    height: metadata.height,
    colorSpace: metadata.space,
    pages: metadata.pages,
    safeRasterHash,
  })
  return {
    kind: "image",
    displayName: filename,
    detectedMime:
      extension === ".svg"
        ? "image/svg+xml"
        : `image/${metadata.format ?? extension.slice(1)}`,
    state: "partial",
    metadata: {
      width: metadata.width,
      height: metadata.height,
      colorSpace: metadata.space,
      safeRasterHash,
      rawSvgRendered: false,
      ocrStatus: "not_run",
    },
    segments: [
      {
        ordinal: 0,
        content,
        contentHash: sha256(content),
        locator: {
          kind: "image",
          imageId: "image-1",
          rectangle: [0, 0, metadata.width ?? 0, metadata.height ?? 0],
        },
        readable: true,
      },
    ],
    warnings: [
      "Image metadata is ready. OCR text is not treated as evidence until machine reading is run and reviewed.",
    ],
  }
}

function normalizeVideo(
  filename: string,
  detectedMime: string
): Omit<NormalizedEvidence, "originalHash" | "byteSize"> {
  const reason =
    "Video bytes are stored locally, but frame extraction must finish in the browser before visual evidence is available."
  return {
    kind: "video",
    displayName: filename,
    detectedMime,
    state: "needs_client_processing",
    metadata: {
      frameExtraction: "pending_browser",
      audioStatus: "not_analyzed",
      maximumFrames: 120,
    },
    segments: [
      {
        ordinal: 0,
        content: "",
        contentHash: sha256(""),
        locator: {
          kind: "unavailable",
          reason,
          recovery:
            "Keep this browser window open while CriteriaForge extracts local frames, or provide a supported alternate video.",
        },
        readable: false,
        failureReason: reason,
      },
    ],
    warnings: [
      "Audio is not inferred. Add SRT, VTT, or TXT subtitles when spoken content is required.",
    ],
  }
}

export async function normalizeEvidenceFile(input: {
  filename: string
  bytes: Uint8Array
}): Promise<NormalizedEvidence> {
  const displayName = safeDisplayName(input.filename)
  const extension = path.extname(displayName).toLowerCase()
  const detected = await fileTypeFromBuffer(input.bytes)
  const originalHash = sha256(input.bytes)

  if (
    input.bytes.length > EVIDENCE_LIMITS.documentBytes &&
    ![".pdf", ".mp4", ".mov", ".webm"].includes(extension)
  ) {
    throw new EvidenceError(
      "document_size_limit",
      "This source exceeds the 50 MB document limit.",
      "Select a smaller source or split it into relevant parts."
    )
  }
  if (
    [".mp4", ".mov", ".webm"].includes(extension) &&
    input.bytes.length > EVIDENCE_LIMITS.videoBytes
  ) {
    throw new EvidenceError(
      "video_size_limit",
      "This video exceeds the 1 GB limit.",
      "Trim the video to the relevant section."
    )
  }

  let normalized: Omit<NormalizedEvidence, "originalHash" | "byteSize">
  if (extension === ".txt" || extension === ".md" || extension === ".markdown") {
    const decoded = decodeText(input.bytes)
    normalized = {
      kind: extension === ".txt" ? "text" : "markdown",
      displayName,
      detectedMime: "text/plain",
      state: "ready",
      metadata: { encoding: decoded.encoding },
      segments: textSegments(decoded.text),
      warnings: decoded.warnings,
    }
  } else if (extension === ".csv") {
    normalized = normalizeCsv(displayName, input.bytes)
  } else if (extension === ".docx") {
    normalized = normalizeDocx(displayName, input.bytes)
  } else if (extension === ".pptx") {
    normalized = normalizePptx(displayName, input.bytes)
  } else if (extension === ".xlsx") {
    normalized = await normalizeXlsx(displayName, input.bytes)
  } else if (extension === ".pdf" && detected?.mime === "application/pdf") {
    normalized = await normalizePdf(displayName, input.bytes)
  } else if (
    [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(extension)
  ) {
    if (
      extension !== ".svg" &&
      !detected?.mime.startsWith("image/")
    ) {
      throw new EvidenceError(
        "mime_signature_mismatch",
        "The image extension does not match its file signature.",
        "Export the original image again without renaming its extension."
      )
    }
    normalized = await normalizeImage(displayName, input.bytes, extension)
  } else if ([".mp4", ".mov", ".webm"].includes(extension)) {
    if (!detected?.mime.startsWith("video/")) {
      throw new EvidenceError(
        "mime_signature_mismatch",
        "The video extension does not match its file signature.",
        "Export the original video again without renaming its extension."
      )
    }
    normalized = normalizeVideo(displayName, detected.mime)
  } else {
    throw new EvidenceError(
      "unsupported_evidence_type",
      "This evidence format is not supported by the first release.",
      "Use PDF, DOCX, PPTX, TXT, Markdown, CSV, XLSX, PNG, JPEG, WebP, SVG, MP4, MOV, or WebM."
    )
  }

  return {
    ...normalized,
    originalHash,
    byteSize: input.bytes.length,
  }
}

const DEFAULT_GIT_EXCLUSIONS = [
  /^\.env(?:\.|$)/u,
  /(?:^|\/)(?:id_rsa|id_ed25519)(?:\.|$)/u,
  /\.(?:pem|key|p12|pfx)$/u,
  /(?:^|\/)(?:auth|credentials|secrets?)\.json$/iu,
  /(?:^|\/)(?:node_modules|\.next|dist|build|out|coverage)(?:\/|$)/u,
]

function git(
  root: string,
  args: string[],
  options: { encoding: "utf8"; maxBuffer?: number } = {
    encoding: "utf8",
  }
): string {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: options.encoding,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
    maxBuffer: options.maxBuffer ?? 100 * 1024 * 1024,
  })
}

function pathInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`)
}

export function snapshotGitRepository(input: {
  repositoryPath: string
}): NormalizedEvidence {
  const requested = fs.realpathSync(
    /* turbopackIgnore: true */ input.repositoryPath
  )
  const root = fs.realpathSync(
    git(requested, ["rev-parse", "--show-toplevel"]).trim()
  )
  if (!pathInside(root, requested)) {
    throw new EvidenceError(
      "git_root_mismatch",
      "The selected path is not inside the detected Git repository.",
      "Choose the repository root and try again."
    )
  }

  const head = git(root, ["rev-parse", "HEAD"]).trim()
  const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim()
  const status = git(root, ["status", "--porcelain=v1", "-z"])
  const fileList = git(root, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .split("\u0000")
    .filter(Boolean)

  if (fileList.length > EVIDENCE_LIMITS.gitFiles) {
    throw new EvidenceError(
      "git_file_limit",
      "The repository exceeds the 20,000-file limit.",
      "Select a narrower repository or remove generated files."
    )
  }

  const excluded: Array<{ path: string; reason: string }> = []
  const segments: NormalizedEvidenceSegment[] = []
  let totalBytes = 0
  for (const relativePath of fileList.sort()) {
    if (
      relativePath.startsWith("/") ||
      relativePath.split("/").includes("..") ||
      DEFAULT_GIT_EXCLUSIONS.some((pattern) => pattern.test(relativePath))
    ) {
      excluded.push({ path: relativePath, reason: "default_sensitive_exclusion" })
      continue
    }
    const candidate = path.join(
      /* turbopackIgnore: true */ root,
      relativePath
    )
    const stat = fs.lstatSync(candidate)
    if (stat.isSymbolicLink()) {
      const resolved = fs.realpathSync(
        /* turbopackIgnore: true */ candidate
      )
      if (!pathInside(root, resolved)) {
        excluded.push({ path: relativePath, reason: "symlink_outside_repository" })
        continue
      }
    }
    if (!stat.isFile()) continue
    totalBytes += stat.size
    if (totalBytes > EVIDENCE_LIMITS.gitBytes) {
      throw new EvidenceError(
        "git_size_limit",
        "The repository exceeds the 500 MB evidence limit.",
        "Select a narrower repository or exclude large generated files."
      )
    }
    const bytes = fs.readFileSync(
      /* turbopackIgnore: true */ candidate
    )
    if (bytes.subarray(0, 8_192).includes(0)) {
      excluded.push({ path: relativePath, reason: "binary_file" })
      continue
    }
    const decoded = decodeText(bytes)
    const lines = decoded.text
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .split("\n")
    for (let start = 0; start < lines.length; start += 200) {
      const content = lines.slice(start, start + 200).join("\n")
      if (!content.trim()) continue
      const contentHash = sha256(content)
      segments.push({
        ordinal: segments.length,
        content,
        contentHash,
        locator: {
          kind: "git",
          commit: head,
          relativePath,
          startLine: start + 1,
          endLine: Math.min(lines.length, start + 200),
          textHash: contentHash,
        },
        readable: true,
      })
    }
  }

  const manifest = JSON.stringify({
    head,
    branch,
    statusHash: sha256(status),
    files: segments.map((segment) => ({
      locator: segment.locator,
      contentHash: segment.contentHash,
    })),
  })
  return {
    kind: "git",
    displayName: path.basename(root),
    detectedMime: "application/x-git-repository",
    originalHash: sha256(manifest),
    byteSize: totalBytes,
    state: "ready",
    metadata: {
      repositoryRoot: root,
      head,
      branch,
      dirty: Boolean(status),
      dirtyStateHash: sha256(status),
      fileCount: fileList.length,
      indexedTextSegments: segments.length,
      excluded,
      remoteFetched: false,
      remotePushed: false,
    },
    segments,
    warnings:
      excluded.length > 0
        ? [
            `${excluded.length} sensitive, generated, linked, or binary file(s) were excluded by default.`,
          ]
        : [],
  }
}
