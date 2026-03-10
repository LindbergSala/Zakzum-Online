import "./globals.css";

export const metadata = {
  title: "Zakzum Online",
  description: "Fantasy PoC med registrering och progression.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
