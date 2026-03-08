import { useState, useEffect, useRef, useMemo } from "react";

// ── PALETTE ──────────────────────────────────────────────────────────────────
const COLORS = [
  { bg: "#C8F135", dark: "#6a9200" },
  { bg: "#FF6EC7", dark: "#b5007d" },
  { bg: "#5DD4F0", dark: "#0088aa" },
  { bg: "#FFD04B", dark: "#a07800" },
  { bg: "#FF8C69", dark: "#c04800" },
  { bg: "#C4A0FF", dark: "#6600cc" },
  { bg: "#6EEAB0", dark: "#008855" },
];

// ── PERSISTENCE ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'habbit_habits';
const DATE_KEY    = 'habbit_date';

const freqLabel = { daily: "every day", weekly: "weekly", custom: "several times" };
const DAYS_SHORT = ["MO","TU","WE","TH","FR","SA","SU"];
const today = new Date(); today.setHours(0,0,0,0);
const todayIdx = (today.getDay() + 6) % 7;
const todayKey = today.toISOString().slice(0,10);

function dateKey(d) { return d.toISOString().slice(0,10); }
function daysAgo(n) { const d = new Date(today); d.setDate(d.getDate()-n); return d; }

function calcStreak(history) {
  let streak = 0;
  const base = new Date(today);
  for (let i = 0; i < 365; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0,10);
    if (history[k]) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const habits = JSON.parse(raw);
    const lastDate = localStorage.getItem(DATE_KEY);
    if (lastDate !== todayKey) {
      localStorage.setItem(DATE_KEY, todayKey);
      return habits.map(h => ({ ...h, done: 0 }));
    }
    return habits;
  } catch { return []; }
}

function saveHabits(habits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    localStorage.setItem(DATE_KEY, todayKey);
  } catch {}
}

// ── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Tag({ label, color }) {
  return (
    <span style={{
      fontSize:10, fontFamily:"'Nunito',sans-serif", fontWeight:800,
      color: COLORS[color%COLORS.length].dark,
      background: COLORS[color%COLORS.length].bg + "33",
      padding:"2px 8px", borderRadius:6, letterSpacing:0.3, whiteSpace:"nowrap"
    }}>{label}</span>
  );
}

// ── SHEET SHELL ───────────────────────────────────────────────────────────────
function Sheet({ onClose, children }) {
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:200,
      display:"flex",alignItems:"flex-end",justifyContent:"center",
      backdropFilter:"blur(8px)"
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#fff", borderRadius:"28px 28px 0 0",
        padding:"28px 24px 52px", width:"100%", maxWidth:480,
        boxShadow:"0 -8px 40px rgba(0,0,0,0.1)", maxHeight:"90vh", overflowY:"auto"
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div style={{width:40,height:4,borderRadius:2,background:"#e8e8e8"}}/>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            fontSize:20,color:"#ccc",lineHeight:1,padding:"0 4px"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── ADD SHEET ─────────────────────────────────────────────────────────────────
function AddSheet({ onClose, onAdd, existingCategories }) {
  const [name, setName]          = useState("");
  const [type, setType]          = useState("regular");
  const [freq, setFreq]          = useState("daily");
  const [target, setTarget]      = useState(1);
  const [unit, setUnit]          = useState("");
  const [category, setCat]       = useState("");
  const [newCat, setNewCat]      = useState("");
  const [projectName, setProjName] = useState("");
  const [colorIdx, setColor]     = useState(0);

  const cats = [...new Set(existingCategories)];
  const isProject  = type === "project";
  const isReminder = type === "reminder";
  const isQuit     = type === "quit";
  const finalCat   = isProject ? (projectName.trim() || "Project") : (category === "__new__" ? newCat : category);
  const accent = COLORS[colorIdx % COLORS.length].bg;

  const submit = () => {
    if (!name.trim()) return;
    if (isProject && !projectName.trim()) return;
    onAdd({ name, type, freq, target: Number(target), unit, category: finalCat || "General", color: colorIdx });
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <p style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:800,color:"#1a1a1a",marginBottom:20}}>
        New habit
      </p>

      {/* Type */}
      <p style={sectionLabel}>Type</p>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[
          ["regular",  "✦ Build"],
          ["quit",     "✕ Quit"],
          ["project",  "◈ Project"],
          ["reminder", "🔔 Reminder"],
        ].map(([v,l]) => (
          <button key={v} onClick={()=>setType(v)} style={{
            padding:"8px 14px", borderRadius:20,
            background: type===v ? "#1a1a1a" : "#f2f2f2",
            border:"none", color: type===v?"#fff":"#999",
            fontSize:13, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
          }}>{l}</button>
        ))}
      </div>

      {/* Name */}
      <p style={sectionLabel}>Name</p>
      <input value={name} onChange={e=>setName(e.target.value)}
        placeholder={isQuit ? "Don't scroll Instagram..." : isReminder ? "To sing, call mom..." : "habit name..."}
        autoFocus style={inputSt}/>

      {/* Project name OR Category */}
      {isProject ? (
        <>
          <p style={sectionLabel}>Project name</p>
          <input value={projectName} onChange={e=>setProjName(e.target.value)}
            placeholder="e.g. Job search, Side project..." style={inputSt}/>
        </>
      ) : (
        <>
          <p style={sectionLabel}>Category</p>
          <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{
                padding:"7px 14px", borderRadius:20,
                background: category===c ? accent : "#f2f2f2",
                border:"none", color: category===c?"#1a1a1a":"#999",
                fontSize:12, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
              }}>{c}</button>
            ))}
            <button onClick={()=>setCat("__new__")} style={{
              padding:"7px 14px", borderRadius:20,
              background: category==="__new__" ? accent : "#f2f2f2",
              border:"none", color: category==="__new__"?"#1a1a1a":"#999",
              fontSize:12, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
            }}>+ New</button>
          </div>
          {category==="__new__" && (
            <input value={newCat} onChange={e=>setNewCat(e.target.value)}
              placeholder="category name..." style={{...inputSt, marginBottom:16}}/>
          )}
        </>
      )}

      {/* Color */}
      <p style={sectionLabel}>Color</p>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {COLORS.map((c,i)=>(
          <div key={i} onClick={()=>setColor(i)} style={{
            width:28,height:28,borderRadius:"50%",background:c.bg,cursor:"pointer",
            boxShadow: colorIdx===i ? `0 0 0 3px #fff, 0 0 0 5px ${c.bg}` : "none",
            transition:"box-shadow 0.15s"
          }}/>
        ))}
      </div>

      {/* Freq + target (only for regular/project) */}
      {!isQuit && !isReminder && (
        <>
          <p style={sectionLabel}>Frequency</p>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {[["daily","every day"],["weekly","weekly"],["custom","several times"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFreq(v)} style={{
                padding:"8px 14px", borderRadius:20,
                background: freq===v ? accent : "#f2f2f2",
                border:"none", color: freq===v?"#1a1a1a":"#999",
                fontSize:13, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
              }}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            <input type="number" min={1} value={target} onChange={e=>setTarget(e.target.value)}
              style={{...inputSt,flex:1,marginBottom:0}}/>
            <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="min / pcs / km"
              style={{...inputSt,flex:2,marginBottom:0}}/>
          </div>
        </>
      )}

      <button onClick={submit} style={{
        width:"100%",padding:"16px",borderRadius:16,
        background:accent,border:"none",cursor:"pointer",
        fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:800,color:"#1a1a1a"
      }}>+ Add</button>
    </Sheet>
  );
}

