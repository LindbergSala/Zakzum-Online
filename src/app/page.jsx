import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Zakzum Online</h1>
      <p>
        Skapa konto eller logga in for att fa tillgang till din sparade
        karaktar.
      </p>
      <p>
        <Link href="/register">Ga till registrering</Link>
      </p>
      <p>
        <Link href="/login">Ga till inloggning</Link>
      </p>
    </main>
  );
}
