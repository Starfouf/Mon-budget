'use strict';

const CATS = ['Logement','Internet','Courses','Restaurant','Livraison repas','Transport','Loisirs','Jeux vidéo','Abonnements','Maison','Sport','Santé','Salaire','Épargne','Autre'];
let AUTO_CATEGORIES = {};
let categoryRules = [];
let user = null;
let tx = [];
let budgetValue = 0;

const cfg = window.BUDGET_CONFIG || {};
const configured = !String(cfg.supabaseUrl).startsWith('REMPLACEZ_');
const db = configured ? supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
const $ = id => document.getElementById(id);
const E = {
  auth:$('auth'),authForm:$('authForm'),email:$('email'),password:$('password'),signup:$('signup'),authMsg:$('authMsg'),logout:$('logout'),status:$('status'),month:$('month'),add:$('add'),rulesBtn:$('rulesBtn'),refresh:$('refresh'),income:$('income'),expense:$('expense'),balance:$('balance'),rate:$('rate'),rows:$('rows'),categories:$('categories'),chart:$('chart'),budget:$('budget'),saveBudget:$('saveBudget'),budgetBar:$('budgetBar'),budgetText:$('budgetText'),exportBtn:$('export'),modal:$('modal'),txForm:$('txForm'),cancel:$('cancel'),type:$('type'),date:$('date'),label:$('label'),category:$('category'),amount:$('amount'),rulesModal:$('rulesModal'),ruleForm:$('ruleForm'),ruleId:$('ruleId'),ruleKeyword:$('ruleKeyword'),ruleCategory:$('ruleCategory'),rulesList:$('rulesList'),saveRule:$('saveRule'),cancelRuleEdit:$('cancelRuleEdit'),closeRules:$('closeRules')
};

const euro = n => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n || 0);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

function detectCategory(label) {
  const value = normalize(label);
  const keywords = Object.keys(AUTO_CATEGORIES).sort((a,b) => b.length - a.length);
  for (const keyword of keywords) if (value.includes(keyword)) return AUTO_CATEGORIES[keyword];
  return '';
}

async function loadCategoryRules() {
  if (!user) return;
  const { data, error } = await db.from('category_rules').select('id,user_id,keyword,category,created_at').order('keyword');
  if (error) { console.error('Erreur chargement règles :', error); alert(error.message); return; }
  categoryRules = data || [];
  AUTO_CATEGORIES = {};
  // Les règles globales sont chargées d'abord, les règles personnelles les remplacent ensuite.
  categoryRules.filter(r => !r.user_id).forEach(r => AUTO_CATEGORIES[normalize(r.keyword)] = r.category);
  categoryRules.filter(r => r.user_id === user.id).forEach(r => AUTO_CATEGORIES[normalize(r.keyword)] = r.category);
  renderRules();
}

function initMonths() {
  for (let i=-18;i<=3;i++) { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+i); const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; E.month.add(new Option(d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),v,i===0,i===0)); }
  const options = CATS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  E.category.innerHTML = options;
  E.ruleCategory.innerHTML = options;
}

function bind() {

    E.authForm.onsubmit = login;
    E.signup.onclick = signup;
    E.logout.onclick = () => db.auth.signOut();

    E.month.onchange = loadData;

    E.refresh.onclick = async () => {
        await loadCategoryRules();
        await loadData();
    };

    E.add.onclick = () => {
        E.txForm.reset();
        E.date.value = new Date().toISOString().slice(0, 10);
        E.modal.classList.add("show");
    };

    E.cancel.onclick = () =>
        E.modal.classList.remove("show");

    E.txForm.onsubmit = addTx;
    E.rows.onclick = deleteTx;

    E.saveBudget.onclick = saveBudget;
    E.exportBtn.onclick = exportJson;

    // Catégorisation automatique
    E.label.addEventListener("input", () => {

        const category =
            detectCategory(E.label.value);

        if (
            category &&
            CATS.includes(category)
        ) {
            E.category.value = category;
        }

    });

    // Bouton règles
    E.rulesBtn.onclick = async () => {

        console.log("Clic sur Règles");

        await loadCategoryRules();

        resetRuleForm();

        E.rulesModal.classList.add("show");

    };

    E.closeRules.onclick = () =>
        E.rulesModal.classList.remove("show");

    E.ruleForm.onsubmit = saveCategoryRule;

    E.cancelRuleEdit.onclick =
        resetRuleForm;

    E.rulesList.onclick =
        handleRuleAction;

    E.modal.onclick = e => {

        if (e.target === E.modal) {
            E.modal.classList.remove("show");
        }

    };

    E.rulesModal.onclick = e => {

        if (e.target === E.rulesModal) {
            E.rulesModal.classList.remove("show");
        }

    };

}
async function boot() {
  initMonths(); bind();
  if (!configured) { E.authMsg.textContent='Configurez config.js puis publiez le dossier.'; return; }
  const { data } = await db.auth.getSession();
  if (data.session) await signedIn(data.session.user);
  db.auth.onAuthStateChange((_event,session) => session ? signedIn(session.user) : signedOut());
}

