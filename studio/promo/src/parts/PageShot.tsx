import { PageCam, type CamKey } from '../lib/PageCam';
import { BrowserChrome, CHROME_H } from './BrowserChrome';
import { SCREEN_H, SCREEN_W } from './DeviceFrame';

/**
 * Сторінка платформи в рамці браузера — те, що показує екран ноутбука.
 *
 * Уся робота тут — узгодити дві системи координат. `PageCam` вважає, що вікно
 * має рівно 1920×1080, і наводить задану точку сторінки в його центр (960, 540).
 * Рамка браузера забирає собі верхні 64 пікселі, тож під сторінку лишається
 * 1016 — і наведення поїхало б на 32 пікселі вниз.
 *
 * Тому `PageCam` отримує повні 1080 висоти, але піднімається на половину
 * висоти рамки всередині вікна, що обрізає. Центр камери після цього збігається
 * з центром видимої частини, і в монтажному плані координати лишаються
 * звичайними координатами сторінки — жодних поправок пам'ятати не треба.
 */
export const PageShot: React.FC<{
  src: string;
  pageH: number;
  keys: CamKey[];
  frame?: number;
  chrome?: boolean;
  chromeOpacity?: number;
  url?: string;
  children?: React.ReactNode;
}> = ({ src, pageH, keys, frame, chrome = true, chromeOpacity = 1, url, children }) => {
  const top = chrome ? CHROME_H : 0;

  return (
    <>
      {chrome ? <BrowserChrome url={url} opacity={chromeOpacity} /> : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top,
          width: SCREEN_W,
          height: SCREEN_H - top,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: -top / 2, width: SCREEN_W, height: SCREEN_H }}>
          <PageCam src={src} pageH={pageH} keys={keys} frame={frame}>
            {children}
          </PageCam>
        </div>
      </div>
    </>
  );
};
