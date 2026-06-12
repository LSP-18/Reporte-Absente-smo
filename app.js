/**
 * SHOPEE RH DASHBOARD - APP.JS
 * Aplicação completa de gestão de recursos humanos
 * 
 * Adaptado para a estrutura real do Firebase do utilizador
 * Mapeia campos reais para campos esperados
 */

'use strict';

// ====== CONSTANTES ======
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SHOPEE = '#EE4D2D';
const INFO = '#3B82F6';
const SUCCESS = '#10B981';
const WARN = '#F59E0B';
const ERROR = '#EF4444';

// Configurar defaults do Chart.js
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B7280';

// ====== CHART MANAGER ======
const Charts = {};

function makeChart(id, config) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Elemento de chart não encontrado: ${id}`);
    return null;
  }
  
  if (Charts[id]) {
    Charts[id].destroy();
  }
  
  try {
    Charts[id] = new Chart(el, config);
    return Charts[id];
  } catch (e) {
    console.error(`Erro ao criar chart ${id}:`, e);
    return null;
  }
}

// ====== ADAPTADOR DE DADOS ======
/**
 * Converte dados do Firebase para formato esperado
 */
const DataAdapter = {
  // Converte atestados e faltas para faltas
  atestadosParaFaltas(atestados, faltas) {
    const resultado = [];
    
    // Processar atestados
    if (atestados && typeof atestados === 'object') {
      Object.entries(atestados).forEach(([id, doc]) => {
        resultado.push({
          _id: id,
          colaborador: doc.employeeName || doc.colaborador || '-',
          data: this.converterData(doc.date || doc.data),
          tipo: doc.type || doc.tipo || 'Atestado',
          observacao: doc.observacao || '',
          status: doc.status || 'Pendente',
          leader: doc.leader || '',
          turno: doc.turno || '',
          employeeCode: doc.employeeCode || ''
        });
      });
    }
    
    // Processar faltas
    if (faltas && typeof faltas === 'object') {
      Object.entries(faltas).forEach(([id, doc]) => {
        resultado.push({
          _id: id,
          colaborador: doc.employeeName || doc.colaborador || '-',
          data: this.converterData(doc.date || doc.data),
          tipo: doc.type || doc.tipo || 'Falta',
          observacao: doc.observacao || '',
          status: doc.status || 'Pendente',
          leader: doc.leader || '',
          turno: doc.turno || '',
          employeeCode: doc.employeeCode || ''
        });
      });
    }
    
    return resultado;
  },

  // Converte admissões para colaboradores
  admissoesParaColaboradores(admissoes) {
    if (!admissoes || typeof admissoes !== 'object') return [];
    return Object.entries(admissoes).map(([id, doc]) => ({
      _id: id,
      nome: doc.nome || '-',
      matricula: doc.matricula || '-',
      cargo: doc.cargo || '-',
      gestor: doc.gesto || doc.gestor || '-',
      admissao: doc.admissao || '',
      turno: doc.turno || '',
      status: doc.status || 'Ativo'
    }));
  },

  // Converte entrevistas
  entrevistasParaEntrevistas(entrevistas) {
    if (!entrevistas || typeof entrevistas !== 'object') return [];
    return Object.entries(entrevistas).map(([id, doc]) => ({
      _id: id,
      colaborador: doc.colaborador || '-',
      data: this.converterData(doc.data),
      motivo: doc.motivo || '',
      plano_acao: doc.plano_acao || '',
      status: doc.status || 'Pendente'
    }));
  },

  // Converte medidas disciplinares
  medidasParaMedidas(medidas) {
    if (!medidas || typeof medidas !== 'object') return [];
    return Object.entries(medidas).map(([id, doc]) => ({
      _id: id,
      colaborador: doc.colaborador || '-',
      data: this.converterData(doc.data),
      tipo: doc.tipo || '',
      motivo: doc.motivo || '',
      observacao: doc.observacao || ''
    }));
  },

  // Converte suspensões
  suspensoesParaSuspensoes(suspensoes) {
    if (!suspensoes || typeof suspensoes !== 'object') return [];
    return Object.entries(suspensoes).map(([id, doc]) => ({
      _id: id,
      colaborador: doc.colaborador || '-',
      data: this.converterData(doc.data),
      dias: doc.dias || 0,
      motivo: doc.motivo || '',
      observacao: doc.observacao || ''
    }));
  },

  // Converte sinergia
  sinergiaParaSinergia(sinergia) {
    if (!sinergia || typeof sinergia !== 'object') return [];
    return Object.entries(sinergia).map(([id, doc]) => ({
      _id: id,
      colaborador: doc.colaborador || '-',
      data_entrada: this.converterData(doc.data_entrada),
      categoria: doc.categoria || 'S1',
      status: doc.status || 'Ativo',
      observacao: doc.observacao || ''
    }));
  },

  // Converte data de DD/MM/YYYY para YYYY-MM-DD
  converterData(data) {
    if (!data) return '';
    
    // Se já está em YYYY-MM-DD, retorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
    
    // Se está em DD/MM/YYYY, converte
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes}-${dia}`;
    }
    
    return data;
  }
};

// ====== UTILITY FUNCTIONS ======

/**
 * Converte objeto do Firebase em array com ID
 */
function toArr(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([id, val]) => ({ ...val, _id: id }));
}

/**
 * Formata data para exibição
 */
function fmtDate(d) {
  if (!d) return '-';
  try {
    // Se está em DD/MM/YYYY, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
    
    // Se está em YYYY-MM-DD, converte
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt) ? d : dt.toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

/**
 * Calcula contagem mensal de registros
 */
function monthlyCount(records, dateField = 'data') {
  const counts = new Array(12).fill(0);
  (records || []).forEach(r => {
    try {
      let dateStr = r[dateField];
      if (!dateStr) return;
      
      // Converte DD/MM/YYYY para YYYY-MM-DD se necessário
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [dia, mes, ano] = dateStr.split('/');
        dateStr = `${ano}-${mes}-${dia}`;
      }
      
      const d = new Date(dateStr + 'T00:00:00');
      if (!isNaN(d)) counts[d.getMonth()]++;
    } catch {
      // Ignorar datas inválidas
    }
  });
  return counts;
}

/**
 * Gera dados de ranking
 */
function rankingData(records, nameField = 'colaborador', top = 10) {
  const counts = {};
  (records || []).forEach(r => {
    const k = r[nameField] || 'N/A';
    counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);
}

/**
 * Validação de email
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validação de data
 */
function isValidDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d);
}

// ====== TOAST NOTIFICATIONS ======
function toast(msg, type = 'success') {
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };
  
  const container = document.getElementById('toast-container');
  if (!container) {
    console.error('Toast container não encontrado');
    return;
  }
  
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.success}"></i>
    <span class="toast-text">${msg}</span>
    <button class="toast-close" onclick="this.parentNode.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ====== LOADING STATE ======
