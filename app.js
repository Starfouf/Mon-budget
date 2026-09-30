'use strict';

const CATS = [
  'Logement', 'Internet', 'Courses', 'Restaurant', 'Livraison repas',
  'Transport', 'Loisirs', 'Jeux vidéo', 'Abonnements', 'Maison',
  'Sport', 'Santé', 'Salaire', 'Épargne', 'Autre'
];

let AUTO_CATEGORIES = {};
let categoryRules = [];
let user = null;
let tx = [];
let comparisonTx = [];
let annualTx = [];
let categoryBudgets = [];
let budgetValue = 0;

const cfg = window.BUDGET_CONFIG || {};
const configured = !String(cfg.supabaseUrl).startsWith('REMPLACEZ_');
const db = configured
  ? supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

const $ = id => document.getElementById(id);
const E = {
  auth: $('auth'), authForm: $('authForm'), email: $('email'), password: $('password'),
  signup: $('signup'), authMsg: $('authMsg'), logout: $('logout'), status: $('status'),
  month: $('month'), add: $('add'), rulesBtn: $('rulesBtn'), refresh: $('refresh'),
  income: $('income'), expense: $('expense'), balance: $('balance'), rate: $('rate'),
  rows: $('rows'), categories: $('categories'), chart: $('chart'), budget: $('budget'),
  saveBudget: $('saveBudget'), budgetBar: $('budgetBar'), budgetText: $('budgetText'),
  exportBtn: $('export'), modal: $('modal'), txForm: $('txForm'), cancel: $('cancel'),
  type: $('type'), date: $('date'), label: $('label'), category: $('category'),
  amount: $('amount'), rulesModal: $('rulesModal'), ruleForm: $('ruleForm'),
  ruleId: $('ruleId'), ruleKeyword: $('ruleKeyword'), ruleCategory: $('ruleCategory'),
  rulesList: $('rulesList'), saveRule: $('saveRule'), cancelRuleEdit: $('cancelRuleEdit'),
  closeRules: $('closeRules'),
  tabButtons: document.querySelectorAll('[data-tab]'),
  tabPanels: document.querySelectorAll('[data-tab-panel]'),
  topExpenses: $('topExpenses'), annualChart: $('annualChart'),
  recurringList: $('recurringList'), forecast: $('forecast'),
  categoryBudgetForm: $('categoryBudgetForm'),
  categoryBudgetCategory: $('categoryBudgetCategory'),
  categoryBudgetAmount: $('categoryBudgetAmount'),
  categoryBudgetsList: $('categoryBudgetsList'),
  budgetAlerts: $('budgetAlerts')
};

const euro = n => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR'
}).format(n || 0);

const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const normalize = s => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const isSavings = item => normalize(item.category) === 'epargne';
const sum = items => items.reduce((total, item) => total + Number(item.amount || 0), 0);

function detectCategory(label) {
  const value = normalize(label);
  const keywords = Object.keys(AUTO_CATEGORIES).sort((a, b) => b.length - a.length);
  for (const keyword of keywords) {
    if (value.includes(keyword)) return AUTO_CATEGORIES[keyword];
  }
  return '';
}

async function loadCategoryRules() {
  if (!user) return;
  const { data, error } = await db.from('category_rules')
    .select('id,user_id,keyword,category,created_at').order('keyword');
  if (error) { console.error(error); alert(error.message); return; }

  categoryRules = data || [];
  AUTO_CATEGORIES = {};
  categoryRules.filter(r => !r.user_id)
    .forEach(r => AUTO_CATEGORIES[normalize(r.keyword)] = r.category);
  categoryRules.filter(r => r.user_id === user.id)
    .forEach(r => AUTO_CATEGORIES[normalize(r.keyword)] = r.category);
  renderRules();
}

