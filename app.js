'use strict';

const CATS=['Logement','Internet','Courses','Restaurant','Livraison repas','Transport','Loisirs','Jeux vidéo','Abonnements','Maison','Sport','Santé','Salaire','Épargne','Autre'];
let user=null,tx=[],annualTx=[],comparisonTx=[],rules=[],auto={},categoryBudgets=[],budgetValue=0;
const cfg=window.BUDGET_CONFIG||{};
const db=!String(cfg.supabaseUrl).startsWith('REMPLACEZ_')?supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}}):null;
const $=id=>document.getElementById(id);
const E={auth:$('auth'),authForm:$('authForm'),email:$('email'),password:$('password'),signup:$('signup'),authMsg:$('authMsg'),logout:$('logout'),status:$('status'),month:$('month'),add:$('add'),rulesBtn:$('rulesBtn'),refresh:$('refresh'),income:$('income'),expense:$('expense'),balance:$('balance'),rate:$('rate'),rows:$('rows'),categories:$('categories'),budget:$('budget'),saveBudget:$('saveBudget'),budgetBar:$('budgetBar'),budgetText:$('budgetText'),modal:$('modal'),txForm:$('txForm'),cancel:$('cancel'),type:$('type'),date:$('date'),label:$('label'),category:$('category'),amount:$('amount'),rulesModal:$('rulesModal'),ruleForm:$('ruleForm'),ruleId:$('ruleId'),ruleKeyword:$('ruleKeyword'),ruleCategory:$('ruleCategory'),rulesList:$('rulesList'),saveRule:$('saveRule'),cancelRuleEdit:$('cancelRuleEdit'),closeRules:$('closeRules'),topExpenses:$('topExpenses'),annualChart:$('annualChart'),recurringList:$('recurringList'),forecast:$('forecast'),categoryBudgetForm:$('categoryBudgetForm'),categoryBudgetCategory:$('categoryBudgetCategory'),categoryBudgetAmount:$('categoryBudgetAmount'),categoryBudgetsList:$('categoryBudgetsList'),budgetAlerts:$('budgetAlerts')};
const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=a=>a.reduce((t,x)=>t+Number(x.amount||0),0);
const isSaving=x=>norm(x.category)==='epargne';

function injectResponsiveStyles(){
  if($('budget-responsive-styles'))return;
  const style=document.createElement('style');
  style.id='budget-responsive-styles';
  style.textContent=`
    html,body{max-width:100%;overflow-x:hidden}
    #monthlySummary .summary-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
    #monthlySummary .summary-card{min-width:0;padding:16px;border:1px solid #e5e7eb;border-radius:14px;background:#f8fafc}
    #monthlySummary .summary-card small{display:block;margin-bottom:7px;color:#6b7280;font-size:12px}
    #monthlySummary .summary-card strong{display:block;font-size:21px;line-height:1.25;overflow-wrap:anywhere}
    #monthlySummary .summary-card.summary-wide{grid-column:auto}
    .health-positive{color:#059669}.health-negative{color:#dc2626}
    .recurring-row>div:last-child small{display:block;margin-top:3px}

    @media(max-width:760px){
      body{width:100%;margin:0}
      main.wrap{width:100%!important;max-width:100%!important;padding:12px!important;margin:0!important}
      main.wrap>section,.grid,.cols,.cards,.card{width:100%!important;max-width:100%!important;min-width:0!important}
      .cols,.cards,.toolbar{grid-template-columns:1fr!important}
      .card{padding:16px!important;border-radius:14px!important;overflow:hidden}
      #monthlySummary .summary-cards{grid-template-columns:1fr 1fr;gap:10px}
      #monthlySummary .summary-card{padding:13px}
      #monthlySummary .summary-card strong{font-size:18px}
      #monthlySummary .summary-card.summary-wide{grid-column:1/-1}

      /* Tableau des opérations transformé en cartes mobiles pleine largeur. */
      #rows{display:block!important;width:100%!important;min-width:0!important}
      #rows tr{display:block!important;position:relative;width:100%!important;margin:0 0 12px!important;padding:14px 50px 14px 14px!important;border:1px solid #e5e7eb!important;border-radius:12px!important;background:#fff!important}
      #rows td{display:block!important;width:100%!important;padding:4px 0!important;border:0!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere!important}
      #rows td::before{content:attr(data-label);display:block;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}
      #rows td[data-label="Libellé"]{font-size:17px;font-weight:800;padding-top:0!important}
      #rows td[data-label="Libellé"]::before{display:none}
      #rows td.amount{font-size:18px;font-weight:800;margin-top:4px}
      #rows td[data-label="Action"]{position:absolute;top:12px;right:12px;width:auto!important;padding:0!important}
      #rows td[data-label="Action"]::before{display:none}
      #rows td[data-label="Action"] button{width:36px;height:36px;padding:0;border-radius:10px}
      #rows .pill{display:inline-block}
      #rows.closest-table-placeholder{display:none}
      table:has(#rows),#rows-table{display:block!important;width:100%!important;min-width:0!important}
      table:has(#rows) thead{display:none!important}
      table:has(#rows) tbody{display:block!important;width:100%!important}
      #rows tr:has(td.empty){padding:14px!important}
      #rows td.empty::before{display:none}

      .recurring-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}
      .recurring-row>div{min-width:0}
      .recurring-row>div:last-child{max-width:150px}
    }

    @media(max-width:420px){
      #monthlySummary .summary-cards{grid-template-columns:1fr}
      #monthlySummary .summary-card.summary-wide{grid-column:auto}
      .recurring-row{grid-template-columns:1fr}
      .recurring-row>div:last-child{max-width:none;text-align:left!important}
    }
  `;
  document.head.appendChild(style);
  const operationsTable=E.rows?.closest('table');
  if(operationsTable)operationsTable.id='rows-table';
}

