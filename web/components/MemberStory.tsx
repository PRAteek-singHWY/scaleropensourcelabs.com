// One member's story, first person.
//
// ONE, not a carousel of testimonials. Three quotes read as marketing and get
// discounted as a set; a single long account from a named person with a face reads as
// somebody talking. The brief asks for one and that is also the right number.
//
// The quote is set at body-lg rather than in display type, and it is NOT centred and
// NOT wrapped in giant decorative quote marks. A student describing a confusing month
// does not want to be typeset as an inspirational poster — the treatment would
// contradict the content, which is the usual failure of this section on club sites.
// The only device is a hairline rule down the left of the text, which is the
// convention for a quotation and costs nothing.
//
// Consent is enforced in content/essence.ts, not here: publishedStories() filters on
// it, so a component cannot accidentally render somebody who did not agree.

import Portrait from "@/components/Portrait";
import { publishedStories } from "@/content/essence";

export default function MemberStory() {
  const story = publishedStories()[0];
  if (!story) return null;

  return (
    <figure className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
      <div>
        <div className="[container-type:inline-size]">
          <Portrait
            name={story.name}
            photo={story.photo}
            className="aspect-[4/5] w-full rounded-tile"
          />
        </div>

        <figcaption className="mt-5">
          <p className="text-body-lg font-semibold leading-snug">{story.name}</p>
          <p className="mt-1 text-sm text-haze">{story.situation}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {story.github && (
              <a
                href={`https://github.com/${story.github}`}
                target="_blank"
                rel="noreferrer"
                className="tap font-mono text-xs text-haze transition-colors hover:text-accent"
              >
                GitHub ↗
              </a>
            )}
            {story.proof && (
              <a
                href={story.proof.url}
                target="_blank"
                rel="noreferrer"
                className="tap font-mono text-xs text-accent transition hover:brightness-125"
              >
                {story.proof.label} ↗
              </a>
            )}
          </div>
        </figcaption>
      </div>

      <blockquote className="space-y-6 border-l border-seam pl-7 sm:pl-9">
        {story.quote.map((para, i) => (
          <p
            key={i}
            className={`text-body-lg ${i === 0 ? "text-ink" : "text-haze"}`}
          >
            {para}
          </p>
        ))}
      </blockquote>
    </figure>
  );
}