const Loading = {
  show() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('show');
  },
  
  hide() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('show');
  }
};

// ====== PAGINATION TABLE ======
class PaginatedTable {
  constructor(tbodyId, paginId, rowsPerPage = 12) {
    this.tbodyId = tbodyId;
    this.paginId = paginId;
    this.rpp = rowsPerPage;
    this.page = 1;
    this.data = [];
    this.filtered = [];
    this.renderer = null;
  }

  setData(data, renderer) {
    this.data = Array.isArray(data) ? data : [];
    this.filtered = [...this.data];
    this.renderer = renderer;
    this.page = 1;
    this.render();
  }

  filter(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.filtered = [...this.data];
    } else {
      this.filtered = this.data.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(q))
      );
    }
    this.page = 1;
    this.render();
  }

  render() {
    const tbody = document.getElementById(this.tbodyId);
    const pagin = document.getElementById(this.paginId);
    
    if (!tbody) {
      console.warn(`Tbody não encontrado: ${this.tbodyId}`);
      return;
    }

    const total = this.filtered.length;
    const pages = Math.max(1, Math.ceil(total / this.rpp));
    this.page = Math.min(this.page, pages);
    const start = (this.page - 1) * this.rpp;
    const slice = this.filtered.slice(start, start + this.rpp);

    if (slice.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state">
              <i class="fa-solid fa-inbox"></i>
              <h3>Nenhum registro encontrado</h3>
              <p>Adicione um novo registro ou ajuste o filtro.</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = slice.map(r => this.renderer(r)).join('');
    }

    if (pagin) {
      const btns = [];
      for (let i = 1; i <= Math.min(pages, 10); i++) {
        btns.push(`
          <button class="${i === this.page ? 'active' : ''}" 
                  onclick="window._tableGoTo('${this.tbodyId}',${i})">
            ${i}
          </button>
        `);
      }
      
      pagin.innerHTML = `
        <span class="pagination-info">
          Mostrando ${Math.min(start + 1, total)}–${Math.min(start + this.rpp, total)} de ${total}
        </span>
        <div class="pagination-btns">${btns.join('')}</div>
      `;
    }
  }

  goTo(p) {
    this.page = p;
    this.render();
  }
}

// Função global para navegação de tabelas
window._tableGoTo = (id, page) => {
  if (App.tables[id]) App.tables[id].goTo(page);
};

// ====== APP CORE ======
const App = {
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  darkMode: false,
  tables: {},
  listeners: [],

  init() {
    if (!Auth.isLoggedIn()) return;
    this.showApp();
  },

  login() {
    const email = document.getElementById('login-email')?.value.trim();
    const pass = document.getElementById('login-password')?.value.trim();
    
    if (!email || !pass) {
      toast('Preencha email e senha', 'warning');
      return;
    }
    
    const result = Auth.login(email, pass);
    if (result.success) {
      this.showApp();
    } else {
      toast(result.error || 'Erro ao fazer login', 'error');
    }
  },

  showApp() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    
    const loginScreen = document.getElementById('login-screen');
    const appEl = document.getElementById('app');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appEl) appEl.style.display = 'block';
    
    // Atualizar informações do usuário
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    const cfgEmailEl = document.getElementById('cfg-email');
    const cfgNameEl = document.getElementById('cfg-name');
    
    if (userNameEl) userNameEl.textContent = user.name || user.email;
    if (userAvatarEl) userAvatarEl.textContent = (user.name || user.email).charAt(0).toUpperCase();
    if (cfgEmailEl) cfgEmailEl.value = user.email;
    if (cfgNameEl) cfgNameEl.value = user.name || '';

    // Restaurar tema
    if (localStorage.getItem('shopee_dark') === '1') this.toggleDark(true);

    // Inicializar tabelas
    this.tables['faltas-tbody'] = new PaginatedTable('faltas-tbody', 'faltas-pagination');
    this.tables['entrevistas-tbody'] = new PaginatedTable('entrevistas-tbody', 'entrevistas-pagination');
    this.tables['medidas-tbody'] = new PaginatedTable('medidas-tbody', 'medidas-pagination');
    this.tables['suspensoes-tbody'] = new PaginatedTable('suspensoes-tbody', 'suspensoes-pagination');
    this.tables['sinergia-tbody'] = new PaginatedTable('sinergia-tbody', 'sinergia-pagination');
    this.tables['colaboradores-tbody'] = new PaginatedTable('colaboradores-tbody', 'colaboradores-pagination');
    this.tables['abs-diario-tbody'] = new PaginatedTable('abs-diario-tbody', 'abs-diario-pagination');

    // Definir data padrão
    document.querySelectorAll('input[type=date]').forEach(el => {
      if (!el.value) el.value = new Date().toISOString().split('T')[0];
    });

    // Navegar para dashboard
    this.navigate('dashboard');

    // Iniciar listeners em tempo real
    this.startListeners();
  },

  logout() {
    this.listeners.forEach(id => clearInterval(id));
    Auth.logout();
    location.reload();
  },

  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const pageEl = document.getElementById('page-' + page);
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    
    if (pageEl) pageEl.classList.add('active');
    if (navEl) navEl.classList.add('active');
    
    const titles = {
      dashboard: 'Dashboard Executivo',
      faltas: 'Faltas e Atestados',
      entrevistas: 'Entrevistas ABS',
      medidas: 'Medidas Disciplinares',
      suspensoes: 'Suspensões',
      sinergia: 'Sinergia S1/S2',
      colaboradores: 'Colaboradores',
      configuracoes: 'Configurações'
    };
    
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = titles[page] || page;
    
    this.currentPage = page;
    Pages[page]?.load();

    // Fechar sidebar em mobile
    if (window.innerWidth <= 768) {
      this.toggleSidebar(true);
    }
  },

  toggleSidebar(close = false) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    
    if (close) {
      sidebar.classList.remove('collapsed');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  },

  toggleDark(force = null) {
    const isDark = force !== null ? force : localStorage.getItem('shopee_dark') !== '1';
    const html = document.documentElement;
    
    if (isDark) {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('shopee_dark', '1');
      document.getElementById('dark-toggle').innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      html.removeAttribute('data-theme');
      localStorage.setItem('shopee_dark', '0');
      document.getElementById('dark-toggle').innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  },

  startListeners() {
    const paths = ['atestados', 'admissoes', 'entrevistas_abs', 'medidas_disciplinares', 'suspensoes', 'sinergia'];
    
    paths.forEach(path => {
      const id = Firebase.listen(path, () => {
        if (this.currentPage === 'dashboard') Pages.dashboard?.load();
      }, 10000);
      
      this.listeners.push(id);
    });
  },

  exportExcel() {
    toast('Funcionalidade em desenvolvimento', 'info');
  },

  exportPDF() {
    toast('Funcionalidade em desenvolvimento', 'info');
  }
};

