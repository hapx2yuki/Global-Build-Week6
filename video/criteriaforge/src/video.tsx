import type {CSSProperties, ReactNode} from 'react';
import {Audio} from '@remotion/media';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const FPS = 30;
export const DURATION_IN_FRAMES = 4734;

const C = {
  paper: '#f4f0e7',
  paperDeep: '#e8e0d1',
  ink: '#211d18',
  muted: '#746d63',
  rule: '#cfc5b5',
  ember: '#ad4d26',
  emberSoft: '#f3ddd2',
  blue: '#315f78',
  blueSoft: '#dce8ed',
  green: '#3e6f5a',
  greenSoft: '#dce9e1',
  red: '#a53f35',
  redSoft: '#f2d9d5',
  dark: '#171512',
};

const FONT = 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const EDITORIAL = 'Iowan Old Style, Baskerville, Georgia, serif';

type Caption = {startMs: number; endMs: number; text: string};
// This generated file is prepared from the reviewed SRT before every render.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const captions = require('../public/captions.json') as Caption[];

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const reveal = (frame: number, delay = 0, duration = 18) =>
  interpolate(frame, [delay, delay + duration], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

const settle = (frame: number, delay = 0) =>
  spring({
    frame: Math.max(0, frame - delay),
    fps: FPS,
    config: {damping: 22, stiffness: 120, mass: 0.8},
  });

const FadeUp = ({
  children,
  frame,
  delay = 0,
  distance = 28,
  style,
}: {
  children: ReactNode;
  frame: number;
  delay?: number;
  distance?: number;
  style?: CSSProperties;
}) => {
  const value = reveal(frame, delay);
  return (
    <div
      style={{
        opacity: value,
        transform: `translateY(${(1 - value) * distance}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Pill = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'blue' | 'green' | 'red' | 'ember';
}) => {
  const tones = {
    neutral: {background: '#fffaf1', color: C.ink, borderColor: C.rule},
    blue: {background: C.blueSoft, color: C.blue, borderColor: '#a9c2cd'},
    green: {background: C.greenSoft, color: C.green, borderColor: '#abc6b8'},
    red: {background: C.redSoft, color: C.red, borderColor: '#d6a59e'},
    ember: {background: C.emberSoft, color: C.ember, borderColor: '#dca98f'},
  };
  return (
    <span
      style={{
        ...tones[tone],
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 999,
        padding: '7px 13px',
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};

const Scene = ({
  chapter,
  kicker,
  title,
  children,
  frame,
  dark = false,
}: {
  chapter: string;
  kicker: string;
  title: string;
  children: ReactNode;
  frame: number;
  dark?: boolean;
}) => {
  const opacity = Math.min(reveal(frame, 0, 12), reveal(20_000 - frame, 0, 12));
  return (
    <AbsoluteFill
      style={{
        background: dark
          ? `radial-gradient(circle at 18% 18%, #312c25 0, ${C.dark} 48%, #0e0d0b 100%)`
          : `radial-gradient(circle at 78% 4%, #fffaf0 0, ${C.paper} 48%, ${C.paperDeep} 100%)`,
        color: dark ? '#f7f0e5' : C.ink,
        fontFamily: FONT,
        padding: '58px 72px 92px',
        opacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <span
            style={{
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.16em',
              color: dark ? '#d5cab9' : C.ember,
            }}
          >
            {chapter}
          </span>
          <span style={{width: 44, height: 1, background: dark ? '#5e5549' : C.rule}} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: dark ? '#b9afa1' : C.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {kicker}
          </span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{fontFamily: EDITORIAL, fontSize: 23}}>CriteriaForge</span>
          <span
            style={{
              border: `1px solid ${dark ? '#5e5549' : C.rule}`,
              borderRadius: 999,
              padding: '5px 9px',
              fontSize: 11,
              color: dark ? '#b9afa1' : C.muted,
            }}
          >
            OPENAI BUILD WEEK
          </span>
        </div>
      </div>
      <FadeUp frame={frame} delay={3}>
        <h1
          style={{
            fontFamily: EDITORIAL,
            fontSize: 58,
            lineHeight: 1.02,
            letterSpacing: '-0.035em',
            margin: 0,
            maxWidth: 1220,
            fontWeight: 500,
          }}
        >
          {title}
        </h1>
      </FadeUp>
      <div style={{flex: 1, minHeight: 0, marginTop: 30}}>{children}</div>
    </AbsoluteFill>
  );
};

const Screenshot = ({
  src,
  frame,
  delay = 0,
  zoom = 1,
  focusX = 50,
  focusY = 50,
  style,
}: {
  src: string;
  frame: number;
  delay?: number;
  zoom?: number;
  focusX?: number;
  focusY?: number;
  style?: CSSProperties;
}) => {
  const value = settle(frame, delay);
  const drift = interpolate(frame, [delay, delay + 240], [1, zoom], clamp);
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        border: `1px solid ${C.rule}`,
        background: '#fff',
        boxShadow: '0 26px 64px rgba(47,38,27,0.18)',
        opacity: value,
        transform: `translateY(${(1 - value) * 28}px) scale(${0.97 + value * 0.03})`,
        ...style,
      }}
    >
      <div
        style={{
          height: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 14px',
          borderBottom: `1px solid ${C.rule}`,
          background: '#fbf8f1',
        }}
      >
        {['#c96555', '#d7a94b', '#6e9c78'].map((color) => (
          <span key={color} style={{width: 9, height: 9, borderRadius: 99, background: color}} />
        ))}
        <span style={{marginLeft: 12, fontSize: 11, color: C.muted}}>criteriaforge.vercel.app</span>
      </div>
      <div style={{position: 'absolute', inset: '34px 0 0', overflow: 'hidden'}}>
        <Img
          src={staticFile(`screens/${src}`)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${focusX}% ${focusY}%`,
            transform: `scale(${drift})`,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      </div>
    </div>
  );
};

const CaptionLayer = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const now = (frame / fps) * 1000;
  const active = captions.find((caption) => now >= caption.startMs && now < caption.endMs);
  if (!active) return null;
  const local = now - active.startMs;
  const opacity = interpolate(local, [0, 120, Math.max(160, active.endMs - active.startMs - 140), active.endMs - active.startMs], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 210,
        right: 210,
        bottom: 24,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1380,
          borderRadius: 12,
          padding: '11px 22px 13px',
          background: 'rgba(23,21,18,0.90)',
          color: '#fffaf1',
          fontFamily: FONT,
          fontWeight: 650,
          fontSize: 27,
          lineHeight: 1.25,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}
      >
        {active.text}
      </div>
    </div>
  );
};

const GlobalProgress = () => {
  const frame = useCurrentFrame();
  const progress = frame / (DURATION_IN_FRAMES - 1);
  return (
    <div style={{position: 'absolute', inset: '0 0 auto', height: 5, background: 'rgba(255,255,255,0.12)', zIndex: 60}}>
      <div style={{width: `${progress * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.ember}, #d8895f)`}} />
    </div>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();
  const shake = frame > 175 ? Math.sin(frame * 0.8) * interpolate(frame, [175, 220], [4, 0], clamp) : 0;
  return (
    <Scene chapter="00" kicker="The authority problem" title="Fast output is not the same as faithful intent." frame={frame} dark>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 56, alignItems: 'center', height: '100%'}}>
        <FadeUp frame={frame} delay={16}>
          <p style={{fontFamily: EDITORIAL, fontSize: 35, lineHeight: 1.28, margin: 0, color: '#d9d0c3'}}>
            When the rules move with the answer, another AI score cannot restore the product owner’s judgment.
          </p>
          <div style={{display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap'}}>
            <Pill tone="red">NON-GOAL DROPPED</Pill>
            <Pill tone="ember">ASSUMPTION INVENTED</Pill>
          </div>
        </FadeUp>
        <div style={{position: 'relative', height: 520, transform: `translateX(${shake}px)`}}>
          {[0, 1, 2].map((index) => {
            const value = settle(frame, 30 + index * 18);
            const rotations = [-4, 2.5, -1];
            const labels = ['RUN 01', 'RUN 02', 'RUN 03'];
            return (
              <div
                key={labels[index]}
                style={{
                  position: 'absolute',
                  left: 90 + index * 84,
                  top: 54 + index * 112,
                  width: 520,
                  padding: 28,
                  borderRadius: 18,
                  background: index === 2 ? '#f7f0e5' : '#2b2721',
                  color: index === 2 ? C.ink : '#f7f0e5',
                  border: `1px solid ${index === 2 ? C.rule : '#4b443a'}`,
                  boxShadow: '0 22px 52px rgba(0,0,0,0.34)',
                  transform: `scale(${0.88 + value * 0.12}) rotate(${rotations[index]}deg)`,
                  opacity: value,
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontSize: 13, fontWeight: 800, letterSpacing: '0.16em'}}>{labels[index]}</span>
                  <Pill tone={index === 2 ? 'red' : 'neutral'}>{index === 2 ? 'BLOCKED' : 'PLAUSIBLE'}</Pill>
                </div>
                <div style={{height: 1, background: index === 2 ? C.rule : '#4b443a', margin: '20px 0'}} />
                <div style={{display: 'grid', gap: 10}}>
                  {[0.88, 0.68, 0.78].map((width, row) => (
                    <div key={row} style={{width: `${width * 100}%`, height: 10, borderRadius: 8, background: index === 2 ? '#d4cab9' : '#5b5246'}} />
                  ))}
                </div>
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: 12,
              fontFamily: EDITORIAL,
              fontSize: 82,
              color: C.ember,
              opacity: reveal(frame, 190, 18),
              transform: `rotate(-8deg) scale(${settle(frame, 190)})`,
            }}
          >
            disagree
          </div>
        </div>
      </div>
    </Scene>
  );
};

const IntakeScene = () => {
  const frame = useCurrentFrame();
  const sendPulse = 0.5 + Math.sin(frame / 11) * 0.5;
  return (
    <Scene chapter="01" kicker="Bring in intent" title="Original evidence stays private. Authority stays visible." frame={frame}>
      <div style={{display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: 38, height: '100%'}}>
        <Screenshot src="01-intent.png" frame={frame} delay={12} zoom={1.055} focusX={58} focusY={43} style={{height: 600}} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 15, paddingTop: 24}}>
          {[
            ['FOUNDER MEMO', 'Original language', 'blue'],
            ['WORKING SESSION', 'Human decisions', 'green'],
            ['GIT SNAPSHOT', 'Fixed artifact', 'ember'],
          ].map(([label, detail, tone], index) => (
            <FadeUp key={label} frame={frame} delay={38 + index * 15}>
              <div style={{border: `1px solid ${C.rule}`, background: '#fffaf1', borderRadius: 14, padding: 18}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <strong style={{fontSize: 14, letterSpacing: '0.12em'}}>{label}</strong>
                  <Pill tone={tone as 'blue' | 'green' | 'ember'}>PRIVATE</Pill>
                </div>
                <p style={{margin: '10px 0 0', color: C.muted, fontSize: 16}}>{detail} · source hash fixed</p>
              </div>
            </FadeUp>
          ))}
          <FadeUp frame={frame} delay={90}>
            <div style={{borderRadius: 14, padding: 18, background: C.dark, color: '#fffaf1'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 13}}>
                <span style={{width: 12, height: 12, borderRadius: 99, background: C.green, boxShadow: `0 0 ${12 + sendPulse * 16}px ${C.green}`}} />
                <strong>Per-run send approval</strong>
              </div>
              <p style={{margin: '10px 0 0', color: '#c9c0b4', lineHeight: 1.45}}>Only reviewed segments may cross the device boundary.</p>
            </div>
          </FadeUp>
        </div>
      </div>
    </Scene>
  );
};

const ConstitutionScene = () => {
  const frame = useCurrentFrame();
  const sections = ['Purpose', 'Experience', 'Scope', 'Must pass', 'Quality', 'Evidence', 'Examples', 'Stop conditions'];
  const approved = frame > 148;
  return (
    <Scene chapter="02" kicker="Compile judgment" title="GPT‑5.6 proposes. A human ratifies the meaning." frame={frame}>
      <div style={{display: 'grid', gridTemplateColumns: '260px 1fr 360px', gap: 24, height: '100%'}}>
        <div style={{display: 'grid', alignContent: 'center', gap: 9}}>
          {sections.map((section, index) => {
            const value = settle(frame, 15 + index * 8);
            return (
              <div key={section} style={{display: 'flex', gap: 12, alignItems: 'center', opacity: value, transform: `translateX(${(1 - value) * -18}px)`}}>
                <span style={{display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 99, border: `1px solid ${index === 7 ? '#ba8a72' : C.rule}`, background: index === 7 ? C.emberSoft : '#fffaf1', fontSize: 12, fontWeight: 800}}>{index + 1}</span>
                <span style={{fontSize: 15, fontWeight: index === 7 ? 800 : 600, color: index === 7 ? C.ember : C.muted}}>{section}</span>
              </div>
            );
          })}
        </div>
        <Screenshot src={approved ? '03-constitution-ratified.png' : '02-constitution-question.png'} frame={frame} delay={14} zoom={1.03} focusX={63} focusY={48} style={{height: 600}} />
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18}}>
          <FadeUp frame={frame} delay={45}>
            <div style={{border: `1px solid #a9c2cd`, background: C.blueSoft, borderRadius: 16, padding: 20}}>
              <Pill tone="blue">AI PROPOSAL</Pill>
              <p style={{fontFamily: EDITORIAL, fontSize: 25, lineHeight: 1.25, margin: '16px 0 0'}}>A consequential ambiguity is returned as a question.</p>
            </div>
          </FadeUp>
          <div style={{height: 52, display: 'grid', placeItems: 'center'}}>
            <div style={{width: 2, height: 42, background: `linear-gradient(${C.blue}, ${C.green})`, transform: `scaleY(${reveal(frame, 180, 48)})`, transformOrigin: 'top'}} />
          </div>
          <FadeUp frame={frame} delay={142}>
            <div style={{border: `1px solid #abc6b8`, background: C.greenSoft, borderRadius: 16, padding: 20}}>
              <Pill tone="green">HUMAN RATIFIED</Pill>
              <p style={{fontFamily: EDITORIAL, fontSize: 25, lineHeight: 1.25, margin: '16px 0 0'}}>Approve, reject, or directly edit in the source language.</p>
            </div>
          </FadeUp>
        </div>
      </div>
    </Scene>
  );
};

const CompileScene = () => {
  const frame = useCurrentFrame();
  const gates = [
    ['Intent complete', 'No material blank filled by AI'],
    ['Ratified', 'Every consequential rule is human-owned'],
    ['Evaluable', 'Observable boundary and evidence rule'],
    ['Consistent', 'Conflicts require a human decision'],
    ['Stable', 'Three calibration runs stay aligned'],
  ];
  return (
    <Scene chapter="03" kicker="Five compile safeguards" title="An immutable version exists only after all five gates pass." frame={frame}>
      <div style={{display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 40, height: '100%'}}>
        <Screenshot src="04-compile-five-gates.png" frame={frame} delay={8} zoom={1.045} focusX={59} focusY={45} style={{height: 600}} />
        <div style={{display: 'grid', alignContent: 'center', gap: 11}}>
          {gates.map(([gate, description], index) => {
            const value = settle(frame, 34 + index * 28);
            return (
              <div key={gate} style={{display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 14, alignItems: 'center', border: `1px solid ${C.rule}`, borderRadius: 13, padding: '13px 14px', background: '#fffaf1', opacity: value, transform: `translateX(${(1 - value) * 26}px)`}}>
                <span style={{display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 99, background: C.greenSoft, color: C.green, fontSize: 22, fontWeight: 800, transform: `scale(${value})`}}>✓</span>
                <div><strong style={{fontSize: 17}}>{gate}</strong><p style={{fontSize: 13, color: C.muted, margin: '4px 0 0'}}>{description}</p></div>
                <Pill tone="green">PASS</Pill>
              </div>
            );
          })}
          <FadeUp frame={frame} delay={210}>
            <div style={{display: 'flex', gap: 12, marginTop: 9}}><Pill tone="ember">NO AVERAGE</Pill><Pill tone="neutral">NO AUTO-APPROVAL</Pill><Pill tone="green">v1.0 IMMUTABLE</Pill></div>
          </FadeUp>
        </div>
      </div>
    </Scene>
  );
};

const EvaluationScene = () => {
  const frame = useCurrentFrame();
  const runnerProgress = [0, 8, 15].map((delay) => reveal(frame, 32 + delay, 150));
  return (
    <Scene chapter="04" kicker="Three independent runs" title="Evaluate the same Constitution—not a moving score." frame={frame}>
      <div style={{display: 'grid', gridTemplateColumns: '0.74fr 1.26fr', gap: 36, height: '100%'}}>
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, height: 330}}>
            {runnerProgress.map((progress, index) => (
              <div key={index} style={{position: 'relative', border: `1px solid ${C.rule}`, borderRadius: 15, background: '#fffaf1', padding: '18px 12px'}}>
                <div style={{fontSize: 12, fontWeight: 850, letterSpacing: '0.13em', textAlign: 'center'}}>RUN {String(index + 1).padStart(2, '0')}</div>
                <div style={{position: 'absolute', left: '50%', top: 58, bottom: 60, width: 2, background: C.rule}} />
                <div style={{position: 'absolute', left: '50%', top: 58, height: `${progress * 210}px`, width: 4, background: C.blue, transform: 'translateX(-1px)', boxShadow: `0 0 16px ${C.blue}`}} />
                <div style={{position: 'absolute', left: '50%', top: 52 + progress * 210, width: 18, height: 18, borderRadius: 99, background: C.blue, transform: 'translateX(-9px)', boxShadow: `0 0 0 7px ${C.blueSoft}`}} />
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 17, display: 'grid', placeItems: 'center', opacity: reveal(frame, 210 + index * 5, 16)}}><Pill tone="red">SAME GAP</Pill></div>
              </div>
            ))}
          </div>
          <FadeUp frame={frame} delay={238} style={{marginTop: 18}}>
            <div style={{borderRadius: 15, padding: 18, background: C.dark, color: '#fffaf1', textAlign: 'center'}}>
              <strong style={{fontFamily: EDITORIAL, fontSize: 28}}>stable / not_met</strong>
              <p style={{margin: '7px 0 0', color: '#c9c0b4'}}>Three real gpt-5.6-sol evaluations · recorded replay</p>
            </div>
          </FadeUp>
        </div>
        <Screenshot src="06-evaluation.png" frame={frame} delay={16} zoom={1.095} focusX={54} focusY={46} style={{height: 600}} />
      </div>
    </Scene>
  );
};

