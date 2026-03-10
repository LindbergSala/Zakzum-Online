export default function ResourceStrip({ resources }) {
  if (!resources) {
    return null;
  }

  return (
    <p>
      <strong>HP:</strong> {resources.hp} | <strong>Energy:</strong>{" "}
      {resources.energy} | <strong>Gold:</strong> {resources.gold} |{" "}
      <strong>XP/Level:</strong> {resources.xp}/{resources.level} |{" "}
      <strong>Renown:</strong> {resources.renown} | <strong>Heat:</strong>{" "}
      {resources.heat}
    </p>
  );
}
