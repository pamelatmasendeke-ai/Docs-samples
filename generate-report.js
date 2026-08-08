const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} = require("docx");
const fs = require("fs");

// 1. Some data you'd normally pull from a database or API
const invoice = {
  client: "Acme Robotics",
  invoiceNumber: "INV-2026-014",
  items: [
    { description: "API integration", hours: 12, rate: 85 },
    { description: "Documentation sprint", hours: 6, rate: 85 },
  ],
};

const total = invoice.items.reduce((sum, item) => sum + item.hours * item.rate, 0);

// 2. Build the table rows from the data
const tableRows = [
  new TableRow({
    children: ["Description", "Hours", "Rate", "Subtotal"].map(
      (text) =>
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
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

// 3. Assemble the document
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
          children: [new TextRun({ text: `Total due: $${total}`, bold: true })],
          spacing: { before: 300 },
        }),
      ],
    },
  ],
});

// 4. Write it to disk
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("invoice.docx", buffer);
  console.log("invoice.docx created");
});