const EvidenceScene = () => {
  const frame = useCurrentFrame();
  const line = reveal(frame, 72, 70);
  return (
    <Scene chapter="05" kicker="Locally verified evidence" title="Every adopted finding must lead back to the exact source." frame={frame}>
      <div style={{position: 'relative', height: '100%'}}>
        <Screenshot src="05-evidence.png" frame={frame} delay={8} zoom={1.07} focusX={59} focusY={45} style={{position: 'absolute', left: 0, top: 0, width: 1250, height: 600}} />
        <FadeUp frame={frame} delay={45} style={{position: 'absolute', right: 0, top: 72, width: 460}}>
          <div style={{borderRadius: 17, border: `1px solid #a9c2cd`, background: '#f8fcfd', padding: 24, boxShadow: '0 22px 50px rgba(49,95,120,0.16)'}}>
            <Pill tone="blue">CITATION VERIFIED</Pill>
            <div style={{display: 'grid', gap: 13, marginTop: 20}}>
              {[['Source ID', 'founder-note'], ['Locator', 'line 6–9'], ['Content hash', 'SHA-256 matched']].map(([label, value]) => (
                <div key={label} style={{display: 'flex', justifyContent: 'space-between', gap: 18, borderBottom: `1px solid ${C.rule}`, paddingBottom: 11}}><span style={{color: C.muted}}>{label}</span><strong style={{fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14}}>{value}</strong></div>
              ))}
            </div>
          </div>
        </FadeUp>
        <svg width="500" height="260" viewBox="0 0 500 260" style={{position: 'absolute', right: 285, top: 230, overflow: 'visible'}}>
          <path d="M 0 200 C 160 200, 150 30, 440 30" fill="none" stroke={C.blue} strokeWidth="4" strokeDasharray="560" strokeDashoffset={560 * (1 - line)} />
          <circle cx="0" cy="200" r="9" fill={C.blue} opacity={line} />
          <circle cx="440" cy="30" r="9" fill={C.green} opacity={line} />
        </svg>
        <FadeUp frame={frame} delay={210} style={{position: 'absolute', right: 48, bottom: 52}}>
          <Pill tone="red">INVALID LOCATOR → NOT ADOPTED</Pill>
        </FadeUp>
      </div>
    </Scene>
  );
};

