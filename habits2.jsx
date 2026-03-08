import { useState, useRef, useMemo } from "react";

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

// ── HABIT TYPES ───────────────────────────────────────────────────────────────
// type: "regular" | "quit" | "project"
// quit: success = day without doing the bad habit
// project: grouped under a named project/category

// ── MOCK HISTORY (last 28 days, per habit) ───────────────────────────────────
function genHistory(habitId, streak) {
  const h = {};
  const base = new Date(); base.setHours(0,0,0,0);
  for (let i = 27; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    // simulate: done on most recent `streak` days, scattered before
    if (i < streak) h[key] = true;
    else h[key] = Math.random() > 0.55;
  }
  return h;
}

const initialHabits = [
  // Regular habits
  { id:1,  name:"Медитация",            type:"regular", category:"Здоровье",    freq:"daily",  target:1,  unit:"",      done:0, color:0, streak:12 },
  { id:2,  name:"Читать книгу",          type:"regular", category:"Развитие",    freq:"daily",  target:30, unit:"мин",   done:0, color:1, streak:5  },
  { id:3,  name:"Пить воду",             type:"regular", category:"Здоровье",    freq:"daily",  target:8,  unit:"стак.", done:3, color:2, streak:20 },
  { id:4,  name:"Прогулка",              type:"regular", category:"Здоровье",    freq:"daily",  target:1,  unit:"",      done:0, color:3, streak:3  },
  { id:5,  name:"Журнал благодарности",  type:"regular", category:"Развитие",    freq:"weekly", target:3,  unit:"раза",  done:1, color:4, streak:2  },
  // Quit habits
  { id:6,  name:"Не Instagram",          type:"quit",    category:"Цифровой детокс", freq:"daily", target:1, unit:"", done:0, color:5, streak:7  },
  { id:7,  name:"Не листать TikTok",     type:"quit",    category:"Цифровой детокс", freq:"daily", target:1, unit:"", done:0, color:6, streak:2  },
  // Project habits
  { id:8,  name:"Публикация в LinkedIn", type:"project", category:"Поиск работы", freq:"weekly", target:1, unit:"пост",    done:0, color:1, streak:1  },
  { id:9,  name:"Проверить вакансии",    type:"project", category:"Поиск работы", freq:"daily",  target:1, unit:"",        done:0, color:2, streak:4  },
  { id:10, name:"Откликнуться",          type:"project", category:"Поиск работы", freq:"daily",  target:5, unit:"вакансий",done:2, color:3, streak:4  },
];

// attach mock history
const habitsWithHistory = initialHabits.map(h => ({
  ...h, history: genHistory(h.id, h.streak)
}));

const freqLabel = { daily:"каждый день", weekly:"еженедельно", custom:"несколько раз" };
const DAYS_SHORT = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"];
const today = new Date(); today.setHours(0,0,0,0);
const todayIdx = (today.getDay() + 6) % 7;
const todayKey = today.toISOString().slice(0,10);

function dateKey(d) { return d.toISOString().slice(0,10); }
function daysAgo(n) { const d = new Date(today); d.setDate(d.getDate()-n); return d; }

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

