const APP_VERSION="2.2.2";
const KEY="taskflow-pro-v1"; // Keep existing data so your tasks/history are preserved.
let db=JSON.parse(localStorage.getItem(KEY)||'{"tasks":[],"logs":[],"settings":{"theme":"light"}}');
let deferredInstall=null;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>dateKey(new Date());
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));render()};
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
function day(d,n){const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return dateKey(x)}
function fmt(d,opts={month:"short",day:"numeric",year:"numeric"}){return new Date(d+"T12:00:00").toLocaleDateString(undefined,opts)}
function scheduled(t,d){
 if(!t.active)return false;
 if(t.repeat==="once")return t.dueDate===d;
 const dow=new Date(d+"T12:00:00").getDay();
 if(t.repeat==="weekdays")return dow>=1&&dow<=5;
 if(t.repeat==="weekly"){const created=new Date(t.createdAt+"T12:00:00").getDay();return dow===created}
 return d>=t.createdAt;
}
function logsFor(id,d=today()){return db.logs.filter(x=>x.taskId===id&&x.date===d)}
function addLog(id){
 const t=db.tasks.find(x=>x.id===id); if(!t)return;
 db.logs.push({id:uid(),taskId:id,date:today(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),note:""});
 save(); toast("Logged +1"); checkReminder(t);
}
function removeLog(id){db.logs=db.logs.filter(x=>x.id!==id);save()}
function currentStreak(t){
 let d=today(),run=0,guard=0;
 while(guard++<4000){
  if(!scheduled(t,d)){d=day(d,-1);continue}
  if(logsFor(t.id,d).length){run++;d=day(d,-1)}else break
 }
 return run
}
function bestStreak(t){
 const dates=[...new Set(db.logs.filter(x=>x.taskId===t.id).map(x=>x.date))].sort();
 let best=0,run=0,prev=null;
 for(const d of dates){if(prev&&day(prev,1)===d)run++;else run=1;best=Math.max(best,run);prev=d}
 return best
}
function goalProgress(t){return Math.min(100,Math.round(logsFor(t.id).length/(Number(t.goal)||1)*100))}
function taskCard(t){
 const count=logsFor(t.id).length, streak=currentStreak(t);
 return `<article class="task-card">
  <div class="task-row">
   <button class="plus ${count>=Number(t.goal)?"done":""}" data-log="${t.id}" title="Log one completion">+</button>
   <div class="task-info" data-detail="${t.id}"><div class="task-name">${esc(t.name)}</div><div class="task-meta"><span class="pill">${esc(t.category)}</span><span class="priority-${t.priority}">${t.priority}</span><span>${t.repeat}</span>${t.time?`<span>⏰ ${t.time}</span>`:""}</div></div>
   <div class="streak-box"><strong>🔥 ${streak}</strong><small>day${streak===1?"":"s"}</small></div>
  </div>
  <div class="task-progress"><i style="width:${goalProgress(t)}%"></i></div>
  <div class="task-meta" style="justify-content:space-between;margin-top:7px"><span>${count} / ${t.goal} today</span><span>${t.active?"Active":"Paused"}</span></div>
  <div class="card-actions"><button data-edit="${t.id}">Edit</button><button data-pause="${t.id}">${t.active?"Pause":"Resume"}</button><button data-delete="${t.id}">Delete</button></div>
 </article>`
}
function render(){
 const active=db.tasks.filter(t=>scheduled(t,today()));
 const total=active.reduce((s,t)=>s+Number(t.goal||1),0);
 const done=active.reduce((s,t)=>s+logsFor(t.id).length,0);
 const pct=total?Math.min(100,Math.round(done/total*100)):0;
 const versionEl=$("#appVersion"); if(versionEl) versionEl.textContent="v"+APP_VERSION;
  $("#dateLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
 $("#mProgress").textContent=pct+"%";$("#mProgressBar").style.width=pct+"%";$("#mCompleted").textContent=done;
 const streaks=active.filter(t=>currentStreak(t)>0);$("#mStreaks").textContent=streaks.length;
 $("#mBest").textContent=Math.max(0,...db.tasks.map(bestStreak));
 $("#todayTasks").innerHTML=active.map(taskCard).join("");$("#todayEmpty").classList.toggle("hidden",active.length>0);
 const q=$("#taskSearch").value.toLowerCase(),f=$("#taskFilter").value,p=$("#priorityFilter").value;
 const all=db.tasks.filter(t=>(!q||t.name.toLowerCase().includes(q)||t.notes.toLowerCase().includes(q))&&(f==="all"||(f==="active"&&t.active)||(f==="paused"&&!t.active))&&(p==="all"||t.priority===p));
 $("#allTasks").innerHTML=all.length?all.map(taskCard).join(""):`<div class="empty"><div>📝</div><h3>No matching tasks</h3><p>Try another filter or create a task.</p></div>`;
 const longest=Math.max(0,...db.tasks.map(bestStreak));$("#longest").textContent=longest+" day"+(longest===1?"":"s");
 const month=new Date().toISOString().slice(0,7);$("#monthLogs").textContent=db.logs.filter(x=>x.date.startsWith(month)).length;
 $("#streakList").innerHTML=db.tasks.length?db.tasks.slice().sort((a,b)=>currentStreak(b)-currentStreak(a)).map(t=>`<article class="task-card"><div class="task-row"><div class="task-info"><div class="task-name">${esc(t.name)}</div><div class="task-meta"><span>${esc(t.category)}</span><span>Best ${bestStreak(t)} days</span></div></div><div class="streak-box"><strong>🔥 ${currentStreak(t)}</strong><small>current</small></div></div></article>`).join(""):`<div class="empty"><div>🔥</div><h3>No streaks yet</h3></div>`;
 renderHistory();renderActivity();bind();
}
function renderActivity(){
 const logs=db.logs.slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,8);
 $("#recentActivity").innerHTML=logs.length?logs.map(l=>{const t=db.tasks.find(x=>x.id===l.taskId);return t?`<div class="log-row"><span>✓</span><b>${esc(t.name)}</b><span class="log-time">${l.date===today()?"Today":fmt(l.date,{month:"short",day:"numeric"})} · ${l.time}</span></div>`:""}).join(""):`<div class="empty"><p>No activity yet.</p></div>`;
}
function renderHistory(){
 const groups={};db.logs.slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).forEach(l=>(groups[l.date]??=[]).push(l));
 $("#historyList").innerHTML=Object.keys(groups).length?Object.entries(groups).map(([d,logs])=>`<div class="day-block"><div class="day-head"><span>${d===today()?"Today":fmt(d)}</span><small>${logs.length} completion${logs.length===1?"":"s"}</small></div>${logs.map(l=>{const t=db.tasks.find(x=>x.id===l.taskId);return t?`<div class="log-row"><span>✓</span><b>${esc(t.name)}</b><span class="log-time">${l.time}</span><button class="link" data-remove-log="${l.id}">×</button></div>`:""}).join("")}</div>`).join(""):`<div class="empty"><div>◷</div><h3>No history</h3><p>Your completion history will appear here.</p></div>`;
}
function bind(){
 $$("[data-log]").forEach(b=>b.onclick=e=>{e.stopPropagation();addLog(b.dataset.log)});
 $$("[data-detail]").forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));
 $$("[data-edit]").forEach(b=>b.onclick=()=>openTask(b.dataset.edit));
 $$("[data-delete]").forEach(b=>b.onclick=()=>delTask(b.dataset.delete));
 $$("[data-pause]").forEach(b=>b.onclick=()=>{const t=db.tasks.find(x=>x.id===b.dataset.pause);t.active=!t.active;save();toast(t.active?"Task resumed":"Task paused")});
 $$("[data-remove-log]").forEach(b=>b.onclick=()=>removeLog(b.dataset.removeLog));
}
function openTask(id=null){
 $("#taskModal").classList.remove("hidden");$("#editId").value=id||"";
 if(id){const t=db.tasks.find(x=>x.id===id);$("#modalTitle").textContent="Edit task";$("#name").value=t.name;$("#category").value=t.category;$("#priority").value=t.priority;$("#repeat").value=t.repeat;$("#time").value=t.time;$("#goal").value=t.goal;$("#notes").value=t.notes;$("#active").checked=t.active}
 else{$("#modalTitle").textContent="New task";$("#taskForm").reset();$("#goal").value=1;$("#active").checked=true}
 setTimeout(()=>$("#name").focus(),50)
}
$("#taskForm").onsubmit=e=>{e.preventDefault();const id=$("#editId").value;let t=id?db.tasks.find(x=>x.id===id):{id:uid(),createdAt:today(),dueDate:today()};Object.assign(t,{name:$("#name").value.trim(),category:$("#category").value,priority:$("#priority").value,repeat:$("#repeat").value,time:$("#time").value,goal:Math.max(1,Number($("#goal").value)||1),notes:$("#notes").value.trim(),active:$("#active").checked});if(!id)db.tasks.push(t);save();close("taskModal");toast(id?"Task updated":"Task created")}
function delTask(id){const t=db.tasks.find(x=>x.id===id);if(t&&confirm(`Delete "${t.name}" and its history?`)){db.tasks=db.tasks.filter(x=>x.id!==id);db.logs=db.logs.filter(x=>x.taskId!==id);save();toast("Task deleted")}}
function openDetail(id){const t=db.tasks.find(x=>x.id===id);if(!t)return;const count=logsFor(id).length;$("#detailName").textContent=t.name;$("#detailBody").innerHTML=`<div class="detail-stat"><div><small>Today</small><strong>${count}</strong></div><div><small>Current streak</small><strong>🔥 ${currentStreak(t)}</strong></div><div><small>Best streak</small><strong>${bestStreak(t)}</strong></div></div><p class="muted">${esc(t.notes)||"No notes."}</p><button class="primary" style="width:100%;margin-top:18px" data-log="${id}">+ Log another completion</button>`;$("#detailBody [data-log]").onclick=()=>addLog(id);$("#detailModal").classList.remove("hidden")}
function close(id){$("#"+id).classList.add("hidden")}
$$("[data-close]").forEach(b=>b.onclick=()=>close(b.dataset.close));
$$("[data-nav]").forEach(b=>b.onclick=()=>navigate(b.dataset.nav));
function navigate(n){$$(".view").forEach(v=>v.classList.remove("active"));$("#"+n+"View").classList.add("active");$$(".nav").forEach(v=>v.classList.toggle("active",v.dataset.nav===n));window.scrollTo(0,0)}
$("#quickAdd").onclick=()=>openTask();$("#emptyAdd").onclick=()=>openTask();$("#addTask").onclick=()=>openTask();$("#settingsBtn").onclick=()=>navigate("settings");
$("#searchBtn").onclick=()=>{$("#searchModal").classList.remove("hidden");$("#globalSearch").focus()};
$("#taskSearch").oninput=render;$("#taskFilter").onchange=render;$("#priorityFilter").onchange=render;
$("#globalSearch").oninput=()=>{const q=$("#globalSearch").value.toLowerCase();$("#searchResults").innerHTML=db.tasks.filter(t=>t.name.toLowerCase().includes(q)||t.notes.toLowerCase().includes(q)).map(t=>`<div class="search-item"><b>${esc(t.name)}</b><small>${esc(t.category)} · 🔥 ${currentStreak(t)}</small></div>`).join("")||"<p class='muted'>No results.</p>"};
function toggleTheme(){db.settings.theme=db.settings.theme==="dark"?"light":"dark";applyTheme();save()}
function applyTheme(){document.documentElement.dataset.theme=db.settings.theme==="dark"?"dark":"light"}
$("#themeBtn").onclick=toggleTheme;
$("#notifyBtn").onclick=async()=>{if(!("Notification"in window)){toast("Notifications are not supported here");return}const p=await Notification.requestPermission();toast(p==="granted"?"Notifications enabled":"Permission not granted")};
$("#backupBtn").onclick=exportData;const eb=$("#exportBtn");if(eb)eb.onclick=exportData;
function exportData(){const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="taskflow-backup-"+today()+".json";a.click();URL.revokeObjectURL(a.href);toast("Backup exported")}
$("#importInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.tasks||!x.logs)throw Error();db=x;save();toast("Backup imported")}catch{toast("Invalid backup file")}};r.readAsText(f)};
$("#resetBtn").onclick=()=>{if(confirm("Reset all local TaskFlow data?")){db={tasks:[],logs:[],settings:{theme:"light"}};save();toast("Data reset")}};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e});
$("#installSettings").onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null}else toast("On iPhone: Safari Share → Add to Home Screen")};
function checkReminder(t){if(t.time&&"Notification"in window&&Notification.permission==="granted") new Notification("TaskFlow",{body:`${t.name} completed. Keep your ${currentStreak(t)}-day streak!`})}
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js?v=2.2.2",{updateViaCache:"none"}).catch(()=>{});