const RepairScene = () => {
  const frame = useCurrentFrame();
  const flow = reveal(frame, 70, 120);
  const verified = frame > 320;
  return (
    <Scene chapter="06" kicker="Bounded Codex repair" title="Give Codex the gap—not authority over the Constitution." frame={frame} dark>
      <div style={{display: 'grid', gridTemplateColumns: '0.88fr 1.12fr', gap: 38, height: '100%'}}>
        <div style={{display: 'grid', alignContent: 'center', gap: 18}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 70px 1fr', alignItems: 'center'}}>
            <FadeUp frame={frame} delay={22}>
              <div style={{border: '1px solid #5e5549', borderRadius: 16, padding: 21, background: '#24211c'}}>
                <Pill tone="green">LOCKED</Pill><p style={{fontFamily: EDITORIAL, fontSize: 27, margin: '17px 0 0'}}>Product Constitution v1.0</p><p style={{color: '#b9afa1', fontSize: 14}}>read-only · hash verified</p>
              </div>
            </FadeUp>
            <div style={{display: 'grid', placeItems: 'center', color: '#8a8072', fontSize: 28}}>→</div>
            <FadeUp frame={frame} delay={50}>
              <div style={{border: `1px solid ${C.ember}`, borderRadius: 16, padding: 21, background: '#2b211c'}}>
                <Pill tone="ember">GAP ONLY</Pill><p style={{fontFamily: EDITORIAL, fontSize: 27, margin: '17px 0 0'}}>Bounded repair brief</p><p style={{color: '#b9afa1', fontSize: 14}}>files · tests · time limit</p>
              </div>
            </FadeUp>
          </div>
          <div style={{position: 'relative', height: 190, border: '1px dashed #6e6355', borderRadius: 18, padding: 24, background: '#1e1b17'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><strong style={{letterSpacing: '0.1em', fontSize: 13}}>DETACHED GIT WORKTREE</strong><Pill tone={verified ? 'green' : 'blue'}>{verified ? 'VERIFIED' : 'RUNNING'}</Pill></div>
            <div style={{position: 'absolute', left: 28, right: 28, top: 88, height: 3, background: '#4b443a'}}><div style={{height: '100%', width: `${flow * 100}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.green})`}} /></div>
            {['diff', 'tests', 'patch'].map((label, index) => <div key={label} style={{position: 'absolute', left: `${12 + index * 38}%`, top: 72, transform: `scale(${settle(frame, 95 + index * 35)})`, width: 34, height: 34, borderRadius: 99, background: frame > 240 + index * 25 ? C.green : C.blue, border: '6px solid #1e1b17', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800}}>{frame > 240 + index * 25 ? '✓' : ''}</div>)}
            <div style={{position: 'absolute', left: 28, right: 28, bottom: 18, display: 'flex', justifyContent: 'space-between', color: '#b9afa1', fontSize: 12}}><span>allowed files</span><span>approved commands</span><span>human apply</span></div>
          </div>
          <FadeUp frame={frame} delay={340}>
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}><Pill tone="red">FORBIDDEN PATHS</Pill><Pill tone="green">CONSTITUTION HASH</Pill><Pill tone="blue">FULL PATCH</Pill></div>
          </FadeUp>
        </div>
        <Screenshot src={verified ? '08-remediation-verified.png' : '07-remediation-boundary.png'} frame={frame} delay={12} zoom={1.07} focusX={61} focusY={48} style={{height: 600, borderColor: '#5e5549'}} />
      </div>
    </Scene>
  );
};

const ReevaluateScene = () => {
  const frame = useCurrentFrame();
  const split = reveal(frame, 25, 65);
  const blocked = frame > 380;
  return (
    <Scene chapter="07" kicker="Same-condition re-evaluation" title="Improvement is comparable only when the contract stays fixed." frame={frame}>
      <div style={{position: 'relative', height: '100%'}}>
        <Screenshot src={blocked ? '11-live-local-blocked.png' : '09-reevaluation.png'} frame={frame} delay={10} zoom={blocked ? 1.02 : 1.065} focusX={58} focusY={45} style={{position: 'absolute', left: 0, right: 0, top: 0, height: 600}} />
        {!blocked && (
          <div style={{position: 'absolute', top: 90, left: 95, right: 95, display: 'grid', gridTemplateColumns: '1fr 100px 1fr', alignItems: 'center', opacity: split}}>
            <div style={{borderRadius: 15, padding: 18, background: 'rgba(242,217,213,0.95)', border: '1px solid #d6a59e'}}><Pill tone="red">BEFORE</Pill><p style={{fontFamily: EDITORIAL, fontSize: 28, margin: '15px 0 0'}}>2 must-pass gaps</p></div>
            <div style={{textAlign: 'center', fontSize: 42, color: C.ember}}>→</div>
            <div style={{borderRadius: 15, padding: 18, background: 'rgba(220,233,225,0.96)', border: '1px solid #abc6b8'}}><Pill tone="green">AFTER</Pill><p style={{fontFamily: EDITORIAL, fontSize: 28, margin: '15px 0 0'}}>same contract hash</p></div>
          </div>
        )}
        <div style={{position: 'absolute', left: 125, right: 125, bottom: 38, display: 'flex', justifyContent: 'center', gap: 12}}>
          {blocked ? <><Pill tone="red">RUNS DISAGREE</Pill><Pill tone="neutral">REPAIR DISABLED</Pill><Pill tone="green">AUTHORITY PRESERVED</Pill></> : <><Pill tone="green">SAME CONSTITUTION</Pill><Pill tone="blue">SAME MODEL SETTINGS</Pill><Pill tone="neutral">SIDE EFFECTS VISIBLE</Pill></>}
        </div>
      </div>
    </Scene>
  );
};

const TechnicalScene = () => {
  const frame = useCurrentFrame();
  const nodes = [
    ['CHATGPT OAUTH', 'Codex CLI', 'green'],
    ['STRICT SCHEMAS', 'additionalProperties: false', 'blue'],
    ['PRIVATE SQLITE', 'macOS Application Support', 'ember'],
    ['CONTENT HASHES', 'SHA-256 locators', 'blue'],
    ['LOOPBACK ONLY', 'random 127.0.0.1 port', 'green'],
    ['PUBLIC SPLIT', 'local APIs physically absent', 'ember'],
  ];
  return (
    <Scene chapter="08" kicker="Technical proof" title="Semantic judgment by GPT‑5.6. Deterministic boundaries by code." frame={frame} dark>
      <div style={{display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 44, height: '100%'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, alignContent: 'center'}}>
          {nodes.map(([title, detail, tone], index) => {
            const value = settle(frame, 18 + index * 16);
            return (
              <div key={title} style={{border: '1px solid #4b443a', background: '#24211c', borderRadius: 15, padding: 20, opacity: value, transform: `translateY(${(1 - value) * 20}px)`}}>
                <Pill tone={tone as 'green' | 'blue' | 'ember'}>{String(index + 1).padStart(2, '0')}</Pill>
                <h3 style={{fontSize: 17, letterSpacing: '0.08em', margin: '16px 0 7px'}}>{title}</h3>
                <p style={{margin: 0, color: '#b9afa1', fontSize: 14}}>{detail}</p>
              </div>
            );
          })}
        </div>
        <div style={{display: 'grid', alignContent: 'center', gap: 18}}>
          <Screenshot src="10-public-boundary.png" frame={frame} delay={20} zoom={1.03} focusX={60} focusY={48} style={{height: 372, borderColor: '#5e5549'}} />
          <FadeUp frame={frame} delay={160}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12}}>
              {[['65', 'unit / integration'], ['4', 'browser checks'], ['0', 'known vulnerabilities']].map(([value, label]) => (
                <div key={label} style={{border: '1px solid #4b443a', borderRadius: 13, background: '#24211c', padding: 16, textAlign: 'center'}}><div style={{fontFamily: EDITORIAL, fontSize: 42, color: '#f7f0e5'}}>{value}</div><div style={{fontSize: 12, color: '#b9afa1'}}>{label}</div></div>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
    </Scene>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const words = ['Human intent', 'becomes executable.', 'Disagreement', 'becomes visible.', 'Authority', 'stays human.'];
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 42%, #fffaf1, ${C.paper} 55%, ${C.paperDeep})`, color: C.ink, fontFamily: FONT, padding: '70px 100px 90px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><span style={{fontFamily: EDITORIAL, fontSize: 28}}>CriteriaForge</span><Pill tone="ember">WORK & PRODUCTIVITY</Pill></div>
      <div style={{flex: 1, display: 'grid', placeItems: 'center'}}>
        <div style={{textAlign: 'center', maxWidth: 1450}}>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '2px 18px', justifyContent: 'center'}}>
            {words.map((word, index) => {
              const value = settle(frame, 12 + index * 12);
              return <span key={word} style={{fontFamily: EDITORIAL, fontSize: index % 2 === 0 ? 77 : 69, lineHeight: 1.15, color: index % 2 === 0 ? C.ember : C.ink, opacity: value, transform: `translateY(${(1 - value) * 20}px)`}}>{word}</span>;
            })}
          </div>
          <FadeUp frame={frame} delay={96}>
            <blockquote style={{margin: '38px auto 0', maxWidth: 1220, paddingTop: 28, borderTop: `1px solid ${C.rule}`, fontFamily: EDITORIAL, fontSize: 32, lineHeight: 1.35, color: C.muted}}>
              “Codex may apply the Product Constitution, but may never silently redefine it.”
            </blockquote>
          </FadeUp>
        </div>
      </div>
      <FadeUp frame={frame} delay={150}>
        <div style={{display: 'flex', justifyContent: 'center', gap: 26, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 16, color: C.muted}}><span>criteriaforge.vercel.app</span><span>github.com/hapx2yuki/Global-Build-Week6</span></div>
      </FadeUp>
    </AbsoluteFill>
  );
};

const scenes = [
  {from: 0, duration: 393, component: IntroScene, name: 'Authority problem'},
  {from: 393, duration: 566, component: IntakeScene, name: 'Private evidence'},
  {from: 959, duration: 270, component: ConstitutionScene, name: 'Human ratification'},
  {from: 1229, duration: 322, component: CompileScene, name: 'Five gates'},
  {from: 1551, duration: 568, component: EvaluationScene, name: 'Three-run evaluation'},
  {from: 2119, duration: 494, component: EvidenceScene, name: 'Evidence verification'},
  {from: 2613, duration: 629, component: RepairScene, name: 'Bounded repair'},
  {from: 3242, duration: 669, component: ReevaluateScene, name: 'Same-condition re-evaluation'},
  {from: 3911, duration: 506, component: TechnicalScene, name: 'Technical proof'},
];

export const CriteriaForgeVideo = () => {
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Audio src={staticFile('narration.mp4')} disallowFallbackToHtml5Audio />
      {scenes.map(({from, duration, component: Component, name}) => (
        <Sequence key={name} from={from} durationInFrames={duration} name={name} premountFor={15}>
          <Component />
        </Sequence>
      ))}
      <Sequence from={4417} durationInFrames={317} name="Closing promise">
        <ClosingScene />
      </Sequence>
      <CaptionLayer />
      <GlobalProgress />
    </AbsoluteFill>
  );
};
