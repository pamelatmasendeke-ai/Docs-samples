# Generating Word documents programmatically with Node.js

If you've ever built a feature that needs to hand someone a `.docx` file — an invoice, a report, a contract — you've probably found that the ecosystem here is thinner than it should be. Most tutorials stop at "install a library" and never show you the part that actually breaks: tables, styling, and getting real data into the document without hand-editing XML.

This walks through building an invoice generator with [`docx`](https://www.npmjs.com/package/docx), a well-maintained Node.js library for creating `.docx` files from scratch. No Microsoft Word, no COM automation, no server running Windows. Every code sample below has been run and the output verified.

## What you'll build

A script that takes structured data (the kind you'd pull from a database or API) and outputs a formatted Word document with a heading, a table, and a calculated total.

## Prerequisites

- Node.js 18 or later (this was tested on Node 22)
- Basic familiarity with JavaScript

## Setup

```bash
mkdir docx-tutorial && cd docx-tutorial
npm init -y
npm install docx
```

At the time of writing, this installs `docx` version 9.6.1.

## Step 1: Define your data

In a real app this comes from a database or API response. Here it's hardcoded so the example is self-contained:

```javascript
const invoice = {
  client: "Acme Robotics",
  invoiceNumber: "INV-2026-014",
  items: [
    { description: "API integration", hours: 12, rate: 85 },
    { description: "Documentation sprint", hours: 6, rate: 85 },
  ],
};

const total = invoice.items.reduce(
  (sum, item) => sum + item.hours * item.rate,
  0
);
```

## Step 2: Build the table

This is the part most tutorials skip. Tables in `docx` are built from `Table`, `TableRow`, and `TableCell` objects — you construct the header row and the data rows separately, then combine them into a single array.

```javascript
const {
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
} = require("docx");

const tableRows = [
  new TableRow({
    children: ["Description", "Hours", "Rate", "Subtotal"].map(
      (text) =>
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ children: [new TextRun({ text, bold: true })] }),
          ],
        })
    ),
  }),
  ...invoice.items.map(
    (item) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph(item.description)],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph(String(item.hours))],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph(`$${item.rate}`)],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph(`$${item.hours * item.rate}`)],
          }),
        ],
      })
  ),
];
```

**A gotcha worth flagging:** every `TableCell` needs an explicit `width`, and those widths need to sum to the table's total width. Skip this and some renderers (Google Docs especially) will render the table with badly collapsed columns.

## Step 3: Assemble the document

```javascript
const { Document, HeadingLevel } = require("docx");

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          text: `Invoice ${invoice.invoiceNumber}`,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Client: ${invoice.client}` })],
          spacing: { after: 300 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Total due: $${total}`, bold: true }),
          ],
          spacing: { before: 300 },
        }),
      ],
    },
  ],
});
```

Note the `HeadingLevel.HEADING_1` — using the library's built-in heading levels (rather than just bolding some text) is what makes the heading show up correctly in Word's navigation pane and in any table of contents you add later.

## Step 4: Write it to disk

```javascript
const { Packer } = require("docx");
const fs = require("fs");

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("invoice.docx", buffer);
  console.log("invoice.docx created");
});
```

`Packer.toBuffer()` is asynchronous — a common early mistake is calling `fs.writeFileSync` before the buffer resolves, which throws.

## Running it

```bash
node generate-report.js
```

```
invoice.docx created
```

Opening the result shows a properly formatted document: a heading, a labeled table with bold headers, and a bold total line — not a wall of unstyled text.

## Verifying your output without opening Word

If you're generating documents in a script or CI pipeline, you won't always have Word or LibreOffice open to eyeball the result. A quick way to sanity-check programmatically:

```bash
soffice --headless --convert-to pdf invoice.docx
pdftoppm -jpeg -r 120 invoice.pdf preview
```

This converts the `.docx` to a PDF headlessly, then rasterizes it to a JPEG you can inspect — useful for catching layout issues (like the column-width gotcha above) before a document ships to a client or a user.

## Where this goes from here

The same pattern — build data, map it into `TableRow`/`Paragraph` objects, pack it to a buffer — scales to much more complex documents: multi-page reports, documents with images (`ImageRun`), page breaks, and headers/footers. The library also supports numbered lists, custom styles, and landscape orientation, all of which follow the same object-composition approach shown here rather than requiring template files.

If you're building a Node.js app that needs to hand users a Word document — reports, certificates, generated contracts — this approach avoids the overhead of a templating engine or a headless-Word dependency, and it's fully scriptable, which matters if the documents need to be generated on a schedule or in response to an API call.