/* ===== v2.1 additions ===== */
db.settings=Object.assign({theme:"light",sound:"chime",volume:.7,vibrate:true,snooze:10},db.settings||{});
db.fired=db.fired||{};db.snooze=db.snooze||{};
function toast(m){const t=$("#toastEl");t.textContent=m;t.classList.remove("hidden");clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.add("hidden"),2200)}

/* --- ringtones (generated, no audio files needed) --- */
let ctx=null;
function audio(){if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(A)ctx=new A()}if(ctx&&ctx.state==="suspended")ctx.resume();return ctx}
["touchstart","click"].forEach(ev=>document.addEventListener(ev,()=>audio(),{passive:true}));
const SOUNDS={
 chime:[[880,0,.25],[1175,.25,.25],[1568,.5,.5]],
 bell:[[1046,0,.9],[1318,.05,.9]],
 melody:[[523,0,.2],[659,.2,.2],[784,.4,.2],[1046,.6,.5]],
 beep:[[1000,0,.15],[1000,.3,.15],[1000,.6,.15]],
 alarm:[[900,0,.2],[700,.25,.2],[900,.5,.2],[700,.75,.2],[900,1,.2],[700,1.25,.2]]
};
function playSound(name=db.settings.sound){
 if(name==="none")return;const c=audio();if(!c)return;
 (SOUNDS[name]||SOUNDS.chime).forEach(([f,s,d])=>{
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+s;
  o.type=name==="beep"||name==="alarm"?"square":"sine";o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,db.settings.volume*.5),t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g).connect(c.destination);o.start(t);o.stop(t+d+.05);
 });
}
function buzz(){if(db.settings.vibrate&&navigator.vibrate)navigator.vibrate([200,100,200,100,300])}

