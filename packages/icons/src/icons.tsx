import { forwardRef } from 'react';
import { baseSvgProps, type IconProps } from './types';

/**
 * Іконки платформи «Ясно». Порт зі спрайту docs/design-reference/app.js.
 *
 * Сигнатурне тріо TlSafe / TlCaution / TlForbid навмисно має РІЗНІ силуети —
 * коло / трикутник / восьмикутник — щоб класифікація даних читалась
 * і без кольору (WCAG: інформація не лише через колір).
 */

function makeIcon(displayName: string, path: React.ReactNode) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 24, ...props }, ref) => (
    <svg ref={ref} width={size} height={size} {...baseSvgProps} {...props}>
      {path}
    </svg>
  ));
  Icon.displayName = displayName;
  return Icon;
}

/* --- Світлофор даних (сигнатурний набір) ----------------------------------- */

export const TlSafe = makeIcon(
  'TlSafe',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.2 2.6 2.6 5-5.6" />
  </>,
);

export const TlCaution = makeIcon(
  'TlCaution',
  <>
    <path d="M12 4.2 21.2 19.8H2.8z" />
    <path d="M12 10v3.4" />
    <circle cx="12" cy="16.6" r="1.05" fill="currentColor" stroke="none" />
  </>,
);

export const TlForbid = makeIcon(
  'TlForbid',
  <>
    <path d="M8.4 3.2h7.2l5.2 5.2v7.2l-5.2 5.2H8.4l-5.2-5.2V8.4z" />
    <path d="M8.6 15.4 15.4 8.6" />
  </>,
);

/* --- Статуси ----------------------------------------------------------------- */

export const Check = makeIcon('Check', <path d="M20 6 9 17l-5-5" strokeWidth={3.2} />);

export const XIcon = makeIcon('XIcon', <path d="M18 6 6 18M6 6l12 12" strokeWidth={2.8} />);

export const Play = makeIcon(
  'Play',
  <path
    d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z"
    fill="currentColor"
    stroke="none"
  />,
);

export const Clock = makeIcon(
  'Clock',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 1.8" />
  </>,
);

export const Lock = makeIcon(
  'Lock',
  <>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
);

/* --- Бренд і безпека ---------------------------------------------------------- */

export const Shield = makeIcon(
  'Shield',
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);

export const Award = makeIcon(
  'Award',
  <>
    <path d="m15.48 12.89 1.51 8.53a.5.5 0 0 1-.81.47l-3.58-2.69a1 1 0 0 0-1.2 0l-3.58 2.69a.5.5 0 0 1-.81-.47l1.51-8.53" />
    <circle cx="12" cy="8" r="6" />
  </>,
);

/* --- Дії ----------------------------------------------------------------------- */

export const Copy = makeIcon(
  'Copy',
  <>
    <rect width="13" height="13" x="9" y="9" rx="4" />
    <path d="M5 15c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
  </>,
);

export const Arrow = makeIcon(
  'Arrow',
  <>
    <path d="M5 12h13" strokeWidth={2.6} />
    <path d="m12 5 7 7-7 7" strokeWidth={2.6} />
  </>,
);

export const ArrowLeft = makeIcon(
  'ArrowLeft',
  <>
    <path d="M19 12H6" strokeWidth={2.6} />
    <path d="m12 19-7-7 7-7" strokeWidth={2.6} />
  </>,
);

/* --- Документи ------------------------------------------------------------------ */

export const Doc = makeIcon(
  'Doc',
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </>,
);

export const Mail = makeIcon(
  'Mail',
  <>
    <rect width="20" height="16" x="2" y="4" rx="5" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </>,
);

export const Chart = makeIcon(
  'Chart',
  <>
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </>,
);

/* --- Емоції продукту -------------------------------------------------------------- */

