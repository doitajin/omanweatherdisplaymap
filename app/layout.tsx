import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Oman 3D Weather Map',
  description: 'Interactive 3D topographic weather map of the Sultanate of Oman featuring real-time temperature, humidity, and atmospheric conditions across all 11 governorates.',
  openGraph: {
    title: 'Oman 3D Weather Map',
    description: 'Interactive 3D topographic weather map of the Sultanate of Oman featuring real-time temperature, humidity, and atmospheric conditions across all 11 governorates.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oman 3D Weather Map',
    description: 'Interactive 3D topographic weather map of the Sultanate of Oman featuring real-time temperature, humidity, and atmospheric conditions across all 11 governorates.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} dark`}>
      <body className="font-sans antialiased bg-[#090D14] text-slate-100 overflow-hidden select-none" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
