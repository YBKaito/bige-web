import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0f1117",
  panel:    "#161b27",
  border:   "#242938",
  bige:     "#4A8FE7",
  pgbige:   "#3dd68c",
  accent:   "#6C63FF",
  text:     "#e2e8f0",
  muted:    "#64748b",
  low:      "#4A8FE7",
  medium:   "#f59e0b",
  high:     "#ef4444",
};

const API = "";  // empty = use CRA proxy to localhost:5000

// ── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function activationColor(level) {
  return { low: C.low, medium: C.medium, high: C.high }[level] ?? C.bige;
}

// ── Skeleton SVG renderer ────────────────────────────────────────────────────
function SkeletonFrame({ frame, activation, color, size = 110 }) {
  if (!frame) return null;
  const kf  = clamp(frame.knee_flex,  0, 130);
  const hf  = clamp(frame.hip_flex,   0, 110);
  const act = clamp(frame.activation_pct, 0, 100);

  const cx = 55;
  const headY = 14;
  const shoulderY = headY + 20;
  const leanX = hf * 0.18;
  const hipY = shoulderY + 36 + hf * 0.18;
  const kneeY = hipY + 34 - kf * 0.12;
  const footY = kneeY + 32;
  const shoulderX = cx - leanX * 0.4;
  const hipX = cx + leanX * 0.3;
  const lKneeX = hipX - kf * 0.18;
  const rKneeX = hipX + kf * 0.10;

  const bone = (x1,y1,x2,y2,w=2.5) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="${w}" stroke-linecap="round"/>`;
  const joint = (x,y,r=4) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#1e293b" stroke="#64748b" stroke-width="1.2"/>`;
  const muscle = (x,y,rx,ry,op) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${op}"/>`;

  const gluteOp  = clamp(act / 100 * 0.9, 0.1, 0.9);
  const quadOp   = clamp((act - 20) / 80 * 0.7, 0, 0.7);

  const svg = `
    <svg viewBox="0 0 110 190" width="${size}" height="${size * 1.73}" xmlns="http://www.w3.org/2000/svg">
      ${muscle(hipX+2, hipY+5, 13, 10, gluteOp)}
      ${quadOp > 0 ? muscle(lKneeX-2, (hipY+kneeY)/2, 7, 15, quadOp) : ''}
      ${bone(hipX, hipY, lKneeX, kneeY)}
      ${bone(hipX+5, hipY, rKneeX, kneeY)}
      ${bone(lKneeX, kneeY, lKneeX+2, footY)}
      ${bone(rKneeX, kneeY, rKneeX-1, footY)}
      ${bone(lKneeX+2, footY, lKneeX-8, footY)}
      ${bone(rKneeX-1, footY, rKneeX+10, footY)}
      ${joint(lKneeX, kneeY, 4.5)}
      ${joint(rKneeX, kneeY, 4.5)}
      ${bone(shoulderX, shoulderY, hipX, hipY, 3)}
      ${bone(shoulderX-13, shoulderY+8, shoulderX, shoulderY)}
      ${bone(shoulderX+13, shoulderY+8, shoulderX, shoulderY)}
      ${bone(shoulderX-13, shoulderY+8, shoulderX-11, shoulderY+28)}
      ${bone(shoulderX+13, shoulderY+8, shoulderX+11, shoulderY+28)}
      ${joint(shoulderX, shoulderY, 5)}
      ${joint(hipX, hipY, 5)}
      <circle cx="${cx}" cy="${headY}" r="10" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
    </svg>`;

  return (
    <div dangerouslySetInnerHTML={{ __html: svg }} style={{ display: "flex", alignItems: "center", justifyContent: "center" }} />
  );
}

