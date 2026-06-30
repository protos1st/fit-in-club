import { initials } from '../lib/utils';

const GRADIENTS = [
  ['#53603E', '#7a8f5a'],
  ['#6D412A', '#a06040'],
  ['#3d5a80', '#5a8aad'],
  ['#7b4f8a', '#a87ab8'],
  ['#8a5a3a', '#c08050'],
  ['#4a6741', '#6a9060'],
];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({ name, photo, size = 40, className = '' }) {
  const idx = hashName(name) % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        title={name}
        className={`avatar ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      />
    );
  }

  return (
    <div
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
