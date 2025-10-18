import ClientProviders from './components/ClientProviders';

export const metadata = {
  title: 'Sora-2 Video Generation',
  description: 'Generate videos using OpenAI Sora-2 API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
