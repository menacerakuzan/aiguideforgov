import { Document, Page, View, Text, StyleSheet, Font, Svg, Rect, Path, Circle } from '@react-pdf/renderer';
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
  // Довгі назви курсів і прізвища переносяться по словах. Без цього
  // react-pdf рве слово посеред складу, що на документі виглядає як брак.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

const INK = '#26224a';
const INK_SOFT = '#5d5880';
const INK_MUTE = '#6e6992';
const GOLD = '#d89a25';
const GOLD_DEEP = '#5e4310';
const GOLD_TINT = '#fcf3dc';
const BLUE = '#3763e8';
const SUN = '#ffc93d';
const PAPER = '#fff9f0';
const HAIRLINE = '#e7e2d6';

const styles = StyleSheet.create({
  page: { fontFamily: 'Nunito', backgroundColor: PAPER, padding: 0 },
  outerBorder: { margin: 22, borderWidth: 3, borderColor: INK, borderRadius: 4, flexGrow: 1, padding: 10 },
  innerBorder: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 3,
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: 44,
    alignItems: 'center',
  },
  mainContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
  brand: { fontSize: 15, fontWeight: 900, color: INK, letterSpacing: 1.5 },

  eyebrow: { fontSize: 10, fontWeight: 700, color: GOLD_DEEP, letterSpacing: 3, marginBottom: 8 },
  courseTitle: {
    fontSize: 27,
    fontWeight: 900,
    color: INK,
    textAlign: 'center',
    lineHeight: 1.22,
    maxWidth: 560,
  },
  /** Коротка золота риска під назвою курсу — розділяє «за що» і «кому». */
  rule: { width: 62, height: 2.5, backgroundColor: GOLD, borderRadius: 2, marginTop: 14, marginBottom: 16 },

  bodyLine: { fontSize: 11, color: INK_SOFT, textAlign: 'center' },
  name: { fontSize: 28, fontWeight: 800, color: BLUE, marginTop: 7, marginBottom: 6, textAlign: 'center' },
  position: { fontSize: 11.5, color: INK_SOFT, textAlign: 'center' },
  org: { fontSize: 11.5, color: INK_SOFT, textAlign: 'center' },

  statement: { fontSize: 11, color: INK_SOFT, textAlign: 'center', marginTop: 14 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: GOLD_TINT,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  scoreValue: { fontSize: 17, fontWeight: 900, color: INK },
  scoreLabel: { fontSize: 8.5, color: GOLD_DEEP, letterSpacing: 1.4 },
  honors: {
    fontSize: 10,
    fontWeight: 700,
    color: GOLD_DEEP,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 16,
    letterSpacing: 0.8,
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  footerCol: { alignItems: 'center', flexGrow: 1, flexBasis: 0 },
  footerLabel: { fontSize: 7.5, color: INK_MUTE, letterSpacing: 1.2, marginBottom: 3 },
  footerValue: { fontSize: 10, fontWeight: 700, color: INK },
  code: { fontSize: 11.5, fontWeight: 900, color: INK, letterSpacing: 1.6 },
  verifyHint: { fontSize: 7.5, color: INK_MUTE, marginTop: 3 },
  disclaimer: { fontSize: 7.5, color: INK_MUTE, textAlign: 'center', marginTop: 10 },
});

/**
 * Знак «ПРО.ШІ» — монограма «Ш» із крапкою, що добирає «І».
 * Повторює packages/ui BrandMark: документ і застосунок мають бути підписані
 * одним знаком. Раніше тут лишався старий світлофор із трьох крапок, тобто
 * єдиний папірець, який людина несе назовні, був підписаний тим, чого на
 * платформі вже немає.
 */
function BrandMonogram({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x="5.5" y="5.5" width="31" height="31" rx="10.5" fill={INK} />
      <Rect x="2.5" y="2" width="31" height="31" rx="10.5" fill={BLUE} stroke={INK} strokeWidth={3} />
      <Path
        d="M11.2 11.4V23.2h13.6V11.4M18 11.4V23.2"
        stroke="#ffffff"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="27.8" cy="8.9" r="2.4" fill={SUN} />
    </Svg>
  );
}

export interface CertificatePdfData {
  code: string;
  holderName: string;
  holderPosition: string | null;
  organizationName: string | null;
  score: number;
  withHonors: boolean;
  issuedAt: string;
  validUntil: string;
  /** Назва курсу зі самого сертифіката (знімок на день видачі). */
  courseTitle: string;
  /** Домен для підказки «перевірити за кодом». Порожньо — рядок не друкуємо. */
  verifyOrigin?: string | null;
}

function fmt(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Домен без схеми: на папері «https://» — шум, який ніхто не набирає. */
function bareHost(origin: string): string {
  return origin.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function CertificateDocument({ data }: { data: CertificatePdfData }) {
  ensureFontsRegistered();

  const host = data.verifyOrigin ? bareHost(data.verifyOrigin) : null;

  return (
    <Document title={`Сертифікат ${data.code} — ${data.courseTitle}`} author="ПРО.ШІ" subject={data.courseTitle}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            <View style={styles.mainContent}>
              <View style={styles.brandRow}>
                <BrandMonogram />
                <Text style={styles.brand}>ПРО.ШІ</Text>
              </View>

              <Text style={styles.eyebrow}>СЕРТИФІКАТ ПРО ПРОХОДЖЕННЯ КУРСУ</Text>
              <Text style={styles.courseTitle}>{data.courseTitle}</Text>
              <View style={styles.rule} />

              <Text style={styles.bodyLine}>Засвідчує, що</Text>
              <Text style={styles.name}>{data.holderName}</Text>
              {data.holderPosition && <Text style={styles.position}>{data.holderPosition}</Text>}
              {data.organizationName && <Text style={styles.org}>{data.organizationName}</Text>}

              <Text style={styles.statement}>
                успішно пройшов(ла) курс і склав(ла) фінальну атестацію
              </Text>

              <View style={styles.badgeRow}>
                <View style={styles.scorePill}>
                  <Text style={styles.scoreValue}>{data.score}%</Text>
                  <Text style={styles.scoreLabel}>РЕЗУЛЬТАТ</Text>
                </View>
                {data.withHonors && <Text style={styles.honors}>СКЛАДЕНО З ВІДЗНАКОЮ</Text>}
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>ВИДАНО</Text>
                <Text style={styles.footerValue}>{fmt(data.issuedAt)}</Text>
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>КОД ПЕРЕВІРКИ</Text>
                <Text style={styles.code}>{data.code}</Text>
                {host && <Text style={styles.verifyHint}>{host}/verify</Text>}
              </View>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>ЧИННИЙ ДО</Text>
                <Text style={styles.footerValue}>{fmt(data.validUntil)}</Text>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              Засвідчує проходження курсу. Не є документом, що підтверджує особу.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