// ── Motion viewer panel (BIGE or PG-BIGE) ────────────────────────────────────
function MotionPanel({ label, tag, color, data, loading, activation }) {
  const frames = data?.frames ?? [];
  const cycleLabels = ["0%", "25%", "50%", "75%"];

  return (
    <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 600, background: color + "22", color, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.05em" }}>{tag}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{label}</span>
        <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: loading ? "#f59e0b" : "#3dd68c" }} />
      </div>

      {/* Skeleton frames */}
      <div style={{ padding: "16px", minHeight: 220 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.muted, fontSize: 13, letterSpacing: "0.15em" }}>
            GENERATING…
          </div>
        ) : frames.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.muted, fontSize: 13, letterSpacing: "0.1em" }}>
            MOTION VISUALIZATION
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {frames.map((f, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <SkeletonFrame frame={f} activation={activation} color={color} size={90} />
                <div style={{ fontSize: 10, color: C.muted }}>{cycleLabels[i]} cycle</div>
                {/* activation bar */}
                <div style={{ width: "100%", height: 3, background: C.border, borderRadius: 2 }}>
                  <div style={{ width: `${f.activation_pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Muscle activation label */}
      {frames.length > 0 && (
        <div style={{ padding: "0 16px 12px", fontSize: 13, color: C.muted }}>
          Muscle activation: <span style={{ color, fontWeight: 600 }}>{activation.charAt(0).toUpperCase() + activation.slice(1)}</span>
        </div>
      )}
    </div>
  );
}

// ── Metric bar ────────────────────────────────────────────────────────────────
function MetricBar({ label, bigeVal, pgVal }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>{label}</div>
      {[["BIGE", bigeVal, C.bige], ["PG-BIG", pgVal, C.pgbige]].map(([name, val, col]) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: C.muted, width: 44 }}>{name}</span>
          <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${val ?? 0}%`, height: "100%", background: col, borderRadius: 3, transition: "width 0.8s ease" }} />
          </div>
          <span style={{ fontSize: 11, color: col, width: 30, textAlign: "right" }}>{val ?? "—"}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Slider input ──────────────────────────────────────────────────────────────
function Slider({ label, value, min, max, unit, onChange }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
}

// ── Select input ──────────────────────────────────────────────────────────────
function Select({ label, value, options, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "7px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // Subject profile
  const [age, setAge]       = useState(22);
  const [height, setHeight] = useState(180);
  const [mass, setMass]     = useState(75);
  const [sport, setSport]   = useState("Basketball");

  // Constraints
  const [activation, setActivation]   = useState("medium");
  const [exercise, setExercise]       = useState("Squat");
  const [pelvis, setPelvis]           = useState("Neutral");
  const [vastus, setVastus]           = useState(65);
  const [comVel, setComVel]           = useState("Low");
  const [depthTarget, setDepthTarget] = useState("Parallel");
  const [angVel, setAngVel]           = useState("Controlled");

  // Results
  const [loading, setLoading]   = useState(false);
  const [bigeData, setBigeData] = useState(null);
  const [pgData, setPgData]     = useState(null);
  const [showChart, setShowChart] = useState(false);

  const depthDeg = { "Quarter": 45, "Parallel": 90, "Deep": 110, "Full": 130 }[depthTarget] ?? 90;

  const METRIC_LABELS = [
    ["squat_depth",           "Squat Depth"],
    ["muscle_activation",     "Muscle Activation"],
    ["temporal_consistency",  "Temporal Consistency"],
    ["reconstruction_loss",   "Reconstruction Loss"],
    ["perplexity",            "Perplexity"],
    ["diversity_score",       "Diversity Score"],
    ["similarity_score",      "Similarity Score"],
  ];

  async function generate() {
    setLoading(true);
    setBigeData(null);
    setPgData(null);
    setShowChart(false);
    try {
      const res = await fetch(`${API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activation_level: activation,
          height_cm: height,
          mass_kg: mass,
          age,
          sport,
          squat_depth_deg: depthDeg,
          exercise_type: exercise,
          pelvis_tilt: pelvis,
          vastus_range: vastus,
          com_velocity: comVel,
          angular_velocity: angVel,
        }),
      });
      const data = await res.json();
      setBigeData(data.bige);
      setPgData(data.pg_bige);
      setShowChart(true);
    } catch (e) {
      console.error(e);
      alert("Backend not running. Start Flask: cd backend && python app.py");
    } finally {
      setLoading(false);
    }
  }

  // Chart data from trajectory
  const chartData = bigeData?.trajectory
    ? bigeData.trajectory.time.map((t, i) => ({
        t: t.toFixed(2),
        bige_knee:   +bigeData.trajectory.knee_flex_l[i].toFixed(1),
        pgbige_knee: pgData ? +pgData.trajectory.knee_flex_l[i].toFixed(1) : null,
      }))
    : [];

  const bmi = (mass / ((height / 100) ** 2)).toFixed(1);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", padding: "20px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.bige}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>B</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>BIGE <span style={{ color: C.muted, fontWeight: 400 }}>·</span> Biomechanics-informed Motion Generation</div>
          <div style={{ fontSize: 11, color: C.muted }}>Rose STL Lab · UCSD</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: C.muted, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
          🟡 Mock mode — plug in checkpoints to go live
        </div>
      </div>

      {/* Motion panels */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <MotionPanel label="Baseline Model" tag="BIGE"  color={C.bige}   data={bigeData} loading={loading} activation={activation} />
        <MotionPanel label="Personalized Guidance" tag="PG-BIG" color={C.pgbige} data={pgData}  loading={loading} activation={activation} />
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 280px", gap: 16 }}>

        {/* Subject profile */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Subject Profile</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["AGE", age + " yr"], ["HEIGHT", height + " cm"], ["WEIGHT", mass + " kg"], ["BMI", bmi]].map(([l, v]) => (
              <div key={l} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.08em", marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.bg, borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.08em", marginBottom: 3 }}>SPORT / ACTIVITY</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{sport} · Athlete</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Slider label="Age"    value={age}    min={16} max={60} unit=" yr" onChange={setAge} />
            <Slider label="Height" value={height} min={150} max={210} unit=" cm" onChange={setHeight} />
            <Slider label="Mass"   value={mass}   min={45} max={130} unit=" kg" onChange={setMass} />
          </div>
          <Select label="Sport" value={sport} options={["Basketball","Soccer","Weightlifting","Track","Swimming","Tennis"]} onChange={setSport} />
        </div>

        {/* Biomechanical constraints */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Biomechanical Constraints</div>

          {/* Activation */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Muscle Activation Target</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["low", "medium", "high"].map(l => (
                <button key={l} onClick={() => setActivation(l)}
                  style={{ flex: 1, padding: "7px 0", fontSize: 13, fontWeight: 500, borderRadius: 7, border: `1px solid ${activation === l ? activationColor(l) : C.border}`, background: activation === l ? activationColor(l) + "22" : C.bg, color: activation === l ? activationColor(l) : C.muted, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Select label="Exercise Type"    value={exercise}     options={["Squat","Lunge","Deadlift","Step-up"]}            onChange={setExercise} />
            <Select label="Pelvis Tilt"      value={pelvis}       options={["Neutral","Anterior","Posterior"]}                onChange={setPelvis} />
            <Select label="Squat Depth Target" value={depthTarget} options={["Quarter","Parallel","Deep","Full"]}             onChange={setDepthTarget} />
            <Select label="COM Velocity"     value={comVel}       options={["Low","Controlled","High"]}                      onChange={setComVel} />
            <Select label="Angular Velocity Ω" value={angVel}    options={["Slow","Controlled","Fast"]}                      onChange={setAngVel} />
            <Select label="Sport / Activity" value={sport}        options={["Basketball","Soccer","Weightlifting","Track","Swimming","Tennis"]} onChange={setSport} />
          </div>

          <Slider label="Vastus Medialis Range" value={vastus} min={0} max={100} unit="%" onChange={setVastus} />

          {/* Presets */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Constraint Presets</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Deep Squat","Rehab Motion","Explosive","Gait Analysis","Low Impact"].map(p => (
                <button key={p} onClick={() => {
                  if (p === "Deep Squat")    { setActivation("high");   setDepthTarget("Deep");     setComVel("Controlled"); setPelvis("Anterior"); }
                  if (p === "Rehab Motion")  { setActivation("low");    setDepthTarget("Quarter");  setComVel("Low");        setPelvis("Neutral"); }
                  if (p === "Explosive")     { setActivation("high");   setDepthTarget("Parallel"); setComVel("High");       setPelvis("Neutral"); }
                  if (p === "Gait Analysis") { setActivation("medium"); setDepthTarget("Parallel"); setComVel("Controlled"); setPelvis("Posterior"); }
                  if (p === "Low Impact")    { setActivation("low");    setDepthTarget("Quarter");  setComVel("Low");        setPelvis("Neutral"); }
                }}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button onClick={generate} disabled={loading}
            style={{ marginTop: 16, width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: loading ? C.border : `linear-gradient(135deg, ${C.accent}, ${C.bige})`, color: "#fff", cursor: loading ? "not-allowed" : "pointer", transition: "opacity 0.2s", letterSpacing: "0.02em" }}>
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>

        {/* Metrics panel */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, overflowY: "auto", maxHeight: 480 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Performance Metrics</div>
          {METRIC_LABELS.map(([key, label]) => (
            <MetricBar key={key} label={label}
              bigeVal={bigeData?.metrics?.[key]}
              pgVal={pgData?.metrics?.[key]} />
          ))}
        </div>
      </div>

      {/* Trajectory chart */}
      {showChart && chartData.length > 0 && (
        <div style={{ marginTop: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Knee Flexion Trajectory — Full Squat Cycle</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="t" tick={{ fill: C.muted, fontSize: 10 }} label={{ value: "Time (s)", fill: C.muted, fontSize: 11, position: "insideBottom", offset: -2 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} label={{ value: "Flex (°)", fill: C.muted, fontSize: 11, angle: -90, position: "insideLeft" }} />
              <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: C.muted }} />
              <Line type="monotone" dataKey="bige_knee"   stroke={C.bige}   dot={false} strokeWidth={2} name="BIGE" />
              <Line type="monotone" dataKey="pgbige_knee" stroke={C.pgbige} dot={false} strokeWidth={2} name="PG-BIGE" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
