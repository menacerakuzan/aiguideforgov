import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { join } from 'node:path';

// Шрифтові файли скопійовані в apps/web/fonts (джерело — @fontsource/nunito),
// а не require.resolve()-нуті з node_modules: webpack статично намагається
// розпарсити будь-який шлях, знайдений через require/require.resolve, як
// JS-модуль — навіть бінарний .woff — і білд падає. Плоский шлях від
// process.cwd() (корінь apps/web під час next build/start) обходить це.
const FONT_DIR = join(process.cwd(), 'fonts');

let registered = false;
function ensureFontsRegistered() {
  if (registered) return;
  Font.register({
    family: 'Nunito',
    fonts: [
      { src: join(FONT_DIR, 'nunito-cyrillic-400-normal.woff'), fontWeight: 400 },
      { src: join(FONT_DIR, 'nunito-cyrillic-600-normal.woff'), fontWeight: 600 },
      { src: join(FONT_DIR, 'nunito-cyrillic-700-normal.woff'), fontWeight: 700 },
      { src: join(FONT_DIR, 'nunito-cyrillic-900-normal.woff'), fontWeight: 900 },
    ],
  });
  registered = true;
}

const INK = '#26224a';
const GOLD = '#d89a25';
const GOLD_DEEP = '#5e4310';
const BLUE = '#3763e8';
const PAPER = '#fff9f0';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Nunito',
    backgroundColor: PAPER,
    padding: 0,
  },
  outerBorder: {
    margin: 22,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 4,
    flexGrow: 1,
    padding: 26,
  },
  innerBorder: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 4,
    flexGrow: 1,
    padding: 28,
    alignItems: 'center',
  },
  mainContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  dot: { width: 9, height: 9, borderRadius: 999 },
  brand: { fontSize: 16, fontWeight: 900, color: INK, letterSpacing: 1 },
  eyebrow: { fontSize: 11, fontWeight: 700, color: GOLD_DEEP, letterSpacing: 3, marginBottom: 6 },
  title: { fontSize: 30, fontWeight: 900, color: INK, marginBottom: 22, letterSpacing: 1 },
  bodyLine: { fontSize: 12, color: '#5d5880', textAlign: 'center', marginBottom: 4 },
  name: { fontSize: 28, fontWeight: 800, color: BLUE, marginTop: 8, marginBottom: 8 },
  position: { fontSize: 12, color: '#5d5880', marginBottom: 2 },
  org: { fontSize: 12, color: '#5d5880', marginBottom: 18 },
  scoreRow: { flexDirection: 'row', gap: 28, marginBottom: 22 },
  scoreBlock: { alignItems: 'center' },
  scoreValue: { fontSize: 20, fontWeight: 900, color: INK },
  scoreLabel: { fontSize: 9, color: '#6e6992', letterSpacing: 1, marginTop: 2 },
  honors: {
    fontSize: 11,
    fontWeight: 700,
    color: GOLD_DEEP,
    backgroundColor: '#fcf3dc',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e7e2d6',
  },
  footerCol: { alignItems: 'center', flexGrow: 1 },
  footerLabel: { fontSize: 8, color: '#6e6992', letterSpacing: 1, marginBottom: 3 },
  footerValue: { fontSize: 10, fontWeight: 700, color: INK },
  code: { fontFamily: 'Nunito', fontSize: 11, fontWeight: 700, color: INK, letterSpacing: 1 },
});

export interface CertificatePdfData {
  code: string;
  holderName: string;
  holderPosition: string | null;
  organizationName: string | null;
  score: number;
  withHonors: boolean;
  issuedAt: string;
  validUntil: string;
  courseTitle: string;
}

function fmt(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function CertificateDocument({ data }: { data: CertificatePdfData }) {
  ensureFontsRegistered();

  return (
    <Document title={`Сертифікат ${data.code}`} author="ПРО.ШІ">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            <View style={styles.mainContent}>
              <View style={styles.brandRow}>
                <View style={[styles.dot, { backgroundColor: '#16b77a' }]} />
                <View style={[styles.dot, { backgroundColor: GOLD }]} />
                <View style={[styles.dot, { backgroundColor: '#cc3e27' }]} />
                <Text style={styles.brand}>ПРО.ШІ</Text>
              </View>

              <Text style={styles.eyebrow}>СЕРТИФІКАТ ПРО ПРОХОДЖЕННЯ КУРСУ</Text>
              <Text style={styles.title}>{data.courseTitle}</Text>

              <Text style={styles.bodyLine}>Засвідчує, що</Text>
              <Text style={styles.name}>{data.holderName}</Text>
              {data.holderPosition && <Text style={styles.position}>{data.holderPosition}</Text>}
              {data.organizationName && <Text style={styles.org}>{data.organizationName}</Text>}

              <Text style={styles.bodyLine}>успішно пройшов(ла) курс і склав(ла) фінальну атестацію</Text>

              <View style={styles.scoreRow}>
                <View style={styles.scoreBlock}>
                  <Text style={styles.scoreValue}>{data.score}%</Text>
                  <Text style={styles.scoreLabel}>РЕЗУЛЬТАТ</Text>
                </View>
              </View>

              {data.withHonors && <Text style={styles.honors}>СКЛАДЕНО З ВІДЗНАКОЮ</Text>}
            </View>

            <View style={styles.footerRow}>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>ВИДАНО</Text>
                <Text style={styles.footerValue}>{fmt(data.issuedAt)}</Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>КОД ПЕРЕВІРКИ</Text>
                <Text style={styles.code}>{data.code}</Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>ЧИННИЙ ДО</Text>
                <Text style={styles.footerValue}>{fmt(data.validUntil)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
