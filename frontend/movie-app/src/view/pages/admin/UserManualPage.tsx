/**
 * UserManualPage — Complete system documentation for CinePlex.
 *
 * Covers all user roles and system features:
 *  - Customer: registration, browsing, booking, check-in
 *  - Admin / Manager: movies, showtimes, seats, staff, kiosks
 *  - Kiosk Operator: entrance check-in and seat arrival flows
 *  - IoT / Tech: LED strip, ESP32, MQTT, WebSocket, QR stickers
 *  - Troubleshooting
 */

import React, { useState, useRef, useEffect } from 'react';
import { Header, Sidebar } from '../../components/layout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  icon: string;
  color: string;
}

const SECTIONS: Section[] = [
  { id: 'overview',       title: 'System Overview',     icon: '◈', color: '#60a5fa' },
  { id: 'customer',       title: 'Customer Guide',       icon: '◉', color: '#4ade80' },
  { id: 'admin',          title: 'Admin & Manager',      icon: '▤', color: '#f87171' },
  { id: 'kiosk',          title: 'Kiosk Operations',     icon: '⬜', color: '#fb923c' },
  { id: 'iot',            title: 'IoT & LED System',     icon: '◎', color: '#a78bfa' },
  { id: 'qr-stickers',    title: 'Seat QR Stickers',     icon: '▣', color: '#fbbf24' },
  { id: 'troubleshooting',title: 'Troubleshooting',      icon: '⚙', color: '#6b7280' },
];

// ─── Style helpers ─────────────────────────────────────────────────────────────

const H2: React.FC<{ id: string; icon: string; color: string; children: React.ReactNode }> = ({
  id, icon, color, children,
}) => (
  <h2
    id={id}
    className="flex items-center gap-3 text-xl font-black text-white mb-4 pt-2"
    style={{ scrollMarginTop: '80px' }}
  >
    <span
      className="flex items-center justify-center w-9 h-9 rounded-xl text-base font-mono flex-shrink-0"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {icon}
    </span>
    {children}
  </h2>
);

const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-base font-bold text-white mt-5 mb-2">{children}</h3>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
    {children}
  </p>
);

