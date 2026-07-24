import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prisma Client і @react-pdf/renderer бандляться неправильно (нативні/динамічні
  // ресурси губляться при трасуванні webpack) — тримаємо їх зовнішніми пакетами,
  // які резолвяться напряму з node_modules у рантаймі.
  serverExternalPackages: ['@prisma/client', '@react-pdf/renderer'],

  // Workspace-пакети без збірки: Next компілює їх напряму з вихідників.
  transpilePackages: [
    '@yasno/ui',
    '@yasno/icons',
    '@yasno/types',
    '@yasno/db',
    '@yasno/auth',
    '@yasno/learning',
    '@yasno/prompts',
    '@yasno/certificates',
    '@yasno/analytics',
    '@yasno/infra',
  ],
};

export default nextConfig;