// ── EDIT SHEET ────────────────────────────────────────────────────────────────
function EditSheet({ habit, onClose, onEdit, existingCategories }) {
  const [name, setName]      = useState(habit.name);
  const [type, setType]      = useState(habit.type);
  const [freq, setFreq]      = useState(habit.freq || "daily");
  const [target, setTarget]  = useState(habit.target || 1);
  const [unit, setUnit]      = useState(habit.unit || "");
  const [category, setCat]   = useState(habit.category || "");
  const [newCat, setNewCat]  = useState("");
  const [colorIdx, setColor] = useState(habit.color);

  const cats = [...new Set(existingCategories)];
  const isReminder = type === "reminder";
  const isQuit     = type === "quit";
  const finalCat   = category === "__new__" ? newCat : category;
  const accent = COLORS[colorIdx % COLORS.length].bg;

  const submit = () => {
    if (!name.trim()) return;
    onEdit(habit.id, { name, type, freq, target: Number(target), unit, category: finalCat || habit.category, color: colorIdx });
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <p style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:800,color:"#1a1a1a",marginBottom:20}}>
        Edit habit
      </p>

      {/* Type */}
      <p style={sectionLabel}>Type</p>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[
          ["regular","✦ Build"],["quit","✕ Quit"],["project","◈ Project"],["reminder","🔔 Reminder"],
        ].map(([v,l]) => (
          <button key={v} onClick={()=>setType(v)} style={{
            padding:"8px 14px", borderRadius:20,
            background: type===v ? "#1a1a1a" : "#f2f2f2",
            border:"none", color: type===v?"#fff":"#999",
            fontSize:13, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
          }}>{l}</button>
        ))}
      </div>

      {/* Name */}
      <p style={sectionLabel}>Name</p>
      <input value={name} onChange={e=>setName(e.target.value)} autoFocus style={inputSt}/>

      {/* Category */}
      <p style={sectionLabel}>Category</p>
      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{
            padding:"7px 14px", borderRadius:20,
            background: category===c ? accent : "#f2f2f2",
            border:"none", color: category===c?"#1a1a1a":"#999",
            fontSize:12, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
          }}>{c}</button>
        ))}
        <button onClick={()=>setCat("__new__")} style={{
          padding:"7px 14px", borderRadius:20,
          background: category==="__new__" ? accent : "#f2f2f2",
          border:"none", color: category==="__new__"?"#1a1a1a":"#999",
          fontSize:12, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
        }}>+ New</button>
      </div>
      {category==="__new__" && (
        <input value={newCat} onChange={e=>setNewCat(e.target.value)}
          placeholder="category name..." style={{...inputSt, marginBottom:16}}/>
      )}

      {/* Color */}
      <p style={sectionLabel}>Color</p>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {COLORS.map((c,i)=>(
          <div key={i} onClick={()=>setColor(i)} style={{
            width:28,height:28,borderRadius:"50%",background:c.bg,cursor:"pointer",
            boxShadow: colorIdx===i ? `0 0 0 3px #fff, 0 0 0 5px ${c.bg}` : "none",
            transition:"box-shadow 0.15s"
          }}/>
        ))}
      </div>

      {/* Frequency (not for quit/reminder) */}
      {!isQuit && !isReminder && (
        <>
          <p style={sectionLabel}>Frequency</p>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {[["daily","every day"],["weekly","weekly"],["custom","several times"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFreq(v)} style={{
                padding:"8px 14px", borderRadius:20,
                background: freq===v ? accent : "#f2f2f2",
                border:"none", color: freq===v?"#1a1a1a":"#999",
                fontSize:13, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
              }}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            <input type="number" min={1} value={target} onChange={e=>setTarget(e.target.value)}
              style={{...inputSt,flex:1,marginBottom:0}}/>
            <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="min / pcs / km"
              style={{...inputSt,flex:2,marginBottom:0}}/>
          </div>
        </>
      )}

      <button onClick={submit} style={{
        width:"100%",padding:"16px",borderRadius:16,marginTop:8,
        background:accent,border:"none",cursor:"pointer",
        fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:800,color:"#1a1a1a"
      }}>Save</button>
    </Sheet>
  );
}

