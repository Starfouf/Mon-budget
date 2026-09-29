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
  auth: $('auth'), authForm: $('authForm'), email: $('email'),
  password: $('password'), signup: $('signup'), authMsg: $('authMsg'),
  logout: $('logout'), status: $('status'), month: $('month'), add: $('add'),
  rulesBtn: $('rulesBtn'), refresh: $('refresh'), income: $('income'),
  expense: $('expense'), balance: $('balance'), rate: $('rate'), rows: $('rows'),
  categories: $('categories'), chart: $('chart'), budget: $('budget'),
  saveBudget: $('saveBudget'), budgetBar: $('budgetBar'),
  budgetText: $('budgetText'), exportBtn: $('export'), modal: $('modal'),
  txForm: $('txForm'), cancel: $('cancel'), type: $('type'), date: $('date'),
  label: $('label'), category: $('category'), amount: $('amount'),
  rulesModal: $('rulesModal'), ruleForm: $('ruleForm'), ruleId: $('ruleId'),
  ruleKeyword: $('ruleKeyword'), ruleCategory: $('ruleCategory'),
  rulesList: $('rulesList'), saveRule: $('saveRule'),
  cancelRuleEdit: $('cancelRuleEdit'), closeRules: $('closeRules')
};

const euro = n => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR'
}).format(n || 0);

const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const normalize = s => String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

function detectCategory(label) {
  const value = normalize(label);
  const keywords = Object.keys(AUTO_CATEGORIES)
    .sort((a, b) => b.length - a.length);

  for (const keyword of keywords) {
    if (value.includes(keyword)) return AUTO_CATEGORIES[keyword];
  }
  return '';
}

async function loadCategoryRules() {
  if (!user) return;

  const { data, error } = await db
    .from('category_rules')
    .select('id,user_id,keyword,category,created_at')
    .order('keyword');

  if (error) {
    console.error('Erreur chargement règles :', error);
    alert(error.message);
    return;
  }

  categoryRules = data || [];
  AUTO_CATEGORIES = {};

  categoryRules
    .filter(rule => !rule.user_id)
    .forEach(rule => {
      AUTO_CATEGORIES[normalize(rule.keyword)] = rule.category;
    });

  categoryRules
    .filter(rule => rule.user_id === user.id)
    .forEach(rule => {
      AUTO_CATEGORIES[normalize(rule.keyword)] = rule.category;
    });

  renderRules();
}

async function suggestRule(label, category) {
  const normalizedLabel = normalize(label);

  if (!normalizedLabel || detectCategory(normalizedLabel)) return;

  const defaultKeyword = normalizedLabel.split(/\s+/)[0];
  const proposedKeyword = prompt(
    `Créer une règle automatique pour « ${label} » ?\n\n` +
    `Modifiez le mot-clé si nécessaire, puis validez.\n` +
    `Catégorie : ${category}`,
    defaultKeyword
  );

  if (proposedKeyword === null) return;

  const keyword = normalize(proposedKeyword);
  if (!keyword) return;

  if (AUTO_CATEGORIES[keyword]) {
    alert(`Une règle existe déjà pour « ${keyword} » : ${AUTO_CATEGORIES[keyword]}.`);
    return;
  }

  const { error } = await db
    .from('category_rules')
    .insert({ user_id: user.id, keyword, category });

  if (error) {
    const message = String(error.message || '');
    if (message.toLowerCase().includes('duplicate')) {
      alert(`Une règle existe déjà pour « ${keyword} ».`);
      return;
    }
    alert(message);
    return;
  }

  await loadCategoryRules();
}

function initMonths() {
  for (let i = -18; i <= 3; i += 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    E.month.add(new Option(
      d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      value, i === 0, i === 0
    ));
  }

  const options = CATS
    .map(category => `<option value="${esc(category)}">${esc(category)}</option>`)
    .join('');

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
    E.modal.classList.add('show');
  };

  E.cancel.onclick = () => E.modal.classList.remove('show');
  E.txForm.onsubmit = addTx;
  E.rows.onclick = deleteTx;
  E.saveBudget.onclick = saveBudget;
  E.exportBtn.onclick = exportJson;

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

  E.modal.onclick = event => {
    if (event.target === E.modal) E.modal.classList.remove('show');
  };

  E.rulesModal.onclick = event => {
    if (event.target === E.rulesModal) E.rulesModal.classList.remove('show');
  };
}