// ── ADD SHEET ─────────────────────────────────────────────────────────────────
function AddSheet({ onClose, onAdd, existingCategories }) {
  const [name, setName]       = useState("");
  const [type, setType]       = useState("regular");
  const [freq, setFreq]       = useState("daily");
  const [target, setTarget]   = useState(1);
  const [unit, setUnit]       = useState("");
  const [category, setCat]    = useState("");
  const [newCat, setNewCat]   = useState("");
  const [colorIdx, setColor]  = useState(0);

  const cats = [...new Set(existingCategories)];
  const finalCat = category === "__new__" ? newCat : category;
  const accent = COLORS[colorIdx % COLORS.length].bg;

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name, type, freq, target:Number(target), unit, category:finalCat||"Общее", color:colorIdx });
    onClose();
  };

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
        <div style={{width:40,height:4,borderRadius:2,background:"#e8e8e8",margin:"0 auto 24px"}}/>
        <p style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:800,color:"#1a1a1a",marginBottom:20}}>
          Новая привычка
        </p>

        {/* Type selector */}
        <p style={sectionLabel}>Тип</p>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {[["regular","✦ Развить"],["quit","✕ Отказаться"],["project","◈ Проект"]].map(([v,l])=>(
            <button key={v} onClick={()=>setType(v)} style={{
              padding:"8px 14px", borderRadius:20,
              background: type===v ? "#1a1a1a" : "#f2f2f2",
              border:"none", color: type===v?"#fff":"#999",
              fontSize:13, fontFamily:"'Nunito',sans-serif", fontWeight:700, cursor:"pointer"
            }}>{l}</button>
          ))}
        </div>

        {/* Name */}
        <p style={sectionLabel}>Название</p>
        <input value={name} onChange={e=>setName(e.target.value)}
          placeholder={type==="quit" ? "Не листать Instagram..." : "название..."}
          autoFocus style={inputSt}/>

        {/* Category */}
        <p style={sectionLabel}>Категория</p>
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
          }}>+ Новая</button>
        </div>
        {category==="__new__" && (
          <input value={newCat} onChange={e=>setNewCat(e.target.value)}
            placeholder="название категории..." style={{...inputSt, marginBottom:16}}/>
        )}

        {/* Color */}
        <p style={sectionLabel}>Цвет</p>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {COLORS.map((c,i)=>(
            <div key={i} onClick={()=>setColor(i)} style={{
              width:28,height:28,borderRadius:"50%",background:c.bg,cursor:"pointer",
              boxShadow: colorIdx===i ? `0 0 0 3px #fff, 0 0 0 5px ${c.bg}` : "none",
              transition:"box-shadow 0.15s"
            }}/>
          ))}
        </div>

        {/* Freq + target (not for quit) */}
        {type !== "quit" && (
          <>
            <p style={sectionLabel}>Частота</p>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[["daily","каждый день"],["weekly","еженедельно"],["custom","несколько раз"]].map(([v,l])=>(
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
              <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="мин / шт / км"
                style={{...inputSt,flex:2,marginBottom:0}}/>
            </div>
          </>
        )}

        <button onClick={submit} style={{
          width:"100%",padding:"16px",borderRadius:16,
          background:accent,border:"none",cursor:"pointer",
          fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:800,color:"#1a1a1a"
        }}>+ Добавить</button>
      </div>
    </div>
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
function HabitCard({ habit, onToggle, onIncrement }) {
  const isQ    = habit.target > 1;
  const isDone = habit.history[todayKey] || (isQ ? habit.done >= habit.target : habit.done > 0);
  const c      = COLORS[habit.color % COLORS.length];
  const pct    = isQ ? Math.min(100,(habit.done/habit.target)*100) : (isDone?100:0);
  const isQuit = habit.type === "quit";

  const handleTap = () => {
    if (isQuit) { onToggle(habit.id); return; }
    isQ ? onIncrement(habit.id) : onToggle(habit.id);
  };

  return (
    <div style={{
      background: isDone ? c.bg+"22" : "#fff",
      border:`1.5px solid ${isDone ? c.bg : "#f0f0f0"}`,
      borderRadius:18, padding:"15px 16px", marginBottom:10,
      transition:"all 0.25s ease",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:13}}>
        {/* Button */}
        <div onClick={handleTap} style={{
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
          {isQ && !isQuit && (
            <div style={{marginTop:7}}>
              <div style={{height:4,background:"#f0f0f0",borderRadius:4}}>
                <div style={{height:4,borderRadius:4,background:c.bg,width:`${pct}%`,transition:"width 0.4s"}}/>
              </div>
              <span style={{fontSize:11,color:"#bbb",marginTop:4,display:"block",
                fontFamily:"'Nunito',sans-serif",fontWeight:600}}>
                {habit.done} / {habit.target} {habit.unit}
              </span>
            </div>
          )}
          {isQuit && (
            <span style={{fontSize:11,color:isDone?"#aaa":c.dark,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>
              {isDone ? "Держишься 💪" : "Нажми если устоял сегодня"}
            </span>
          )}
        </div>

        {habit.streak > 0 && (
          <div style={{
            background:c.bg+"25",borderRadius:10,padding:"4px 10px",flexShrink:0,
            display:"flex",alignItems:"center",gap:5
          }}>
            <div style={{width:7,height:7,borderRadius:"50%",background:c.bg}}/>
            <span style={{fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,color:c.dark}}>
              {habit.streak}д
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MANAGE ROW ────────────────────────────────────────────────────────────────
function ManageRow({ habit, onDelete }) {
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
            <span>{freqLabel[habit.freq]}</span>
            <span>·</span>
            <Tag label={habit.category} color={habit.color}/>
          </div>
        </div>
        {revealed
          ? <button onClick={doDelete} style={{background:"#FF6B6B",border:"none",borderRadius:10,
              color:"#fff",fontSize:12,fontFamily:"'Nunito',sans-serif",
              fontWeight:800,padding:"6px 12px",cursor:"pointer",flexShrink:0}}>удалить</button>
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

  // group by category
  const cats = {};
  habits.forEach(h => {
    if(!cats[h.category]) cats[h.category]=[];
    cats[h.category].push(h);
  });

  // week label row
  const weekLabels = period==="week"
    ? DAYS_SHORT
    : Array.from({length:4},(_,i)=>`Нед ${i+1}`);

  return (
    <div>
      {/* Period toggle handled by parent */}
      {Object.entries(cats).map(([catName, catHabits])=>{
        const firstHabit = catHabits[0];
        const c = COLORS[firstHabit.color % COLORS.length];
        const isQuitCat = catHabits.every(h=>h.type==="quit");

        return (
          <div key={catName} style={{marginBottom:28}}>
            {/* Category header */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.bg}}/>
              <span style={{fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:800,
                color:"#aaa",letterSpacing:1,textTransform:"uppercase"}}>{catName}</span>
              {isQuitCat && (
                <span style={{fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,
                  color:"#FF6B6B",background:"#FF6B6B22",padding:"2px 8px",borderRadius:6}}>ОТКАЗ</span>
              )}
            </div>

            {/* Grid: habits × days */}
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

            {/* Category stats */}
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

  // Current period completion rate
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

  // Best streak habit
  const bestStreak = habits.reduce((best, h) => h.streak > best.streak ? h : best, habits[0]);

  // Most consistent habit
  const mostConsistent = habits
    .map(h => ({
      ...h,
      pct: Math.round(currentDates.filter(d => h.history[dateKey(d)]).length / currentDates.length * 100)
    }))
    .reduce((best, h) => h.pct > best.pct ? h : best, { pct: 0 });

  // Perfect days
  const perfectDays = currentDates.filter(d =>
    habits.every(h => h.history[dateKey(d)])
  ).length;

  // Build insight
  const insights = [];

  if (diff > 10) {
    insights.push({
      emoji: "🚀",
      title: `+${diff}% к прошлому периоду`,
      sub: "Ты набираешь темп. Так держать.",
      color: "#C8F135",
      dark: "#6a9200"
    });
  } else if (diff > 0) {
    insights.push({
      emoji: "📈",
      title: `Чуть лучше прошлого`,
      sub: `${currentRate}% выполнения — движение вперёд.`,
      color: "#6EEAB0",
      dark: "#008855"
    });
  } else if (diff < -10) {
    insights.push({
      emoji: "💭",
      title: `Сложная неделя`,
      sub: "Это нормально. Главное — снова начать.",
      color: "#FFD04B",
      dark: "#a07800"
    });
  }

  if (bestStreak.streak >= 7) {
    insights.push({
      emoji: "🔥",
      title: `${bestStreak.streak} дней подряд`,
      sub: `«${bestStreak.name}» — твой рекорд.`,
      color: "#FF8C69",
      dark: "#c04800"
    });
  }

  if (mostConsistent.pct === 100) {
    insights.push({
      emoji: "⭐",
      title: `Идеально`,
      sub: `«${mostConsistent.name}» — 100% за период.`,
      color: "#FFD04B",
      dark: "#a07800"
    });
  } else if (mostConsistent.pct >= 80) {
    insights.push({
      emoji: "✦",
      title: `${mostConsistent.pct}% выполнения`,
      sub: `«${mostConsistent.name}» — самая стабильная.`,
      color: "#C4A0FF",
      dark: "#6600cc"
    });
  }

  if (perfectDays > 0) {
    insights.push({
      emoji: "🎯",
      title: `${perfectDays} идеальных ${perfectDays === 1 ? "день" : perfectDays < 5 ? "дня" : "дней"}`,
      sub: "Все привычки выполнены за один день.",
      color: "#5DD4F0",
      dark: "#0088aa"
    });
  }

  if (!insights.length) {
    insights.push({
      emoji: "🌱",
      title: `${currentRate}% выполнения`,
      sub: "Начало — уже половина дела.",
      color: "#6EEAB0",
      dark: "#008855"
    });
  }

  return insights[0];
}

function InsightCard({ habits, period }) {
  const insight = getInsight(habits, period);
  if (!insight) return null;

  return (
    <div style={{
      background: insight.color,
      borderRadius: 20,
      padding: "18px 20px",
      marginBottom: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* decorative circle */}
      <div style={{
        position: "absolute", right: -20, top: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: "rgba(255,255,255,0.2)"
      }} />
      <div style={{
        position: "absolute", right: 20, bottom: -30,
        width: 70, height: 70, borderRadius: "50%",
        background: "rgba(255,255,255,0.12)"
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>{insight.emoji}</span>
        <div>
          <div style={{
            fontFamily: "'Nunito',sans-serif", fontSize: 18, fontWeight: 900,
            color: "#1a1a1a", letterSpacing: -0.3, lineHeight: 1.2
          }}>{insight.title}</div>
          <div style={{
            fontFamily: "'Nunito',sans-serif", fontSize: 12, fontWeight: 700,
            color: insight.dark, marginTop: 3
          }}>{insight.sub}</div>
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [habits, setHabits]     = useState(habitsWithHistory);
  const [showAdd, setShowAdd]   = useState(false);
  const [tab, setTab]           = useState("today");
  const [period, setPeriod]     = useState("week"); // "week" | "month"

  const toggle    = id => setHabits(h=>h.map(x=>x.id===id
    ? {...x, done:x.done>0?0:1, history:{...x.history,[todayKey]:!x.history[todayKey]}} : x));
  const increment = id => setHabits(h=>h.map(x=>x.id===id
    ? {...x, done:Math.min(x.target,x.done+1)} : x));
  const addHabit  = h  => setHabits(p=>[...p,{...h,id:Date.now(),done:0,streak:0,
    history:genHistory(Date.now(),0)}]);
  const delHabit  = id => setHabits(h=>h.filter(x=>x.id!==id));

  const regular = habits.filter(h=>h.type==="regular");
  const quit    = habits.filter(h=>h.type==="quit");
  const project = habits.filter(h=>h.type==="project");

  const doneToday = habits.filter(h=>h.history[todayKey]||(h.done>=(h.target||1))).length;
  const pct = habits.length ? Math.round(doneToday/habits.length*100) : 0;

  const existingCats = [...new Set(habits.map(h=>h.category))];

  const dayName = today.toLocaleDateString("ru-RU",{weekday:"long"});
  const dayNum  = today.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
  const todayAccent = COLORS[todayIdx%COLORS.length].bg;

  const NAV = [
    {key:"today",   label:"Сегодня"},
    {key:"progress",label:"Прогресс"},
    {key:"all",     label:"Все"},
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
                  fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:4}}>аналитика</p>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <h1 style={{fontFamily:"'Nunito',sans-serif",fontSize:30,fontWeight:900,
                    color:"#1a1a1a",letterSpacing:-0.5}}>Прогресс</h1>
                  {/* Period toggle */}
                  <div style={{display:"flex",background:"#fff",borderRadius:14,padding:3,gap:2,
                    boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                    {[["week","7 дней"],["month","28 дней"]].map(([v,l])=>(
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
                  fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:4}}>управление</p>
                <h1 style={{fontFamily:"'Nunito',sans-serif",fontSize:30,fontWeight:900,
                  color:"#1a1a1a",letterSpacing:-0.5}}>Все привычки</h1>
                <p style={{fontSize:13,color:"#bbb",fontFamily:"'Nunito',sans-serif",fontWeight:600,marginTop:4}}>
                  {habits.length} привычек · свайп ← удалить
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
                {/* Regular */}
                {regular.length>0 && (
                  <div style={{marginBottom:6}}>
                    <p style={{...sectionLabel,marginBottom:8}}>Привычки</p>
                    {regular.map((h,i)=>(
                      <div key={h.id} className="card" style={{animationDelay:`${i*0.04}s`}}>
                        <HabitCard habit={h} onToggle={toggle} onIncrement={increment}/>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quit */}
                {quit.length>0 && (
                  <div style={{marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <p style={{...sectionLabel,marginBottom:0}}>Отказаться</p>
                      <span style={{fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,
                        color:"#FF6B6B",background:"#FF6B6B22",padding:"2px 8px",borderRadius:6}}>
                        каждый день без срыва
                      </span>
                    </div>
                    {quit.map((h,i)=>(
                      <div key={h.id} className="card" style={{animationDelay:`${i*0.04}s`}}>
                        <HabitCard habit={h} onToggle={toggle} onIncrement={increment}/>
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {project.length>0 && (() => {
                  const projCats = [...new Set(project.map(h=>h.category))];
                  return projCats.map(cat=>{
                    const catHabits = project.filter(h=>h.category===cat);
                    const catColor = COLORS[catHabits[0].color%COLORS.length];
                    return (
                      <div key={cat} style={{marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:catColor.bg}}/>
                          <p style={{...sectionLabel,marginBottom:0}}>{cat}</p>
                        </div>
                        {catHabits.map((h,i)=>(
                          <div key={h.id} className="card" style={{animationDelay:`${i*0.04}s`}}>
                            <HabitCard habit={h} onToggle={toggle} onIncrement={increment}/>
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}

                {habits.length===0 && (
                  <div style={{textAlign:"center",marginTop:60}}>
                    <div style={{fontSize:36,marginBottom:12}}>✦</div>
                    <p style={{color:"#ccc",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:15}}>
                      Нет привычек — добавь первую
                    </p>
                  </div>
                )}
                <div style={{height:24}}/>
              </>
            )}

            {/* PROGRESS */}
            {tab==="progress" && (
              <div style={{paddingTop:8}}>
                {/* Overall summary */}
                <div style={{display:"flex",gap:10,marginBottom:20}}>
                  {[
                    {label:"Выполнено сегодня", value:`${doneToday}/${habits.length}`, color:todayAccent},
                    {label:"Лучший streak", value:`${Math.max(...habits.map(h=>h.streak))}д`, color:"#C8F135"},
                    {label:"Отказов держу", value:`${quit.filter(h=>h.streak>0).length}/${quit.length}`, color:"#FF6EC7"},
                  ].map(({label,value,color})=>(
                    <div key={label} style={{flex:1,background:"#fff",borderRadius:16,
                      padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:20,fontWeight:900,
                        color:"#1a1a1a"}}>{value}</div>
                      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:10,fontWeight:700,
                        color:"#bbb",marginTop:2,letterSpacing:0.3}}>{label}</div>
                      <div style={{height:3,background:color,borderRadius:2,marginTop:8}}/>
                    </div>
                  ))}
                </div>

                <InsightCard habits={habits} period={period}/>
                <Heatmap habits={habits} period={period}/>
                <div style={{height:32}}/>
              </div>
            )}

            {/* ALL HABITS */}
            {tab==="all" && (
              <div style={{marginTop:8}}>
                {[
                  {label:"✦ Развить", items:regular},
                  {label:"✕ Отказаться", items:quit, accent:"#FF6B6B"},
                  {label:"◈ Проекты", items:project},
                ].map(({label,items,accent})=> items.length>0 && (
                  <div key={label} style={{marginBottom:20}}>
                    <p style={{fontSize:11,color:accent||"#bbb",letterSpacing:1.2,
                      textTransform:"uppercase",fontFamily:"'Nunito',sans-serif",
                      fontWeight:800,marginBottom:10}}>{label} · {items.length}</p>
                    {items.map(h=><ManageRow key={h.id} habit={h} onDelete={delHabit}/>)}
                  </div>
                ))}
                {habits.length===0 && (
                  <p style={{color:"#ccc",textAlign:"center",marginTop:60,
                    fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14}}>Список пуст</p>
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
        <AddSheet
          onClose={()=>setShowAdd(false)}
          onAdd={addHabit}
          existingCategories={existingCats}
        />
      )}
    </>
  );
}
