import React from 'react';
import { Header } from '../../components/layout';
import { Link } from 'react-router-dom';

const featureCards = [
  {
    title: 'ULTRA - 4K LASER PROJECTION',
    description:
      'Our laser projectors deliver four times the resolution of standard digital cinema. Every frame renders with stunning clarity at 120 frames per second from the first grain to the most distant galaxy.',
    stats: [
      ['Resolution', '4096 x 2160 (4K DCI)'],
      ['Frame Rate', 'Up to 120fps HFR'],
      ['Peak Brightness', '60,000 lumens'],
      ['Screen Size', 'Up to 32 metres'],
      ['Contrast Ratio', '10,000:1 native'],
    ],
  },
  {
    title: 'DOLBY ATMOS SOUND',
    description:
      'Sound moves around you in three-dimensional space. With 64 speaker objects positioned throughout the hall - ceiling, walls, floor - audio becomes a physical sensation that anchors you completely in the story.',
    stats: [
      ['Speaker Objects', '64 discrete channels'],
      ['Coverage', '360 immersive field'],
      ['Frequency Range', '20Hz - 20kHz'],
      ['Peak SPL', '115 dB'],
      ['Subwoofers', '6 x 18" custom units'],
    ],
  },
];

const seatSteps = [
  {
    number: '01',
    title: 'SCAN AT THE DOOR',
    body:
      'The display screen at the hall entrance shows the live seat map. Hold your phone QR code to the scanner - your booking is verified instantly and your seat is highlighted.',
  },
  {
    number: '02',
    title: 'FIND YOUR SEAT',
    body:
      'The hall display shows your seat row and number. Walk through the aisle - your assigned seat’s LED pulses gently to guide you in dim conditions.',
  },
  {
    number: '03',
    title: 'SCAN AT YOUR SEAT',
    body:
      'Each seat has a small QR reader embedded in the armrest. Scan your code - the LED turns green. If you’ve sat in the wrong seat, it turns red, prompting a quick correction before the film begins.',
  },
];

const footerLinks = [
  {
    title: 'About CineMax',
    items: ['Description'],
  },
  {
    title: 'Quick Links',
    items: ['Movies', 'Cinemas', 'Experience'],
  },
  {
    title: 'Help',
    items: ['FAQs', 'Contact Us', 'Terms and Conditions', 'Privacy Policy'],
  },
];

const seatRows = [
  ['empty', 'empty', 'gold', 'green', 'empty', 'gold', 'red', 'empty'],
  ['gold', 'green', 'empty', 'gold', 'empty', 'green', 'gold', 'empty'],
  ['empty', 'gold', 'green', 'empty', 'red', 'empty', 'gold', 'green'],
  ['empty', 'empty', 'gold', 'green', 'gold', 'empty', 'empty', 'gold'],
] as const;

const seatLegend = [
  { color: '#2dd4bf', glow: '0 0 14px rgba(45,212,191,0.45)', label: 'LED Green', detail: 'Correct seat scanned ✓' },
  { color: '#f43f5e', glow: '0 0 14px rgba(244,63,94,0.45)', label: 'LED Red', detail: 'Wrong seat detected ✗' },
  { color: '#eab308', glow: '0 0 14px rgba(234,179,8,0.35)', label: 'Gold pulse', detail: 'Seat reserved, awaiting scan' },
  { color: '#374151', glow: 'none', label: 'Unlit', detail: 'Seat available / not booked' },
];

const seatStateStyles: Record<(typeof seatRows)[number][number], { border: string; background: string; shadow: string }> = {
  empty: {
    border: 'rgba(75, 85, 99, 0.45)',
    background: 'linear-gradient(180deg, rgba(31,41,55,0.28), rgba(17,24,39,0.6))',
    shadow: 'none',
  },
  green: {
    border: 'rgba(45, 212, 191, 0.75)',
    background: 'linear-gradient(180deg, rgba(45,212,191,0.18), rgba(15,23,42,0.88))',
    shadow: '0 0 18px rgba(45,212,191,0.35)',
  },
  red: {
    border: 'rgba(244, 63, 94, 0.75)',
    background: 'linear-gradient(180deg, rgba(244,63,94,0.18), rgba(15,23,42,0.88))',
    shadow: '0 0 18px rgba(244,63,94,0.3)',
  },
  gold: {
    border: 'rgba(234, 179, 8, 0.7)',
    background: 'linear-gradient(180deg, rgba(234,179,8,0.16), rgba(15,23,42,0.88))',
    shadow: '0 0 16px rgba(234,179,8,0.25)',
  },
};

