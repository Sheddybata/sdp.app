import Image from "next/image";
import type { TranslationKeys } from "@/lib/i18n/translations";
import { HomeQuickInfoPanel } from "@/components/home/HomeQuickInfoPanel";

type HomeCopy = TranslationKeys["home"];

const CHAIRMAN_PORTRAIT = "/images/dr.sadiq.jpg";
/** National secretariat building — add `natsec.jpeg` in /public/images/. */
const SECRETARIAT_IMAGE = "/images/natsec.jpeg";

/** Photo beside name/role; full-width message below so the quote uses the whole column. */
function LeadershipQuote({
  quote,
  name,
  role,
  imageSrc,
}: {
  quote: string;
  name: string;
  role: string;
  imageSrc: string;
}) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 sm:h-14 sm:w-14">
          <Image
            src={imageSrc}
            alt={name}
            fill
            className="object-cover object-top"
            sizes="56px"
            priority={false}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-neutral-900 sm:text-base">{name}</p>
          <p className="mt-0.5 text-xs leading-snug text-neutral-500 sm:text-sm">{role}</p>
        </div>
      </div>

      <blockquote className="m-0 w-full min-w-0 border-y-0 border-r-0 border-l-[3px] border-solid border-sdp-primary py-0 pl-4 sm:pl-5">
        <p className="text-sm leading-relaxed text-neutral-600 sm:leading-relaxed">{quote}</p>
      </blockquote>
    </div>
  );
}

export function HomeInstitutionalSection({ home }: { home: HomeCopy }) {
  const t = home;

  return (
    <section
      aria-labelledby="home-leadership-heading"
      className="mb-14 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
    >
      <div className="grid min-w-0 gap-10 lg:grid-cols-12 lg:gap-12 lg:items-start">
        <div className="lg:col-span-5">
          <figure className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            <div className="relative aspect-[16/10] w-full bg-neutral-100">
              <Image
                src={SECRETARIAT_IMAGE}
                alt={t.secretariatCaption}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority={false}
              />
            </div>
            <figcaption className="border-t border-neutral-200 bg-white px-4 py-3 text-caption text-neutral-600">
              <span className="font-medium text-neutral-800">{t.secretariatCaption}</span>
            </figcaption>
          </figure>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <h2
            id="home-leadership-heading"
            className="text-overline font-semibold uppercase tracking-wide text-sdp-accent"
          >
            {t.leadershipHeading}
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-snug text-neutral-500 sm:text-sm">
            {t.leadershipSubheading}
          </p>

          <div className="mt-8">
            <LeadershipQuote
              quote={t.chairmanQuote}
              name={t.chairmanName}
              role={t.chairmanRole}
              imageSrc={CHAIRMAN_PORTRAIT}
            />
          </div>

          <HomeQuickInfoPanel heading={t.quickInfoHeading} bullets={t.quickInfoBullets} />
        </div>
      </div>
    </section>
  );
}
