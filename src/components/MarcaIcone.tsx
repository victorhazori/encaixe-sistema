/** Ícone da marca Encaixe: E + check (encaixe confirmado). */
export function MarcaIcone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 6.5h16.5a2 2 0 1 1 0 4H13.5v3.75H22a2 2 0 1 1 0 4h-8.5V21H25a2 2 0 1 1 0 4H8A2 2 0 0 1 6 23V8.5A2 2 0 0 1 8 6.5z"
      />
      <path
        fill="currentColor"
        d="m19.85 22.35 2.85 2.75c.55.52 1.45.5 1.97-.05L30 19.9l-2.5-2.4-4.05 3.9-1.4-1.35-2.2 2.3z"
      />
    </svg>
  );
}
