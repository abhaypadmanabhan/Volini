import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Volini | Voice Assistant',
    description: 'AI voice assistant built with LiveKit and OpenAI Realtime',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="antialiased min-h-screen bg-paywave-bg">
                {children}
            </body>
        </html>
    );
}
