import { useState, type ReactNode } from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { StaticRouter } from 'react-router';
import { NewsLayout } from '../../../src/routes/News/NewsLayout';
import { PUBLIC_RESOURCES } from '../../../src/i18n/publicResources';

interface Props {
  lang: 'it' | 'en';
  path: string;
  languageLinks: Record<'it' | 'en', string>;
  children?: ReactNode;
}

/** Reuse the actual public navigation, footer and cookie controls with request-local language state. */
export default function LandingShell({lang, path, languageLinks, children}: Props) {
  const [instance] = useState(() => {
    const value = createInstance();
    void value.init({lng: lang, fallbackLng: 'it', resources: PUBLIC_RESOURCES,
      initAsync: false, interpolation: {escapeValue: false}, react: {useSuspense: false}});
    return value;
  });
  return (
    <I18nextProvider i18n={instance}>
      <StaticRouter location={path}>
        <NewsLayout languageLinks={languageLinks}>{children}</NewsLayout>
      </StaticRouter>
    </I18nextProvider>
  );
}
