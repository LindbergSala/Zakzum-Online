import "./globals.css";

export const metadata = {
  title: "Zakzum Online",
  description: "Fantasy PoC with registration and progression.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