const SeatCell: React.FC<{ state: keyof typeof seatStateStyles }> = ({ state }) => {
  const style = seatStateStyles[state];

  return (
    <div
      className="relative rounded-[0.95rem]"
      style={{
        width: '100%',
        aspectRatio: '0.9 / 1',
        border: `1px solid ${style.border}`,
        background: style.background,
        boxShadow: style.shadow,
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-t-[0.45rem]"
        style={{
          top: '-5px',
          width: '56%',
          height: '7px',
          border: `1px solid ${style.border}`,
          borderBottom: 'none',
          background: 'rgba(17,24,39,0.95)',
        }}
      />
    </div>
  );
};

export const ExperiencePage: React.FC = () => (
  <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
    <Header />

    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-5 md:py-8">
      <section className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white">The Experience</h1>
        <p className="mt-2 text-sm md:text-base" style={{ color: '#9ca3af' }}>
          Beyond the Screen
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {featureCards.map((card) => (
          <article
            key={card.title}
            className="rounded-[2rem] p-6 md:p-8"
            style={{
              background: 'linear-gradient(160deg, #0d1117, #111827)',
              border: '1px solid #1f2937',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: '#111827', border: '1px solid #1f2937', color: '#f3f4f6' }}>
              <span className="text-3xl">◫</span>
            </div>

            <h2 className="text-xl font-semibold text-white">{card.title}</h2>
            <p className="mt-4 text-sm leading-7" style={{ color: '#9ca3af' }}>
              {card.description}
            </p>

            <div className="mt-6 space-y-2">
              {card.stats.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 text-sm">
                  <span style={{ color: '#9ca3af' }}>{label}</span>
                  <span className="text-right font-medium" style={{ color: '#f87171' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section
        className="mt-8 rounded-[2rem] p-6 md:p-8"
        style={{
          background: 'linear-gradient(150deg, #0d1117, #111827)',
          border: '1px solid #1d4ed8',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: '#9ca3af' }}>
              Innovative
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">SMART SEAT TECHNOLOGY</h2>
            <p className="mt-4 text-sm leading-7 max-w-2xl" style={{ color: '#9ca3af' }}>
              Our patented LED seat system transforms seat assignment from a source of confusion into an intuitive, guided experience. Every seat has an embedded LED that communicates directly with our booking system.
            </p>

            <div className="mt-8 space-y-6">
              {seatSteps.map((step) => (
                <div key={step.number} className="grid gap-3 md:grid-cols-[56px_1fr]">
                  <div className="text-3xl font-light leading-none" style={{ color: '#f59e0b' }}>
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6" style={{ color: '#9ca3af' }}>
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-start">
            <div
              className="w-full rounded-[1.75rem] p-6 md:p-7"
              style={{
                background: 'linear-gradient(180deg, #111827, #0b0f18)',
                border: '1px solid #1f2937',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <div className="w-full">
                <div className="flex items-center gap-4 mb-8">
                  <span className="flex-1 h-px" style={{ backgroundColor: '#1f2937' }} />
                  <span
                    className="text-[0.7rem] font-semibold uppercase tracking-[0.45em]"
                    style={{ color: '#6b7280' }}
                  >
                    Screen
                  </span>
                  <span className="flex-1 h-px" style={{ backgroundColor: '#1f2937' }} />
                </div>

                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}>
                  {seatRows.flatMap((row, rowIndex) =>
                    row.map((seat, seatIndex) => (
                      <SeatCell key={`${rowIndex}-${seatIndex}`} state={seat} />
                    ))
                  )}
                </div>

                <div className="mt-8 pt-6 space-y-4 text-sm" style={{ borderTop: '1px solid #1f2937' }}>
                  {seatLegend.map((item) => (
                    <div key={item.label} className="flex items-center gap-4" style={{ color: '#9ca3af' }}>
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color, boxShadow: item.glow }}
                      />
                      <p>
                        <span style={{ color: '#f3f4f6' }}>{item.label}</span>
                        <span> — {item.detail}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer className="mt-auto" style={{ borderTop: '1px solid #111827', backgroundColor: '#080b10' }}>
      <div className="max-w-7xl mx-auto px-4 py-10 md:px-5 grid gap-8 md:grid-cols-4">
        {footerLinks.map((group) => (
          <div key={group.title}>
            <h3 className="text-white font-semibold mb-3">{group.title}</h3>
            <div className="flex flex-col gap-2 text-sm" style={{ color: '#9ca3af' }}>
              {group.items.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-white font-semibold mb-3">Follow Us</h3>
          <div className="flex items-center gap-3">
            {['f', 'i', '▶', '✉'].map((label) => (
              <span
                key={label}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: '#111827', color: '#f3f4f6', border: '1px solid #1f2937' }}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-5">
            <Link to="/movies" className="text-sm font-semibold" style={{ color: '#f87171', textDecoration: 'none' }}>
              Book a Show
            </Link>
          </div>
        </div>
      </div>
    </footer>
  </div>
);