async function boot() {
  initMonths();
  bind();

  if (!configured) {
    E.authMsg.textContent = 'Configurez config.js puis publiez le dossier.';
    return;
  }

  const { data } = await db.auth.getSession();
  if (data.session) await signedIn(data.session.user);

  db.auth.onAuthStateChange((_event, session) => {
    if (session) signedIn(session.user);
    else signedOut();
  });
}

async function login(event) {
  event.preventDefault();
  msg('Connexion…');
  const { error } = await db.auth.signInWithPassword({
    email: E.email.value,
    password: E.password.value
  });
  msg(error ? error.message : '');
}

async function signup() {
  msg('Création…');
  const { error } = await db.auth.signUp({
    email: E.email.value,
    password: E.password.value
  });
  msg(error ? error.message : 'Compte créé. Vérifiez éventuellement votre e-mail, puis connectez-vous.');
}

function msg(text) {
  E.authMsg.textContent = text;
}

async function signedIn(currentUser) {
  user = currentUser;
  E.auth.classList.remove('show');
  E.logout.style.display = '';
  E.status.textContent = currentUser.email;
  await loadCategoryRules();
  await loadData();
}

function signedOut() {
  user = null;
  tx = [];
  categoryRules = [];
  AUTO_CATEGORIES = {};
  E.auth.classList.add('show');
  E.logout.style.display = 'none';
  E.status.textContent = 'Déconnecté';
}

async function loadData() {
  if (!user) return;

  E.status.textContent = 'Synchronisation…';
  const start = `${E.month.value}-01`;
  const firstDay = new Date(`${start}T12:00:00`);
  const end = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 1)
    .toISOString().slice(0, 10);

  const [transactionsResult, budgetResult] = await Promise.all([
    db.from('transactions').select('*')
      .gte('tx_date', start).lt('tx_date', end)
      .order('tx_date', { ascending: false }),
    db.from('monthly_budgets').select('amount')
      .eq('month', start).maybeSingle()
  ]);

  if (transactionsResult.error || budgetResult.error) {
    alert((transactionsResult.error || budgetResult.error).message);
    E.status.textContent = 'Erreur';
    return;
  }

  tx = transactionsResult.data || [];
  budgetValue = Number(budgetResult.data?.amount || 0);
  localStorage.setItem('budget-cache', JSON.stringify({
    month: E.month.value, tx, budgetValue
  }));
  E.status.textContent = 'Synchronisé';
  render();
}

async function addTx(event) {
  event.preventDefault();

  const row = {
    user_id: user.id,
    tx_date: E.date.value,
    tx_type: E.type.value,
    label: E.label.value.trim(),
    category: E.category.value,
    amount: Number(E.amount.value)
  };

  const { error } = await db.from('transactions').insert(row);

  if (error) {
    alert(error.message);
    return;
  }

  E.modal.classList.remove('show');

  if (row.tx_type === 'expense') {
    await suggestRule(row.label, row.category);
  }

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
  E.ruleForm.reset();
  E.ruleId.value = '';
  E.saveRule.textContent = 'Ajouter la règle';
  E.cancelRuleEdit.style.display = 'none';
}

function renderRules() {
  if (!E.rulesList) return;

  E.rulesList.innerHTML = categoryRules.length
    ? categoryRules.map(rule => {
        const own = rule.user_id === user?.id;
        return `<div class="rule-row">
          <div><b>${esc(rule.keyword)}</b><br><span class="badge">${own ? 'Personnelle' : 'Globale'}</span></div>
          <div class="rule-category">${esc(rule.category)}</div>
          <div>${own
            ? `<button data-edit-rule="${rule.id}" title="Modifier">✏️</button>
               <button class="danger" data-delete-rule="${rule.id}" title="Supprimer">🗑️</button>`
            : '🔒'}</div>
        </div>`;
      }).join('')
    : '<div class="empty">Aucune règle</div>';
}

async function saveCategoryRule(event) {
  event.preventDefault();
  const keyword = normalize(E.ruleKeyword.value);
  const category = E.ruleCategory.value;
  const id = E.ruleId.value;
  if (!keyword) return;

  const result = id
    ? await db.from('category_rules').update({ keyword, category })
        .eq('id', id).eq('user_id', user.id)
    : await db.from('category_rules').insert({ user_id: user.id, keyword, category });

  if (result.error) {
    return alert(String(result.error.message).toLowerCase().includes('duplicate')
      ? 'Ce mot-clé existe déjà.'
      : result.error.message);
  }

  resetRuleForm();
  await loadCategoryRules();
}

