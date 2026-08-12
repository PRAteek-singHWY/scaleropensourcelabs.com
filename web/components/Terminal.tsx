// A terminal block.
//
// The motif is doing a job rather than signalling "developer aesthetic": the
// commands in it are the real, working commands for the club's own repository, so
// the block is simultaneously the page's visual texture and the thing a reader
// copies into their shell. That is why it is built from <pre><code> rather than
// styled divs — the text has to survive being selected and pasted, with the
// prompts excluded from the copy.
//
// Excluding the prompt from what gets copied is the detail that makes it usable.
// A `$` glued to the front of the command is the oldest paper cut in developer
// documentation; `user-select: none` on the prompt span means a reader can drag
// across three lines and paste three runnable commands.
//
// The window chrome is three dots and a title, and they are aria-hidden: a screen
// reader announcing "circle circle circle" before every code block is pure noise.
// The <pre> carries the accessible name instead.

export type Line =
  | { kind: "cmd"; text: string }
  /** Output. Dimmer, no prompt, not copyable as a command. */
  | { kind: "out"; text: string }
  /** A comment line the reader is meant to read, not run. */
  | { kind: "note"; text: string };

export default function Terminal({
  title,
  lines,
  label,
  className = "",
}: {
  /** Shown in the window chrome. Usually the directory or the task. */
  title: string;
  lines: Line[];
  /** Accessible name for the block. */
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-tile border border-seam bg-sunk ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-seam px-4 py-2.5">
        <span aria-hidden className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-seam" />
          <span className="h-2.5 w-2.5 rounded-full bg-seam" />
          <span className="h-2.5 w-2.5 rounded-full bg-seam" />
        </span>
        <p className="truncate font-mono text-[13px] text-dust">{title}</p>
      </div>

      {/* overflow-x-auto on the scroller and not on the <pre>, so the padding stays
          put while a long command scrolls inside it. Long lines are NOT wrapped: a
          wrapped shell command is ambiguous about whether the break is a newline. */}
      <div className="overflow-x-auto">
        <pre
          tabIndex={0}
          aria-label={label}
          className="px-4 py-4 font-mono text-[13px] leading-relaxed"
        >
          {/* A GROUP, so the lines print in sequence as the block arrives rather
              than the whole listing existing at once. This is the one place on the
              site where the reveal stagger is imitating something real — a shell
              writing output line by line — and the block is short enough (three to
              six lines) that the whole thing resolves in about half a second.
              Nothing about the text depends on it: the lines are ordinary DOM,
              selectable and copyable at every point in the animation. */}
          <code data-reveal-group>
            {lines.map((l, i) => {
              if (l.kind === "note") {
                return (
                  <span key={i} className="block whitespace-pre text-dust">
                    {`# ${l.text}`}
                  </span>
                );
              }
              if (l.kind === "out") {
                return (
                  <span key={i} className="block whitespace-pre text-haze">
                    {l.text}
                  </span>
                );
              }
              return (
                <span key={i} className="block whitespace-pre text-ink">
                  <span aria-hidden className="select-none text-accent">
                    {"$ "}
                  </span>
                  {l.text}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
