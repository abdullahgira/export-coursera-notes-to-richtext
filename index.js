const fs = require("fs");
const docx = require("docx");
const { Paragraph, ExternalHyperlink, Packer, TextRun } = require("docx");

async function main() {
  const args = process.argv.slice(2);
  const path = args.slice(0, 1)[0];
  console.log(path);

  await exportHighlightsWithNotes({ path });
}

const exportHighlightsWithNotes = async ({ path }) => {
  fs.readFile(path, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    const filtered = filterTrash(data);
    writeToDocx(filtered);

    console.info("Done!");
  });
};

const filterTrash = (html = "") => {
  const notesRegexp =
    /<p\s+class=\".*?\"\s+data-e2e="video-section-text">(.*?)<\/p>(<\/div><p.*?data-e2e="video-note-text">(.*?)<\/p>)*/gm;
  const linksRegexp = /\/learn\/[\w\d-]+\/lecture\/[\w]+\?t=\d+/gm;

  const matchedNotes = [...html.matchAll(notesRegexp)];
  const matchedLinks = [...html.matchAll(linksRegexp)];

  const returnVal = [];
  for (let i = 0; i < matchedNotes.length; i++) {
    const link = matchedLinks[i];
    const note = matchedNotes[i];

    returnVal.push({
      note: note[1],
      ...(note[3] && { yourNote: note[3] }),
      link: `https://www.coursera.org${link}`,
    });
  }

  return returnVal;
};

const writeToDocx = (data) => {
  const children = [];

  for (const note of data) {
    const paragraph = new Paragraph({
      text: note.note,
    });
    const yourNotes = new Paragraph({
      text: note.yourNote || "",
    });

    const link = new Paragraph({
      children: [
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: "Link",
              style: "Hyperlink",
            }),
          ],
          link: note.link,
        }),
      ],
    });

    if (note.yourNote)
      children.push(
        paragraph,
        new Paragraph({ text: "" }),
        new Paragraph({ text: "Your note: ", style: "Strong" }),
        yourNotes,
        link,
        new Paragraph({ text: "" })
      );
    else children.push(paragraph, link, new Paragraph({ text: "" }));
  }

  const doc = new docx.Document({
    sections: [
      {
        children,
      },
    ],
  });

  Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(`${__dirname}/exports/highlights.docx`, buffer);
  });
};

main();