const sectionLabel = {
  fontSize:11,color:"#bbb",letterSpacing:1.2,textTransform:"uppercase",
  fontFamily:"'Nunito',sans-serif",fontWeight:800,marginBottom:8
};
const inputSt = {
  width:"100%",background:"#f7f7f7",border:"1.5px solid #efefef",
  borderRadius:14,padding:"13px 16px",fontSize:15,
  fontFamily:"'Nunito',sans-serif",fontWeight:600,color:"#1a1a1a",
  outline:"none",marginBottom:16,boxSizing:"border-box"
};

// ── HABIT CARD (today) ────────────────────────────────────────────────────────
function HabitCard({ habit, onToggle, onIncrement, onDecrement }) {
  const isReminder = habit.type === "reminder";
  const isQuit     = habit.type === "quit";
  const isQ        = habit.target > 1 && !isQuit;
  const isDone     = isReminder
    ? habit.done > 0
    : habit.history[todayKey] || (isQ ? habit.done >= habit.target : habit.done > 0);
  const c   = COLORS[habit.color % COLORS.length];
  const pct = isQ ? Math.min(100,(habit.done/habit.target)*100) : (isDone?100:0);

  if (isReminder) {
    return (
      <div onClick={()=>onToggle(habit.id)} style={{
        background: isDone ? c.bg+"22" : "#fff",
        border:`1.5px solid ${isDone ? c.bg : "#f0f0f0"}`,
        borderRadius:18, padding:"15px 16px", marginBottom:10,
        transition:"all 0.25s ease", cursor:"pointer",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:13}}>
          <div style={{
            width:30, height:30, borderRadius:8,
            border:`2.5px solid ${isDone ? c.bg : "#e0e0e0"}`,
            background: isDone ? c.bg : "#fff",
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",flexShrink:0,fontSize:15,
            transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            🔔
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{
                fontFamily:"'Nunito',sans-serif",fontSize:15,fontWeight:700,
                color: isDone?"#aaa":"#1a1a1a", transition:"color 0.3s"
              }}>{habit.name}</span>
              <Tag label={habit.category} color={habit.color}/>
            </div>
            <span style={{fontSize:11,color:isDone?"#aaa":c.dark,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
              {isDone ? "Noted ✓" : "Tap to acknowledge"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const handleTap = () => {
    if (isQuit) { onToggle(habit.id); return; }
    isQ ? onIncrement(habit.id) : onToggle(habit.id);
  };

  return (
    <div onClick={handleTap} style={{
      background: isDone ? c.bg+"22" : "#fff",
      border:`1.5px solid ${isDone ? c.bg : "#f0f0f0"}`,
      borderRadius:18, padding:"15px 16px", marginBottom:10,
      transition:"all 0.25s ease", cursor:"pointer",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:13}}>
        {/* Button */}
        <div style={{
          width:30, height:30,
          borderRadius: isQuit ? 8 : "50%",
          border:`2.5px solid ${isDone ? c.bg : "#e0e0e0"}`,
          background: isDone ? c.bg : "#fff",
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",flexShrink:0,
          transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          transform: isDone?"scale(1.08)":"scale(1)",
          boxShadow: isDone?`0 0 0 4px ${c.bg}33`:"none"
        }}>
          {isDone && !isQuit && (
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
              <path d="M1 4.5L4.5 8L11 1" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {isQuit && isDone && <span style={{fontSize:13}}>✕</span>}
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{
              fontFamily:"'Nunito',sans-serif",fontSize:15,fontWeight:700,
              color: isDone?"#aaa":"#1a1a1a",
              textDecoration: isDone&&!isQuit?"line-through":"none",
              transition:"color 0.3s"
            }}>{habit.name}</span>
            <Tag label={habit.category} color={habit.color}/>
          </div>

          {isQ && (
            <div style={{marginTop:7}}>
              <div style={{height:4,background:"#f0f0f0",borderRadius:4}}>
                <div style={{height:4,borderRadius:4,background:c.bg,width:`${pct}%`,transition:"width 0.4s"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:11,color:"#bbb",fontFamily:"'Nunito',sans-serif",fontWeight:600}}>
                  {habit.done} / {habit.target} {habit.unit}
                </span>
                {habit.done > 0 && (
                  <button onClick={e=>{e.stopPropagation();onDecrement(habit.id);}} style={{
                    background:"#f0f0f0",border:"none",borderRadius:8,
                    width:22,height:22,cursor:"pointer",fontSize:14,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#999",fontWeight:700,flexShrink:0
                  }}>−</button>
                )}
              </div>
            </div>
          )}

          {isQuit && (
            <span style={{fontSize:11,color:isDone?"#aaa":c.dark,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
              {isDone ? "Holding strong 💪" : "Tap if you resisted today"}
            </span>
          )}
        </div>

        {habit.streak > 0 && !isReminder && (
          <div style={{
            background:c.bg+"25",borderRadius:10,padding:"4px 10px",flexShrink:0,
            display:"flex",alignItems:"center",gap:5
          }}>
            <div style={{width:7,height:7,borderRadius:"50%",background:c.bg}}/>
            <span style={{fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,color:c.dark}}>
              {habit.streak}d
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MANAGE ROW ────────────────────────────────────────────────────────────────
function ManageRow({ habit, onDelete, onEdit }) {
  const [offset, setOffset]     = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [exiting, setExiting]   = useState(false);
  const startX = useRef(null); const dragging = useRef(false);
  const LIMIT = 80;
  const c = COLORS[habit.color % COLORS.length];

  const down = x => { startX.current=x; dragging.current=true; };
  const move = x => { if(!dragging.current)return; const dx=x-startX.current; if(dx<0) setOffset(Math.max(dx,-LIMIT-8)); };
  const up   = () => {
    if(!dragging.current)return; dragging.current=false;
    if(offset<-LIMIT/2){setRevealed(true);setOffset(-LIMIT);}
    else{setRevealed(false);setOffset(0);}
    startX.current=null;
  };
  const doDelete = () => { setExiting(true); setTimeout(()=>onDelete(habit.id),300); };

  return (
    <div style={{position:"relative",overflow:"hidden",marginBottom:8,
      maxHeight:exiting?0:80,opacity:exiting?0:1,
      transition:"max-height 0.3s ease,opacity 0.25s ease"}}>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:LIMIT,
        background:"#FF6B6B",display:"flex",alignItems:"center",justifyContent:"center",
        borderRadius:"0 16px 16px 0"}}>
        <span style={{color:"#fff",fontSize:16}}>✕</span>
      </div>
      <div
        onTouchStart={e=>down(e.touches[0].clientX)} onTouchMove={e=>move(e.touches[0].clientX)} onTouchEnd={up}
        onMouseDown={e=>down(e.clientX)} onMouseMove={e=>move(e.clientX)} onMouseUp={up} onMouseLeave={up}
        style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
          background:"#fff",borderRadius:16,border:"1.5px solid #f0f0f0",
          transform:`translateX(${offset}px)`,
          transition:dragging.current?"none":"transform 0.25s cubic-bezier(0.25,1,0.5,1)",
          cursor:"grab",userSelect:"none",position:"relative",zIndex:1}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:c.bg,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,fontWeight:700,color:"#1a1a1a"}}>
            {habit.name}
          </div>
          <div style={{fontSize:11,color:"#bbb",fontFamily:"'Nunito',sans-serif",fontWeight:600,marginTop:1,display:"flex",gap:6,alignItems:"center"}}>
            {habit.type !== "reminder" && <><span>{freqLabel[habit.freq] || habit.freq}</span><span>·</span></>}
            {habit.type === "reminder" && <span>reminder</span>}
            {habit.type === "reminder" && <span>·</span>}
            <Tag label={habit.category} color={habit.color}/>
          </div>
        </div>
        {/* Edit button */}
        <button onClick={e=>{e.stopPropagation();setOffset(0);setRevealed(false);onEdit(habit);}} style={{
          background:"#f2f2f2",border:"none",borderRadius:10,
          width:32,height:32,cursor:"pointer",flexShrink:0,fontSize:14,
          display:"flex",alignItems:"center",justifyContent:"center"
        }}>✎</button>
        {revealed
          ? <button onClick={doDelete} style={{background:"#FF6B6B",border:"none",borderRadius:10,
              color:"#fff",fontSize:12,fontFamily:"'Nunito',sans-serif",
              fontWeight:800,padding:"6px 12px",cursor:"pointer",flexShrink:0}}>delete</button>
          : <span style={{color:"#ddd",fontSize:18,flexShrink:0}}>‹</span>
        }
      </div>
    </div>
  );
}

// ── HEATMAP ───────────────────────────────────────────────────────────────────
function Heatmap({ habits, period }) {
  const days = period === "week" ? 7 : 28;
  const dates = Array.from({length:days},(_,i)=>daysAgo(days-1-i));

  const cats = {};
  habits.forEach(h => {
    if(!cats[h.category]) cats[h.category]=[];
    cats[h.category].push(h);
  });

  return (
    <div>
      {Object.entries(cats).map(([catName, catHabits])=>{
        const firstHabit = catHabits[0];
        const c = COLORS[firstHabit.color % COLORS.length];
        const isQuitCat = catHabits.every(h=>h.type==="quit");

        return (
          <div key={catName} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.bg}}/>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:800,
                color:"#aaa",letterSpacing:1,textTransform:"uppercase"}}>{catName}</span>
              {isQuitCat && (
                <span style={{fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,
                  color:"#FF6B6B",background:"#FF6B6B22",padding:"2px 8px",borderRadius:6}}>QUIT</span>
              )}
            </div>

            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"separate",borderSpacing:"3px 3px",width:"100%"}}>
                <thead>
                  <tr>
                    <td style={{width:90}}/>
                    {period==="week"
                      ? dates.map((d,i)=>(
                          <td key={i} style={{textAlign:"center",paddingBottom:4}}>
                            <span style={{fontSize:9,color:"#ccc",fontFamily:"'Nunito',sans-serif",fontWeight:800,
                              letterSpacing:0.5,display:"block"}}>
                              {DAYS_SHORT[(d.getDay()+6)%7]}
                            </span>
                            <span style={{fontSize:10,color:dateKey(d)===todayKey?"#1a1a1a":"#bbb",
                              fontFamily:"'Nunito',sans-serif",fontWeight:dateKey(d)===todayKey?900:600}}>
                              {d.getDate()}
                            </span>
                          </td>
                        ))
                      : Array.from({length:28},(_,i)=>daysAgo(27-i)).map((d,i)=>(
                          <td key={i} style={{textAlign:"center",paddingBottom:2,minWidth:14}}>
                            {i%7===0 && (
                              <span style={{fontSize:8,color:"#ddd",fontFamily:"'Nunito',sans-serif"}}>
                                {d.getDate()}
                              </span>
                            )}
                          </td>
                        ))
                    }
                  </tr>
                </thead>
                <tbody>
                  {catHabits.map(habit=>{
                    const hc = COLORS[habit.color%COLORS.length];
                    const isQuit = habit.type==="quit";
                    return (
                      <tr key={habit.id}>
                        <td style={{paddingRight:8,paddingBottom:3}}>
                          <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,
                            color:"#555",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                            display:"block",maxWidth:85}}>
                            {habit.name}
                          </span>
                        </td>
                        {dates.map((d,i)=>{
                          const key = dateKey(d);
                          const done = habit.history[key];
                          const isToday = key===todayKey;
                          return (
                            <td key={i} style={{textAlign:"center"}}>
                              <div style={{
                                width:"100%", minWidth:period==="week"?28:12,
                                height:period==="week"?28:12,
                                borderRadius:period==="week"?8:4,
                                background: done
                                  ? (isQuit ? "#FF6EC7" : hc.bg)
                                  : isToday ? "#f0f0f0" : "#ebe9e4",
                                border: isToday?`1.5px solid ${done?hc.bg:"#ddd"}`:"none",
                                display:"flex",alignItems:"center",justifyContent:"center",
                                transition:"background 0.2s",
                                margin:"0 auto"
                              }}>
                                {period==="week" && done && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L3.5 6.5L9 1" stroke={isQuit?"#fff":"#1a1a1a"}
                                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{display:"flex",gap:16,marginTop:10}}>
              {catHabits.map(h=>{
                const total = dates.filter(d=>h.history[dateKey(d)]).length;
                const pct = Math.round(total/dates.length*100);
                const hc = COLORS[h.color%COLORS.length];
                return (
                  <div key={h.id} style={{flex:1}}>
                    <div style={{height:3,background:"#ebe9e4",borderRadius:2}}>
                      <div style={{height:3,borderRadius:2,background:h.type==="quit"?"#FF6EC7":hc.bg,
                        width:`${pct}%`,transition:"width 0.5s"}}/>
                    </div>
                    <span style={{fontSize:10,color:"#bbb",fontFamily:"'Nunito',sans-serif",
                      fontWeight:700,marginTop:3,display:"block"}}>
                      {h.name.length>12 ? h.name.slice(0,12)+"…" : h.name} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── EMOTIONAL INSIGHT ─────────────────────────────────────────────────────────
function getInsight(habits, period) {
  if (!habits.length) return null;

  const days = period === "week" ? 7 : 28;
  const prevDays = period === "week" ? 14 : 56;

  const currentDates = Array.from({ length: days }, (_, i) => daysAgo(days - 1 - i));
  const prevDates = Array.from({ length: days }, (_, i) => daysAgo(prevDays - 1 - i));

  const rate = (dates) => {
    const total = habits.length * dates.length;
    const done = habits.reduce((acc, h) =>
      acc + dates.filter(d => h.history[dateKey(d)]).length, 0);
    return total ? Math.round((done / total) * 100) : 0;
  };

  const currentRate = rate(currentDates);
  const prevRate = rate(prevDates);
  const diff = currentRate - prevRate;

  const bestStreak = habits.reduce((best, h) => h.streak > best.streak ? h : best, habits[0]);

  const mostConsistent = habits
    .map(h => ({
      ...h,
      pct: Math.round(currentDates.filter(d => h.history[dateKey(d)]).length / currentDates.length * 100)
    }))
    .reduce((best, h) => h.pct > best.pct ? h : best, { pct: 0 });

  const perfectDays = currentDates.filter(d =>
    habits.every(h => h.history[dateKey(d)])
  ).length;

  const insights = [];

  if (diff > 10) {
    insights.push({ emoji:"🚀", title:`+${diff}% from last period`, sub:"You're picking up pace. Keep it up.", color:"#C8F135", dark:"#6a9200" });
  } else if (diff > 0) {
    insights.push({ emoji:"📈", title:`Slightly better than before`, sub:`${currentRate}% completion — moving forward.`, color:"#6EEAB0", dark:"#008855" });
  } else if (diff < -10) {
    insights.push({ emoji:"💭", title:`Tough period`, sub:"That's okay. The main thing is to start again.", color:"#FFD04B", dark:"#a07800" });
  }

  if (bestStreak.streak >= 7) {
    insights.push({ emoji:"🔥", title:`${bestStreak.streak} days in a row`, sub:`"${bestStreak.name}" — your record.`, color:"#FF8C69", dark:"#c04800" });
  }

  if (mostConsistent.pct === 100) {
    insights.push({ emoji:"⭐", title:`Perfect`, sub:`"${mostConsistent.name}" — 100% for the period.`, color:"#FFD04B", dark:"#a07800" });
  } else if (mostConsistent.pct >= 80) {
    insights.push({ emoji:"✦", title:`${mostConsistent.pct}% completion`, sub:`"${mostConsistent.name}" — most consistent.`, color:"#C4A0FF", dark:"#6600cc" });
  }

  if (perfectDays > 0) {
    insights.push({ emoji:"🎯", title:`${perfectDays} perfect ${perfectDays === 1 ? "day" : "days"}`, sub:"All habits completed in one day.", color:"#5DD4F0", dark:"#0088aa" });
  }

  if (!insights.length) {
    insights.push({ emoji:"🌱", title:`${currentRate}% completion`, sub:"Starting is half the battle.", color:"#6EEAB0", dark:"#008855" });
  }

  return insights[0];
}

function InsightCard({ habits, period }) {
  const insight = getInsight(habits, period);
  if (!insight) return null;

  return (
    <div style={{
      background: insight.color, borderRadius: 20,
      padding: "18px 20px", marginBottom: 20,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", right:-20, top:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.2)" }} />
      <div style={{ position:"absolute", right:20, bottom:-30, width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,0.12)" }} />
      <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
        <span style={{ fontSize:32, lineHeight:1 }}>{insight.emoji}</span>
        <div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:18, fontWeight:900, color:"#1a1a1a", letterSpacing:-0.3, lineHeight:1.2 }}>{insight.title}</div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:12, fontWeight:700, color:insight.dark, marginTop:3 }}>{insight.sub}</div>
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [habits, setHabits]       = useState(loadHabits);
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState(null); // habit object being edited
  const [tab, setTab]             = useState("today");
  const [period, setPeriod]       = useState("week");
  const [collapsed, setCollapsed] = useState({});

  const toggleSection = key => setCollapsed(p => ({...p, [key]: !p[key]}));

  useEffect(() => { saveHabits(habits); }, [habits]);

  const toggle = id => setHabits(h => h.map(x => {
    if (x.id !== id) return x;
    const isReminder = x.type === "reminder";
    if (isReminder) return { ...x, done: x.done > 0 ? 0 : 1 };
    const nowDone = !x.history[todayKey];
    const newHistory = { ...x.history, [todayKey]: nowDone };
    return { ...x, done: nowDone ? 1 : 0, history: newHistory, streak: calcStreak(newHistory) };
  }));

  const increment = id => setHabits(h => h.map(x => {
    if (x.id !== id) return x;
    const newDone = Math.min(x.target, x.done + 1);
    const completed = newDone >= x.target;
    const newHistory = completed ? { ...x.history, [todayKey]: true } : x.history;
    return { ...x, done: newDone, history: newHistory, streak: calcStreak(newHistory) };
  }));

  const decrement = id => setHabits(h => h.map(x => {
    if (x.id !== id) return x;
    const newDone = Math.max(0, x.done - 1);
    const wasCompleted = x.history[todayKey] && x.done >= x.target;
    const newHistory = wasCompleted && newDone < x.target
      ? { ...x.history, [todayKey]: false }
      : x.history;
    return { ...x, done: newDone, history: newHistory, streak: calcStreak(newHistory) };
  }));

  const addHabit  = h   => setHabits(p => [...p, { ...h, id: Date.now(), done: 0, streak: 0, history: {} }]);
  const delHabit  = id  => setHabits(h => h.filter(x => x.id !== id));
  const editHabit = (id, changes) => setHabits(h => h.map(x => x.id === id ? { ...x, ...changes } : x));

  const regular   = habits.filter(h => h.type === "regular");
  const quit      = habits.filter(h => h.type === "quit");
  const project   = habits.filter(h => h.type === "project");
  const reminders = habits.filter(h => h.type === "reminder");

  // Progress excludes reminders
  const trackable = habits.filter(h => h.type !== "reminder");
  const doneToday = trackable.filter(h => h.history[todayKey] || (h.done >= (h.target||1))).length;
  const pct = trackable.length ? Math.round(doneToday/trackable.length*100) : 0;

  const existingCats = [...new Set(habits.map(h => h.category))];

  const dayName = today.toLocaleDateString("en-US", {weekday:"long"});
  const dayNum  = today.toLocaleDateString("en-US", {day:"numeric", month:"long"});
  const todayAccent = COLORS[todayIdx%COLORS.length].bg;

  const NAV = [
    { key:"today",    label:"Today"    },
    { key:"progress", label:"Progress" },
    { key:"all",      label:"All"      },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#f5f4f0;}
        ::-webkit-scrollbar{display:none;}
        input::placeholder{color:#ccc;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .card{animation:fadeUp 0.3s ease both;}
      `}</style>

      <div style={{minHeight:"100vh",background:"#f5f4f0",display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",minHeight:"100vh"}}>

          {/* ── HEADER ── */}
          <div style={{padding:"52px 20px 0"}}>
            {tab==="today" && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <p style={{fontSize:12,color:"#bbb",letterSpacing:1.5,textTransform:"uppercase",
                      fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:4}}>{dayName}</p>
                    <h1 style={{fontFamily:"'Nunito',sans-serif",fontSize:30,fontWeight:900,
                      color:"#1a1a1a",letterSpacing:-0.5,lineHeight:1.1}}>{dayNum}</h1>
                  </div>
                  <div style={{
                    background: pct===100 ? todayAccent : "#fff",
                    borderRadius:20,padding:"10px 20px",
                    boxShadow: pct===100?`0 4px 20px ${todayAccent}55`:"0 2px 12px rgba(0,0,0,0.06)",
                    transition:"all 0.4s"
                  }}>
                    <span style={{fontFamily:"'Nunito',sans-serif",fontSize:22,fontWeight:900,color:"#1a1a1a"}}>
                      {pct}%
                    </span>
                  </div>
                </div>
                {/* Week strip */}
                <div style={{display:"flex",gap:5,marginTop:18}}>
                  {DAYS_SHORT.map((d,i)=>{
                    const isToday=i===todayIdx, isPast=i<todayIdx;
                    const ac=COLORS[i%COLORS.length].bg;
                    return (
                      <div key={i} style={{flex:1,textAlign:"center",padding:"8px 0",borderRadius:12,
                        background:isToday?ac:isPast?"#ebe9e3":"#eceae4",
                        boxShadow:isToday?`0 2px 10px ${ac}55`:"none"}}>
                        <div style={{fontSize:9,letterSpacing:0.5,marginBottom:3,
                          fontFamily:"'Nunito',sans-serif",fontWeight:800,
                          color:isToday?"#1a1a1a":isPast?"#bbb":"#ccc"}}>{d}</div>
                        <div style={{fontSize:12,fontWeight:900,fontFamily:"'Nunito',sans-serif",
                          color:isToday?"#1a1a1a":isPast?"#bbb":"#ccc"}}>
                          {new Date(today.getFullYear(),today.getMonth(),today.getDate()-todayIdx+i).getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {tab==="progress" && (
              <>
                <p style={{fontSize:12,color:"#bbb",letterSpacing:1.5,textTransform:"uppercase",
                  fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:4}}>analytics</p>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <h1 style={{fontFamily:"'Nunito',sans-serif",fontSize:30,fontWeight:900,
                    color:"#1a1a1a",letterSpacing:-0.5}}>Progress</h1>
                  <div style={{display:"flex",background:"#fff",borderRadius:14,padding:3,gap:2,
                    boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                    {[["week","7 days"],["month","28 days"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setPeriod(v)} style={{
                        padding:"6px 14px",borderRadius:11,border:"none",cursor:"pointer",
                        background:period===v?"#1a1a1a":"transparent",
                        color:period===v?"#fff":"#bbb",
                        fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,
                        transition:"all 0.2s"
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {tab==="all" && (
              <>
                <p style={{fontSize:12,color:"#bbb",letterSpacing:1.5,textTransform:"uppercase",
                  fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:4}}>manage</p>
                <h1 style={{fontFamily:"'Nunito',sans-serif",fontSize:30,fontWeight:900,
                  color:"#1a1a1a",letterSpacing:-0.5}}>All habits</h1>
                <p style={{fontSize:13,color:"#bbb",fontFamily:"'Nunito',sans-serif",fontWeight:600,marginTop:4}}>
                  {habits.length} habits · swipe ← to delete
                </p>
              </>
            )}
          </div>

          {/* ── NAV TABS ── */}
          <div style={{display:"flex",padding:"16px 20px 0",gap:8}}>
            {NAV.map(({key,label})=>{
              const active=tab===key;
              return (
                <button key={key} onClick={()=>setTab(key)} style={{
                  padding:"9px 18px",borderRadius:20,
                  background:active?"#1a1a1a":"#fff",border:"none",
                  color:active?"#fff":"#bbb",
                  fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800,
                  cursor:"pointer",transition:"all 0.18s",
                  boxShadow:active?"0 2px 12px rgba(0,0,0,0.12)":"none"
                }}>{label}</button>
              );
            })}
          </div>

          {/* ── CONTENT ── */}
          <div style={{flex:1,padding:"14px 20px 0",overflowY:"auto"}}>

            {/* TODAY */}
            {tab==="today" && (
              <>
                {/* Regular habits grouped by category — collapsible */}
                {regular.length>0 && (() => {
                  const cats = [...new Set(regular.map(h => h.category || "Habits"))];
                  return cats.map(cat => {
                    const catHabits = regular.filter(h => (h.category || "Habits") === cat);
                    const key = `reg-${cat}`;
                    const isCollapsed = collapsed[key];
                    return (
                      <div key={cat} style={{marginBottom:6}}>
                        <div onClick={()=>toggleSection(key)} style={{
                          display:"flex",alignItems:"center",gap:8,marginBottom:8,
                          cursor:"pointer",userSelect:"none"
                        }}>
                          <p style={{...sectionLabel,marginBottom:0}}>{cat}</p>
                          <span style={{fontSize:10,color:"#ccc",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
                            {catHabits.length}
                          </span>
                          <span style={{marginLeft:"auto",color:"#ccc",fontSize:13,lineHeight:1}}>
                            {isCollapsed ? "▸" : "▾"}
                          </span>
                        </div>
                        {!isCollapsed && catHabits.map((h,i)=>(
                          <div key={h.id} className="card" style={{animationDelay:`${i*0.04}s`}}>
                            <HabitCard habit={h} onToggle={toggle} onIncrement={increment} onDecrement={decrement}/>
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}

                {/* Quit habits — collapsible */}
                {quit.length>0 && (() => {
                  const key = "quit";
                  const isCollapsed = collapsed[key];
                  return (
                    <div style={{marginBottom:6}}>
                      <div onClick={()=>toggleSection(key)} style={{
                        display:"flex",alignItems:"center",gap:8,marginBottom:8,
                        cursor:"pointer",userSelect:"none"
                      }}>
                        <p style={{...sectionLabel,marginBottom:0}}>Quit</p>
                        <span style={{fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,
                          color:"#FF6B6B",background:"#FF6B6B22",padding:"2px 8px",borderRadius:6}}>
                          every day without a slip
                        </span>
                        <span style={{marginLeft:"auto",color:"#ccc",fontSize:13,lineHeight:1}}>
                          {isCollapsed ? "▸" : "▾"}
                        </span>
                      </div>
                      {!isCollapsed && quit.map((h,i)=>(
                        <div key={h.id} className="card" style={{animationDelay:`${i*0.04}s`}}>
                          <HabitCard habit={h} onToggle={toggle} onIncrement={increment} onDecrement={decrement}/>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Projects grouped by project name — collapsible */}
                {project.length>0 && (() => {
                  const projCats = [...new Set(project.map(h=>h.category))];
                  return projCats.map(cat=>{
                    const catHabits = project.filter(h=>h.category===cat);
                    const catColor = COLORS[catHabits[0].color%COLORS.length];
                    const key = `proj-${cat}`;
                    const isCollapsed = collapsed[key];
                    return (
                      <div key={cat} style={{marginBottom:6}}>
                        <div onClick={()=>toggleSection(key)} style={{
                          display:"flex",alignItems:"center",gap:8,marginBottom:8,
                          cursor:"pointer",userSelect:"none"
                        }}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:catColor.bg,flexShrink:0}}/>
                          <p style={{...sectionLabel,marginBottom:0}}>{cat}</p>
                          <span style={{marginLeft:"auto",color:"#ccc",fontSize:13,lineHeight:1}}>
                            {isCollapsed ? "▸" : "▾"}
                          </span>
                        </div>
                        {!isCollapsed && catHabits.map((h,i)=>(
                          <div key={h.id} className="card" style={{animationDelay:`${i*0.04}s`}}>
                            <HabitCard habit={h} onToggle={toggle} onIncrement={increment} onDecrement={decrement}/>
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}

                {/* Reminders — collapsible */}
                {reminders.length>0 && (() => {
                  const key = "reminders";
                  const isCollapsed = collapsed[key];
                  return (
                    <div style={{marginBottom:6}}>
                      <div onClick={()=>toggleSection(key)} style={{
                        display:"flex",alignItems:"center",gap:8,marginBottom:8,
                        cursor:"pointer",userSelect:"none"
                      }}>
                        <p style={{...sectionLabel,marginBottom:0}}>Reminders</p>
                        <span style={{fontSize:10,color:"#ccc",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
                          {reminders.length}
                        </span>
                        <span style={{marginLeft:"auto",color:"#ccc",fontSize:13,lineHeight:1}}>
                          {isCollapsed ? "▸" : "▾"}
                        </span>
                      </div>
                      {!isCollapsed && reminders.map((h,i)=>(
                        <div key={h.id} className="card" style={{animationDelay:`${i*0.04}s`}}>
                          <HabitCard habit={h} onToggle={toggle} onIncrement={increment} onDecrement={decrement}/>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {habits.length===0 && (
                  <div style={{textAlign:"center",marginTop:60}}>
                    <div style={{fontSize:36,marginBottom:12}}>✦</div>
                    <p style={{color:"#ccc",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:15}}>
                      No habits yet — add your first
                    </p>
                  </div>
                )}
                <div style={{height:24}}/>
              </>
            )}

            {/* PROGRESS */}
            {tab==="progress" && (
              <div style={{paddingTop:8}}>
                <div style={{display:"flex",gap:10,marginBottom:20}}>
                  {[
                    {label:"Done today", value:`${doneToday}/${trackable.length}`, color:todayAccent},
                    {label:"Best streak", value:`${trackable.length ? Math.max(...trackable.map(h=>h.streak)) : 0}d`, color:"#C8F135"},
                    {label:"Quit streak", value:`${quit.filter(h=>h.streak>0).length}/${quit.length}`, color:"#FF6EC7"},
                  ].map(({label,value,color})=>(
                    <div key={label} style={{flex:1,background:"#fff",borderRadius:16,
                      padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:900,color:"#1a1a1a"}}>{value}</div>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,fontWeight:700,color:"#bbb",marginTop:2,letterSpacing:0.3}}>{label}</div>
                      <div style={{height:3,background:color,borderRadius:2,marginTop:8}}/>
                    </div>
                  ))}
                </div>

                <InsightCard habits={trackable} period={period}/>
                {trackable.length > 0
                  ? <Heatmap habits={trackable} period={period}/>
                  : <p style={{color:"#ccc",textAlign:"center",marginTop:40,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>Add habits to see progress</p>
                }
                <div style={{height:32}}/>
              </div>
            )}

            {/* ALL HABITS */}
            {tab==="all" && (
              <div style={{marginTop:8}}>
                {[
                  {label:"✦ Build",      items:regular},
                  {label:"✕ Quit",       items:quit,      accent:"#FF6B6B"},
                  {label:"◈ Projects",   items:project},
                  {label:"🔔 Reminders", items:reminders},
                ].map(({label,items,accent})=> items.length>0 && (
                  <div key={label} style={{marginBottom:20}}>
                    <p style={{fontSize:11,color:accent||"#bbb",letterSpacing:1.2,
                      textTransform:"uppercase",fontFamily:"'Nunito',sans-serif",
                      fontWeight:800,marginBottom:10}}>{label} · {items.length}</p>
                    {items.map(h=>(
                      <ManageRow key={h.id} habit={h} onDelete={delHabit} onEdit={setEditing}/>
                    ))}
                  </div>
                ))}
                {habits.length===0 && (
                  <p style={{color:"#ccc",textAlign:"center",marginTop:60,
                    fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14}}>List is empty</p>
                )}
                <div style={{height:32}}/>
              </div>
            )}
          </div>

          {/* ── BOTTOM BAR ── */}
          <div style={{padding:"14px 20px 36px",background:"#f5f4f0",
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              {COLORS.map((c,i)=>(
                <div key={i} style={{
                  width:i===todayIdx%COLORS.length?20:8, height:8,
                  borderRadius:4, background:c.bg, opacity:0.65,
                  transition:"width 0.3s ease"
                }}/>
              ))}
            </div>
            <button onClick={()=>setShowAdd(true)} style={{
              width:54,height:54,borderRadius:"50%",
              background:"#1a1a1a",border:"none",cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 4px 20px rgba(0,0,0,0.15)",transition:"transform 0.15s"
            }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2V16M2 9H16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

        </div>
      </div>

      {showAdd && (
        <AddSheet onClose={()=>setShowAdd(false)} onAdd={addHabit} existingCategories={existingCats}/>
      )}
      {editing && (
        <EditSheet habit={editing} onClose={()=>setEditing(null)} onEdit={editHabit} existingCategories={existingCats}/>
      )}
    </>
  );
}
