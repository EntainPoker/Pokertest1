/**
 * Displayed when no games are available in the lobby.
 * Satisfies Requirement 2.6: display a message when no games are available.
 */
export function EmptyLobbyMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">🃏</div>
      <h2 className="text-xl font-semibold text-gray-200 mb-2">
        No Games Available
      </h2>
      <p className="text-gray-400 max-w-md">
        There are no Spin &amp; Go games available right now. Please check back
        shortly — new games are created regularly.
      </p>
    </div>
  );
}