/* --- notifications (via service worker, required on iOS/Android) --- */
async function notify(title,body,tag){
 if(!("Notification"in window)||Notification.permission!=="granted")return;
 try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,tag,icon:"icon-192.png?v=2.2.2",badge:"icon-192.png?v=2.2.2",vibrate:[200,100,200],renotify:true})}
 catch{try{new Notification(title,{body,tag})}catch{}}
}
checkReminder=function(t){notify("TaskFlow",`${t.name} done. Keep your ${currentStreak(t)}-day streak!`,"done-"+t.id)};
$("#notifyBtn").onclick=async()=>{
 if(!("Notification"in window)){toast("Not supported. On iPhone, add to Home Screen first");return}
 const p=await Notification.requestPermission();audio();
 toast(p==="granted"?"Notifications enabled":"Permission blocked. Allow it in device settings");
 if(p==="granted")notify("TaskFlow","Notifications are working","test");
};
$("#notifyTest").onclick=()=>{ring({id:"test",name:"Test reminder"},true)};

/* --- reminder scheduler --- */
let alarmTask=null;
function ring(t,test){
 playSound();buzz();alarmTask=t;
 $("#alarmName").textContent=t.name;$("#alarmSub").textContent=test?"This is a test":"Reminder · "+(t.time||"");
 $("#alarm").classList.remove("hidden");
 notify("TaskFlow reminder",t.name,"rem-"+t.id);
 clearTimeout(ring.h);ring.h=setTimeout(()=>$("#alarm").classList.add("hidden"),60000);
}
$("#alarmStop").onclick=()=>$("#alarm").classList.add("hidden");
$("#alarmDone").onclick=()=>{$("#alarm").classList.add("hidden");if(alarmTask&&alarmTask.id!=="test")addLog(alarmTask.id)};
$("#alarmSnooze").onclick=()=>{$("#alarm").classList.add("hidden");if(alarmTask&&alarmTask.id!=="test"){db.snooze[alarmTask.id]=Date.now()+db.settings.snooze*60000;localStorage.setItem(KEY,JSON.stringify(db));toast("Snoozed "+db.settings.snooze+" min")}};
function tick(){
 const now=new Date(),hm=pad(now.getHours())+":"+pad(now.getMinutes()),td=today();
 for(const k in db.fired)if(!k.endsWith(td))delete db.fired[k];
 for(const t of db.tasks){
  if(!t.time||!scheduled(t,td)||logsFor(t.id).length>=Number(t.goal))continue;
  const key=t.id+"|"+td,sn=db.snooze[t.id];
  if(sn){if(Date.now()>=sn){delete db.snooze[t.id];localStorage.setItem(KEY,JSON.stringify(db));ring(t)}continue}
  if(!db.fired[key]&&hm>=t.time){
   db.fired[key]=1;localStorage.setItem(KEY,JSON.stringify(db));
   const late=(now.getHours()*60+now.getMinutes())-(+t.time.slice(0,2)*60+ +t.time.slice(3));
   if(late<=120)ring(t);
  }
 }
}
setInterval(tick,15000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});