const Note: React.FC<{ type?: 'info' | 'warn' | 'tip'; children: React.ReactNode }> = ({
  type = 'info', children,
}) => {
  const map = {
    info: { bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.25)',  text: '#60a5fa',  icon: 'ℹ' },
    warn: { bg: 'rgba(251,191,36,0.07)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24',  icon: '⚠' },
    tip:  { bg: 'rgba(74,222,128,0.07)',  border: 'rgba(74,222,128,0.25)',  text: '#4ade80',  icon: '✦' },
  };
  const s = map[type];
  return (
    <div
      className="rounded-xl px-4 py-3 my-3 flex gap-3"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
    >
      <span style={{ color: s.text, fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <p style={{ color: '#d1d5db', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  );
};

interface StepProps { number: number | string; title: string; children: React.ReactNode; }
const Step: React.FC<StepProps> = ({ number, title, children }) => (
  <div className="flex gap-4 mb-4">
    <div
      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white mt-0.5"
      style={{ backgroundColor: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.4)' }}
    >
      {number}
    </div>
    <div>
      <p className="font-semibold text-white text-sm mb-1">{title}</p>
      <div style={{ color: '#9ca3af', fontSize: '0.82rem', lineHeight: 1.65 }}>{children}</div>
    </div>
  </div>
);

const CodeBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code
    className="font-mono rounded px-1.5 py-0.5"
    style={{ backgroundColor: '#111827', color: '#f87171', fontSize: '0.8em', border: '1px solid #1f2937' }}
  >
    {children}
  </code>
);

const LedDot: React.FC<{ color: string; label: string; desc: string }> = ({ color, label, desc }) => (
  <div className="flex items-center gap-3">
    <div
      className="w-5 h-5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
    />
    <div>
      <span className="text-white text-sm font-semibold">{label}</span>
      <span style={{ color: '#6b7280', fontSize: '0.78rem', marginLeft: 8 }}>{desc}</span>
    </div>
  </div>
);

const Divider: React.FC = () => (
  <div
    className="my-8"
    style={{ height: '1px', background: 'linear-gradient(to right, transparent, #1f2937, transparent)' }}
  />
);

const Table: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl mb-4" style={{ border: '1px solid #1f2937' }}>
    <table className="w-full text-sm">
      <thead>
        <tr style={{ backgroundColor: '#111827' }}>
          {headers.map(h => (
            <th key={h} className="text-left px-4 py-2.5 font-semibold" style={{ color: '#6b7280', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderTop: '1px solid #1f2937' }}>
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-2.5" style={{ color: j === 0 ? '#d1d5db' : '#9ca3af', fontSize: '0.82rem' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── TOC sidebar ─────────────────────────────────────────────────────────────

const TableOfContents: React.FC<{ active: string; onNavigate: (id: string) => void }> = ({
  active, onNavigate,
}) => (
  <nav
    className="sticky top-6 rounded-2xl p-4 no-print"
    style={{
      backgroundColor: '#0d1117',
      border: '1px solid #1f2937',
      minWidth: 200,
      alignSelf: 'flex-start',
    }}
  >
    <p
      className="text-xs font-bold uppercase tracking-widest mb-3"
      style={{ color: '#374151', letterSpacing: '0.14em' }}
    >
      Contents
    </p>
    <div className="flex flex-col gap-1">
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => onNavigate(s.id)}
          className="flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-all text-xs font-medium"
          style={{
            backgroundColor: active === s.id ? `${s.color}15` : 'transparent',
            color: active === s.id ? s.color : '#4b5563',
            border: `1px solid ${active === s.id ? `${s.color}30` : 'transparent'}`,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.icon}</span>
          {s.title}
        </button>
      ))}
    </div>

    <div
      className="mt-4 pt-4"
      style={{ borderTop: '1px solid #1f2937' }}
    >
      <button
        onClick={() => window.print()}
        className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
        style={{
          backgroundColor: 'rgba(220,38,38,0.1)',
          color: '#f87171',
          border: '1px solid rgba(220,38,38,0.2)',
          cursor: 'pointer',
        }}
      >
        🖨 Print Manual
      </button>
    </div>
  </nav>
);

// ─── Content sections ─────────────────────────────────────────────────────────

const OverviewSection: React.FC = () => (
  <section id="overview">
    <H2 id="overview" icon="◈" color="#60a5fa">System Overview</H2>
    <P>
      CinePlex is an integrated cinema seat management system combining web-based booking,
      IoT LED seat guidance, and smart kiosk check-in. The system connects customers,
      cinema staff, and physical hardware (ESP32 LED controllers) into one real-time platform.
    </P>

    <H3>Architecture</H3>
    <Table
      headers={['Component', 'Technology', 'Purpose']}
      rows={[
        ['Backend API',    'Spring Boot 3 · Java',         'REST API, WebSocket, MQTT, business logic'],
        ['Frontend App',   'React 19 · TypeScript · Redux', 'Customer & admin web interface'],
        ['LED Controller', 'ESP32 · WS2812B strip',        'Physical seat LED indicator hardware'],
        ['Message Broker', 'MQTT (Mosquitto)',              'Backend ↔ ESP32 real-time commands'],
        ['Live Updates',   'STOMP over WebSocket',         'Backend ↔ Browser real-time events'],
        ['Database',       'MySQL / PostgreSQL (JPA)',      'Seats, bookings, users, showtimes'],
      ]}
    />

    <H3>User Roles</H3>
    <Table
      headers={['Role', 'Access Level', 'Key Permissions']}
      rows={[
        ['CUSTOMER',  'Self-service',       'Browse movies, book seats, view own bookings, check in'],
        ['MANAGER',   'Operational',        'CRUD movies & showtimes, view all bookings, staff list'],
        ['ADMIN',     'Full access',        'Everything MANAGER can do + staff management, kiosks, seat override'],
        ['OPERATOR',  'IoT read-only',      'View IoT Monitor page (real-time LED dashboard)'],
      ]}
    />

    <Note type="info">
      Kiosk terminals (entrance + seat arrival) authenticate via an <CodeBadge>X-API-Key</CodeBadge> header,
      not a user JWT. Each kiosk is registered in the system and given a unique API key.
    </Note>
  </section>
);

const CustomerSection: React.FC = () => (
  <section id="customer">
    <Divider />
    <H2 id="customer" icon="◉" color="#4ade80">Customer Guide</H2>
    <P>
      Customers interact with CinePlex via the web app to discover movies, select seats,
      complete payment, and check in at the cinema.
    </P>

    <H3>1. Registration &amp; Login</H3>
    <Step number={1} title="Create an account">
      Navigate to <CodeBadge>/register</CodeBadge>. Enter your full name, email address,
      and a password. After submitting, you are automatically logged in.
    </Step>
    <Step number={2} title="Log in">
      Visit <CodeBadge>/login</CodeBadge>, enter your email and password.
      A JWT access token is issued (15-minute expiry) with automatic silent refresh.
    </Step>

    <H3>2. Browsing Movies</H3>
    <Step number={1} title="View the movie list">
      The home page (<CodeBadge>/movies</CodeBadge>) shows all active movies.
      You can search by title and filter by genre or language using the controls at the top.
    </Step>
    <Step number={2} title="Select a showtime">
      Click on a movie to see available showtimes. Each showtime card shows the screen,
      cinema, date/time, base price, and available seats.
    </Step>

    <H3>3. Booking Seats</H3>
    <Step number={1} title="Open the seat map">
      Click <strong>Book Now</strong> on a showtime. The interactive seat map loads
      showing real-time availability.
    </Step>
    <Step number={2} title="Select your seats">
      Click on green (AVAILABLE) seats to select them. VIP and special seats are
      clearly labelled. Selected seats turn blue.
    </Step>
    <Step number={3} title="Reservation hold">
      Once you select seats and begin checkout, they are held as RESERVED for
      <strong> 7 minutes</strong>. If payment is not completed in time, they are
      automatically released.
    </Step>
    <Step number={4} title="Complete payment">
      Choose a payment method and confirm. Your booking status changes to
      <CodeBadge>BOOKED</CodeBadge> and seats turn blue on the LED strip.
    </Step>
    <Step number={5} title="Confirmation email">
      A confirmation email is sent containing your booking code
      (e.g., <CodeBadge>BK-A3F7X2QP</CodeBadge>) and a QR code image.
      <strong> Keep this QR code</strong> — you will need it at the cinema entrance.
    </Step>

    <Note type="tip">
      You can also view your booking QR code anytime at <CodeBadge>/bookings</CodeBadge> under
      <em> My Bookings</em>. Each booking card has a QR icon that expands the code.
    </Note>

    <H3>4. Cinema Check-In (IoT Flow)</H3>
    <P>CinePlex uses a two-step IoT process to guide you to your seat with LED indicators.</P>

    <Step number={1} title="Arrive at the entrance kiosk">
      At the cinema entrance, look for the kiosk screen displaying
      <strong> "CinePlex Entrance Check-In Kiosk"</strong>.
      Present the QR code from your email (or tap <strong>Ticket</strong> in My Bookings on your phone).
    </Step>
    <Step number={2} title="Entrance QR scanned — LED activates">
      After a successful scan, the screen shows your seat label (e.g., <strong>C7</strong>).
      The physical LED strip begins blinking <strong style={{ color: '#fb923c' }}>amber</strong> at
      your assigned seat — follow the light to your row.
    </Step>
    <Step number={3} title="Open your phone — tap Confirm Seat">
      Once at your seat, open the CinePlex website on your phone, go to
      <CodeBadge>/bookings</CodeBadge> (My Bookings). Your booking will show as
      <strong> Checked In</strong> with an orange <strong>"Confirm Seat"</strong> button.
      Tap it to open the camera scanner.
    </Step>
    <Step number={4} title="Scan the permanent QR sticker on your seat">
      Point your phone camera at the small QR sticker permanently affixed to the seat.
      The system verifies it matches your booking. On success, your booking becomes
      <CodeBadge>COMPLETED</CodeBadge> and the LED at your seat turns off.
    </Step>
    <Step number="★" title="Kiosk fallback (no phone)">
      If you don't have a phone, use the <strong>Seat Arrival Station</strong> kiosk
      near the hall entrance. Follow the two-scan flow on the kiosk screen.
    </Step>

    <Note type="warn">
      The entrance ticket QR becomes invalid once the session has passed (shown as "Session Expired"
      in My Bookings). If your booking was already cancelled or expired, contact cinema staff.
    </Note>

    <H3>5. Managing Bookings</H3>
    <P>
      Visit <CodeBadge>/bookings</CodeBadge> to see your full booking history.
      You can cancel bookings that have not yet been checked in. Cancellations
      release the seats back to AVAILABLE immediately.
    </P>
  </section>
);

const AdminSection: React.FC = () => (
  <section id="admin">
    <Divider />
    <H2 id="admin" icon="▤" color="#f87171">Admin &amp; Manager Guide</H2>
    <P>
      Admins and Managers access the system at <CodeBadge>/admin</CodeBadge> after logging in
      with a staff account. The dashboard provides an overview of all bookings and
      system activity.
    </P>

    <H3>Movie Management — <CodeBadge>/admin/movies</CodeBadge></H3>
    <Step number={1} title="Add a movie">
      Click <strong>+ Add Movie</strong>. Fill in title, description, genre, language,
      duration (minutes), and poster URL. Mark it as active when ready to publish.
    </Step>
    <Step number={2} title="Edit or delete">
      Each movie card has Edit (pencil) and Delete (trash) buttons. Deleting a movie
      also removes its future showtimes. Active movies appear in the customer view.
    </Step>

    <H3>Showtime Management — <CodeBadge>/admin/showtimes</CodeBadge></H3>
    <Step number={1} title="Create a showtime">
      Click <strong>+ Add Showtime</strong>. Select a movie and screen.
      The end time is <em>auto-calculated</em> as movie duration + buffer (ceiled to
      the next 30-minute slot). You can override it manually.
    </Step>
    <Step number={2} title="Cancel a showtime">
      Click <strong>Cancel</strong> on any scheduled showtime. This cannot be undone.
      All BOOKED seats will be flagged; refund processing is handled separately.
    </Step>

    <Note type="tip">
      Filter the showtime list by movie using the dropdown at the top of the page.
      The system shows available vs. total seats for each showtime in real time.
    </Note>

    <H3>Booking Overview — <CodeBadge>/admin</CodeBadge> (Dashboard)</H3>
    <P>
      The admin dashboard lists all bookings across all showtimes. You can filter by
      showtime and see booking codes, seat details, payment status, and check-in time.
    </P>

    <H3>Staff Management — <CodeBadge>/admin/staff</CodeBadge> (ADMIN only)</H3>
    <Step number={1} title="Register a new staff member">
      Click <strong>+ Add Staff</strong>. Choose a role (MANAGER, OPERATOR) and
      the cinema they belong to. A registration request is created; the staff member
      receives their login credentials.
    </Step>
    <Step number={2} title="Deactivate staff">
      Click <strong>Deactivate</strong> next to any staff member. Their account is
      disabled immediately but not deleted. Historical audit logs are preserved.
    </Step>

    <H3>Kiosk Management — <CodeBadge>/admin/kiosks</CodeBadge> (ADMIN only)</H3>
    <Step number={1} title="Register a kiosk">
      Click <strong>+ Register Kiosk</strong>. Select the screen the kiosk belongs to
      and give it a name (e.g., "Lobby Entrance Screen 1").
    </Step>
    <Step number={2} title="Retrieve the API key">
      After registration, the system shows the kiosk API key in the format
      <CodeBadge>KIOSK-xxxxxxxx-xxxx-…</CodeBadge>. Copy this immediately —
      it is only shown once. Configure it as the <CodeBadge>X-API-Key</CodeBadge> header
      on the kiosk browser or terminal.
    </Step>
    <Step number={3} title="Access kiosk URLs">
      Entrance kiosk: <CodeBadge>/kiosk/checkin</CodeBadge>
      <br />Seat arrival station: <CodeBadge>/kiosk/seat-arrival</CodeBadge>
      <br />Hall display board: <CodeBadge>/display/{'{showtimeId}'}</CodeBadge>
    </Step>

    <H3>Seat State Override</H3>
    <P>
      Admins can manually override any seat state via the IoT Monitor page or the admin API.
      Valid transitions are enforced by the state machine. Use this to mark seats as
      MAINTENANCE (physically damaged seats), or to reset OCCUPIED seats after
      a technical issue.
    </P>

    <Table
      headers={['State', 'LED Color', 'Meaning']}
      rows={[
        ['AVAILABLE',   '🟢 Green',  'Seat is open for booking'],
        ['RESERVED',    '🟡 Yellow', 'Customer has selected — 7-minute hold'],
        ['BOOKED',      '🔵 Blue',   'Payment confirmed — awaiting check-in'],
        ['OCCUPIED',    '🔴 Off/dim','Customer is seated'],
        ['MAINTENANCE', '⚪ Dim',    'Seat is out of service'],
        ['CANCELLED',   '🟢 Green',  'Booking cancelled — seat reopened'],
      ]}
    />
  </section>
);

const KioskSection: React.FC = () => (
  <section id="kiosk">
    <Divider />
    <H2 id="kiosk" icon="⬜" color="#fb923c">Kiosk Operations</H2>
    <P>
      CinePlex operates two types of kiosk terminals, designed for full-screen
      browser displays (e.g., a Raspberry Pi or a dedicated tablet at the entrance).
    </P>

    <H3>Entrance Check-In Kiosk — <CodeBadge>/kiosk/checkin</CodeBadge></H3>
    <P>
      This kiosk handles <strong>Step 1</strong> of the IoT check-in flow.
      It requires no customer login — authentication is handled by the booking code itself.
    </P>
    <Step number={1} title="Camera activation">
      The kiosk automatically activates the rear-facing camera on load.
      The viewfinder shows animated corner brackets and a red scan line.
    </Step>
    <Step number={2} title="Customer scans booking QR">
      The customer presents their QR code (from the confirmation email or the app).
      The camera reads the <CodeBadge>BK-XXXXXXXX</CodeBadge> code automatically.
    </Step>
    <Step number={3} title="Manual fallback">
      If the camera fails, the customer can type the booking code manually into the
      text field below the viewfinder and press <strong>Submit</strong>.
    </Step>
    <Step number={4} title="Success display">
      On valid scan, the screen shows the movie title, booking code, and a
      <strong> seat navigation card</strong> for each booked seat (Row + Seat number).
      The amber LED blink starts on the LED strip simultaneously.
    </Step>
    <Step number={5} title="Next customer">
      Click <strong>Next Customer →</strong> to reset the kiosk for the next person.
    </Step>

    <Note type="warn">
      The kiosk browser must have camera access (HTTPS or localhost). If prompted,
      click <em>Allow</em> for camera permissions. Ensure the kiosk device's API key
      is set in the backend if your setup requires it.
    </Note>

    <H3>Seat Arrival Station — <CodeBadge>/kiosk/seat-arrival</CodeBadge></H3>
    <P>
      This is a <strong>staff-operated kiosk fallback</strong> for customers who don't have a
      smartphone. The primary seat confirmation path is via the customer's own phone
      from <strong>My Bookings → Confirm Seat</strong>.
    </P>
    <Step number={1} title="Scan booking QR (step 1)">
      Customer scans their booking QR to confirm identity.
      The red corner brackets indicate booking scan mode.
    </Step>
    <Step number={2} title="Follow the blinking LED">
      The amber in-transit banner is shown on screen to reinforce following the LED.
    </Step>
    <Step number={3} title="Scan permanent seat QR sticker (step 2)">
      Customer scans the permanent QR sticker on their seat.
      Format: <CodeBadge>SEAT:{'{seatId}'}</CodeBadge> — the backend extracts the seat ID
      and verifies it matches the booking.
    </Step>
    <Step number={4} title="Confirmation">
      LED turns off, screen shows <em>"Enjoy the show!"</em> with LED-off animation per seat.
    </Step>

    <Note type="tip">
      Encourage customers to use their own phone for seat confirmation — it reduces kiosk queues
      and works anywhere in the cinema (no need to find a second kiosk terminal).
    </Note>

    <H3>Hall Display Board — <CodeBadge>/display/{'{showtimeId}'}</CodeBadge></H3>
    <P>
      Mount this on a large TV screen outside each hall.
      It shows a live seat availability map for a specific showtime, updating in real time
      via WebSocket. No login required. Replace <CodeBadge>{'{showtimeId}'}</CodeBadge> with
      the actual showtime ID from the admin panel.
    </P>
  </section>
);

const IoTSection: React.FC = () => (
  <section id="iot">
    <Divider />
    <H2 id="iot" icon="◎" color="#a78bfa">IoT &amp; LED System</H2>
    <P>
      CinePlex uses an ESP32 microcontroller connected to a WS2812B addressable LED strip
      mounted under or beside each seat. The backend sends JSON commands to the ESP32
      over MQTT.
    </P>

    <H3>LED Color Reference</H3>
    <div className="flex flex-col gap-2 mb-4 p-4 rounded-xl" style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
      <LedDot color="#16a34a" label="Green"      desc="AVAILABLE — seat is open for booking" />
      <LedDot color="#ca8a04" label="Yellow"     desc="RESERVED — 7-minute hold (payment pending)" />
      <LedDot color="#2563eb" label="Blue"       desc="BOOKED — payment confirmed, awaiting arrival" />
      <LedDot color="#f97316" label="Amber pulse"desc="IN TRANSIT — customer is walking to seat (WHITE_PULSE mode)" />
      <LedDot color="#dc2626" label="Red / Off"  desc="OCCUPIED — customer is seated, LED dims out" />
      <LedDot color="#374151" label="Dim white"  desc="MAINTENANCE — seat is out of service" />
    </div>

    <H3>IoT Monitor — <CodeBadge>/admin/iot-monitor</CodeBadge></H3>
    <P>
      This is the primary staff interface for watching the LED system in real time.
      It mirrors the physical LED strip exactly, including the amber blink animation for
      customers currently in transit.
    </P>
    <Step number={1} title="Select a showtime">
      Use the dropdown in the top bar to load the seat map for a running showtime.
    </Step>
    <Step number={2} title="Watch real-time state changes">
      Each seat is displayed as a coloured LED dot. WebSocket updates from the backend
      keep the display in sync with the physical strip with no page refresh needed.
    </Step>
    <Step number={3} title="In-transit alert banner">
      When a customer scans the entrance kiosk, an amber alert banner appears at the
      top listing how many seats are actively blinking. Seats show a triple-ring
      pulsing animation.
    </Step>
    <Step number={4} title="ESP32 status panel">
      The right sidebar shows whether the ESP32 is online, the LED count, and the
      last heartbeat timestamp. If the device goes offline, the badge turns red.
    </Step>
    <Step number={5} title="Resync LEDs">
      If the ESP32 restarts (e.g., power cut), click <strong>↺ Resync LEDs</strong>.
      The backend replays SET_LED commands for every seat in the current showtime,
      restoring the strip to the correct state.
    </Step>

    <H3>MQTT Protocol</H3>
    <P>
      Commands are published to the topic{' '}
      <CodeBadge>cinema/screen/{'{screenId}'}/seat/command</CodeBadge>
      in the following JSON format:
    </P>
    <div
      className="rounded-xl p-4 font-mono text-sm mb-3"
      style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937', color: '#86efac' }}
    >
      {'{ "action": "SET_LED", "ledIndex": 7, "color": "BLUE" }'}
    </div>
    <P>
      Heartbeats from the ESP32 are published to{' '}
      <CodeBadge>cinema/+/heartbeat</CodeBadge>. The backend updates the device
      online status and broadcasts it to all connected browser clients via WebSocket.
    </P>

    <H3>WebSocket Topics</H3>
    <Table
      headers={['Topic', 'Payload', 'Purpose']}
      rows={[
        ['/topic/seats/{id}',       'SeatWebSocketUpdate',  'Seat state change (any booking event)'],
        ['/topic/iot/{showtimeId}', 'IoTEvent',             'DOOR_SCAN, SEAT_SCAN, RESYNC events'],
        ['/topic/esp32/{screenId}/status', 'Esp32Status',  'Device heartbeat / online status'],
      ]}
    />

    <H3>LED Index Mapping</H3>
    <P>
      Each seat in the database has an optional <CodeBadge>ledIndex</CodeBadge> field (0-based integer).
      This maps the database seat to its physical position on the LED strip.
      If <CodeBadge>ledIndex</CodeBadge> is <CodeBadge>null</CodeBadge>, no LED command is
      sent for that seat. Configure LED indices via direct database update or through
      the seat import tool.
    </P>

    <Note type="warn">
      Ensure MQTT broker (Mosquitto) is running and accessible at the URL configured in
      <CodeBadge>application.properties</CodeBadge> before starting the backend. The system
      degrades gracefully — bookings still work without MQTT, but LED control is disabled.
    </Note>
  </section>
);

const QrStickersSection: React.FC = () => (
  <section id="qr-stickers">
    <Divider />
    <H2 id="qr-stickers" icon="▣" color="#fbbf24">Seat QR Stickers</H2>
    <P>
      Every physical seat in the cinema must have a small QR code sticker affixed to it.
      This QR is scanned by the customer at the <strong>Seat Arrival Station</strong> to
      confirm they have reached their assigned seat.
    </P>

    <H3>QR Data Format</H3>
    <P>
      Each sticker encodes the format <CodeBadge>SEAT:{'{seatId}'}</CodeBadge> (colon separator), where
      <CodeBadge>seatId</CodeBadge> is the stable database ID for that physical seat
      (e.g., <CodeBadge>SEAT:14</CodeBadge>, <CodeBadge>SEAT:42</CodeBadge>).
      This is a permanent identifier — it never changes between showtimes or booking cycles.
    </P>

    <Note type="info">
      Seat IDs are permanent identifiers tied to the screen layout, not to any specific
      booking or showtime. Once stickers are printed and affixed, they never need to be
      replaced unless a seat is physically removed or replaced.
    </Note>

    <H3>Printing Stickers — <CodeBadge>/admin/seat-qr-codes</CodeBadge></H3>
    <Step number={1} title="Navigate to Seat QR Codes in the admin panel">
      Click <strong>QR Stickers</strong> in the left sidebar or go directly to
      <CodeBadge>/admin/seat-qr-codes</CodeBadge>.
    </Step>
    <Step number={2} title="Select a movie and showtime">
      Choose any movie that has an active showtime on the screen you want to configure.
      The seat map for that screen is loaded automatically.
    </Step>
    <Step number={3} title="Filter if needed">
      Use the search box to find specific seats, or click a seat type button
      (STANDARD, VIP, COUPLE, WHEELCHAIR) to show only that category.
    </Step>
    <Step number={4} title="Print all stickers">
      Click <strong>🖨 Print All QR Stickers</strong>. The browser print dialog opens
      with a clean white layout: 4 columns of cards, each showing the QR code,
      seat label, and seat type. Print on adhesive label paper for best results.
    </Step>

    <Note type="tip">
      Print on A4 label sheets (4-per-row) for exactly-sized stickers. For VIP and
      special seats, consider colour-coded label paper matching the LED colour (gold
      for VIP, pink for COUPLE).
    </Note>

    <H3>Sticker Placement Guidelines</H3>
    <P>Place each sticker in a consistent, visible location on the seat — recommended locations:</P>
    <div className="flex flex-col gap-2 pl-4 mb-4">
      {[
        'Inside the seat back, at eye level when standing in the aisle',
        'Under the seat arm rest (visible when looking for the seat)',
        'On the seat number plate if one exists',
      ].map((t, i) => (
        <div key={i} className="flex items-start gap-2">
          <span style={{ color: '#dc2626', marginTop: 3 }}>→</span>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>{t}</p>
        </div>
      ))}
    </div>
    <P>
      Ensure the sticker is not covered by seat cushions or obscured when the seat
      is folded down. After placement, test each sticker using the Seat Arrival Station
      app to confirm every scan resolves correctly.
    </P>
  </section>
);

const TroubleshootingSection: React.FC = () => (
  <section id="troubleshooting">
    <Divider />
    <H2 id="troubleshooting" icon="⚙" color="#6b7280">Troubleshooting</H2>

    <H3>Kiosk camera not starting</H3>
    <P>
      The browser requires camera permissions. Ensure the kiosk URL is served over
      HTTPS or is <CodeBadge>localhost</CodeBadge>. In Chrome, navigate to
      <em>Settings → Privacy → Camera</em> and allow access for the site.
      Reload the page after granting permission.
    </P>

    <H3>QR scan not detected</H3>
    <P>
      Ensure adequate lighting. The scan area should have no glare on the phone screen.
      If automatic scan fails, use the manual booking code entry field below the camera.
      The code format is <CodeBadge>BK-XXXXXXXX</CodeBadge> (2 letters + dash + 8 alphanumeric).
    </P>

    <H3>LED strip not responding</H3>
    <Step number={1} title="Check ESP32 status in IoT Monitor">
      If the status badge shows <strong style={{ color: '#f87171' }}>Offline</strong>,
      the ESP32 has disconnected from MQTT.
    </Step>
    <Step number={2} title="Physically restart the ESP32">
      Power-cycle the ESP32 controller. It will reconnect to the MQTT broker and
      publish a heartbeat within 30 seconds.
    </Step>
    <Step number={3} title="Resync LED states">
      After the device shows <strong style={{ color: '#4ade80' }}>Online</strong>, click
      <strong> ↺ Resync LEDs</strong> in the IoT Monitor page to restore all LED colors
      to the current booking states.
    </Step>

    <Note type="warn">
      If the MQTT broker itself is down, all LED functionality is suspended.
      Check that the Mosquitto service is running on the broker host and that
      the port (default 1883) is reachable from both the backend server and the ESP32.
    </Note>

    <H3>Booking QR code not accepted at kiosk</H3>
    <Table
      headers={['Error Message', 'Cause', 'Resolution']}
      rows={[
        ['Booking not found',      'Wrong or mistyped code',          'Re-enter the code from the email carefully'],
        ['Already checked in',     'Duplicate scan',                  'Customer is already inside — let them through'],
        ['Booking expired',        'Reservation TTL elapsed (7 min)', 'Customer must rebook; offer assistance'],
        ['Booking cancelled',      'Customer or admin cancelled',     'Verify payment; contact admin if needed'],
        ['Invalid booking format', 'QR from wrong system/printout',   'Ensure the QR is from the CinePlex confirmation email'],
      ]}
    />

    <H3>Seat arrival scan rejects the seat QR</H3>
    <P>
      This happens when the scanned <CodeBadge>SEAT-{'{id}'}</CodeBadge> QR does not match
      any seat in the customer's booking. Verify:
    </P>
    <div className="flex flex-col gap-1 pl-4 mb-4">
      {[
        'The customer is scanning the correct seat (matches their booking confirmation)',
        'The QR sticker has not been damaged or replaced with a wrong sticker',
        'The booking was checked in at the entrance first (step 1 must precede step 2)',
      ].map((t, i) => (
        <div key={i} className="flex items-start gap-2">
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>•</span>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>{t}</p>
        </div>
      ))}
    </div>

    <H3>WebSocket disconnects frequently</H3>
    <P>
      The frontend uses SockJS with STOMP for WebSocket fallback. If connections drop,
      check the backend CORS configuration (<CodeBadge>cors.allowed-origins</CodeBadge>)
      to ensure the frontend origin is whitelisted. Also verify the
      <CodeBadge>REACT_APP_WS_URL</CodeBadge> environment variable is correct.
    </P>

    <H3>JWT Token expired — stuck on login</H3>
    <P>
      Access tokens expire after 15 minutes. The app silently refreshes them using the
      refresh token. If the refresh token is also expired (e.g., after a long browser
      closure), the user is automatically redirected to <CodeBadge>/login</CodeBadge>.
      This is by design for security.
    </P>

    <Divider />
    <div
      className="rounded-2xl p-5 text-center"
      style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
    >
      <p className="font-bold text-white mb-1">CinePlex IoT Cinema Management System</p>
      <p style={{ color: '#4b5563', fontSize: '0.78rem' }}>
        Version 1.0 · IT 3052 · Built with Spring Boot, React, MQTT &amp; ESP32
      </p>
      <p style={{ color: '#374151', fontSize: '0.72rem', marginTop: 4 }}>
        For technical support, contact your system administrator.
      </p>
    </div>
  </section>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const UserManualPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  // Track which section is in view via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const navigateTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 overflow-auto" style={{ minWidth: 0 }}>

          {/* ── Page title ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  User Manual
                </h1>
                <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '3px' }}>
                  CinePlex IoT Cinema Management System · Complete Reference Guide
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="no-print flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: 'rgba(220,38,38,0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(220,38,38,0.2)',
                  cursor: 'pointer',
                }}
              >
                🖨 Print Manual
              </button>
            </div>

            <div
              className="mt-4 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-4"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
            >
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => navigateTo(s.id)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-100 opacity-70 no-print"
                  style={{ color: s.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span style={{ fontFamily: 'monospace' }}>{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content + TOC ── */}
          <div className="flex gap-8 items-start">
            {/* Main content */}
            <div
              ref={contentRef}
              className="flex-1 min-w-0"
              style={{
                maxWidth: 820,
                backgroundColor: '#0d1117',
                border: '1px solid #1f2937',
                borderRadius: '1rem',
                padding: '2rem',
              }}
            >
              <OverviewSection />
              <CustomerSection />
              <AdminSection />
              <KioskSection />
              <IoTSection />
              <QrStickersSection />
              <TroubleshootingSection />
            </div>

            {/* Sticky TOC */}
            <div className="no-print" style={{ width: 210, flexShrink: 0 }}>
              <TableOfContents active={activeSection} onNavigate={navigateTo} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
