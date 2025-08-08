// Nenhuma mudança funcional — apenas mantém o app operando com o novo layout.

const TASKS_KEY = "todo:tasks:v1";
const PREFS_KEY = "todo:prefs:v1";

let tasks = [];
let prefs = { ocultarConcluidas: false, ordenarPor: "prazo", modoDenso: false };

const elLista = document.getElementById("lista");
const elVazio = document.getElementById("vazio");
const elPendentes = document.getElementById("count-pendentes");
const elTotal = document.getElementById("count-total");

const formNova = document.getElementById("form-nova");
const inputTitulo = document.getElementById("titulo");
const inputNotas = document.getElementById("notas");
const inputPrazo = document.getElementById("prazo");
const inputPrioridade = document.getElementById("prioridade");
const btnLimparConcluidas = document.getElementById("btn-limpar-concluidas");
const inputBusca = document.getElementById("busca");

const prefOcultar = document.getElementById("pref-ocultar");
const prefOrdenar = document.getElementById("pref-ordenar");
const prefDenso = document.getElementById("pref-denso");

const dlg = document.getElementById("dlg-editar");
const editTitulo = document.getElementById("edit-titulo");
const editNotas = document.getElementById("edit-notas");
const editPrazo = document.getElementById("edit-prazo");
const editPrioridade = document.getElementById("edit-prioridade");
let editId = null;

function save(){ localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }
function savePrefs(){ localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
function load(){
  try{
    const t = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    tasks = Array.isArray(t) ? t : [];
    prefs = p && typeof p === "object" ? { ocultarConcluidas: !!p.ocultarConcluidas, ordenarPor: p.ordenarPor || "prazo", modoDenso: !!p.modoDenso } : prefs;
  }catch{ tasks = []; }
}

function relativeDays(iso){
  if(!iso) return "Sem prazo";
  const d = new Date(iso + "T12:00:00");
  const t = new Date(); const t0 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12);
  const diff = Math.round((d - t0) / (1000*60*60*24));
  if(diff===0) return "Hoje";
  if(diff===1) return "Amanhã";
  if(diff<0) return `${Math.abs(diff)} dia(s) em atraso`;
  return `Em ${diff} dia(s)`;
}
function prioridadeClass(p){ return p==="alta"?"p-alta":p==="baixa"?"p-baixa":"p-média"; }
function sortTasks(arr){
  const a = arr.slice();
  if(prefs.ordenarPor==="prazo") a.sort((x,y)=>(x.prazo||"9999-12-31").localeCompare(y.prazo||"9999-12-31"));
  else if(prefs.ordenarPor==="prioridade"){ const o={alta:0,"média":1,baixa:2}; a.sort((x,y)=>o[x.prioridade]-o[y.prioridade]); }
  else a.sort((x,y)=>y.criadaEm-x.criadaEm);
  return a;
}
function filteredTasks(){
  const q = (inputBusca.value||"").trim().toLowerCase();
  let l = tasks;
  if(prefs.ocultarConcluidas) l = l.filter(t=>!t.concluida);
  if(q) l = l.filter(t=>t.titulo.toLowerCase().includes(q) || (t.notas && t.notas.toLowerCase().includes(q)));
  return sortTasks(l);
}
function updateCounters(){
  elPendentes.textContent = String(tasks.filter(t=>!t.concluida).length);
  elTotal.textContent = String(tasks.length);
  btnLimparConcluidas.disabled = !tasks.some(t=>t.concluida);
}
function render(){
  const list = filteredTasks();
  elLista.innerHTML=""; elVazio.classList.toggle("hidden", list.length!==0);
  for(const t of list){
    const li=document.createElement("li"); li.className="task";
    const check=document.createElement("input"); check.type="checkbox"; check.className="check"; check.checked=!!t.concluida;
    check.addEventListener("change",()=>{ t.concluida=check.checked; save(); updateCounters(); render(); });
    li.appendChild(check);

    const main=document.createElement("div"); main.className="task-main";
    const title=document.createElement("p"); title.className="task-title"+(t.concluida?" done":""); title.textContent=t.titulo; main.appendChild(title);
    const meta=document.createElement("div"); meta.className="task-meta";
    const badge=document.createElement("span"); badge.className=`badge ${prioridadeClass(t.prioridade)}`; badge.textContent=`prioridade: ${t.prioridade}`; meta.appendChild(badge);
    const prazo=document.createElement("span"); prazo.textContent=relativeDays(t.prazo); meta.appendChild(prazo);
    if(t.notas){ const n=document.createElement("span"); n.textContent="• "+t.notas; meta.appendChild(n); }
    main.appendChild(meta); li.appendChild(main);

    const actions=document.createElement("div"); actions.className="task-actions";
    const bE=document.createElement("button"); bE.className="icon-btn icon-edit"; bE.type="button"; bE.title="Editar"; bE.textContent="✏️"; bE.addEventListener("click",()=>openEdit(t.id));
    const bD=document.createElement("button"); bD.className="icon-btn icon-del"; bD.type="button"; bD.title="Excluir"; bD.textContent="🗑️"; bD.addEventListener("click",()=>removeTask(t.id));
    actions.appendChild(bE); actions.appendChild(bD); li.appendChild(actions);

    elLista.appendChild(li);
  }
  updateCounters();
}
function addTask(d){
  const task={id:crypto.randomUUID(),titulo:d.titulo.trim(),notas:d.notas?.trim()||"",prazo:d.prazo||"",prioridade:d.prioridade||"média",concluida:false,criadaEm:Date.now()};
  tasks.unshift(task); save(); render();
}
function removeTask(id){ if(!confirm("Excluir esta tarefa?")) return; tasks=tasks.filter(t=>t.id!==id); save(); render(); }
function openEdit(id){
  const t=tasks.find(x=>x.id===id); if(!t) return;
  document.getElementById("edit-titulo").value=t.titulo;
  document.getElementById("edit-notas").value=t.notas||"";
  document.getElementById("edit-prazo").value=t.prazo||"";
  document.getElementById("edit-prioridade").value=t.prioridade;
  window._editId=id; document.getElementById("dlg-editar").showModal();
}
function applyEdit(){
  const id = window._editId; if(!id) return;
  const t=tasks.find(x=>x.id===id); if(!t) return;
  t.titulo=document.getElementById("edit-titulo").value.trim()||t.titulo;
  t.notas=document.getElementById("edit-notas").value.trim();
  t.prazo=document.getElementById("edit-prazo").value||"";
  t.prioridade=document.getElementById("edit-prioridade").value;
  save(); render(); window._editId=null;
}