async function handleRuleAction(event) {
  const editButton = event.target.closest('[data-edit-rule]');
  const deleteButton = event.target.closest('[data-delete-rule]');

  if (editButton) {
    const rule = categoryRules.find(item => item.id === editButton.dataset.editRule);
    if (!rule) return;
    E.ruleId.value = rule.id;
    E.ruleKeyword.value = rule.keyword;
    E.ruleCategory.value = rule.category;
    E.saveRule.textContent = 'Enregistrer';
    E.cancelRuleEdit.style.display = '';
    E.ruleKeyword.focus();
  }

  if (deleteButton && confirm('Supprimer cette règle ?')) {
    const { error } = await db.from('category_rules').delete()
      .eq('id', deleteButton.dataset.deleteRule)
      .eq('user_id', user.id);
    if (error) return alert(error.message);
    await loadCategoryRules();
  }
}

function render() {
  const income = tx.filter(item => item.tx_type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = tx.filter(item => item.tx_type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expenses;

  E.income.textContent = euro(income);
  E.expense.textContent = euro(expenses);
  E.balance.textContent = euro(balance);
  E.balance.className = balance >= 0 ? 'good' : 'bad';
  E.rate.textContent = income ? `${Math.round(balance / income * 100)} %` : '0 %';

  E.rows.innerHTML = tx.length
    ? tx.map(item => `<tr>
        <td>${new Date(`${item.tx_date}T12:00`).toLocaleDateString('fr-FR')}</td>
        <td>${esc(item.label)}</td>
        <td><span class="pill">${esc(item.category)}</span></td>
        <td class="amount ${item.tx_type === 'income' ? 'good' : 'bad'}">${item.tx_type === 'income' ? '+' : '-'}${euro(item.amount)}</td>
        <td><button class="danger" data-id="${item.id}">×</button></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="empty">Aucune opération</td></tr>';

  const byCategory = {};
  tx.filter(item => item.tx_type === 'expense').forEach(item => {
    byCategory[item.category] = (byCategory[item.category] || 0) + Number(item.amount);
  });

  E.categories.innerHTML = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, value]) => `<p><b>${esc(category)}</b><span style="float:right">${euro(value)}</span></p><div class="bar"><i style="width:${expenses ? value / expenses * 100 : 0}%"></i></div>`)
    .join('') || '<div class="empty">Aucune dépense</div>';

  E.budget.value = budgetValue || '';
  E.budgetBar.style.width = `${budgetValue ? Math.min(100, expenses / budgetValue * 100) : 0}%`;
  E.budgetBar.style.background = expenses > budgetValue && budgetValue ? 'var(--bad)' : 'var(--blue)';
  E.budgetText.textContent = budgetValue
    ? (expenses <= budgetValue ? `${euro(budgetValue - expenses)} disponibles` : `Dépassement de ${euro(expenses - budgetValue)}`)
    : 'Définissez un plafond.';
  draw();
}

function draw() {
  const canvas = E.chart;
  const g = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height, padding = 34;
  const firstDay = new Date(`${E.month.value}-01T12:00`);
  const days = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const values = [];
  let running = 0;

  for (let day = 1; day <= days; day += 1) {
    tx.filter(item => Number(item.tx_date.slice(8, 10)) === day)
      .forEach(item => running += item.tx_type === 'income' ? Number(item.amount) : -Number(item.amount));
    values.push(running);
  }

  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  g.clearRect(0, 0, width, height);
  g.strokeStyle = '#e5e7eb';
  g.beginPath(); g.moveTo(padding, height - padding); g.lineTo(width - padding, height - padding); g.stroke();
  g.strokeStyle = '#2563eb'; g.lineWidth = 3; g.beginPath();
  values.forEach((value, index) => {
    const x = padding + index * (width - 2 * padding) / Math.max(1, days - 1);
    const y = height - padding - (value - min) / (max - min) * (height - 2 * padding);
    if (index) g.lineTo(x, y); else g.moveTo(x, y);
  });
  g.stroke();
  g.fillStyle = '#6b7280'; g.font = '12px Segoe UI';
  g.fillText(euro(max), 3, 14); g.fillText(euro(min), 3, height - 8);
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
