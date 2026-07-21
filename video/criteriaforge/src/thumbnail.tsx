import {AbsoluteFill, Img, staticFile} from 'remotion';

const FONT =
  'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const EDITORIAL = 'Iowan Old Style, Baskerville, Georgia, serif';

const RunRail = ({label, offset}: {label: string; offset: number}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      transform: `translateX(${offset}px)`,
    }}
  >
    <span
      style={{
        width: 68,
        color: '#b9afa1',
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: '0.12em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
    <span
      style={{
        position: 'relative',
        width: 130,
        height: 3,
        borderRadius: 99,
        background: '#4a433a',
      }}
    >
      <span
        style={{
          position: 'absolute',
          right: 0,
          top: -5,
          width: 13,
          height: 13,
          borderRadius: 99,
          background: '#d5e6dd',
          border: '3px solid #4b7e66',
          boxShadow: '0 0 0 4px rgba(75,126,102,0.16)',
        }}
      />
    </span>
    <span
      style={{
        border: '1px solid #71917f',
        borderRadius: 999,
        color: '#cfe1d7',
        padding: '5px 9px',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.08em',
      }}
    >
      AGREES
    </span>
  </div>
);

export const CriteriaForgeThumbnail = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(circle at 17% 16%, #353027 0, #191714 46%, #0d0c0a 100%)',
      color: '#f7f0e5',
      fontFamily: FONT,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        opacity: 0.55,
      }}
    />

    <div
      style={{
        position: 'absolute',
        left: 54,
        top: 43,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
      }}
    >
      <span style={{fontFamily: EDITORIAL, fontSize: 27}}>CriteriaForge</span>
      <span
        style={{
          border: '1px solid #5f574c',
          borderRadius: 999,
          padding: '6px 11px',
          color: '#bbb1a3',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}
      >
        OPENAI BUILD WEEK
      </span>
    </div>

    <div
      style={{
        position: 'absolute',
        left: 54,
        top: 128,
        width: 620,
      }}
    >
      <div
        style={{
          color: '#d7a48b',
          fontSize: 16,
          fontWeight: 850,
          letterSpacing: '0.15em',
          marginBottom: 17,
        }}
      >
        HUMAN AUTHORITY · EXECUTABLE RULES
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: EDITORIAL,
          fontSize: 86,
          lineHeight: 0.91,
          letterSpacing: '-0.055em',
          fontWeight: 500,
        }}
      >
        The AI can’t
        <br />
        <span style={{color: '#d87a4f'}}>move the rules.</span>
      </h1>
      <p
        style={{
          margin: '24px 0 0',
          width: 555,
          color: '#c7bdb0',
          fontSize: 23,
          lineHeight: 1.28,
          fontWeight: 520,
        }}
      >
        Human-ratified Product Constitutions for Codex.
      </p>
    </div>

    <div
      style={{
        position: 'absolute',
        left: 58,
        bottom: 51,
        display: 'grid',
        gap: 11,
      }}
    >
      <RunRail label="RUN 01" offset={0} />
      <RunRail label="RUN 02" offset={12} />
      <RunRail label="RUN 03" offset={24} />
    </div>

    <div
      style={{
        position: 'absolute',
        right: -34,
        top: 84,
        width: 630,
        height: 550,
        transform: 'rotate(-1.7deg)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '17px 42px -8px -16px',
          borderRadius: 25,
          background: '#8d4a2e',
          opacity: 0.38,
          transform: 'rotate(4deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 24,
          overflow: 'hidden',
          background: '#f4f0e7',
          border: '1px solid #675e52',
          boxShadow: '0 34px 80px rgba(0,0,0,0.52)',
        }}
      >
        <div
          style={{
            height: 34,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '0 14px',
            background: '#fffaf1',
            borderBottom: '1px solid #d6ccbc',
          }}
        >
          {['#ad4d26', '#d4b273', '#3e6f5a'].map((color) => (
            <span
              key={color}
              style={{width: 8, height: 8, borderRadius: 99, background: color}}
            />
          ))}
          <span
            style={{
              marginLeft: 8,
              color: '#756d62',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.07em',
            }}
          >
            FORMAL EVALUATION · SAME CONSTITUTION
          </span>
        </div>
        <Img
          src={staticFile('screens/06-evaluation.png')}
          style={{
            width: '100%',
            height: 'calc(100% - 34px)',
            objectFit: 'cover',
            objectPosition: '46% 42%',
            transform: 'scale(1.08)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 30,
          top: -23,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          border: '1px solid #9bc0ad',
          borderRadius: 999,
          background: '#deece4',
          color: '#32624d',
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 850,
          letterSpacing: '0.08em',
          boxShadow: '0 12px 28px rgba(0,0,0,0.24)',
        }}
      >
        <span style={{fontSize: 16}}>✓</span> CONSTITUTION LOCKED
      </div>
      <div
        style={{
          position: 'absolute',
          left: -30,
          bottom: 32,
          borderRadius: 13,
          background: '#f8f1e6',
          color: '#8b352e',
          border: '1px solid #d8a69f',
          padding: '13px 17px',
          boxShadow: '0 14px 30px rgba(0,0,0,0.28)',
          fontSize: 13,
          fontWeight: 850,
          letterSpacing: '0.06em',
        }}
      >
        INTENT ≠ OBSERVED → GAP
      </div>
    </div>

    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 7,
        background: 'linear-gradient(90deg, #ad4d26 0 35%, #315f78 35% 68%, #3e6f5a 68%)',
      }}
    />
  </AbsoluteFill>
);
