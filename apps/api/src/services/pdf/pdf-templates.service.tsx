import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    fontFamily: "Helvetica"
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 16,
    marginBottom: 6
  },
  subtitle: {
    color: "#444"
  },
  section: {
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1px solid #ddd",
    paddingVertical: 4
  }
});

function makeTemplate(title: string) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>[Logo] {title}</Text>
          <Text style={styles.subtitle}>Mise en page aérée — Charcuterie Bartoli</Text>
        </View>
        <View style={styles.section}>
          <Text>Ce fichier est un gabarit de départ prêt à être enrichi.</Text>
        </View>
        <View>
          <View style={styles.row}>
            <Text>Champ 1</Text>
            <Text>Valeur</Text>
          </View>
          <View style={styles.row}>
            <Text>Champ 2</Text>
            <Text>Valeur</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generateDemoPdfs() {
  const outputDir = path.resolve(process.cwd(), "exports");
  await mkdir(outputDir, { recursive: true });

  const templates = [
    { name: "bon-livraison-template.pdf", title: "Bon de livraison signé" },
    { name: "fiche-lot-template.pdf", title: "Fiche de lot" },
    { name: "commande-consolidee-template.pdf", title: "Commande consolidée" },
    { name: "avoir-template.pdf", title: "Avoir" }
  ];

  const writtenFiles: string[] = [];
  for (const tpl of templates) {
    const filePath = path.join(outputDir, tpl.name);
    const instance = pdf(makeTemplate(tpl.title));
    const buffer = await instance.toBuffer();
    await writeFile(filePath, buffer);
    writtenFiles.push(filePath);
  }

  return writtenFiles;
}
