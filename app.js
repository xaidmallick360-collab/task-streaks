const KEY="task-streaks-v1";
let data=JSON.parse(localStorage.getItem(KEY)||'{"tasks":[],"history":{}}');
let deferredInstall=null;

const $=s=>document.querySelector(s);
const today=()=>{const d=new Date();return d.toISOString().slice(0,10)};
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));render()};
const fmtDate=d=>new Date(d+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
const dateOffset=(date,n)=>{const d=new Date(date+"T00:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
function scheduled(task,date){
  const dow=new Date(date+"T00:00:00").getDay();
  if(task.repeat==="weekdays") return dow>=1&&dow<=5;
  if(task.repeat==="weekly") return new Date(task.createdAt).getDay()===dow;
  return true;
}
function done(taskId,date){return !!data.history[date]?.includes(taskId)}
function toggle(taskId,date=today()){
  data.history[date]??=[];
  const a=data.history[date],i=a.indexOf(taskId);
  if(i>=0)a.splice(i,1);else a.push(taskId);
  save();
}
function currentStreak(task){
  let d=today(), count=0;
  for(let i=0;i<3660;i++){
    if(!scheduled(task,d)) {d=dateOffset(d,-1);continue}
    if(done(task.id,d)){count++;d=dateOffset(d,-1)}else break;
  }
  return count;
}
function bestStreak(task){
  let dates=[];
  for(const [d,ids] of Object.entries(data.history)) if(ids.includes(task.id)&&scheduled(task,d)) dates.push(d);
  dates.sort();
  let best=0,run=0,prev=null;
  for(const d of dates){if(prev&&dateOffset(prev,1)===d)run++;else run=1;best=Math.max(best,run);prev=d}
  return best;
}
function repeatLabel(r){return {daily:"Daily",weekdays:"Weekdays",weekly:"Weekly"}[r]||r}
function taskCard(t,showCheck=true){
  const isDone=done(t.id,today());
  return `<div class="task">
    ${showCheck?`<button class="check ${isDone?"done":""}" data-toggle="${t.id}">${isDone?"✓":""}</button>`:""}
    <div class="task-main"><div class="task-name">${escapeHtml(t.name)}</div>
    <div class="task-meta">${repeatLabel(t.repeat)}${t.time?" · "+t.time:""}</div></div>
    <div class="streak">🔥 ${currentStreak(t)}</div>
    <div class="task-actions"><button data-edit="${t.id}" aria-label="Edit">✎</button><button data-delete="${t.id}" aria-label="Delete">⋯</button></div>
  </div>`;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function render(){
  const ts=data.tasks.filter(t=>scheduled(t,today()));
  const completed=ts.filter(t=>done(t.id,today())).length;
  const pct=ts.length?Math.round(completed/ts.length*100):0;
  $("#progressText").textContent=`${completed} / ${ts.length}`;
  $("#progressPercent").textContent=pct+"%";
  $("#progressBar").style.width=pct+"%";
  $("#todayList").innerHTML=ts.map(t=>taskCard(t)).join("");
  $("#emptyToday").classList.toggle("hidden",ts.length>0);
  $("#allTasksList").innerHTML=data.tasks.length?data.tasks.map(t=>taskCard(t,false)).join(""):`<div class="empty"><div class="empty-icon">📝</div><h3>No tasks</h3><p>Create a recurring task to begin.</p></div>`;
  $("#statsList").innerHTML=data.tasks.length?data.tasks.map(t=>`<div class="stat"><div><h3>${escapeHtml(t.name)}</h3><small>Best streak: ${bestStreak(t)} day${bestStreak(t)===1?"":"s"}</small></div><div class="stat-number">🔥 ${currentStreak(t)}</div></div>`).join(""):`<div class="empty"><div class="empty-icon">🔥</div><h3>Your streaks will appear here</h3></div>`;
  bindActions();
}
function bindActions(){
  document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggle(b.dataset.toggle));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openModal(b.dataset.edit));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteTask(b.dataset.delete));
}
function openModal(id=null){
  $("#modal").classList.remove("hidden");
  $("#taskId").value=id||"";
  $("#modalTitle").textContent=id?"Edit task":"Add task";
  if(id){const t=data.tasks.find(x=>x.id===id);$("#taskName").value=t.name;$("#taskRepeat").value=t.repeat;$("#taskTime").value=t.time||""}
  else{$("#taskForm").reset();$("#taskRepeat").value="daily"}
  setTimeout(()=>$("#taskName").focus(),50);
}
function closeModal(){$("#modal").classList.add("hidden")}
function deleteTask(id){
  const t=data.tasks.find(x=>x.id===id);
  if(!t||!confirm(`Delete "${t.name}"?`))return;
  data.tasks=data.tasks.filter(x=>x.id!==id);
  Object.keys(data.history).forEach(d=>data.history[d]=data.history[d].filter(x=>x!==id));
  save();toast("Task deleted");
}
$("#taskForm").onsubmit=e=>{
  e.preventDefault();
  const id=$("#taskId").value,name=$("#taskName").value.trim();
  if(!name)return;
  const existing=id&&data.tasks.find(t=>t.id===id);
  if(existing){existing.name=name;existing.repeat=$("#taskRepeat").value;existing.time=$("#taskTime").value}
  else data.tasks.push({id:uid(),name,repeat:$("#taskRepeat").value,time:$("#taskTime").value,createdAt:today()});
  save();closeModal();toast(id?"Task updated":"Task added");
};
$("#closeModal").onclick=closeModal;$("#cancelBtn").onclick=closeModal;
$("#addTaskBtn").onclick=()=>openModal();$("#addTodayBtn").onclick=()=>openModal();
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.tab).classList.add("active");
});
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden")};
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