/* --- settings controls --- */
function bindSettings(){
 $("#soundSel").value=db.settings.sound;$("#volume").value=db.settings.volume;$("#snoozeSel").value=db.settings.snooze;$("#vibrate").checked=db.settings.vibrate;
}
const persist=()=>localStorage.setItem(KEY,JSON.stringify(db));
$("#soundSel").onchange=e=>{db.settings.sound=e.target.value;persist();playSound()};
$("#volume").onchange=e=>{db.settings.volume=+e.target.value;persist();playSound()};
$("#snoozeSel").onchange=e=>{db.settings.snooze=+e.target.value;persist()};
$("#vibrate").onchange=e=>{db.settings.vibrate=e.target.checked;persist();buzz()};

/* --- templates --- */
const TEMPLATES={
 Health:[["Drink water","Health",8,""],["Morning walk","Health",1,"07:00"],["Workout","Health",1,"18:00"],["Take vitamins","Health",1,"09:00"],["Sleep by 11 pm","Health",1,"22:30"],["Stretch","Health",1,"08:00"]],
 Study:[["Read 20 pages","Study",1,"20:00"],["Revise notes","Study",1,"19:00"],["Practice a language","Study",1,"17:00"],["Homework","Study",1,"16:00"]],
 Work:[["Plan the day","Work",1,"09:00"],["Check email","Work",2,"11:00"],["Deep-work block","Work",1,"10:00"],["Daily wrap-up","Work",1,"17:30"]],
 Personal:[["Meditate","Personal",1,"06:30"],["Journal","Personal",1,"21:30"],["Tidy up","Personal",1,"20:00"],["Call family","Personal",1,"19:30"],["Pray / reflect","Personal",1,""]],
 Finance:[["Log expenses","Finance",1,"21:00"],["Check budget","Finance",1,"20:00"]]
};
function addTpl(g,i){
 const [name,category,goal,time]=TEMPLATES[g][i];
 if(db.tasks.some(t=>t.name===name))return false;
 db.tasks.push({id:uid(),createdAt:today(),dueDate:today(),name,category,priority:"medium",repeat:"daily",time,goal,notes:"",active:true});return true;
}
function renderTpl(){
 $("#tplBody").innerHTML=Object.entries(TEMPLATES).map(([g,items])=>`<div class="tpl-group"><h3>${g}</h3>${items.map(([n,,goal,time],i)=>{const has=db.tasks.some(t=>t.name===n);return `<div class="tpl-item"><span>${n}<br><small class="muted">${goal>1?goal+"× daily":"daily"}${time?" · "+time:""}</small></span><button data-tpl="${g}|${i}" ${has?"disabled":""}>${has?"Added":"Add"}</button></div>`}).join("")}<button class="tpl-add-all" data-tplall="${g}">Add all ${g}</button></div>`).join("");
 $$("[data-tpl]").forEach(b=>b.onclick=()=>{const[g,i]=b.dataset.tpl.split("|");addTpl(g,+i);persist();render();renderTpl();toast("Task added")});
 $$("[data-tplall]").forEach(b=>b.onclick=()=>{const g=b.dataset.tplall;let n=0;TEMPLATES[g].forEach((_,i)=>{if(addTpl(g,i))n++});persist();render();renderTpl();toast(n+" tasks added")});
}
$("#tplBtn").onclick=()=>{renderTpl();$("#tplModal").classList.remove("hidden")};
const origEmpty=$("#emptyAdd");origEmpty.insertAdjacentHTML("afterend",' <button id="emptyTpl" class="ghost">Use a template</button>');
$("#emptyTpl").onclick=()=>$("#tplBtn").click();