export const Spark = makeIcon(
  'Spark',
  <path
    d="M12 2.5 13.8 9 20 11l-6.2 2L12 19.5 10.2 13 4 11l6.2-2L12 2.5Z"
    fill="currentColor"
    stroke="none"
  />,
);

export const Flame = makeIcon(
  'Flame',
  <path
    d="M12 2s1.5 3.2-.8 5.6C9 10 8 11.4 8 13.4a4 4 0 0 0 8 0c0-1-.4-1.9-1-2.6.9.3 1.7.9 2.3 1.7.5-1.2.7-2.4.7-3.5C18 5.6 12 2 12 2Z"
    fill="currentColor"
    stroke="none"
  />,
);

export const Book = makeIcon(
  'Book',
  <>
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </>,
);

/* --- Навігація і UI ---------------------------------------------------------------- */

export const Menu = makeIcon('Menu', <path d="M4 7h16M4 12h16M4 17h16" strokeWidth={2.4} />);

export const EyeOff = makeIcon(
  'EyeOff',
  <>
    <path d="M10.73 5.08a10.74 10.74 0 0 1 11.21 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.45 2.49" />
    <path d="M14.08 14.16a3 3 0 0 1-4.24-4.24" />
    <path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14" />
    <path d="m2 2 20 20" />
  </>,
);

export const Info = makeIcon(
  'Info',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="7.8" r="1.05" fill="currentColor" stroke="none" />
  </>,
);

export const VideoIcon = makeIcon(
  'VideoIcon',
  <>
    <rect x="2.5" y="6" width="14" height="12" rx="2.5" />
    <path d="M16.5 10.2 21 7.6v8.8l-4.5-2.6Z" fill="currentColor" stroke="none" />
  </>,
);

export const Search = makeIcon(
  'Search',
  <>
    <circle cx="11" cy="11" r="7.5" />
    <path d="m20.5 20.5-4.3-4.3" />
  </>,
);

export const ThumbsUp = makeIcon(
  'ThumbsUp',
  <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4.5-8a2 2 0 0 1 3.5 1.3V8h4.2a2 2 0 0 1 1.98 2.3l-1.1 7A2 2 0 0 1 17.12 19H10a3 3 0 0 1-3-3v-5Z" />,
);

export const ThumbsDown = makeIcon(
  'ThumbsDown',
  <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Zm0 0-4.5 8a2 2 0 0 1-3.5-1.3V16H4.8a2 2 0 0 1-1.98-2.3l1.1-7A2 2 0 0 1 5.88 5H13a3 3 0 0 1 3 3v5Z" />,
);

export const Sun = makeIcon(
  'Sun',
  <>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.3M12 19.2v2.3M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.4 19.6 6 18M18 6l1.6-1.6" />
  </>,
);

export const Moon = makeIcon('Moon', <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />);

export const Users = makeIcon(
  'Users',
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 4.8a3.2 3.2 0 0 1 0 6.3" />
    <path d="M15 14.6c2.6.3 4.5 2.2 4.5 4.9" />
  </>,
);

export const Upload = makeIcon(
  'Upload',
  <>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </>,
);

/* --- Чат підтримки ------------------------------------------------------------- */

export const Chat = makeIcon(
  'Chat',
  <>
    <path d="M20.5 11.6c0 4.2-3.8 7.4-8.5 7.4-1.2 0-2.3-.2-3.3-.6L4 19.8l1.3-3.7c-1.1-1.3-1.8-2.8-1.8-4.5 0-4.2 3.8-7.6 8.5-7.6s8.5 3.4 8.5 7.6Z" />
    <circle cx="8.4" cy="11.7" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="12" cy="11.7" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="15.6" cy="11.7" r="1.05" fill="currentColor" stroke="none" />
  </>,
);

export const Send = makeIcon(
  'Send',
  <>
    <path d="M21 3 10.2 13.8" />
    <path d="M21 3 14.4 21l-4.2-7.2L3 9.6 21 3Z" />
  </>,
);
