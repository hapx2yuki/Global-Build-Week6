import ExcelJS from "exceljs"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import { zipSync, strToU8 } from "fflate"
import os from "node:os"
import path from "node:path"
import { PDFDocument, StandardFonts } from "pdf-lib"
import sharp from "sharp"
import { describe, expect, it } from "vitest"

import {
  EvidenceError,
  normalizeEvidenceFile,
  snapshotGitRepository,
} from "@/lib/criteriaforge/evidence"

describe("evidence normalization", () => {
  it("preserves TXT line locations and source hashes", async () => {
    const result = await normalizeEvidenceFile({
      filename: "founder-note.txt",
      bytes: new TextEncoder().encode("first promise\nsecond promise"),
    })
    expect(result.kind).toBe("text")
    expect(result.state).toBe("ready")
    expect(result.segments[0].locator).toMatchObject({
      kind: "document",
      startLine: 1,
      endLine: 2,
    })
    expect(result.originalHash).toMatch(/^[a-f0-9]{64}$/u)
  })

  it("extracts DOCX paragraphs without executing embedded content", async () => {
    const documentXml = `<?xml version="1.0"?>
      <w:document xmlns:w="urn:test"><w:body>
        <w:p><w:r><w:t>Founder intent</w:t></w:r></w:p>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Boundary</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      </w:body></w:document>`
    const bytes = zipSync({
      "[Content_Types].xml": strToU8("<Types />"),
      "word/document.xml": strToU8(documentXml),
    })
    const result = await normalizeEvidenceFile({
      filename: "brief.docx",
      bytes,
    })
    expect(result.kind).toBe("docx")
    expect(result.segments.map((segment) => segment.content)).toEqual([
      "Founder intent",
      "Boundary",
    ])
    expect(result.metadata).toMatchObject({
      tableCount: 1,
      macrosExecuted: false,
      externalLinksOpened: false,
    })
  })

  it("preserves PPTX slide and element identifiers", async () => {
    const bytes = zipSync({
      "[Content_Types].xml": strToU8("<Types />"),
      "ppt/slides/slide1.xml": strToU8(
        `<p:sld xmlns:p="urn:p" xmlns:a="urn:a">
          <p:cNvPr id="42" name="Headline"/>
          <a:t>Product promise</a:t>
        </p:sld>`
      ),
    })
    const result = await normalizeEvidenceFile({
      filename: "direction.pptx",
      bytes,
    })
    expect(result.kind).toBe("pptx")
    expect(result.segments[0]).toMatchObject({
      content: "Product promise",
      locator: { kind: "slide", slide: 1, elementId: "42" },
    })
  })

  it("keeps spreadsheet formulas separate and excludes hidden sheets", async () => {
    const workbook = new ExcelJS.Workbook()
    const visible = workbook.addWorksheet("Visible")
    visible.getCell("A1").value = 2
    visible.getCell("B1").value = {
      formula: "A1*2",
      result: 4,
    }
    const hidden = workbook.addWorksheet("Private")
    hidden.state = "hidden"
    hidden.getCell("A1").value = "must not mix automatically"
    const buffer = await workbook.xlsx.writeBuffer()
    const result = await normalizeEvidenceFile({
      filename: "evidence.xlsx",
      bytes: new Uint8Array(buffer),
    })
    expect(result.kind).toBe("xlsx")
    expect(result.metadata.hiddenSheets).toEqual(["Private"])
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].content).toContain('"formula":"A1*2"')
    expect(result.segments[0].locator).toMatchObject({
      kind: "spreadsheet",
      sheet: "Visible",
      cellRange: "Visible!A1:B1",
    })
  })

  it("detects CSV encoding structure and cell ranges", async () => {
    const result = await normalizeEvidenceFile({
      filename: "signals.csv",
      bytes: new TextEncoder().encode("signal,value\nretention,0.8"),
    })
    expect(result.kind).toBe("csv")
    expect(result.metadata).toMatchObject({
      delimiter: ",",
      rowCount: 2,
      nonEmptyCells: 4,
    })
    expect(result.segments[1].locator).toMatchObject({
      cellRange: "CSV!A2:B2",
    })
  })

  it("extracts PDF text per page", async () => {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([400, 300])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    page.drawText("Ratified promise", { x: 20, y: 250, font, size: 14 })
    const bytes = await pdf.save()
    const result = await normalizeEvidenceFile({
      filename: "brief.pdf",
      bytes,
    })
    expect(result.kind).toBe("pdf")
    expect(result.metadata.pageCount).toBe(1)
    expect(result.segments[0].content).toContain("Ratified promise")
    expect(result.segments[0].locator).toMatchObject({
      kind: "pdf",
      page: 1,
    })
  })

  it("rasterizes SVG for a safe preview and never returns raw SVG markup", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40">
      <script>alert("never execute")</script>
      <rect width="80" height="40" fill="#f00"/>
    </svg>`
    const result = await normalizeEvidenceFile({
      filename: "design.svg",
      bytes: new TextEncoder().encode(svg),
    })
    expect(result.kind).toBe("image")
    expect(result.metadata.rawSvgRendered).toBe(false)
    expect(result.metadata.safeRasterHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(JSON.stringify(result)).not.toContain("<script>")
  })

  it("records image dimensions while keeping OCR explicitly unverified", async () => {
    const bytes = await sharp({
      create: {
        width: 40,
        height: 20,
        channels: 4,
        background: "#ffffff",
      },
    })
      .png()
      .toBuffer()
    const result = await normalizeEvidenceFile({
      filename: "screen.png",
      bytes,
    })
    expect(result.metadata).toMatchObject({
      width: 40,
      height: 20,
      ocrStatus: "not_run",
    })
    expect(result.state).toBe("partial")
  })

  it("stores video safely but stops evidence use until local frames exist", async () => {
    const bytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      0x00, 0x00, 0x00, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31,
    ])
    const result = await normalizeEvidenceFile({
      filename: "demo.mp4",
      bytes,
    })
    expect(result.kind).toBe("video")
    expect(result.state).toBe("needs_client_processing")
    expect(result.segments[0].locator.kind).toBe("unavailable")
    expect(result.metadata.audioStatus).toBe("not_analyzed")
  })

  it("rejects renamed files whose signature does not match", async () => {
    await expect(
      normalizeEvidenceFile({
        filename: "not-an-image.png",
        bytes: new TextEncoder().encode("plain text"),
      })
    ).rejects.toMatchObject({
      code: "mime_signature_mismatch",
    } satisfies Partial<EvidenceError>)
  })

  it("rejects ZIP path traversal before Office extraction", async () => {
    const bytes = zipSync({
      "../word/document.xml": strToU8("<w:document />"),
    })
    await expect(
      normalizeEvidenceFile({ filename: "unsafe.docx", bytes })
    ).rejects.toMatchObject({
      code: "zip_path_traversal",
    } satisfies Partial<EvidenceError>)
  })

  it("rejects an unsafe ZIP compression ratio before expansion", async () => {
    const bytes = zipSync(
      {
        "word/document.xml": new Uint8Array(4 * 1024 * 1024),
      },
      { level: 9 }
    )
    await expect(
      normalizeEvidenceFile({ filename: "bomb.docx", bytes })
    ).rejects.toMatchObject({
      code: "zip_compression_ratio",
    } satisfies Partial<EvidenceError>)
  })

  it("fixes a Git snapshot to HEAD plus dirty state and excludes secrets", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "criteriaforge-git-"))
    try {
      execFileSync("git", ["init", "-q", root])
      fs.writeFileSync(path.join(root, "README.md"), "# FounderBrief\n")
      fs.writeFileSync(path.join(root, ".env"), "SECRET=must-not-read\n")
      execFileSync("git", ["-C", root, "add", "README.md"])
      execFileSync("git", [
        "-C",
        root,
        "-c",
        "user.name=CriteriaForge Test",
        "-c",
        "user.email=test@criteriaforge.invalid",
        "commit",
        "-qm",
        "fixture",
      ])
      fs.appendFileSync(path.join(root, "README.md"), "dirty line\n")

      const result = snapshotGitRepository({ repositoryPath: root })
      expect(result.kind).toBe("git")
      expect(result.metadata).toMatchObject({
        dirty: true,
        remoteFetched: false,
        remotePushed: false,
      })
      expect(result.segments[0].locator).toMatchObject({
        kind: "git",
        relativePath: "README.md",
      })
      expect(JSON.stringify(result)).not.toContain("must-not-read")
      expect(result.metadata.excluded).toContainEqual({
        path: ".env",
        reason: "default_sensitive_exclusion",
      })
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
