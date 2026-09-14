/**
 * The buy-in marker. Sits directly after a member's name wherever names appear,
 * so the money race is visible in the same table as everything else rather
 * than on a second page. Deliberately unstyled — colour is spoken for by the
 * leader and viewer highlights.
 */
export default function Money({ size = 11 }: { size?: 11 | 12 }) {
  return (
    <span
      aria-label="in for the money"
      title="In for the $10 buy-in"
      style={{ fontSize: size, verticalAlign: -1, marginLeft: 3 }}
    >
      💰
    </span>
  );
}
