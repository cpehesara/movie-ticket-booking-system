import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout';

type CinemaCard = {
  id: number;
  name: string;
  location: string;
  screens: number;
  facilities: string[];
};

const cinemas: CinemaCard[] = [
  {
    id: 1,
    name: 'CinePlex Galle',
    location: 'Galle Fort Road, Galle',
    screens: 2,
    facilities: ['IMAX', '4K Projection', 'Food Court', 'Dolby Atmos', 'Recliner Seats', 'Parking'],
  },
  {
    id: 2,
    name: 'CinePlex Colombo City Center',
    location: 'Colombo 03, Western Province',
    screens: 8,
    facilities: ['IMAX', '4K Projection', 'Food Court', 'Dolby Atmos', 'Recliner Seats', 'Parking'],
  },
  {
    id: 3,
    name: 'CinePlex Kandy',
    location: 'Kandy Lake Road, Central Province',
    screens: 6,
    facilities: ['IMAX', '4K Projection', 'Food Court', 'Dolby Atmos', 'Recliner Seats', 'Parking'],
  },
  {
    id: 4,
    name: 'CinePlex Negombo',
    location: 'Negombo Beach Road, Western Province',
    screens: 5,
    facilities: ['IMAX', '4K Projection', 'Food Court', 'Dolby Atmos', 'Recliner Seats', 'Parking'],
  },
];

const ImagePlaceholder: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    className={`rounded-[1.5rem] flex items-center justify-center ${compact ? 'h-24 w-24' : 'h-52 w-full'}`}
    style={{
      background: 'linear-gradient(160deg, #111827, #0b1220)',
      border: '1px solid #1f2937',
    }}
  >
    <div
      className="rounded-[1.25rem] flex items-center justify-center"
      style={{
        width: compact ? '4.5rem' : '6rem',
        height: compact ? '4.5rem' : '6rem',
        border: '2px solid #4b5563',
        color: '#6b7280',
        fontSize: compact ? '0.72rem' : '0.85rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      Image
    </div>
  </div>
);

const CinemaCardItem: React.FC<{ cinema: CinemaCard; onShowtimes: () => void }> = ({ cinema, onShowtimes }) => (
  <article
    className="rounded-[1.75rem] p-5 md:p-6 flex flex-col"
    style={{
      background: 'linear-gradient(160deg, #0d1117, #111827)',
      border: '1px solid #1f2937',
      boxShadow: '0 16px 36px rgba(0, 0, 0, 0.2)',
    }}
  >
    <div className="mb-5">
      <ImagePlaceholder compact />
    </div>

    <h2 className="text-lg font-semibold text-white">{cinema.name}</h2>
    <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
      {cinema.location}
    </p>

    <div className="mt-4 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(220,38,38,0.14)', color: '#f87171', border: '1px solid rgba(220,38,38,0.22)' }}>
      {cinema.screens} Screens
    </div>

    <div className="mt-5 pt-5" style={{ borderTop: '1px solid #1f2937' }}>
      <p className="text-sm font-semibold text-white">Facilities</p>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm" style={{ color: '#9ca3af' }}>
        {cinema.facilities.map((facility) => (
          <span key={facility}>{facility}</span>
        ))}
      </div>
    </div>

    <button
      type="button"
      onClick={onShowtimes}
      className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all"
      style={{
        backgroundColor: '#dc2626',
        color: '#fff',
        boxShadow: '0 10px 20px rgba(220,38,38,0.18)',
      }}
    >
      View Showtime
    </button>
  </article>
);

export const CinemaPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-5 md:py-8">
        <section className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Our Cinemas</h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: '#9ca3af' }}>
            Experience movies in state-of-the-art theatres near you.
          </p>
        </section>

        <section
          className="rounded-[2rem] p-5 md:p-8"
          style={{
            background: 'linear-gradient(145deg, #0d1117, #111827)',
            border: '1px solid #1f2937',
            boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
          }}
        >
          <ImagePlaceholder />
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          {cinemas.map((cinema) => (
            <CinemaCardItem
              key={cinema.id}
              cinema={cinema}
              onShowtimes={() => navigate('/movies')}
            />
          ))}
        </section>
      </main>

      <footer
        className="mt-auto"
        style={{ borderTop: '1px solid #111827', backgroundColor: '#080b10' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-10 md:px-5 grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-white font-semibold mb-3">About CineMax</h3>
            <p className="text-sm leading-7" style={{ color: '#9ca3af' }}>
              Description
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Quick Links</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/movies" style={{ color: '#9ca3af', textDecoration: 'none' }}>Movies</Link>
              <Link to="/cinemas" style={{ color: '#9ca3af', textDecoration: 'none' }}>Cinemas</Link>
              <Link to="/experience" style={{ color: '#9ca3af', textDecoration: 'none' }}>Experience</Link>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Help</h3>
            <div className="flex flex-col gap-2 text-sm" style={{ color: '#9ca3af' }}>
              <span>FAQs</span>
              <span>Contact Us</span>
              <span>Terms and Conditions</span>
              <span>Privacy Policy</span>
            </div>
          </div>

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
          </div>
        </div>
      </footer>
    </div>
  );
};