async function suggestRule(label, category) {
  const normalizedLabel = normalize(label);
  if (!normalizedLabel || detectCategory(normalizedLabel)) return;

  const defaultKeyword = normalizedLabel.split(/\s+/)[0];
  const proposedKeyword = prompt(
    `Créer une règle automatique pour « ${label} » ?\n\n` +
    `Modifiez le mot-clé si nécessaire, puis validez.\nCatégorie : ${category}`,
    defaultKeyword
  );
  if (proposedKeyword === null) return;

  const keyword = normalize(proposedKeyword);
  if (!keyword) return;
  if (AUTO_CATEGORIES[keyword]) {
    alert(`Une règle existe déjà pour « ${keyword} » : ${AUTO_CATEGORIES[keyword]}.`);
    return;
  }

  const { error } = await db.from('category_rules')
    .insert({ user_id: user.id, keyword, category });
  if (error) {
    alert(String(error.message).toLowerCase().includes('duplicate')
      ? `Une règle existe déjà pour « ${keyword} ».` : error.message);
    return;
  }
  await loadCategoryRules();
}

function injectMobileStyles() {
  if ($('budget-mobile-styles')) return;

  const style = document.createElement('style');
  style.id = 'budget-mobile-styles';
  style.textContent = `
    @media (max-width: 700px) {
      main.wrap {
        width: 100%;
        max-width: none;
        padding: 12px;
      }

      main.wrap > *,
      main.wrap .card,
      main.wrap .grid,
      main.wrap .cols {
        width: 100%;
        min-width: 0;
      }

      .cols,
      .cards {
        grid-template-columns: 1fr !important;
      }

      .card {
        width: 100% !important;
        max-width: none !important;
        padding: 16px;
        border-radius: 14px;
      }

      /* Le bloc Objectif mensuel occupe toute la largeur du téléphone. */
      #budget {
        width: 100% !important;
        min-width: 0;
      }

      #budget + button,
      #saveBudget {
        flex: 0 0 auto;
        min-width: 52px;
      }

      #budgetBar {
        min-height: 10px;
      }

      /* L'export JSON est une sauvegarde technique, masquée dans l'interface mobile. */
      #export {
        display: none !important;
      }

      /* Le tableau devient une liste de cartes lisibles sur téléphone. */
      #rows,
      #rows tr,
      #rows td {
        display: block;
        width: 100%;
      }

      #rows {
        min-width: 0;
      }

      #rows tr {
        position: relative;
        margin: 0 0 12px;
        padding: 14px 52px 14px 14px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
      }

      #rows td {
        box-sizing: border-box;
        padding: 4px 0;
        border: 0;
        text-align: left;
        overflow-wrap: anywhere;
      }

      #rows td::before {
        content: attr(data-label);
        display: block;
        margin-bottom: 2px;
        color: #6b7280;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      #rows td[data-label="Libellé"] {
        padding-top: 0;
        font-size: 17px;
        font-weight: 700;
        color: #172033;
      }

      #rows td[data-label="Libellé"]::before {
        display: none;
      }

      #rows td.amount {
        margin-top: 4px;
        font-size: 18px;
        font-weight: 800;
      }

      #rows td[data-label="Action"] {
        position: absolute;
        top: 12px;
        right: 12px;
        width: auto;
        padding: 0;
      }

      #rows td[data-label="Action"]::before {
        display: none;
      }

      #rows td[data-label="Action"] button {
        width: 36px;
        height: 36px;
        padding: 0;
        border-radius: 10px;
      }

      #rows .pill {
        display: inline-block;
        margin-top: 2px;
      }

      /* Masque uniquement l'en-tête du tableau des opérations. */
      #rows.closest-table-placeholder {
        display: none;
      }

      #rows-container-placeholder {
        width: 100%;
      }

      table:has(#rows) {
        display: block;
        width: 100%;
        min-width: 0;
      }

      table:has(#rows) thead {
        display: none;
      }

      table:has(#rows) tbody,
      table.mobile-operation-table tbody {
        display: block;
        width: 100%;
      }

      table.mobile-operation-table {
        display: block;
        width: 100% !important;
        min-width: 0 !important;
      }

      table.mobile-operation-table thead {
        display: none !important;
      }

      #rows tr.empty-row {
        padding: 14px;
      }

      #rows tr.empty-row td::before {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);

  const operationsTable = E.rows ? E.rows.closest('table') : null;
  if (operationsTable) operationsTable.classList.add('mobile-operation-table');

  if (E.budget) {
    const budgetCard = E.budget.closest('.card');
    if (budgetCard) budgetCard.classList.add('budget-card');
  }
}

function initMonths() {
  E.month.innerHTML = '';
  const startYear = 2024;
  const endYear = 2030;
  const nowValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const value = `${year}-${String(month).padStart(2, '0')}`;
      const date = new Date(year, month - 1, 1);
      E.month.add(new Option(
        date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        value, value === nowValue, value === nowValue
      ));
    }
  }

  const options = CATS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  E.category.innerHTML = options;
  E.ruleCategory.innerHTML = options;
  if (E.categoryBudgetCategory) {
    E.categoryBudgetCategory.innerHTML = options;
    E.categoryBudgetCategory.value = 'Courses';
  }
  createComparisonPanel();
}

function createComparisonPanel() {
  if ($('comparisonCard')) return;
  const card = document.createElement('section');
  card.id = 'comparisonCard';
  card.className = 'card';
  card.style.marginTop = '16px';
  card.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <h2 style="margin:0">Comparatif mensuel</h2>
      <label>Comparer avec <select id="comparisonMonth"></select></label>
    </div>
    <div id="comparisonContent" style="margin-top:14px"></div>`;
  const analysisPanel = document.querySelector('[data-tab-panel="analysis"]');
  (analysisPanel || document.querySelector('main.wrap')).appendChild(card);

  const select = $('comparisonMonth');
  Array.from(E.month.options).forEach(option => select.add(option.cloneNode(true)));
  select.value = previousMonth(E.month.value);
  select.addEventListener('change', loadComparisonData);
}

