import { C, F, R } from '../theme';

/**
 * Рамка браузера над сторінкою: три кружечки й адреса.
 *
 * Навіщо. Знімок сторінки сам по собі може прочитатись як макет у презентації.
 * Один рядок браузера знімає це питання за півсекунди — глядач бачить, що це
 * сайт, у який можна зайти.
 *
 * Чому адреса намальована, а не знята. Знімали з `localhost:3000`, і показувати
 * це в промо не можна. Малюємо той домен, під яким платформа й буде працювати.
 *
 * Висота рядка враховується в кадруванні сцени: рамка ЗАБИРАЄ місце в екрана,
 * а не лягає поверх сторінки. Поверх вона затуляла б шапку навігації — тобто
 * рівно те, за чим глядач стежить, коли розділ змінюється.
 */

export const CHROME_H = 64;

export const BrowserChrome: React.FC<{ url?: string; opacity?: number }> = ({
  url = 'proai.od.gov.ua',
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: CHROME_H,
      display: 'flex',
      alignItems: 'center',
      gap: 26,
      padding: '0 28px',
      background: 'linear-gradient(180deg, #F3EFE6 0%, #E9E3D6 100%)',
      borderBottom: `1px solid rgba(38,34,74,.14)`,
      opacity,
    }}
  >
    <div style={{ display: 'flex', gap: 11 }}>
      {['#E06C5B', '#E8B84B', '#67B06A'].map((color) => (
        <span key={color} style={{ width: 17, height: 17, borderRadius: R.pill, background: color }} />
      ))}
    </div>

    <div
      style={{
        flex: 1,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderRadius: R.pill,
        background: C.white,
        boxShadow: 'inset 0 0 0 1px rgba(38,34,74,.10)',
      }}
    >
      {/* Замок — не прикраса: платформа про безпеку даних, і захищене з'єднання
          в кадрі працює на ту саму думку. */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="10" width="16" height="11" rx="3" fill={C.green} />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={C.green} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: F.text, fontSize: 21, fontWeight: 500, color: C.inkSoft, letterSpacing: 0.2 }}>
        {url}
      </span>
    </div>

    {/* Порожнє поле праворуч тієї ж ширини, що й кружечки: без нього адреса
        стоїть не по центру рядка, і рамка виглядає зібраною абияк. */}
    <div style={{ width: 63 }} />
  </div>
);