document.getElementById("form-nova").addEventListener("submit",(e)=>{
  e.preventDefault();
  if(!inputTitulo.value.trim()) return;
  addTask({titulo:inputTitulo.value,notas:inputNotas.value,prazo:inputPrazo.value,prioridade:inputPrioridade.value});
  e.target.reset(); inputTitulo.focus();
});
btnLimparConcluidas.addEventListener("click",()=>{
  if(!tasks.some(t=>t.concluida)) return;
  if(!confirm("Remover todas as tarefas concluídas?")) return;
  tasks=tasks.filter(t=>!t.concluida); save(); render();
});
inputBusca.addEventListener("input",render);
prefOcultar.addEventListener("change",()=>{prefs.ocultarConcluidas=prefOcultar.checked;savePrefs();render();});
prefOrdenar.addEventListener("change",()=>{prefs.ordenarPor=/** @type any */(prefOrdenar.value);savePrefs();render();});
prefDenso.addEventListener("change",()=>{prefs.modoDenso=prefDenso.checked;document.body.classList.toggle("dense",prefs.modoDenso);savePrefs();render();});
document.getElementById("btn-salvar-edicao").addEventListener("click",()=>{applyEdit();document.getElementById("dlg-editar").close();});

(function init(){ load(); prefOcultar.checked=prefs.ocultarConcluidas; prefOrdenar.value=prefs.ordenarPor; prefDenso.checked=prefs.modoDenso; document.body.classList.toggle("dense",prefs.modoDenso); render(); })();