import "./globals.css";
import StartPageMusic from "@/components/audio/start-page-music";

export const metadata = {
  title: "Zakzum Online",
  description: "Fantasy PoC with registration and progression.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StartPageMusic src="/audio/music/Intro.mp3">
          {children}
        </StartPageMusic>
      </body>
    </html>
  );
}
