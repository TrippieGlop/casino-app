import './globals.css';
import { AppProvider } from '@/components/app/AppProvider';

export const metadata = {
  title: 'Card Hub',
  description: 'Card Hub casino-style card games',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