function previousMonth(value) {
  const date = new Date(`${value}-01T12:00:00`);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function bind() {
  E.tabButtons.forEach(button => button.addEventListener('click', () => showTab(button.dataset.tab)));
  E.authForm.onsubmit = login;
  E.signup.onclick = signup;
  E.logout.onclick = () => db.auth.signOut();
  E.month.onchange = async () => {
    const comparison = $('comparisonMonth');
    if (comparison) comparison.value = previousMonth(E.month.value);
    await loadData();
    await loadAnnualData();
    await loadCategoryBudgets();
  };
  E.refresh.onclick = async () => { await loadCategoryRules(); await loadData(); await loadAnnualData(); await loadCategoryBudgets(); };
  E.add.onclick = () => {
    E.txForm.reset();
    E.date.value = new Date().toISOString().slice(0, 10);
    E.modal.classList.add('show');
  };
  E.cancel.onclick = () => E.modal.classList.remove('show');
  E.txForm.onsubmit = addTx;
  E.rows.onclick = deleteTx;
  E.saveBudget.onclick = saveBudget;
  if (E.exportBtn) E.exportBtn.onclick = exportJson;
  E.categories.onclick = toggleCategoryDetails;

  E.label.addEventListener('input', () => {
    const category = detectCategory(E.label.value);
    if (category && CATS.includes(category)) E.category.value = category;
  });

  E.rulesBtn.onclick = async () => {
    await loadCategoryRules();
    resetRuleForm();
    E.rulesModal.classList.add('show');
  };
  E.closeRules.onclick = () => E.rulesModal.classList.remove('show');
  E.ruleForm.onsubmit = saveCategoryRule;
  E.cancelRuleEdit.onclick = resetRuleForm;
  E.rulesList.onclick = handleRuleAction;
  if (E.categoryBudgetForm) E.categoryBudgetForm.onsubmit = saveCategoryBudget;
  E.modal.onclick = event => { if (event.target === E.modal) E.modal.classList.remove('show'); };
  E.rulesModal.onclick = event => { if (event.target === E.rulesModal) E.rulesModal.classList.remove('show'); };
}

async function boot() {
  injectMobileStyles();
  initMonths();
  bind();
  if (!configured) { E.authMsg.textContent = 'Configurez config.js puis publiez le dossier.'; return; }
  const { data } = await db.auth.getSession();
  if (data.session) await signedIn(data.session.user);
  db.auth.onAuthStateChange((_event, session) => session ? signedIn(session.user) : signedOut());
}

async function login(event) {
  event.preventDefault();
  msg('Connexion…');
  const { error } = await db.auth.signInWithPassword({ email: E.email.value, password: E.password.value });
  msg(error ? error.message : '');
}

async function signup() {
  msg('Création…');
  const { error } = await db.auth.signUp({ email: E.email.value, password: E.password.value });
  msg(error ? error.message : 'Compte créé. Vérifiez éventuellement votre e-mail, puis connectez-vous.');
}

function msg(text) { E.authMsg.textContent = text; }

async function signedIn(currentUser) {
  user = currentUser;
  E.auth.classList.remove('show');
  E.logout.style.display = '';
  E.status.textContent = currentUser.email;
  await loadCategoryRules();
  await loadData();
  await loadAnnualData();
  await loadCategoryBudgets();
}

function signedOut() {
  user = null; tx = []; comparisonTx = []; categoryRules = []; AUTO_CATEGORIES = {};
  E.auth.classList.add('show');
  E.logout.style.display = 'none';
  E.status.textContent = 'Déconnecté';
}

async function queryTransactionsForMonth(monthValue) {
  const start = `${monthValue}-01`;
  const first = new Date(`${start}T12:00:00`);
  const end = new Date(first.getFullYear(), first.getMonth() + 1, 1).toISOString().slice(0, 10);
  return db.from('transactions').select('*')
    .gte('tx_date', start).lt('tx_date', end).order('tx_date', { ascending: false });
}

async function loadData() {
  if (!user) return;
  E.status.textContent = 'Synchronisation…';
  const budgetMonth = `${E.month.value}-01`;
  const [transactionsResult, budgetResult] = await Promise.all([
    queryTransactionsForMonth(E.month.value),
    db.from('monthly_budgets').select('amount').eq('month', budgetMonth).maybeSingle()
  ]);
  if (transactionsResult.error || budgetResult.error) {
    alert((transactionsResult.error || budgetResult.error).message);
    E.status.textContent = 'Erreur';
    return;
  }
  tx = transactionsResult.data || [];
  budgetValue = Number(budgetResult.data?.amount || 0);
  E.status.textContent = 'Synchronisé';
  render();
  await loadComparisonData();
  renderForecast();
  renderTopExpenses();
  renderBudgetAlerts();
}

async function loadComparisonData() {
  if (!user || !$('comparisonMonth')) return;
  const result = await queryTransactionsForMonth($('comparisonMonth').value);
  if (result.error) { console.error(result.error); return; }
  comparisonTx = result.data || [];
  renderComparison();
}


function showTab(tabName) {
  E.tabButtons.forEach(button => button.classList.toggle('active', button.dataset.tab === tabName));
  E.tabPanels.forEach(panel => {
    panel.hidden = panel.dataset.tabPanel !== tabName;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadAnnualData() {
  if (!user) return;
  const selectedYear = Number(E.month.value.slice(0, 4));
  const start = `${selectedYear}-01-01`;
  const end = `${selectedYear + 1}-01-01`;
  const { data, error } = await db.from('transactions').select('*')
    .gte('tx_date', start).lt('tx_date', end).order('tx_date');
  if (error) { console.error(error); return; }
  annualTx = data || [];
  renderAnnualChart();
  renderRecurring();
}

async function loadCategoryBudgets() {
  if (!user) return;
  const { data, error } = await db.from('category_budgets')
    .select('*').eq('month', `${E.month.value}-01`).order('category');
  if (error) {
    if (String(error.message).includes('category_budgets')) return;
    console.error(error);
    return;
  }
  categoryBudgets = data || [];
  renderCategoryBudgets();
  renderBudgetAlerts();
}

async function saveCategoryBudget(event) {
  event.preventDefault();
  const category = E.categoryBudgetCategory.value;
  const amount = Number(E.categoryBudgetAmount.value || 0);
  if (!category || amount < 0) return;
  const { error } = await db.from('category_budgets').upsert({
    user_id: user.id, month: `${E.month.value}-01`, category, amount
  }, { onConflict: 'user_id,month,category' });
  if (error) { alert(error.message); return; }
  E.categoryBudgetAmount.value = '';
  await loadCategoryBudgets();
}

function renderTopExpenses() {
  if (!E.topExpenses) return;
  const items = tx.filter(item => item.tx_type === 'expense' && !isSavings(item))
    .sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);
  E.topExpenses.innerHTML = items.length ? items.map((item, index) => `
    <div class="rank-row"><b>${index + 1}. ${esc(item.label)}</b><span>${euro(item.amount)}</span></div>
  `).join('') : '<div class="empty">Aucune dépense</div>';
}

function renderForecast() {
  if (!E.forecast) return;
  const metrics = getMetrics(tx);
  const selected = new Date(`${E.month.value}-01T12:00:00`);
  const now = new Date();
  const daysInMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();
  const isCurrent = selected.getFullYear() === now.getFullYear() && selected.getMonth() === now.getMonth();
  const elapsed = isCurrent ? Math.max(1, now.getDate()) : daysInMonth;
  const projected = metrics.spending / elapsed * daysInMonth;
  E.forecast.innerHTML = `
    <div class="forecast-value">${euro(projected)}</div>
    <p class="note">Projection calculée à partir de ${euro(metrics.spending)} sur ${elapsed} jour(s).</p>`;
}

function renderRecurring() {
  if (!E.recurringList) return;
  const groups = {};
  annualTx.filter(item => item.tx_type === 'expense').forEach(item => {
    const key = normalize(item.label);
    if (!key) return;
    if (!groups[key]) groups[key] = { label: item.label, amounts: [], months: new Set(), category: item.category };
    groups[key].amounts.push(Number(item.amount));
    groups[key].months.add(item.tx_date.slice(0, 7));
  });
  const recurring = Object.values(groups).filter(group => group.months.size >= 2)
    .map(group => ({ ...group, average: sum(group.amounts) / group.amounts.length }))
    .sort((a, b) => b.average - a.average);
  E.recurringList.innerHTML = recurring.length ? recurring.map(group => `
    <div class="recurring-row"><div><b>${esc(group.label)}</b><small>${esc(group.category)} · ${group.months.size} mois</small></div><strong>${euro(group.average)}/mois</strong></div>
  `).join('') : '<div class="empty">Aucune charge récurrente détectée</div>';
}

function renderCategoryBudgets() {
  if (!E.categoryBudgetsList) return;
  const grouped = groupExpenses(tx);
  E.categoryBudgetsList.innerHTML = categoryBudgets.length ? categoryBudgets.map(item => {
    const spent = grouped[item.category]?.total || 0;
    const percent = item.amount ? spent / Number(item.amount) * 100 : 0;
    return `<div class="category-budget-row"><div><b>${esc(item.category)}</b><span>${euro(spent)} / ${euro(item.amount)}</span></div><div class="bar"><i style="width:${Math.min(100, percent)}%;background:${percent > 100 ? 'var(--bad)' : 'var(--blue)'}"></i></div><small>${Math.round(percent)} % consommé</small></div>`;
  }).join('') : '<div class="empty">Aucun budget par catégorie</div>';
}

function renderBudgetAlerts() {
  if (!E.budgetAlerts) return;
  const grouped = groupExpenses(tx);
  const alerts = categoryBudgets.filter(item => (grouped[item.category]?.total || 0) > Number(item.amount));
  E.budgetAlerts.innerHTML = alerts.map(item => {
    const spent = grouped[item.category]?.total || 0;
    return `<div class="alert-card">⚠️ <b>${esc(item.category)}</b> dépassé de ${euro(spent - Number(item.amount))}</div>`;
  }).join('');
}

function renderAnnualChart() {
  if (!E.annualChart) return;
  const canvas = E.annualChart, g = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height, padding = 44;
  const months = Array.from({ length: 12 }, () => ({ income: 0, spending: 0, savings: 0 }));
  annualTx.forEach(item => {
    const index = Number(item.tx_date.slice(5, 7)) - 1;
    if (item.tx_type === 'income') months[index].income += Number(item.amount);
    else if (isSavings(item)) months[index].savings += Number(item.amount);
    else months[index].spending += Number(item.amount);
  });
  const max = Math.max(1, ...months.flatMap(m => [m.income, m.spending, m.savings]));
  g.clearRect(0, 0, width, height);
  g.strokeStyle = '#e5e7eb'; g.beginPath(); g.moveTo(padding, height - padding); g.lineTo(width - padding, height - padding); g.stroke();
  const plot = width - 2 * padding, groupWidth = plot / 12, bar = Math.max(3, groupWidth / 5);
  months.forEach((month, index) => {
    [month.income, month.spending, month.savings].forEach((value, series) => {
      g.fillStyle = ['#059669', '#dc2626', '#7c3aed'][series];
      const barHeight = value / max * (height - 2 * padding);
      g.fillRect(padding + index * groupWidth + series * bar, height - padding - barHeight, bar - 1, barHeight);
    });
    g.fillStyle = '#6b7280'; g.font = '10px Segoe UI';
    g.fillText(new Date(2026, index, 1).toLocaleDateString('fr-FR', { month: 'short' }), padding + index * groupWidth, height - 12);
  });
}

async function addTx(event) {
  event.preventDefault();
  const row = {
    user_id: user.id, tx_date: E.date.value, tx_type: E.type.value,
    label: E.label.value.trim(), category: E.category.value, amount: Number(E.amount.value)
  };
  const { error } = await db.from('transactions').insert(row);
  if (error) { alert(error.message); return; }
  E.modal.classList.remove('show');
  if (row.tx_type === 'expense') await suggestRule(row.label, row.category);
  await loadData();
}

async function deleteTx(event) {
  const button = event.target.closest('[data-id]');
  if (!button || !confirm('Supprimer cette opération ?')) return;
  const { error } = await db.from('transactions').delete().eq('id', button.dataset.id);
  if (error) return alert(error.message);
  await loadData();
}

async function saveBudget() {
  const month = `${E.month.value}-01`;
  const amount = Number(E.budget.value || 0);
  const { error } = await db.from('monthly_budgets')
    .upsert({ user_id: user.id, month, amount }, { onConflict: 'user_id,month' });
  if (error) return alert(error.message);
  await loadData();
}

function resetRuleForm() {
  E.ruleForm.reset(); E.ruleId.value = '';
  E.saveRule.textContent = 'Ajouter la règle';
  E.cancelRuleEdit.style.display = 'none';
}

function renderRules() {
  if (!E.rulesList) return;
  E.rulesList.innerHTML = categoryRules.length ? categoryRules.map(rule => {
    const own = rule.user_id === user?.id;
    return `<div class="rule-row"><div><b>${esc(rule.keyword)}</b><br><span class="badge">${own ? 'Personnelle' : 'Globale'}</span></div><div class="rule-category">${esc(rule.category)}</div><div>${own ? `<button data-edit-rule="${rule.id}">✏️</button> <button class="danger" data-delete-rule="${rule.id}">🗑️</button>` : '🔒'}</div></div>`;
  }).join('') : '<div class="empty">Aucune règle</div>';
}

async function saveCategoryRule(event) {
  event.preventDefault();
  const keyword = normalize(E.ruleKeyword.value), category = E.ruleCategory.value, id = E.ruleId.value;
  if (!keyword) return;
  const result = id
    ? await db.from('category_rules').update({ keyword, category }).eq('id', id).eq('user_id', user.id)
    : await db.from('category_rules').insert({ user_id: user.id, keyword, category });
  if (result.error) return alert(String(result.error.message).toLowerCase().includes('duplicate') ? 'Ce mot-clé existe déjà.' : result.error.message);
  resetRuleForm();
  await loadCategoryRules();
}

async function handleRuleAction(event) {
  const edit = event.target.closest('[data-edit-rule]');
  const del = event.target.closest('[data-delete-rule]');
  if (edit) {
    const rule = categoryRules.find(item => item.id === edit.dataset.editRule);
    if (!rule) return;
    E.ruleId.value = rule.id; E.ruleKeyword.value = rule.keyword;
    E.ruleCategory.value = rule.category; E.saveRule.textContent = 'Enregistrer';
    E.cancelRuleEdit.style.display = ''; E.ruleKeyword.focus();
  }
  if (del && confirm('Supprimer cette règle ?')) {
    const { error } = await db.from('category_rules').delete()
      .eq('id', del.dataset.deleteRule).eq('user_id', user.id);
    if (error) return alert(error.message);
    await loadCategoryRules();
  }
}

function getMetrics(items) {
  const income = sum(items.filter(item => item.tx_type === 'income'));
  const savings = sum(items.filter(item => item.tx_type === 'expense' && isSavings(item)));
  const spending = sum(items.filter(item => item.tx_type === 'expense' && !isSavings(item)));
  return { income, savings, spending, balance: income - spending - savings,
    savingsRate: income ? savings / income * 100 : 0 };
}

function groupExpenses(items) {
  const grouped = {};
  items.filter(item => item.tx_type === 'expense').forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = { total: 0, details: {} };
    grouped[item.category].total += Number(item.amount);
    const detail = item.label.trim() || 'Sans libellé';
    grouped[item.category].details[detail] = (grouped[item.category].details[detail] || 0) + Number(item.amount);
  });
  return grouped;
}

function render() {
  const metrics = getMetrics(tx);
  E.income.textContent = euro(metrics.income);
  E.expense.textContent = euro(metrics.spending);
  E.balance.textContent = euro(metrics.balance);
  E.balance.className = metrics.balance >= 0 ? 'good' : 'bad';
  E.rate.textContent = `${Math.round(metrics.savingsRate)} %`;
  const rateLabel = E.rate.parentElement?.querySelector('small');
  if (rateLabel) rateLabel.textContent = `Taux d'épargne (${euro(metrics.savings)})`;

  E.rows.innerHTML = tx.length ? tx.map(item => `<tr>
    <td data-label="Date">${new Date(`${item.tx_date}T12:00`).toLocaleDateString('fr-FR')}</td>
    <td data-label="Libellé">${esc(item.label)}</td>
    <td data-label="Catégorie"><span class="pill">${esc(item.category)}</span></td>
    <td data-label="Montant" class="amount ${item.tx_type === 'income' ? 'good' : 'bad'}">${item.tx_type === 'income' ? '+' : '-'}${euro(item.amount)}</td>
    <td data-label="Action"><button class="danger" data-id="${item.id}" aria-label="Supprimer ${esc(item.label)}">×</button></td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="5" class="empty">Aucune opération</td></tr>';

  const grouped = groupExpenses(tx);
  const totalExpenses = Object.values(grouped).reduce((total, group) => total + group.total, 0);
  E.categories.innerHTML = Object.entries(grouped)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, group], index) => {
      const details = Object.entries(group.details).sort((a, b) => b[1] - a[1]);
      return `<div class="category-group">
        <button type="button" data-toggle-category="cat-${index}" style="width:100%;border:0;padding:7px 0;background:transparent;text-align:left">
          <b>▶ ${esc(category)}</b><span style="float:right">${euro(group.total)} · ${totalExpenses ? Math.round(group.total / totalExpenses * 100) : 0}%</span>
        </button>
        <div class="bar"><i style="width:${totalExpenses ? group.total / totalExpenses * 100 : 0}%"></i></div>
        <div id="cat-${index}" style="display:none;padding:5px 4px 12px 18px">
          ${details.map(([label, value]) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0"><span>${esc(label)}</span><span>${euro(value)} · ${group.total ? Math.round(value / group.total * 100) : 0}%</span></div>`).join('')}
        </div></div>`;
    }).join('') || '<div class="empty">Aucune dépense</div>';

  E.budget.value = budgetValue || '';
  E.budgetBar.style.width = `${budgetValue ? Math.min(100, metrics.spending / budgetValue * 100) : 0}%`;
  E.budgetBar.style.background = metrics.spending > budgetValue && budgetValue ? 'var(--bad)' : 'var(--blue)';
  E.budgetText.textContent = budgetValue
    ? (metrics.spending <= budgetValue ? `${euro(budgetValue - metrics.spending)} disponibles` : `Dépassement de ${euro(metrics.spending - budgetValue)}`)
    : 'Définissez un plafond.';
  draw();
}

function toggleCategoryDetails(event) {
  const button = event.target.closest('[data-toggle-category]');
  if (!button) return;
  const details = $(button.dataset.toggleCategory);
  const opened = details.style.display !== 'none';
  details.style.display = opened ? 'none' : 'block';
  const bold = button.querySelector('b');
  if (bold) bold.textContent = bold.textContent.replace(opened ? '▼' : '▶', opened ? '▶' : '▼');
}

function renderComparison() {
  const container = $('comparisonContent');
  if (!container) return;
  const current = getMetrics(tx), previous = getMetrics(comparisonTx);
  const rows = [
    ['Revenus', current.income, previous.income],
    ['Dépenses', current.spending, previous.spending],
    ['Épargne', current.savings, previous.savings],
    ['Solde', current.balance, previous.balance]
  ];
  const currentLabel = E.month.options[E.month.selectedIndex]?.text || E.month.value;
  const comparisonSelect = $('comparisonMonth');
  const previousLabel = comparisonSelect.options[comparisonSelect.selectedIndex]?.text || comparisonSelect.value;
  container.innerHTML = `<p class="note">${esc(currentLabel)} comparé à ${esc(previousLabel)}</p>
    <div style="overflow:auto"><table><thead><tr><th>Indicateur</th><th>${esc(currentLabel)}</th><th>${esc(previousLabel)}</th><th>Écart</th></tr></thead><tbody>
    ${rows.map(([label, currentValue, previousValue]) => {
      const difference = currentValue - previousValue;
      return `<tr><td><b>${label}</b></td><td>${euro(currentValue)}</td><td>${euro(previousValue)}</td><td class="${difference >= 0 ? 'good' : 'bad'}">${difference >= 0 ? '+' : ''}${euro(difference)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function draw() {
  const canvas = E.chart;
  const g = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 46;
  const selectedMonth = new Date(`${E.month.value}-01T12:00:00`);
  const days = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0
  ).getDate();

  const dailyNet = Array(days).fill(0);

  tx.forEach(item => {
    const dayIndex = Number(item.tx_date.slice(8, 10)) - 1;
    const amount = Number(item.amount);

    if (item.tx_type === 'income') {
      dailyNet[dayIndex] += amount;
    } else {
      dailyNet[dayIndex] -= amount;
    }
  });

  const cumulative = [];
  let runningBalance = 0;

  for (let index = 0; index < days; index += 1) {
    runningBalance += dailyNet[index];
    cumulative.push(runningBalance);
  }

  const minimum = Math.min(0, ...cumulative);
  const maximum = Math.max(1, ...cumulative);
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;

  g.clearRect(0, 0, width, height);

  // Grille horizontale et valeurs de référence.
  g.font = '11px Segoe UI';
  g.textAlign = 'right';

  for (let step = 0; step <= 4; step += 1) {
    const ratio = step / 4;
    const value = maximum - ratio * (maximum - minimum);
    const y = padding + ratio * plotHeight;

    g.strokeStyle = '#e5e7eb';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(padding, y);
    g.lineTo(width - padding, y);
    g.stroke();

    g.fillStyle = '#6b7280';
    g.fillText(euro(value), padding - 8, y + 4);
  }

  // Courbe du solde cumulé.
  g.strokeStyle = '#2563eb';
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();

  cumulative.forEach((value, index) => {
    const x = padding + index * plotWidth / Math.max(1, days - 1);
    const y = padding + (maximum - value) / (maximum - minimum) * plotHeight;

    if (index === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });

  g.stroke();

  // Repères de jours.
  g.fillStyle = '#6b7280';
  g.textAlign = 'center';
  [1, 5, 10, 15, 20, 25, days]
    .filter((day, index, values) => day <= days && values.indexOf(day) === index)
    .forEach(day => {
      const x = padding + (day - 1) * plotWidth / Math.max(1, days - 1);
      g.fillText(String(day), x, height - 15);
    });

  // Légende simple.
  g.fillStyle = '#2563eb';
  g.fillRect(padding, 12, 14, 4);
  g.fillStyle = '#374151';
  g.textAlign = 'left';
  g.fillText('Solde cumulé', padding + 20, 18);
}
function exportJson() {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([
    JSON.stringify({ transactions: tx, budget: budgetValue, rules: categoryRules }, null, 2)
  ], { type: 'application/json' }));
  link.download = `budget-${E.month.value}.json`;
  link.click();
}

boot();