function init(){injectResponsiveStyles();const now=new Date(),current=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;for(let y=2024;y<=2030;y++)for(let m=1;m<=12;m++){const v=`${y}-${String(m).padStart(2,'0')}`,d=new Date(y,m-1,1);E.month.add(new Option(d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),v,v===current,v===current));}const options=CATS.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');[E.category,E.ruleCategory,E.categoryBudgetCategory].filter(Boolean).forEach(s=>s.innerHTML=options);prepareSummary();bind();}
function prepareSummary(){const chart=$('chart'),card=chart?.closest('.card');if(card){card.innerHTML='<h2>Synthèse du mois</h2><div id="monthlySummary"></div>';}}
function bind(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));E.authForm.onsubmit=login;E.signup.onclick=signup;E.logout.onclick=()=>db.auth.signOut();E.month.onchange=reloadAll;E.refresh.onclick=reloadAll;E.add.onclick=()=>{E.txForm.reset();E.date.value=new Date().toISOString().slice(0,10);E.modal.classList.add('show')};E.cancel.onclick=()=>E.modal.classList.remove('show');E.txForm.onsubmit=addTx;E.rows.onclick=deleteTx;E.saveBudget.onclick=saveBudget;E.categories.onclick=toggleCategory;E.label.oninput=()=>{const c=detect(E.label.value);if(CATS.includes(c))E.category.value=c};E.rulesBtn.onclick=async()=>{await loadRules();resetRule();E.rulesModal.classList.add('show')};E.closeRules.onclick=()=>E.rulesModal.classList.remove('show');E.ruleForm.onsubmit=saveRule;E.cancelRuleEdit.onclick=resetRule;E.rulesList.onclick=ruleAction;if(E.categoryBudgetForm)E.categoryBudgetForm.onsubmit=saveCategoryBudget;}
function showTab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('[data-tab-panel]').forEach(p=>p.hidden=p.dataset.tabPanel!==name);}
async function boot(){init();if(!db){E.authMsg.textContent='Configurez config.js';return}const{data}=await db.auth.getSession();if(data.session)await signedIn(data.session.user);db.auth.onAuthStateChange((_e,s)=>s?signedIn(s.user):signedOut());}
async function login(e){e.preventDefault();const{error}=await db.auth.signInWithPassword({email:E.email.value,password:E.password.value});E.authMsg.textContent=error?.message||'';}
async function signup(){const{error}=await db.auth.signUp({email:E.email.value,password:E.password.value});E.authMsg.textContent=error?.message||'Compte créé.';}
async function signedIn(u){user=u;E.auth.classList.remove('show');E.logout.style.display='';E.status.textContent=u.email;await reloadAll();}
function signedOut(){user=null;E.auth.classList.add('show');E.logout.style.display='none';}
async function reloadAll(){if(!user)return;E.status.textContent='Synchronisation…';await Promise.all([loadRules(),loadMonth(),loadAnnual(),loadCategoryBudgets()]);E.status.textContent='Synchronisé';renderAll();}
async function monthQuery(value){const start=`${value}-01`,d=new Date(`${start}T12:00`),end=new Date(d.getFullYear(),d.getMonth()+1,1).toISOString().slice(0,10);return db.from('transactions').select('*').gte('tx_date',start).lt('tx_date',end).order('tx_date',{ascending:false});}
async function loadMonth(){const [a,b]=await Promise.all([monthQuery(E.month.value),db.from('monthly_budgets').select('amount').eq('month',`${E.month.value}-01`).maybeSingle()]);if(a.error||b.error)throw(a.error||b.error);tx=a.data||[];budgetValue=Number(b.data?.amount||0);}
async function loadAnnual(){const y=E.month.value.slice(0,4),{data,error}=await db.from('transactions').select('*').gte('tx_date',`${y}-01-01`).lt('tx_date',`${Number(y)+1}-01-01`).order('tx_date');if(error)throw error;annualTx=data||[];}
async function loadRules(){const{data,error}=await db.from('category_rules').select('*').order('keyword');if(error)throw error;rules=data||[];auto={};rules.filter(r=>!r.user_id).forEach(r=>auto[norm(r.keyword)]=r.category);rules.filter(r=>r.user_id===user.id).forEach(r=>auto[norm(r.keyword)]=r.category);renderRules();}
async function loadCategoryBudgets(){if(!E.categoryBudgetsList)return;const{data,error}=await db.from('category_budgets').select('*').eq('month',`${E.month.value}-01`).order('category');if(error){console.error(error);return}categoryBudgets=data||[];}
function detect(label){const value=norm(label);for(const k of Object.keys(auto).sort((a,b)=>b.length-a.length))if(value.includes(k))return auto[k];return'';}
async function addTx(e){e.preventDefault();const row={user_id:user.id,tx_date:E.date.value,tx_type:E.type.value,label:E.label.value.trim(),category:E.category.value,amount:Number(E.amount.value)};const{error}=await db.from('transactions').insert(row);if(error)return alert(error.message);E.modal.classList.remove('show');if(row.tx_type==='expense'&&!detect(row.label)){const proposed=prompt(`Créer une règle automatique pour « ${row.label} » ?\nCatégorie : ${row.category}`,norm(row.label).split(/\s+/)[0]);if(proposed){await db.from('category_rules').insert({user_id:user.id,keyword:norm(proposed),category:row.category});}}await reloadAll();}
async function deleteTx(e){const b=e.target.closest('[data-id]');if(!b||!confirm('Supprimer cette opération ?'))return;await db.from('transactions').delete().eq('id',b.dataset.id);await reloadAll();}
async function saveBudget(){const{error}=await db.from('monthly_budgets').upsert({user_id:user.id,month:`${E.month.value}-01`,amount:Number(E.budget.value||0)},{onConflict:'user_id,month'});if(error)return alert(error.message);await reloadAll();}
async function saveCategoryBudget(e){e.preventDefault();const{error}=await db.from('category_budgets').upsert({user_id:user.id,month:`${E.month.value}-01`,category:E.categoryBudgetCategory.value,amount:Number(E.categoryBudgetAmount.value||0)},{onConflict:'user_id,month,category'});if(error)return alert(error.message);await reloadAll();}
function resetRule(){E.ruleForm.reset();E.ruleId.value='';E.saveRule.textContent='Ajouter';E.cancelRuleEdit.style.display='none';}
function renderRules(){if(!E.rulesList)return;E.rulesList.innerHTML=rules.map(r=>{const own=r.user_id===user?.id;return`<div class="rule-row"><div><b>${esc(r.keyword)}</b><small>${own?'Personnelle':'Globale'}</small></div><span>${esc(r.category)}</span><span>${own?`<button data-edit="${r.id}">✏️</button><button data-delete="${r.id}">🗑️</button>`:'🔒'}</span></div>`}).join('');}
async function saveRule(e){e.preventDefault();const keyword=norm(E.ruleKeyword.value),category=E.ruleCategory.value,id=E.ruleId.value;const q=id?db.from('category_rules').update({keyword,category}).eq('id',id).eq('user_id',user.id):db.from('category_rules').insert({user_id:user.id,keyword,category});const{error}=await q;if(error)return alert(error.message);resetRule();await reloadAll();}
async function ruleAction(e){const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit){const r=rules.find(x=>x.id===edit.dataset.edit);E.ruleId.value=r.id;E.ruleKeyword.value=r.keyword;E.ruleCategory.value=r.category;E.saveRule.textContent='Enregistrer';E.cancelRuleEdit.style.display='';}if(del&&confirm('Supprimer cette règle ?')){await db.from('category_rules').delete().eq('id',del.dataset.delete).eq('user_id',user.id);await reloadAll();}}
function metrics(items){const income=sum(items.filter(x=>x.tx_type==='income')),savings=sum(items.filter(x=>x.tx_type==='expense'&&isSaving(x))),spending=sum(items.filter(x=>x.tx_type==='expense'&&!isSaving(x)));return{income,savings,spending,balance:income-spending-savings,rate:income?savings/income*100:0};}
function grouped(items){const g={};items.filter(x=>x.tx_type==='expense').forEach(x=>{g[x.category]??={total:0,details:{}};g[x.category].total+=Number(x.amount);g[x.category].details[x.label]=(g[x.category].details[x.label]||0)+Number(x.amount)});return g;}
function renderAll(){renderHome();renderSummary();renderRecurring();renderAnalysis();renderCategoryBudgets();}
function renderHome(){const m=metrics(tx);E.income.textContent=euro(m.income);E.expense.textContent=euro(m.spending);E.balance.textContent=euro(m.balance);E.balance.className=m.balance>=0?'good':'bad';E.rate.textContent=`${Math.round(m.rate)} %`;E.rows.innerHTML=tx.length?tx.map(x=>`<tr><td data-label="Date">${new Date(`${x.tx_date}T12:00`).toLocaleDateString('fr-FR')}</td><td data-label="Libellé">${esc(x.label)}</td><td data-label="Catégorie"><span class="pill">${esc(x.category)}</span></td><td data-label="Montant" class="amount ${x.tx_type==='income'?'good':'bad'}">${x.tx_type==='income'?'+':'-'}${euro(x.amount)}</td><td data-label="Action"><button data-id="${x.id}">×</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty">Aucune opération</td></tr>';const g=grouped(tx),total=Object.values(g).reduce((t,x)=>t+x.total,0);E.categories.innerHTML=Object.entries(g).sort((a,b)=>b[1].total-a[1].total).map(([c,v],i)=>`<div><button data-cat="d${i}" style="width:100%;text-align:left;border:0"><b>▶ ${esc(c)}</b><span style="float:right">${euro(v.total)} · ${total?Math.round(v.total/total*100):0}%</span></button><div class="bar"><i style="width:${total?v.total/total*100:0}%"></i></div><div id="d${i}" hidden>${Object.entries(v.details).map(([l,a])=>`<div style="display:flex;justify-content:space-between"><span>${esc(l)}</span><span>${euro(a)} · ${Math.round(a/v.total*100)}%</span></div>`).join('')}</div></div>`).join('');E.budget.value=budgetValue||'';E.budgetBar.style.width=`${budgetValue?Math.min(100,m.spending/budgetValue*100):0}%`;E.budgetText.textContent=budgetValue?`${euro(budgetValue-m.spending)} disponibles`:'Définissez un plafond.';}
function toggleCategory(e){const b=e.target.closest('[data-cat]');if(!b)return;const d=$(b.dataset.cat);d.hidden=!d.hidden;b.querySelector('b').textContent=b.querySelector('b').textContent.replace(d.hidden?'▼':'▶',d.hidden?'▶':'▼');}
function renderSummary(){
  const target=$('monthlySummary');
  if(!target)return;

  const m=metrics(tx);
  const top=[...tx]
    .filter(x=>x.tx_type==='expense'&&!isSaving(x))
    .sort((a,b)=>Number(b.amount)-Number(a.amount))[0];

  const health=m.balance>=0
    ? {label:'Budget maîtrisé',value:`+${euro(m.balance)}`,className:'health-positive'}
    : {label:'Déficit du mois',value:euro(m.balance),className:'health-negative'};

  target.innerHTML=`
    <div class="summary-cards">
      <div class="summary-card">
        <small>💰 Épargne</small>
        <strong>${euro(m.savings)}</strong>
      </div>
      <div class="summary-card">
        <small>📋 Opérations</small>
        <strong>${tx.length}</strong>
      </div>
      <div class="summary-card">
        <small>${m.balance>=0?'✅':'⚠️'} ${health.label}</small>
        <strong class="${health.className}">${health.value}</strong>
      </div>
      <div class="summary-card summary-wide">
        <small>🏆 Plus grosse dépense</small>
        <strong>${top?`${esc(top.label)} · ${euro(top.amount)}`:'Aucune dépense'}</strong>
      </div>
    </div>`;
}
function renderRecurring(){if(!E.recurringList)return;const g={};annualTx.filter(x=>x.tx_type==='expense').forEach(x=>{const k=norm(x.label);g[k]??={label:x.label,category:x.category,entries:[]};g[k].entries.push({amount:Number(x.amount),date:x.tx_date,month:x.tx_date.slice(0,7)})});const list=Object.values(g).map(x=>{x.entries.sort((a,b)=>a.date.localeCompare(b.date));const months=new Set(x.entries.map(e=>e.month));const latest=x.entries.at(-1)?.amount||0,prev=x.entries.at(-2)?.amount??latest,average=x.entries.reduce((t,e)=>t+e.amount,0)/x.entries.length;return{...x,months:months.size,latest,average,variation:latest-prev}}).filter(x=>x.months>=2).sort((a,b)=>b.latest-a.latest);E.recurringList.innerHTML=list.length?list.map(x=>`<div class="recurring-row"><div><b>${esc(x.label)}</b><small>${esc(x.category)} · ${x.months} mois</small><small class="${x.variation>0?'bad':x.variation<0?'good':''}">${x.variation===0?'Stable':`${x.variation>0?'+':''}${euro(x.variation)} vs précédent`}</small></div><div style="text-align:right"><strong>${euro(x.latest)}</strong><small>Dernier montant</small><small>Moyenne : ${euro(x.average)}</small></div></div>`).join(''):'<div class="empty">Aucune charge récurrente détectée</div>';}
function renderAnalysis(){if(E.topExpenses){const top=[...tx].filter(x=>x.tx_type==='expense'&&!isSaving(x)).sort((a,b)=>b.amount-a.amount).slice(0,5);E.topExpenses.innerHTML=top.map((x,i)=>`<div class="rank-row"><b>${i+1}. ${esc(x.label)}</b><span>${euro(x.amount)}</span></div>`).join('');}if(E.forecast){const m=metrics(tx),d=new Date(`${E.month.value}-01T12:00`),now=new Date(),days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),elapsed=d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()?now.getDate():days;E.forecast.innerHTML=`<div class="forecast-value">${euro(m.spending/Math.max(1,elapsed)*days)}</div><p>Projection fin de mois</p>`;}drawAnnual();}
function drawAnnual(){if(!E.annualChart)return;const c=E.annualChart,g=c.getContext('2d'),w=c.width,h=c.height,p=42,months=Array.from({length:12},()=>({i:0,d:0,e:0}));annualTx.forEach(x=>{const m=Number(x.tx_date.slice(5,7))-1;if(x.tx_type==='income')months[m].i+=Number(x.amount);else if(isSaving(x))months[m].e+=Number(x.amount);else months[m].d+=Number(x.amount)});const max=Math.max(1,...months.flatMap(x=>[x.i,x.d,x.e]));g.clearRect(0,0,w,h);const gw=(w-2*p)/12,bw=gw/5;months.forEach((x,n)=>{[x.i,x.d,x.e].forEach((v,j)=>{g.fillStyle=['#059669','#dc2626','#7c3aed'][j];const bh=v/max*(h-2*p);g.fillRect(p+n*gw+j*bw,h-p-bh,bw-1,bh)});g.fillStyle='#6b7280';g.fillText(new Date(2026,n,1).toLocaleDateString('fr-FR',{month:'short'}),p+n*gw,h-10)});}
function renderCategoryBudgets(){if(!E.categoryBudgetsList)return;const g=grouped(tx);E.categoryBudgetsList.innerHTML=categoryBudgets.length?categoryBudgets.map(x=>{const spent=g[x.category]?.total||0,p=x.amount?spent/x.amount*100:0;return`<div class="category-budget-row"><div><b>${esc(x.category)}</b><span>${euro(spent)} / ${euro(x.amount)}</span></div><div class="bar"><i style="width:${Math.min(100,p)}%;background:${p>100?'var(--bad)':'var(--blue)'}"></i></div><small>${Math.round(p)} %</small></div>`}).join(''):'<div class="empty">Aucun budget par catégorie</div>';if(E.budgetAlerts){const a=categoryBudgets.filter(x=>(g[x.category]?.total||0)>x.amount);E.budgetAlerts.innerHTML=a.map(x=>`<div class="alert-card">⚠️ ${esc(x.category)} dépassé</div>`).join('');}}

boot();