async function login(e) { e.preventDefault(); msg('Connexion…'); const { error }=await db.auth.signInWithPassword({email:E.email.value,password:E.password.value}); msg(error ? error.message : ''); }
async function signup() { msg('Création…'); const { error }=await db.auth.signUp({email:E.email.value,password:E.password.value}); msg(error ? error.message : 'Compte créé. Vérifiez éventuellement votre e-mail, puis connectez-vous.'); }
function msg(x) { E.authMsg.textContent=x; }
async function signedIn(u) { user=u; E.auth.classList.remove('show'); E.logout.style.display=''; E.status.textContent=u.email; await loadCategoryRules(); await loadData(); }
function signedOut() { user=null; tx=[]; categoryRules=[]; AUTO_CATEGORIES={}; E.auth.classList.add('show'); E.logout.style.display='none'; E.status.textContent='Déconnecté'; }

async function loadData() {
  if (!user) return;
  E.status.textContent='Synchronisation…';
  const start=E.month.value+'-01', d=new Date(start+'T12:00:00'), end=new Date(d.getFullYear(),d.getMonth()+1,1).toISOString().slice(0,10);
  const [a,b]=await Promise.all([db.from('transactions').select('*').gte('tx_date',start).lt('tx_date',end).order('tx_date',{ascending:false}),db.from('monthly_budgets').select('amount').eq('month',start).maybeSingle()]);
  if (a.error || b.error) { alert((a.error||b.error).message); E.status.textContent='Erreur'; return; }
  tx=a.data||[]; budgetValue=Number(b.data?.amount||0); localStorage.setItem('budget-cache',JSON.stringify({month:E.month.value,tx,budgetValue})); E.status.textContent='Synchronisé'; render();
}

async function addTx(e) { e.preventDefault(); const row={user_id:user.id,tx_date:E.date.value,tx_type:E.type.value,label:E.label.value.trim(),category:E.category.value,amount:Number(E.amount.value)}; const { error }=await db.from('transactions').insert(row); if(error)return alert(error.message); E.modal.classList.remove('show'); await loadData(); }
async function deleteTx(e) { const b=e.target.closest('[data-id]'); if(!b||!confirm('Supprimer cette opération ?'))return; const { error }=await db.from('transactions').delete().eq('id',b.dataset.id); if(error)return alert(error.message); await loadData(); }
async function saveBudget() { const start=E.month.value+'-01',amount=Number(E.budget.value||0); const { error }=await db.from('monthly_budgets').upsert({user_id:user.id,month:start,amount},{onConflict:'user_id,month'}); if(error)return alert(error.message); await loadData(); }

