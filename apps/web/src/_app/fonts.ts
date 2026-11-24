import { Wix_Madefor_Display } from 'next/font/google';

export const wix = Wix_Madefor_Display({
  subsets: ['cyrillic', 'latin'],
  display: 'swap',
  variable: '--font-wix',
});
