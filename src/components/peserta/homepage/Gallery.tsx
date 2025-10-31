const events = [
  {
    name: "2024/2025",
    images: [
      "/webp/last-period/1.webp",
      "/webp/last-period/2.webp",
      "/webp/last-period/3.webp",
      "/webp/last-period/4.webp",
      "/webp/last-period/5.webp",
    ],
  },
  {
    name: "OPEN HOUSE 2025",
    images: [
      "/webp/openhouse/1.webp",
      "/webp/openhouse/2.webp",
      "/webp/openhouse/3.webp",
      "/webp/openhouse/4.webp",
      "/webp/openhouse/5.webp",
    ],
  },
];

const weekActivities = [
  {
    name: "WEEK 1",
    images: [
      "/webp/week-1/1.webp",
      "/webp/week-1/2.webp",
      "/webp/week-1/3.webp",
      "/webp/week-1/4.webp",
      "/webp/week-1/5.webp",
    ],
  },
];

export default function Gallery() {
  const duplicatedEvents = [...events, ...events];
  const duplicatedWeeks = [...weekActivities, ...weekActivities];

  return (
    <div className="w-full bg-[#0c1015] flex flex-col items-center overflow-hidden">
      {/* top track */}
      <div className="w-full overflow-hidden">
        <ul
          className="track flex items-center animate-scroll group-hover:pause"
          style={{ width: "max-content" }}
        >
          {duplicatedEvents.map((event, outerIndex) =>
            event.images.map((src, imgIndex) => {
              const key = `event-${outerIndex}-${imgIndex}-${src}`;
              return (
                <li key={key} className="flex-shrink-0">
                  <div className="relative min-w-[70vw] max-w-xs md:min-w-[18rem] md:max-w-sm h-56 shadow-lg overflow-hidden">
                    <div className="absolute top-0 left-0 w-full py-1 px-2 bg-yellow-400 text-gray-900 z-10 text-center text-xs font-semibold uppercase tracking-wider border-y-2 border-[#0c1015]">
                      {event.name}
                    </div>

                    <img
                      src={src}
                      alt={`Image from ${event.name}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="absolute top-0 left-0 w-full h-full bg-blue-900/20" />
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

    <div className="relative w-full h-[2.5rem] bg-yellow-400 border-y-2 border-[#0c1015] flex items-center justify-center z-20">
      <span className="absolute left-4 md:left-60 text-[#0c1015] font-semibold uppercase tracking-wider text-sm">
        Activities
      </span>

      <span className="absolute right-4 md:right-60 text-[#0c1015] font-semibold uppercase tracking-wider text-sm">
        Activities
      </span>

      <img
        src="/webp/bella-mascot.webp"
        alt="Mascot Bella"
        className="absolute z-30 h-28 w-auto rotate-12"
      />
    </div>


      {/* bot track */}
      <div className="w-full overflow-hidden">
        <ul
          className="track flex items-center animate-scroll-reverse group-hover:pause"
          style={{ width: "max-content" }}
        >
          {duplicatedWeeks.map((week, outerIndex) =>
            week.images.map((src, imgIndex) => {
              const key = `week-${outerIndex}-${imgIndex}-${src}`;
              return (
                <li key={key} className="flex-shrink-0">
                  <div className="relative min-w-[70vw] max-w-xs md:min-w-[18rem] md:max-w-sm h-56 shadow-lg overflow-hidden">
                    <img
                      src={src}
                      alt={`Image from ${week.name}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 left-0 w-full h-full bg-blue-900/20" />

                    <div className="absolute bottom-0 left-0 w-full py-1 px-2 bg-yellow-400 text-gray-900 z-10 text-center text-xs font-semibold uppercase tracking-wider border-y-2 border-[#0c1015]">
                      {week.name}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