function resetRuleForm() { E.ruleForm.reset(); E.ruleId.value=''; E.saveRule.textContent='Ajouter la règle'; E.cancelRuleEdit.style.display='none'; }
function renderRules() {
  if (!E.rulesList) return;
  E.rulesList.innerHTML = categoryRules.length ? categoryRules.map(rule => {
    const own = rule.user_id === user?.id;
    return `<div class="rule-row"><div><b>${esc(rule.keyword)}</b><br><span class="badge">${own?'Personnelle':'Globale'}</span></div><div class="rule-category">${esc(rule.category)}</div><div>${own?`<button data-edit-rule="${rule.id}" title="Modifier">✏️</button> <button class="danger" data-delete-rule="${rule.id}" title="Supprimer">🗑️</button>`:'🔒'}</div></div>`;
  }).join('') : '<div class="empty">Aucune règle</div>';
}
async function saveCategoryRule(e) {
  e.preventDefault();
  const keyword=normalize(E.ruleKeyword.value), category=E.ruleCategory.value, id=E.ruleId.value;
  if (!keyword) return;
  let result;
  if (id) result=await db.from('category_rules').update({keyword,category}).eq('id',id).eq('user_id',user.id);
  else result=await db.from('category_rules').insert({user_id:user.id,keyword,category});
  if (result.error) return alert(result.error.message.includes('duplicate')?'Ce mot-clé existe déjà.':result.error.message);
  resetRuleForm(); await loadCategoryRules();
}
async function handleRuleAction(e) {
  const edit=e.target.closest('[data-edit-rule]'), del=e.target.closest('[data-delete-rule]');
  if (edit) { const rule=categoryRules.find(r=>r.id===edit.dataset.editRule); if(!rule)return; E.ruleId.value=rule.id; E.ruleKeyword.value=rule.keyword; E.ruleCategory.value=rule.category; E.saveRule.textContent='Enregistrer'; E.cancelRuleEdit.style.display=''; E.ruleKeyword.focus(); }
  if (del && confirm('Supprimer cette règle ?')) { const { error }=await db.from('category_rules').delete().eq('id',del.dataset.deleteRule).eq('user_id',user.id); if(error)return alert(error.message); await loadCategoryRules(); }
}

function render() {
  const inc=tx.filter(x=>x.tx_type==='income').reduce((s,x)=>s+Number(x.amount),0), exp=tx.filter(x=>x.tx_type==='expense').reduce((s,x)=>s+Number(x.amount),0), bal=inc-exp;
  E.income.textContent=euro(inc);E.expense.textContent=euro(exp);E.balance.textContent=euro(bal);E.balance.className=bal>=0?'good':'bad';E.rate.textContent=inc?Math.round(bal/inc*100)+' %':'0 %';
  E.rows.innerHTML=tx.length?tx.map(x=>`<tr><td>${new Date(x.tx_date+'T12:00').toLocaleDateString('fr-FR')}</td><td>${esc(x.label)}</td><td><span class="pill">${esc(x.category)}</span></td><td class="amount ${x.tx_type==='income'?'good':'bad'}">${x.tx_type==='income'?'+':'-'}${euro(x.amount)}</td><td><button class="danger" data-id="${x.id}">×</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Aucune opération</td></tr>';
  const by={};tx.filter(x=>x.tx_type==='expense').forEach(x=>by[x.category]=(by[x.category]||0)+Number(x.amount));E.categories.innerHTML=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<p><b>${esc(k)}</b><span style="float:right">${euro(v)}</span></p><div class="bar"><i style="width:${exp?v/exp*100:0}%"></i></div>`).join('')||'<div class="empty">Aucune dépense</div>';
  E.budget.value=budgetValue||'';E.budgetBar.style.width=(budgetValue?Math.min(100,exp/budgetValue*100):0)+'%';E.budgetBar.style.background=exp>budgetValue&&budgetValue?'var(--bad)':'var(--blue)';E.budgetText.textContent=budgetValue?(exp<=budgetValue?`${euro(budgetValue-exp)} disponibles`:`Dépassement de ${euro(exp-budgetValue)}`):'Définissez un plafond.';draw();
}
function draw(){const c=E.chart,g=c.getContext('2d'),w=c.width,h=c.height,p=34,d0=new Date(E.month.value+'-01T12:00'),days=new Date(d0.getFullYear(),d0.getMonth()+1,0).getDate(),vals=[];let run=0;for(let d=1;d<=days;d++){tx.filter(x=>+x.tx_date.slice(8,10)===d).forEach(x=>run+=x.tx_type==='income'?+x.amount:-x.amount);vals.push(run)}const min=Math.min(0,...vals),max=Math.max(1,...vals);g.clearRect(0,0,w,h);g.strokeStyle='#e5e7eb';g.beginPath();g.moveTo(p,h-p);g.lineTo(w-p,h-p);g.stroke();g.strokeStyle='#2563eb';g.lineWidth=3;g.beginPath();vals.forEach((v,i)=>{const x=p+i*(w-2*p)/Math.max(1,days-1),y=h-p-(v-min)/(max-min)*(h-2*p);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();g.fillStyle='#6b7280';g.font='12px Segoe UI';g.fillText(euro(max),3,14);g.fillText(euro(min),3,h-8)}
function exportJson(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({transactions:tx,budget:budgetValue,rules:categoryRules},null,2)],{type:'application/json'}));a.download='budget-'+E.month.value+'.json';a.click()}
boot();
