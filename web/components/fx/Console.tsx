"use client";

// The footer easter egg: a one-line shell that actually does something.
//
// NOT fixed to the viewport, and that is a deliberate departure from "a bar at the
// bottom of the page". StickyCTA is already `fixed inset-x-0 bottom-0` and already
// reserves 4.5rem of body padding to avoid covering the footer; a second fixed bar
// would either sit on top of it or need a second reservation, and two permanently
// docked bars on a phone is most of the screen gone. In the footer it is a reward
// for reaching the bottom, which is what an easter egg should be.
//
// Everything here degrades. With JavaScript off it is an inert text input in a
// footer — visibly a toy, not a broken control.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JOIN_HREF } from "@/content/site";

type Line = { id: number; text: string; tone: "in" | "out" };

const HELP = [
  "join     — jump to the application form",
  "who      — who runs this",
  "clear    — wipe the scrollback",
  "help     — this",
];

const EASTER = [
  "nobody asked for this console. that is how most open source starts.",
  "no build step. no bundler. no framework. just vibes and one useState.",
  "there is no `sudo` here. ask an organiser nicely instead.",
  "`git blame` says this was your idea.",
];

export default function Console() {
  const [lines, setLines] = useState<Line[]>([
    { id: 0, text: "type `help` if you are curious", tone: "out" },
  ]);
  const [value, setValue] = useState("");
  const next = useRef(1);
  const router = useRouter();

  const push = (text: string, tone: Line["tone"]) =>
    setLines((l) => [...l, { id: next.current++, text, tone }]);

  function run(raw: string) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    push(`guest@osc:~ $ ${raw}`, "in");

    switch (cmd) {
      case "join": {
        // SCROLL IF THE TARGET IS HERE, ROUTE IF IT IS NOT — and the branch is the
        // whole reason this changed. The console lives in the footer, and the footer
        // is now on all six routes, so the form is on exactly one of the pages this
        // command can be typed from. The old version looked up #af-name, got null on
        // five pages out of six, and did nothing at all: the reader typed `join`,
        // saw "opening the application form…", and stayed exactly where they were.
        //
        // On /join itself the in-page path is still the better one. scrollIntoView
        // respects the smooth behaviour and scroll-padding already set on <html>, so
        // the field lands clear of the floating nav without this needing to know the
        // nav's height, and it does not throw away a page the reader is already on.
        const field = document.getElementById("af-name");
        push("opening the application form…", "out");
        if (field) {
          field.scrollIntoView({ block: "center" });
          // focus() after the scroll, and preventScroll so the browser does not
          // immediately jump the element to the top of the viewport and undo the
          // centring above.
          window.setTimeout(() => field.focus({ preventScroll: true }), 450);
        } else {
          router.push(JOIN_HREF);
        }
        break;
      }
      case "who": {
        // Same branch as `join`, against the team page. block:"start" rather than
        // "center" because the section has a heading — landing on it reads as
        // arriving at the team, and scroll-padding-top on <html> keeps that heading
        // clear of the floating nav.
        const team = document.getElementById("team");
        push("students at scaler school of technology. taking you to them…", "out");
        if (team) team.scrollIntoView({ block: "start" });
        else router.push("/team");
        break;
      }
      case "clear":
        // `clear` empties the scrollback, as it should — and then says something,
        // because a control that appears to do nothing reads as broken.
        setLines([{ id: next.current++, text: EASTER[0], tone: "out" }]);
        return;
      case "help":
        HELP.forEach((h) => push(h, "out"));
        break;
      default:
        push(
          `${cmd}: command not found — ${EASTER[Math.floor(cmd.length % EASTER.length)]}`,
          "out",
        );
    }
  }

  return (
    <div className="card card-still mt-7 overflow-hidden rounded-tile">
      <div
        className="px-4 py-3 font-mono text-xs leading-relaxed"
        style={{ background: "#0F172A" }}
      >
        {/* The scrollback. aria-live=polite so a command's output is announced
            when it lands, rather than a screen-reader user typing into a box that
            silently changes somewhere below them. Capped in height so a long
            session cannot push the footer off the page. */}
        <div
          aria-live="polite"
          className="scroll-strip max-h-32 overflow-y-auto"
        >
          {lines.map((l) => (
            <p
              key={l.id}
              style={{ color: l.tone === "in" ? "#E2E8F0" : "#94A3B8" }}
            >
              {l.text}
            </p>
          ))}
        </div>

        <form
          className="mt-1.5 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
            setValue("");
          }}
        >
          <label htmlFor="osc-console" className="shrink-0" style={{ color: "#4ADE80" }}>
            guest@osc:~ $
            <span className="sr-only"> run a command</span>
          </label>
          <input
            id="osc-console"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            // A real input rather than a keydown listener on the document: it can
            // be tapped on a phone, it raises a keyboard, and it does not fight
            // the rest of the page for keystrokes.
            // min-h-10 clears the 40px touch floor. A bare inline input in a
            // mono row is 20px tall, which is a fine mouse target and half of a
            // usable one on a phone — the height is invisible here because the
            // background is transparent, so it costs nothing to make it tappable.
            className="min-h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#64748B]"
            style={{ color: "#E2E8F0", caretColor: "#4ADE80" }}
            placeholder="help"
          />
        </form>
      </div>
    </div>
  );
}
