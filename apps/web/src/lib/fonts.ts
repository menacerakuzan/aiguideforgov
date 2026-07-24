import { JetBrains_Mono, Nunito, Rubik } from 'next/font/google';

/**
 * Шрифти платформи, самохостяться через next/font (не Google CDN).
 * Кирилиця підключена явно — Nunito/Rubik/JetBrains Mono її підтримують.
 * Nunito на вагах 800/900 — навмисно «мультяшний»/chunky display-шрифт
 * (округлі термінали, великий x-height), заміна Comfortaa для соковитішого
 * cartoon-вигляду заголовків.
 */
export const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
});

export const rubik = Rubik({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rubik',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400'],
  variable: '--font-jetbrains',
  display: 'swap',
});
