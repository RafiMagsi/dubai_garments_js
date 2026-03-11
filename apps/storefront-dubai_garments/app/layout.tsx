import type { Metadata } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Dubai Garments',
  description: 'Bulk garment ordering and quote requests',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('dg_theme');
                  if (theme) document.documentElement.setAttribute('data-dg-theme', theme);
                  if (theme === 'custom') {
                    var raw = localStorage.getItem('dg_custom_theme');
                    if (raw) {
                      var t = JSON.parse(raw);
                      if (t.brand500) document.documentElement.style.setProperty('--color-brand-500', t.brand500);
                      if (t.brand600) document.documentElement.style.setProperty('--color-brand-600', t.brand600);
                      if (t.brandMid) document.documentElement.style.setProperty('--color-brand-mid', t.brandMid);
                      if (t.brandDeep) document.documentElement.style.setProperty('--color-brand-deep', t.brandDeep);
                      if (t.accent500) document.documentElement.style.setProperty('--color-accent-500', t.accent500);
                      if (t.ink900) document.documentElement.style.setProperty('--color-ink-900', t.ink900);
                      if (t.ink700) document.documentElement.style.setProperty('--color-ink-700', t.ink700);
                      if (t.ink500) document.documentElement.style.setProperty('--color-ink-500', t.ink500);
                      if (t.surfaceSoft) document.documentElement.style.setProperty('--color-surface-soft', t.surfaceSoft);
                      if (t.border) document.documentElement.style.setProperty('--color-border', t.border);
                      if (t.topbarFrom) document.documentElement.style.setProperty('--topbar-from', t.topbarFrom);
                      if (t.topbarTo) document.documentElement.style.setProperty('--topbar-to', t.topbarTo);
                      if (t.headerText) document.documentElement.style.setProperty('--dg-header-text', t.headerText);
                      if (t.headerSubtext) document.documentElement.style.setProperty('--dg-header-subtext', t.headerSubtext);
                      if (t.footerBg) document.documentElement.style.setProperty('--dg-footer-bg', t.footerBg);
                      if (t.footerText) document.documentElement.style.setProperty('--dg-footer-text', t.footerText);
                      if (t.cardBg) document.documentElement.style.setProperty('--dg-card-bg', t.cardBg);
                      if (t.cardText) document.documentElement.style.setProperty('--dg-card-text', t.cardText);
                      if (t.buttonPrimaryText) document.documentElement.style.setProperty('--dg-button-primary-text', t.buttonPrimaryText);
                      if (t.buttonSecondaryBg) document.documentElement.style.setProperty('--dg-button-secondary-bg', t.buttonSecondaryBg);
                      if (t.buttonSecondaryText) document.documentElement.style.setProperty('--dg-button-secondary-text', t.buttonSecondaryText);
                      if (t.textMain) document.documentElement.style.setProperty('--dg-text-main', t.textMain);
                      if (t.textMuted) document.documentElement.style.setProperty('--dg-text-muted', t.textMuted);
                      if (t.fontBase) document.documentElement.style.setProperty('--dg-font-family', t.fontBase);
                      if (t.fontHeader) document.documentElement.style.setProperty('--dg-font-header', t.fontHeader);
                      if (t.fontFooter) document.documentElement.style.setProperty('--dg-font-footer', t.fontFooter);
                      if (t.fontCard) document.documentElement.style.setProperty('--dg-font-card', t.fontCard);
                      if (t.fontButton) document.documentElement.style.setProperty('--dg-font-button', t.fontButton);
                      if (t.fontText) document.documentElement.style.setProperty('--dg-font-text', t.fontText);
                      if (t.brand500 && /^#[0-9a-fA-F]{6}$/.test(t.brand500)) {
                        var h = t.brand500.replace('#', '');
                        var r = parseInt(h.slice(0, 2), 16);
                        var g = parseInt(h.slice(2, 4), 16);
                        var b = parseInt(h.slice(4, 6), 16);
                        document.documentElement.style.setProperty('--brand-rgb', r + ', ' + g + ', ' + b);
                      }
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