// ====== MODALS ======
const Modals = {
  open(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      this.populateColaboradores();
    }
  },

  close(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  },

  async populateColaboradores() {
    try {
      const raw = await Firebase.get('colaboradores').catch(() => null);
      const cols = DataAdapter.admissoesParaColaboradores(raw).filter(c => c.status !== 'Inativo');
      const opts = cols.length
        ? cols.map(c => `<option value="${c.nome || ''}">${c.nome || 'Sem nome'}</option>`).join('')
        : '<option value="">-- Nenhum colaborador cadastrado --</option>';

      document.querySelectorAll('select[id$="-colaborador"]').forEach(sel => {
        const cur = sel.value;
        sel.innerHTML = opts;
        if (cur) sel.value = cur;
      });
    } catch (e) {
      console.error('Erro ao popular colaboradores:', e);
    }
  },

  confirmDelete(path, id, callback) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    
    Loading.show();
    Firebase.delete(path, id)
      .then(() => {
        toast('Registro excluído com sucesso!', 'success');
        if (callback) callback();
      })
      .catch(e => toast('Erro ao excluir: ' + e.message, 'error'))
      .finally(() => Loading.hide());
  },

  // ---- Ocorrência ----
  openOcorrencia(id) {
    const idEl = document.getElementById('ocorrencia-id');
    const titleEl = document.getElementById('modal-ocorrencia-title');
    const dataEl = document.getElementById('ocorrencia-data');
    const obsEl = document.getElementById('ocorrencia-obs');
    
    if (idEl) idEl.value = id || '';
    if (titleEl) titleEl.textContent = id ? 'Editar Ocorrência' : 'Adicionar Ocorrência';
    if (!id) {
      if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
      if (obsEl) obsEl.value = '';
    }
    this.open('modal-ocorrencia');
  },

  async saveOcorrencia() {
    const id = document.getElementById('ocorrencia-id')?.value;
    const colaborador = document.getElementById('ocorrencia-colaborador')?.value;
    const data = document.getElementById('ocorrencia-data')?.value;
    const tipo = document.getElementById('ocorrencia-tipo')?.value;
    const observacao = document.getElementById('ocorrencia-obs')?.value;
    
    if (!colaborador || !data) {
      toast('Preencha os campos obrigatórios', 'warning');
      return;
    }
    
    if (!isValidDate(data)) {
      toast('Data inválida', 'warning');
      return;
    }

    Loading.show();
    try {
      const pathMap = {
        'Falta': 'atestados',
        'Atestado': 'atestados',
        'Afastamento': 'atestados',
        'Advertência Verbal': 'medidas_disciplinares',
        'Advertência Escrita': 'medidas_disciplinares',
        'Suspensão': 'suspensoes'
      };
      
      const path = pathMap[tipo] || 'atestados';
      const payload = { colaborador, data, tipo, observacao };
      
      if (id) {
        await Firebase.put(path, id, payload);
      } else {
        await Firebase.post(path, payload);
      }
      
      this.close('modal-ocorrencia');
      toast('Ocorrência salva com sucesso!', 'success');
      Pages[App.currentPage]?.load();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    } finally {
      Loading.hide();
    }
  },

  // ---- Falta ----
  openFalta(id, record) {
    const idEl = document.getElementById('falta-id');
    const titleEl = document.getElementById('modal-falta-title');
    const dataEl = document.getElementById('falta-data');
    const tipoEl = document.getElementById('falta-tipo');
    const obsEl = document.getElementById('falta-obs');
    const colab = document.getElementById('falta-colaborador');
    const turnoEl = document.getElementById('falta-turno');
    
    if (idEl) idEl.value = id || '';
    if (titleEl) titleEl.textContent = id ? 'Editar Registro' : 'Adicionar Falta/Atestado';
    
    if (record) {
      if (dataEl) dataEl.value = record.data || '';
      if (tipoEl) tipoEl.value = record.tipo || 'Falta';
      if (obsEl) obsEl.value = record.observacao || '';
      if (turnoEl) turnoEl.value = record.turno || '';
      this.open('modal-falta');
      setTimeout(() => {
        if (colab) colab.value = record.colaborador || '';
      }, 100);
    } else {
      if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
      if (obsEl) obsEl.value = '';
      if (turnoEl) turnoEl.value = '';
      this.open('modal-falta');
    }
  },

  async saveFalta() {
    const id = document.getElementById('falta-id')?.value;
    const colaborador = document.getElementById('falta-colaborador')?.value;
    const data = document.getElementById('falta-data')?.value;
    const tipo = document.getElementById('falta-tipo')?.value;
    const observacao = document.getElementById('falta-obs')?.value;
    const turno = document.getElementById('falta-turno')?.value || '';
    
    if (!colaborador || !data) {
      toast('Preencha os campos obrigatórios', 'warning');
      return;
    }
    
    if (!isValidDate(data)) {
      toast('Data inválida', 'warning');
      return;
    }

    Loading.show();
    try {
      const payload = { colaborador, data, tipo, observacao, turno };
      if (id) {
        await Firebase.put('atestados', id, payload);
      } else {
        await Firebase.post('atestados', payload);
      }
      this.close('modal-falta');
      toast('Registro salvo!', 'success');
      Pages.faltas.load();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    } finally {
      Loading.hide();
    }
  },

  // ---- Entrevista ----
  openEntrevista(id, record) {
    const idEl = document.getElementById('entrevista-id');
    const titleEl = document.getElementById('modal-entrevista-title');
    const dataEl = document.getElementById('entrevista-data');
    const motivoEl = document.getElementById('entrevista-motivo');
    const planoEl = document.getElementById('entrevista-plano');
    const statusEl = document.getElementById('entrevista-status');
    const colab = document.getElementById('entrevista-colaborador');
    
    if (idEl) idEl.value = id || '';
    if (titleEl) titleEl.textContent = id ? 'Editar Entrevista' : 'Adicionar Entrevista ABS';
    
    if (record) {
      if (dataEl) dataEl.value = record.data || '';
      if (motivoEl) motivoEl.value = record.motivo || '';
      if (planoEl) planoEl.value = record.plano_acao || '';
      if (statusEl) statusEl.value = record.status || 'Pendente';
      this.open('modal-entrevista');
      setTimeout(() => {
        if (colab) colab.value = record.colaborador || '';
      }, 100);
    } else {
      if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
      if (motivoEl) motivoEl.value = '';
      if (planoEl) planoEl.value = '';
      if (statusEl) statusEl.value = 'Pendente';
      this.open('modal-entrevista');
    }
  },

  async saveEntrevista() {
    const id = document.getElementById('entrevista-id')?.value;
    const colaborador = document.getElementById('entrevista-colaborador')?.value;
    const data = document.getElementById('entrevista-data')?.value;
    const motivo = document.getElementById('entrevista-motivo')?.value;
    const plano_acao = document.getElementById('entrevista-plano')?.value;
    const status = document.getElementById('entrevista-status')?.value;
    
    if (!colaborador || !data) {
      toast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    Loading.show();
    try {
      const payload = { colaborador, data, motivo, plano_acao, status };
      if (id) {
        await Firebase.put('entrevistas_abs', id, payload);
      } else {
        await Firebase.post('entrevistas_abs', payload);
      }
      this.close('modal-entrevista');
      toast('Entrevista salva!', 'success');
      Pages.entrevistas.load();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    } finally {
      Loading.hide();
    }
  },

  // ---- Medida Disciplinar ----
  openMedida(id, record) {
    const idEl = document.getElementById('medida-id');
    const titleEl = document.getElementById('modal-medida-title');
    const dataEl = document.getElementById('medida-data');
    const tipoEl = document.getElementById('medida-tipo');
    const motivoEl = document.getElementById('medida-motivo');
    const obsEl = document.getElementById('medida-obs');
    const colab = document.getElementById('medida-colaborador');
    
    if (idEl) idEl.value = id || '';
    if (titleEl) titleEl.textContent = id ? 'Editar Medida' : 'Adicionar Medida Disciplinar';
    
    if (record) {
      if (dataEl) dataEl.value = record.data || '';
      if (tipoEl) tipoEl.value = record.tipo || '';
      if (motivoEl) motivoEl.value = record.motivo || '';
      if (obsEl) obsEl.value = record.observacao || '';
      this.open('modal-medida');
      setTimeout(() => {
        if (colab) colab.value = record.colaborador || '';
      }, 100);
    } else {
      if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
      if (motivoEl) motivoEl.value = '';
      if (obsEl) obsEl.value = '';
      this.open('modal-medida');
    }
  },

  async saveMedida() {
    const id = document.getElementById('medida-id')?.value;
    const colaborador = document.getElementById('medida-colaborador')?.value;
    const data = document.getElementById('medida-data')?.value;
    const tipo = document.getElementById('medida-tipo')?.value;
    const motivo = document.getElementById('medida-motivo')?.value;
    const observacao = document.getElementById('medida-obs')?.value;
    
    if (!colaborador || !data || !tipo) {
      toast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    Loading.show();
    try {
      const payload = { colaborador, data, tipo, motivo, observacao };
      if (id) {
        await Firebase.put('medidas_disciplinares', id, payload);
      } else {
        await Firebase.post('medidas_disciplinares', payload);
      }
      this.close('modal-medida');
      toast('Medida salva!', 'success');
      Pages.medidas.load();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    } finally {
      Loading.hide();
    }
  },

  // ---- Suspensão ----
  openSuspensao(id, record) {
    const idEl = document.getElementById('suspensao-id');
    const titleEl = document.getElementById('modal-suspensao-title');
    const dataEl = document.getElementById('suspensao-data');
    const diasEl = document.getElementById('suspensao-dias');
    const motivoEl = document.getElementById('suspensao-motivo');
    const obsEl = document.getElementById('suspensao-obs');
    const colab = document.getElementById('suspensao-colaborador');
    
    if (idEl) idEl.value = id || '';
    if (titleEl) titleEl.textContent = id ? 'Editar Suspensão' : 'Adicionar Suspensão';
    
    if (record) {
      if (dataEl) dataEl.value = record.data || '';
      if (diasEl) diasEl.value = record.dias || '';
      if (motivoEl) motivoEl.value = record.motivo || '';
      if (obsEl) obsEl.value = record.observacao || '';
      this.open('modal-suspensao');
      setTimeout(() => {
        if (colab) colab.value = record.colaborador || '';
      }, 100);
    } else {
      if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
      if (diasEl) diasEl.value = '';
      if (motivoEl) motivoEl.value = '';
      if (obsEl) obsEl.value = '';
      this.open('modal-suspensao');
    }
  },

  async saveSuspensao() {
    const id = document.getElementById('suspensao-id')?.value;
    const colaborador = document.getElementById('suspensao-colaborador')?.value;
    const data = document.getElementById('suspensao-data')?.value;
    const dias = parseInt(document.getElementById('suspensao-dias')?.value || 0);
    const motivo = document.getElementById('suspensao-motivo')?.value;
    const observacao = document.getElementById('suspensao-obs')?.value;
    
    if (!colaborador || !data || dias <= 0) {
      toast('Preencha os campos obrigatórios corretamente', 'warning');
      return;
    }

    Loading.show();
    try {
      const payload = { colaborador, data, dias, motivo, observacao };
      if (id) {
        await Firebase.put('suspensoes', id, payload);
      } else {
        await Firebase.post('suspensoes', payload);
      }
      this.close('modal-suspensao');
      toast('Suspensão salva!', 'success');
      Pages.suspensoes.load();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    } finally {
      Loading.hide();
    }
  },

  // ---- Sinergia ----
  openSinergia(id, record) {
    const idEl = document.getElementById('sinergia-id');
    const titleEl = document.getElementById('modal-sinergia-title');
    const dataEl = document.getElementById('sinergia-data');
    const catEl = document.getElementById('sinergia-categoria');
    const statusEl = document.getElementById('sinergia-status');
    const obsEl = document.getElementById('sinergia-obs');
    const colab = document.getElementById('sinergia-colaborador');
    
    if (idEl) idEl.value = id || '';
    if (titleEl) titleEl.textContent = id ? 'Editar Sinergia' : 'Adicionar Sinergia';
    
    if (record) {
      if (dataEl) dataEl.value = record.data_entrada || '';
      if (catEl) catEl.value = record.categoria || 'S1';
      if (statusEl) statusEl.value = record.status || 'Ativo';
      if (obsEl) obsEl.value = record.observacao || '';
      this.open('modal-sinergia');
      setTimeout(() => {
        if (colab) colab.value = record.colaborador || '';
      }, 100);
    } else {
      if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
      if (catEl) catEl.value = 'S1';
      if (statusEl) statusEl.value = 'Ativo';
      if (obsEl) obsEl.value = '';
      this.open('modal-sinergia');
    }
  },

  async saveSinergia() {
    const id = document.getElementById('sinergia-id')?.value;
    const colaborador = document.getElementById('sinergia-colaborador')?.value;
    const data_entrada = document.getElementById('sinergia-data')?.value;
    const categoria = document.getElementById('sinergia-categoria')?.value;
    const status = document.getElementById('sinergia-status')?.value;
    const observacao = document.getElementById('sinergia-obs')?.value;
    
    if (!colaborador || !data_entrada) {
      toast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    Loading.show();
    try {
      const payload = { colaborador, data_entrada, categoria, status, observacao };
      if (id) {
        await Firebase.put('sinergia', id, payload);
      } else {
        await Firebase.post('sinergia', payload);
      }
      this.close('modal-sinergia');
      toast('Sinergia salva!', 'success');
      Pages.sinergia.load();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    } finally {
      Loading.hide();
    }
  },

  // ---- Colaborador ----
  openColaborador(id, record) {
    const idEl = document.getElementById('colaborador-id');
    const titleEl = document.getElementById('modal-colaborador-title');
    const nomeEl = document.getElementById('col-nome');
    const matriculaEl = document.getElementById('col-matricula');
    const cargoEl = document.getElementById('col-cargo-input');
    const gestorEl = document.getElementById('col-gestor-input');
    const admissaoEl = document.getElementById('col-admissao');
    const statusEl = document.getElementById('col-status-input');
    
    if (idEl) idEl.value = id || '';
    if (titleEl) titleEl.textContent = id ? 'Editar Colaborador' : 'Adicionar Colaborador';
    
    if (record) {
      if (nomeEl) nomeEl.value = record.nome || '';
      if (matriculaEl) matriculaEl.value = record.matricula || '';
      if (cargoEl) cargoEl.value = record.cargo || '';
      if (gestorEl) gestorEl.value = record.gestor || '';
      if (admissaoEl) admissaoEl.value = record.admissao || '';
      if (statusEl) statusEl.value = record.status || 'Ativo';
    } else {
      if (nomeEl) nomeEl.value = '';
      if (matriculaEl) matriculaEl.value = '';
      if (cargoEl) cargoEl.value = '';
      if (gestorEl) gestorEl.value = '';
      if (admissaoEl) admissaoEl.value = new Date().toISOString().split('T')[0];
      if (statusEl) statusEl.value = 'Ativo';
    }
    this.open('modal-colaborador');
  },

  async saveColaborador() {
    const id = document.getElementById('colaborador-id')?.value;
    const nome = document.getElementById('col-nome')?.value.trim();
    const matricula = document.getElementById('col-matricula')?.value.trim();
    const cargo = document.getElementById('col-cargo-input')?.value.trim();
    const gestor = document.getElementById('col-gestor-input')?.value.trim();
    const admissao = document.getElementById('col-admissao')?.value;
    const status = document.getElementById('col-status-input')?.value;
    
    if (!nome || !matricula || !cargo) {
      toast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    Loading.show();
    try {
      const payload = { nome, matricula, cargo, gesto: gestor, admissao, status };
      if (id) {
        await Firebase.put('colaboradores', id, payload);
      } else {
        await Firebase.post('colaboradores', payload);
      }
      this.close('modal-colaborador');
      toast('Colaborador salvo!', 'success');
      Pages.colaboradores.load();
    } catch (e) {
      toast('Erro: ' + e.message, 'error');
    } finally {
      Loading.hide();
    }
  }
};

// ====== PAGES ======
const Pages = {
  // Dashboard
  dashboard: {
    data: {},
    filterData(data, dateIni, dateFim, mes, ano, turno) {
      if (!data || data.length === 0) return [];
      
      return data.filter(r => {
        let rData = r.data || '';
        
        // Converter data para YYYY-MM-DD se necessário
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(rData)) {
          const [dia, m, a] = rData.split('/');
          rData = `${a}-${m}-${dia}`;
        }
        
        // Filtro por data inicial e final
        if (dateIni && rData < dateIni) return false;
        if (dateFim && rData > dateFim) return false;
        
        // Filtro por mês e ano
        if (mes || ano) {
          try {
            const d = new Date(rData + 'T00:00:00');
            if (!isNaN(d)) {
              if (mes && d.getMonth() + 1 !== parseInt(mes)) return false;
              if (ano && d.getFullYear() !== parseInt(ano)) return false;
            }
          } catch {}
        }
        
        // Filtro por turno - Mostrar registros que correspondem ao turno OU que nao tem turno preenchido
        if (turno) {
          if (r.turno && r.turno !== turno) return false;
        }
        
        return true;
      });
    },
    async load() {
      Loading.show();
      try {
        const [atestados, faltas, admissoes, entrevistas, medidas, suspensoes, sinergia] = await Promise.all([
          Firebase.get('atestados').catch(() => null),
          Firebase.get('faltas').catch(() => null),
          Firebase.get('colaboradores').catch(() => null),
          Firebase.get('entrevistas_abs').catch(() => null),
          Firebase.get('medidas_disciplinares').catch(() => null),
          Firebase.get('suspensoes').catch(() => null),
          Firebase.get('sinergia').catch(() => null)
        ]);

        let faltasArr = DataAdapter.atestadosParaFaltas(atestados, faltas);
        const colaboradoresArr = DataAdapter.admissoesParaColaboradores(admissoes);
        let entrevistasArr = DataAdapter.entrevistasParaEntrevistas(entrevistas);
        let medidasArr = DataAdapter.medidasParaMedidas(medidas);
        let suspensoesArr = DataAdapter.suspensoesParaSuspensoes(suspensoes);
        const sinergiaArr = DataAdapter.sinergiaParaSinergia(sinergia);
        
        // Aplicar filtros
        const dateIni = document.getElementById('dash-dt-ini')?.value || '';
        const dateFim = document.getElementById('dash-dt-fim')?.value || '';
        const mes = document.getElementById('dash-mes')?.value || '';
        const ano = document.getElementById('dash-ano')?.value || '';
        const turno = document.getElementById('dash-turno')?.value || '';
        
        faltasArr = this.filterData(faltasArr, dateIni, dateFim, mes, ano, turno);
        entrevistasArr = this.filterDataByTurno(entrevistasArr, turno);
        medidasArr = this.filterDataByTurno(medidasArr, turno);
        suspensoesArr = this.filterDataByTurno(suspensoesArr, turno);

        // Atualizar KPIs - FILTRAR COLABORADORES POR TURNO
        let colaboradoresArrFiltrados = colaboradoresArr;
        if (turno) {
          colaboradoresArrFiltrados = colaboradoresArr.filter(c => c.turno && c.turno === turno);
        }
        
        const totalColaboradores = colaboradoresArrFiltrados.length;
        // Contar apenas Faltas, Atestados e Afastamentos como ausências
        const totalFaltasAtestadosAfastamentos = faltasArr.filter(f => f.tipo === 'Falta' || f.tipo === 'Atestado' || f.tipo === 'Afastamento').length;
        const totalPresentes = Math.max(0, totalColaboradores - totalFaltasAtestadosAfastamentos);
        const absPorcentagem = totalColaboradores > 0 ? ((totalFaltasAtestadosAfastamentos / totalColaboradores) * 100).toFixed(1) : '0';

        document.getElementById('kpi-headcount').textContent = totalColaboradores;
        document.getElementById('kpi-presentes').textContent = totalPresentes;
        document.getElementById('kpi-abs').textContent = absPorcentagem + '%';
        document.getElementById('kpi-faltas').textContent = faltasArr.filter(f => f.tipo === 'Falta').length;
        document.getElementById('kpi-atestados').textContent = faltasArr.filter(f => f.tipo === 'Atestado').length;
        document.getElementById('kpi-afastamentos').textContent = faltasArr.filter(f => f.tipo === 'Afastamento').length;
        
        // Atualizar S1 e S2 com dados filtrados por turno
        const sinergiaArrFiltrados = turno ? sinergiaArr.filter(s => s.turno && s.turno === turno) : sinergiaArr;
        document.getElementById('kpi-s1').textContent = sinergiaArrFiltrados.filter(s => s.categoria === 'S1').length;
        document.getElementById('kpi-s2').textContent = sinergiaArrFiltrados.filter(s => s.categoria === 'S2').length;
        document.getElementById('kpi-advertencias').textContent = medidasArr.length;
        document.getElementById('kpi-suspensoes').textContent = suspensoesArr.length;

        // Charts
        // Função auxiliar para calcular ABS mensal real (Faltas + Atestados)
        const absMensalData = new Array(12).fill(0);
        faltasArr.forEach(f => {
          if (f.tipo === 'Falta' || f.tipo === 'Atestado') {
            try {
              let dateStr = f.data;
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const [dia, mes, ano] = dateStr.split('/');
                dateStr = `${ano}-${mes}-${dia}`;
              }
              const d = new Date(dateStr + 'T00:00:00');
              if (!isNaN(d)) absMensalData[d.getMonth()]++;
            } catch {}
          }
        });

        makeChart('chart-abs-mensal', {
          type: 'line',
          data: {
            labels: MONTHS,
            datasets: [{
              label: 'Ocorrências ABS (%)',
              data: absMensalData.map(count => totalColaboradores > 0 ? ((count / totalColaboradores) * 100).toFixed(1) : 0),
              borderColor: SHOPEE,
              backgroundColor: SHOPEE + '20',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
          }
        });

        makeChart('chart-faltas-mes', {
          type: 'bar',
          data: {
            labels: MONTHS,
            datasets: [
              {
                label: 'Faltas',
                data: monthlyCount(faltasArr.filter(f => f.tipo === 'Falta')),
                backgroundColor: ERROR
              },
              {
                label: 'Atestados',
                data: monthlyCount(faltasArr.filter(f => f.tipo === 'Atestado')),
                backgroundColor: INFO
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
          }
        });

        makeChart('chart-rank-faltas', {
          type: 'bar',
          data: {
            labels: rankingData(faltasArr, 'colaborador', 5).map(r => r[0]),
            datasets: [{
              label: 'Quantidade',
              data: rankingData(faltasArr, 'colaborador', 5).map(r => r[1]),
              backgroundColor: ERROR
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
          }
        });

        makeChart('chart-semanal', {
          type: 'area',
          data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
            datasets: [{
              label: 'Ocorrências',
              data: [12, 19, 8, 15, 10, 6, 3],
              borderColor: SHOPEE,
              backgroundColor: SHOPEE + '20',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
          }
        });

        makeChart('chart-disciplinar-mes', {
          type: 'bar',
          data: {
            labels: MONTHS,
            datasets: [
              {
                label: 'Advertências',
                data: monthlyCount(medidasArr),
                backgroundColor: WARN
              },
              {
                label: 'Suspensões',
                data: monthlyCount(suspensoesArr),
                backgroundColor: ERROR
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
          }
        });

        makeChart('chart-rank-adv', {
          type: 'bar',
          data: {
            labels: rankingData(medidasArr, 'colaborador', 5).map(r => r[0]),
            datasets: [{
              label: 'Quantidade',
              data: rankingData(medidasArr, 'colaborador', 5).map(r => r[1]),
              backgroundColor: WARN
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
          }
        });

        // Renderizar tabela de ABS por dia
        const absDiarioData = this.generateAbsDiario(faltasArr, colaboradoresArrFiltrados);
        App.tables['abs-diario-tbody'].setData(absDiarioData, r => `
          <tr>
            <td><strong>${fmtDate(r.data)}</strong></td>
            <td>${r.diaSemana}</td>
            <td><span class="badge badge-blue">${r.total}</span></td>
            <td><span class="badge badge-green">${r.presentes}</span></td>
            <td><span class="badge badge-red">${r.ausentes}</span></td>
            <td><strong style="color: ${parseFloat(r.percentual) > 20 ? '#EF4444' : '#10B981'}">${r.percentual}%</strong></td>
          </tr>
        `);
      } catch (e) {
        toast('Erro ao carregar dashboard: ' + e.message, 'error');
      } finally {
        Loading.hide();
      }
    },
    generateAbsDiario(faltasArr, colaboradoresArr) {
      const absDiario = {};
      
      // Apenas contar Faltas, Atestados e Afastamentos como ausencias
      const ausenciasValidas = faltasArr.filter(f => 
        f.tipo === 'Falta' || f.tipo === 'Atestado' || f.tipo === 'Afastamento'
      );
      
      // Inicializar com todos os colaboradores para cada data
      ausenciasValidas.forEach(f => {
        let dateStr = f.data;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const [dia, mes, ano] = dateStr.split('/');
          dateStr = `${ano}-${mes}-${dia}`;
        }
        
        if (!absDiario[dateStr]) {
          absDiario[dateStr] = {
            data: dateStr,
            total: colaboradoresArr.length,
            ausentes: 0,
            presentes: colaboradoresArr.length,
            colaboradoresAusentes: new Set()
          };
        }
        
        // Contar ausentes por colaborador (apenas uma vez por colaborador por dia)
        const colab = f.colaborador || '-';
        if (!absDiario[dateStr].colaboradoresAusentes.has(colab)) {
          absDiario[dateStr].colaboradoresAusentes.add(colab);
          absDiario[dateStr].ausentes++;
          absDiario[dateStr].presentes--;
        }
      });
      
      // Converter para array e formatar
      return Object.values(absDiario)
        .map(item => ({
          data: item.data,
          diaSemana: getDayOfWeek(new Date(item.data + 'T00:00:00')),
          total: item.total,
          presentes: item.presentes,
          ausentes: item.ausentes,
          percentual: item.total > 0 ? ((item.ausentes / item.total) * 100).toFixed(1) : '0'
        }))
        .sort((a, b) => new Date(b.data) - new Date(a.data));
    },
    filterDataByTurno(data, turno) {
      if (!turno) return data;
      return data.filter(r => r.turno && r.turno === turno);
    },
    searchAbsDiario(q) {
      App.tables['abs-diario-tbody'].filter(q);
    }
  },

  // Faltas
  faltas: {
    data: [],
    filterData(data, dateIni, dateFim, tipo, turno, colab) {
      if (!data || data.length === 0) return [];
      
      return data.filter(r => {
        let rData = r.data || '';
        
        // Converter data para YYYY-MM-DD se necessário
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(rData)) {
          const [dia, m, a] = rData.split('/');
          rData = `${a}-${m}-${dia}`;
        }
        
        // Filtro por data inicial e final
        if (dateIni && rData < dateIni) return false;
        if (dateFim && rData > dateFim) return false;
        
        // Filtro por tipo
        if (tipo && r.tipo !== tipo) return false;
        
        // Filtro por turno - Mostrar registros que correspondem ao turno OU que não têm turno preenchido
        if (turno) {
          if (r.turno && r.turno !== turno) return false;
        }
        
        // Filtro por colaborador
        if (colab && !r.colaborador.toLowerCase().includes(colab.toLowerCase())) return false;
        
        return true;
      });
    },
    async load() {
      Loading.show();
      try {
        const [atestados, faltas] = await Promise.all([
          Firebase.get('atestados').catch(() => null),
          Firebase.get('faltas').catch(() => null)
        ]);
        this.data = DataAdapter.atestadosParaFaltas(atestados, faltas);

        // Aplicar filtros
        const dateIni = document.getElementById('f-dt-ini')?.value || '';
        const dateFim = document.getElementById('f-dt-fim')?.value || '';
        const tipo = document.getElementById('f-tipo')?.value || '';
        const turno = document.getElementById('f-turno')?.value || '';
        const colab = document.getElementById('f-colab')?.value || '';
        
        const filteredData = this.filterData(this.data, dateIni, dateFim, tipo, turno, colab);

        document.getElementById('f-total-faltas').textContent = filteredData.filter(f => f.tipo === 'Falta').length;
        document.getElementById('f-total-atestados').textContent = filteredData.filter(f => f.tipo === 'Atestado').length;
        document.getElementById('f-total-afastamentos').textContent = filteredData.filter(f => f.tipo === 'Afastamento').length;

        makeChart('chart-faltas-evolucao', {
          type: 'line',
          data: {
            labels: MONTHS,
            datasets: [{
              label: 'Faltas',
              data: monthlyCount(filteredData),
              borderColor: ERROR,
              backgroundColor: ERROR + '20',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
          }
        });

        makeChart('chart-faltas-top10', {
          type: 'bar',
          data: {
            labels: rankingData(filteredData, 'colaborador', 10).map(r => r[0]),
            datasets: [{
              label: 'Faltas',
              data: rankingData(filteredData, 'colaborador', 10).map(r => r[1]),
              backgroundColor: ERROR
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
          }
        });

        const typeBadge = { Falta: 'badge-red', Atestado: 'badge-blue', Afastamento: 'badge-purple' };
        App.tables['faltas-tbody'].setData(filteredData, r => `
          <tr>
            <td><strong>${r.colaborador || '-'}</strong></td>
            <td>${fmtDate(r.data)}</td>
            <td><span class="badge ${typeBadge[r.tipo] || 'badge-gray'}">${r.tipo || '-'}</span></td>
            <td>${r.observacao || '-'}</td>
            <td>
              <div class="action-btns">
                <button class="btn-edit" onclick="Modals.openFalta('${r._id}', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" onclick="Modals.confirmDelete('atestados','${r._id}',()=>Pages.faltas.load())" title="Excluir"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        Loading.hide();
      }
    },
    search(q) {
      App.tables['faltas-tbody'].filter(q);
    }
  },

  // Entrevistas
  entrevistas: {
    data: [],
    filterDataByTurno(data, turno) {
      if (!turno) return data;
      return data.filter(r => r.turno && r.turno === turno);
    },
    async load() {
      Loading.show();
      try {
        const raw = await Firebase.get('entrevistas_abs').catch(() => null);
        this.data = DataAdapter.entrevistasParaEntrevistas(raw);
        
        // Aplicar filtro de turno
        const turno = document.getElementById('dash-turno')?.value || '';
        let filteredData = this.filterDataByTurno(this.data, turno);

        const statusBadge = { Pendente: 'badge-orange', Realizada: 'badge-green' };
        App.tables['entrevistas-tbody'].setData(filteredData, r => `
          <tr>
            <td><strong>${r.colaborador || '-'}</strong></td>
            <td>${fmtDate(r.data)}</td>
            <td>${r.motivo || '-'}</td>
            <td>${r.plano_acao || '-'}</td>
            <td><span class="badge ${statusBadge[r.status] || 'badge-gray'}">${r.status || '-'}</span></td>
            <td>
              <div class="action-btns">
                <button class="btn-edit" onclick="Modals.openEntrevista('${r._id}', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" onclick="Modals.confirmDelete('entrevistas_abs','${r._id}',()=>Pages.entrevistas.load())" title="Excluir"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        Loading.hide();
      }
    },
    search(q) {
      App.tables['entrevistas-tbody'].filter(q);
    }
  },

  // Medidas Disciplinares
  medidas: {
    data: [],
    filterDataByTurno(data, turno) {
      if (!turno) return data;
      return data.filter(r => r.turno && r.turno === turno);
    },
    async load() {
      Loading.show();
      try {
        const raw = await Firebase.get('medidas_disciplinares').catch(() => null);
        this.data = DataAdapter.medidasParaMedidas(raw);
        
        // Aplicar filtro de turno
        const turno = document.getElementById('dash-turno')?.value || '';
        let filteredData = this.filterDataByTurno(this.data, turno);

        const typeBadge = { 'Advertência Verbal': 'badge-yellow', 'Advertência Escrita': 'badge-orange', 'Suspensão': 'badge-red' };
        App.tables['medidas-tbody'].setData(filteredData, r => `
          <tr>
            <td><strong>${r.colaborador || '-'}</strong></td>
            <td>${fmtDate(r.data)}</td>
            <td><span class="badge ${typeBadge[r.tipo] || 'badge-gray'}">${r.tipo || '-'}</span></td>
            <td>${r.motivo || '-'}</td>
            <td>${r.observacao || '-'}</td>
            <td>
              <div class="action-btns">
                <button class="btn-edit" onclick="Modals.openMedida('${r._id}', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" onclick="Modals.confirmDelete('medidas_disciplinares','${r._id}',()=>Pages.medidas.load())" title="Excluir"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        Loading.hide();
      }
    },
    search(q) {
      App.tables['medidas-tbody'].filter(q);
    }
  },

  // Suspensões
  suspensoes: {
    data: [],
    filterDataByTurno(data, turno) {
      if (!turno) return data;
      return data.filter(r => r.turno && r.turno === turno);
    },
    async load() {
      Loading.show();
      try {
        const raw = await Firebase.get('suspensoes').catch(() => null);
        this.data = DataAdapter.suspensoesParaSuspensoes(raw);
        
        // Aplicar filtro de turno
        const turno = document.getElementById('dash-turno')?.value || '';
        let filteredData = this.filterDataByTurno(this.data, turno);

        App.tables['suspensoes-tbody'].setData(filteredData, r => `
          <tr>
            <td><strong>${r.colaborador || '-'}</strong></td>
            <td>${fmtDate(r.data)}</td>
            <td><span class="badge badge-orange">${r.dias || 0} dia(s)</span></td>
            <td>${r.motivo || '-'}</td>
            <td>${r.observacao || '-'}</td>
            <td>
              <div class="action-btns">
                <button class="btn-edit" onclick="Modals.openSuspensao('${r._id}', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" onclick="Modals.confirmDelete('suspensoes','${r._id}',()=>Pages.suspensoes.load())" title="Excluir"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        Loading.hide();
      }
    },
    search(q) {
      App.tables['suspensoes-tbody'].filter(q);
    }
  },

  // Sinergia
  sinergia: {
    data: [],
    filterDataByTurno(data, turno) {
      if (!turno) return data;
      return data.filter(r => r.turno && r.turno === turno);
    },
    async load() {
      Loading.show();
      try {
        const raw = await Firebase.get('sinergia').catch(() => null);
        this.data = DataAdapter.sinergiaParaSinergia(raw);
        
        // Aplicar filtro de turno
        const turno = document.getElementById('dash-turno')?.value || '';
        let filteredData = this.filterDataByTurno(this.data, turno);

        const s1 = filteredData.filter(s => s.categoria === 'S1');
        const s2 = filteredData.filter(s => s.categoria === 'S2');

        makeChart('chart-sin-evolucao', {
          type: 'line',
          data: {
            labels: MONTHS,
            datasets: [
              {
                label: 'S1',
                data: monthlyCount(filteredData.filter(s => s.categoria === 'S1'), 'data_entrada'),
                borderColor: SUCCESS,
                backgroundColor: SUCCESS + '20',
                tension: 0.4,
                fill: true
              },
              {
                label: 'S2',
                data: monthlyCount(filteredData.filter(s => s.categoria === 'S2'), 'data_entrada'),
                borderColor: WARN,
                backgroundColor: WARN + '20',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
          }
        });

        makeChart('chart-sin-dist', {
          type: 'doughnut',
          data: {
            labels: ['S1', 'S2'],
            datasets: [{
              data: [s1.length || 0, s2.length || 0],
              backgroundColor: [SUCCESS, WARN]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
          }
        });

        const catBadge = { S1: 'badge-green', S2: 'badge-yellow' };
        const stsBadge = { Ativo: 'badge-green', Concluído: 'badge-blue', 'Em andamento': 'badge-orange' };
        App.tables['sinergia-tbody'].setData(filteredData, r => `
          <tr>
            <td><strong>${r.colaborador || '-'}</strong></td>
            <td><span class="badge ${catBadge[r.categoria] || 'badge-gray'}">${r.categoria || '-'}</span></td>
            <td>${fmtDate(r.data_entrada)}</td>
            <td><span class="badge ${stsBadge[r.status] || 'badge-gray'}">${r.status || '-'}</span></td>
            <td>
              <div class="action-btns">
                <button class="btn-edit" onclick="Modals.openSinergia('${r._id}', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" onclick="Modals.confirmDelete('sinergia','${r._id}',()=>Pages.sinergia.load())" title="Excluir"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        Loading.hide();
      }
    },
    search(q) {
      App.tables['sinergia-tbody'].filter(q);
    }
  },

  // Colaboradores
  colaboradores: {
    data: [],
    async load() {
      Loading.show();
      try {
        const raw = await Firebase.get('colaboradores').catch(() => null);
        this.data = DataAdapter.admissoesParaColaboradores(raw);

        const stsBadge = { Ativo: 'badge-green', Inativo: 'badge-red', Afastado: 'badge-yellow' };
        App.tables['colaboradores-tbody'].setData(this.data, r => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--shopee-orange-bg);color:var(--shopee-orange);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">
                  ${(r.nome || '?').charAt(0).toUpperCase()}
                </div>
                <strong>${r.nome || '-'}</strong>
              </div>
            </td>
            <td><code style="font-size:12px;background:var(--gray-100);padding:2px 6px;border-radius:4px">${r.matricula || '-'}</code></td>
            <td>${r.cargo || '-'}</td>
            <td>${r.gestor || '-'}</td>
            <td>${fmtDate(r.admissao)}</td>
            <td><span class="badge ${stsBadge[r.status] || 'badge-gray'}">${r.status || 'Ativo'}</span></td>
            <td>
              <div class="action-btns">
                <button class="btn-edit" onclick="Modals.openColaborador('${r._id}', ${JSON.stringify(r).replace(/"/g, '&quot;')})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-del" onclick="Modals.confirmDelete('colaboradores','${r._id}',()=>Pages.colaboradores.load())" title="Excluir"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `);
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        Loading.hide();
      }
    },
    search(q) {
      App.tables['colaboradores-tbody'].filter(q);
    }
  },

  // Configurações
  configuracoes: {
    load() {
      const user = Auth.getCurrentUser();
      if (user) {
        const cfgEmail = document.getElementById('cfg-email');
        const cfgName = document.getElementById('cfg-name');
        if (cfgEmail) cfgEmail.value = user.email || '';
        if (cfgName) cfgName.value = user.name || '';
      }
    }
  }
};

// ====== FUNCOES AUXILIARES PARA ABS DIARIO ======
function getDayOfWeek(date) {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[date.getDay()];
}

// ====== EVENT LISTENERS ======
// Listeners para filtros do dashboard
setTimeout(() => {
  ['dash-dt-ini', 'dash-dt-fim', 'dash-mes', 'dash-ano', 'dash-turno'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => Pages.dashboard?.load());
    }
  });
}, 100);

// Listeners para filtros de faltas
setTimeout(() => {
  ['f-dt-ini', 'f-dt-fim', 'f-tipo', 'f-turno', 'f-colab'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => Pages.faltas?.load());
      el.addEventListener('input', () => Pages.faltas?.load());
    }
  });
}, 100);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', async () => {
  if (Auth.isLoggedIn()) {
    App.showApp();
  } else {
    const loginScreen = document.getElementById('login-screen');
    const appEl = document.getElementById('app');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
  }
});
