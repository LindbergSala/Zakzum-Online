import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Zakzum Online</h1>
      <p>
        Create an account or log in to access your saved character.
      </p>
      <p>
        <Link href="/register">Go to registration</Link>
      </p>
      <p>
        <Link href="/login">Go to login</Link>
      </p>
    </main>
  );
}