/* --- weekly chart + render hook --- */
function renderWeek(){
 const days=[...Array(7)].map((_,i)=>day(today(),i-6)),counts=days.map(d=>db.logs.filter(l=>l.date===d).length),mx=Math.max(1,...counts);
 $("#weekChart").innerHTML=days.map((d,i)=>`<div><span>${counts[i]}</span><i style="height:${counts[i]/mx*80}%"></i><span>${fmt(d,{weekday:"short"})}</span></div>`).join("");
}
const _render=render;render=function(){_render();renderWeek();bindSettings()};
applyTheme();render();tick();

/* ===== v2.2 background push ===== */
const PUSH_URL="https://taskflow-push.amin-taskflow-2026.workers.dev"; // set after deploying /worker
const VAPID_PUBLIC="BDtWDQbR8UC0kpbF4y5mruoiTKR-E-vuslfBDyyVq5TrCrwNJ2XL4p7LFR38HRJ5SNwlyNNmBE_WGlMgwQyYKUQ";
const pushReady=()=>PUSH_URL.startsWith("https://")&&!PUSH_URL.includes("YOURNAME")&&!VAPID_PUBLIC.includes("PASTE");
const b64=s=>{const r=(s+"=".repeat((4-s.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(r),c=>c.charCodeAt(0))};
async function pushSub(create){const reg=await navigator.serviceWorker.ready;let s=await reg.pushManager.getSubscription();if(!s&&create)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID_PUBLIC)});return s}
let lastSync="",syncT;
async function syncPush(force){
 if(!db.settings.push||!pushReady())return;
 try{const s=await pushSub(false);if(!s)return;
  const tasks=db.tasks.filter(t=>t.time).map(({id,name,time,repeat,active,createdAt,dueDate,goal})=>({id,name,time,repeat,active,createdAt,dueDate,goal}));
  const done={};db.tasks.forEach(t=>{const n=logsFor(t.id).length;if(n)done[t.id]=n});
  const body=JSON.stringify({sub:s.toJSON(),tz:Intl.DateTimeFormat().resolvedOptions().timeZone,tasks,done,date:today()});
  if(!force&&body===lastSync)return;
  await fetch(PUSH_URL+"/sync",{method:"POST",headers:{"Content-Type":"text/plain"},body});lastSync=body;
 }catch(e){}
}
$("#pushBtn").onclick=async()=>{
 if(!pushReady()){toast("Set PUSH_URL and VAPID_PUBLIC in app.js first");return}
 if(!("PushManager"in window)){toast("On iPhone, open the Home Screen app first");return}
 if(await Notification.requestPermission()!=="granted"){toast("Permission blocked in device settings");return}
 try{await pushSub(true);db.settings.push=true;persist();await syncPush(true);toast("Background reminders on")}catch(e){toast("Push setup failed")}
};
const _render2=render;render=function(){_render2();clearTimeout(syncT);syncT=setTimeout(()=>syncPush(),1500)};
document.addEventListener("visibilitychange",()=>{if(!document.hidden)syncPush()});
syncPush();

$("#testPushBtn").onclick=async()=>{
 if(!pushReady()||!db.settings.push){toast("Tap Enable background reminders first");return}
 try{const s=await pushSub(false);if(!s){toast("No push subscription. Tap Enable again");return}
  await syncPush(true);
  const r=await fetch(PUSH_URL+"/test",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({endpoint:s.endpoint,delay:12})});
  const j=await r.json();toast(j.found?"Sent. Close the app now. Alert in about 12 seconds":"Server has no record. Tap Enable again");
 }catch(e){toast("Could not reach the server")}
};
