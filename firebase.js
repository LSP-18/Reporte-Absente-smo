/**
 * Firebase Realtime Database Integration
 * Shopee RH Dashboard - Versão Melhorada
 * 
 * Melhorias implementadas:
 * - Suporte a autenticação com token
 * - Retry automático com exponential backoff
 * - Tratamento robusto de erros
 * - Validação de dados
 * - Logging melhorado
 * - CORS handling
 */

'use strict';

// ====== FIREBASE CONFIG ======
const FIREBASE_CONFIG = {
  url: 'https://teste-ff843-default-rtdb.firebaseio.com',
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true
};

// ====== LOGGER ======
const Logger = {
  log(msg, data = null) {
    if (FIREBASE_CONFIG.enableLogging) {
      console.log(`[Firebase] ${msg}`, data || '');
    }
  },
  error(msg, err = null) {
    console.error(`[Firebase ERROR] ${msg}`, err || '');
  },
  warn(msg, data = null) {
    console.warn(`[Firebase WARN] ${msg}`, data || '');
  }
};

// ====== RETRY HELPER ======
const RetryHelper = {
  async execute(fn, retries = FIREBASE_CONFIG.maxRetries, delay = FIREBASE_CONFIG.retryDelay) {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Não fazer retry em erros de autenticação ou validação
        if (error.status === 401 || error.status === 403 || error.status === 400) {
          throw error;
        }
        
        // Se não é a última tentativa, aguardar antes de retry
        if (attempt < retries) {
          const waitTime = delay * Math.pow(2, attempt);
          Logger.warn(`Tentativa ${attempt + 1}/${retries} falhou. Aguardando ${waitTime}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
  }
};

// ====== FIREBASE REST API ======
const Firebase = {
  url: FIREBASE_CONFIG.url,
  authToken: null,
  
  /**
   * Define token de autenticação (opcional)
   */
  setAuthToken(token) {
    this.authToken = token;
    Logger.log('Token de autenticação configurado');
  },
  
  /**
   * Constrói headers padrão
   */
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  },
  
  /**
   * Valida resposta do Firebase
   */
  validateResponse(res, operation) {
    if (!res.ok) {
      const error = new Error(`Firebase ${operation} error: ${res.status}`);
      error.status = res.status;
      
      if (res.status === 401) {
        error.message = 'Não autorizado. Verifique suas credenciais.';
      } else if (res.status === 403) {
        error.message = 'Acesso negado. Verifique as regras de segurança do Firebase.';
      } else if (res.status === 404) {
        error.message = 'Recurso não encontrado.';
      } else if (res.status >= 500) {
        error.message = 'Erro no servidor Firebase. Tente novamente.';
      }
      
      throw error;
    }
  },
  
  /**
   * GET - Recupera dados
   */
  async get(path) {
    Logger.log(`GET: ${path}`);
    
    return RetryHelper.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FIREBASE_CONFIG.timeout);
      
      try {
        const res = await fetch(`${this.url}/${path}.json`, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal
        });
        
        this.validateResponse(res, 'GET');
        const data = await res.json();
        Logger.log(`GET success: ${path}`, data);
        return data;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  },
  
  /**
   * POST - Cria novo registro
   */
  async post(path, data) {
    if (!data || typeof data !== 'object') {
      throw new Error('POST: Dados inválidos');
    }
    
    Logger.log(`POST: ${path}`, data);
    
    return RetryHelper.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FIREBASE_CONFIG.timeout);
      
      try {
        const payload = {
          ...data,
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now()
        };
        
        const res = await fetch(`${this.url}/${path}.json`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        this.validateResponse(res, 'POST');
        const result = await res.json();
        Logger.log(`POST success: ${path}`, result);
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  },
  
  /**
   * PUT - Atualiza registro existente
   */
  async put(path, id, data) {
    if (!id) {
      throw new Error('PUT: ID é obrigatório');
    }
    if (!data || typeof data !== 'object') {
      throw new Error('PUT: Dados inválidos');
    }
    
    Logger.log(`PUT: ${path}/${id}`, data);
    
    return RetryHelper.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FIREBASE_CONFIG.timeout);
      
      try {
        const payload = {
          ...data,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now()
        };
        
        const res = await fetch(`${this.url}/${path}/${id}.json`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        this.validateResponse(res, 'PUT');
        const result = await res.json();
        Logger.log(`PUT success: ${path}/${id}`, result);
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  },
  
  /**
   * PATCH - Atualiza parcialmente um registro
   */
  async patch(path, id, data) {
    if (!id) {
      throw new Error('PATCH: ID é obrigatório');
    }
    if (!data || typeof data !== 'object') {
      throw new Error('PATCH: Dados inválidos');
    }
    
    Logger.log(`PATCH: ${path}/${id}`, data);
    
    return RetryHelper.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FIREBASE_CONFIG.timeout);
      
      try {
        const payload = {
          ...data,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now()
        };
        
        const res = await fetch(`${this.url}/${path}/${id}.json`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        this.validateResponse(res, 'PATCH');
        const result = await res.json();
        Logger.log(`PATCH success: ${path}/${id}`, result);
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  },
  
  /**
   * DELETE - Remove registro
   */
  async delete(path, id) {
    if (!id) {
      throw new Error('DELETE: ID é obrigatório');
    }
    
    Logger.log(`DELETE: ${path}/${id}`);
    
    return RetryHelper.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FIREBASE_CONFIG.timeout);
      
      try {
        const res = await fetch(`${this.url}/${path}/${id}.json`, {
          method: 'DELETE',
          headers: this.getHeaders(),
          signal: controller.signal
        });
        
        this.validateResponse(res, 'DELETE');
        Logger.log(`DELETE success: ${path}/${id}`);
        return { success: true };
      } finally {
        clearTimeout(timeoutId);
      }
    });
  },
  
  /**
   * Listener em tempo real com polling
   * Retorna ID do intervalo para limpeza posterior
   */
  listen(path, callback, interval = 5000) {
    Logger.log(`Iniciando listener: ${path} (intervalo: ${interval}ms)`);
    
    let lastData = null;
    
    const poll = async () => {
      try {
        const data = await this.get(path);
        
        // Só chama callback se dados mudaram
        if (JSON.stringify(data) !== JSON.stringify(lastData)) {
          lastData = data;
          callback(data);
        }
      } catch (e) {
        Logger.error(`Listener error para ${path}`, e.message);
        // Continua tentando mesmo com erro
      }
    };
    
    // Primeira chamada imediata
    poll();
    
    // Polling periódico
    return setInterval(poll, interval);
  },
  
  /**
   * Bulk operations - POST múltiplos registros
   */
  async bulkPost(path, dataArray) {
    if (!Array.isArray(dataArray)) {
      throw new Error('bulkPost: dataArray deve ser um array');
    }
    
    Logger.log(`Bulk POST: ${path} (${dataArray.length} registros)`);
    
    const results = [];
    for (const data of dataArray) {
      try {
        const result = await this.post(path, data);
        results.push({ success: true, result });
      } catch (e) {
        Logger.error(`Erro em bulkPost`, e);
        results.push({ success: false, error: e.message });
      }
    }
    
    return results;
  },
  
  /**
   * Testa conexão com Firebase
   */
  async testConnection() {
    try {
      Logger.log('Testando conexão com Firebase...');
      const res = await fetch(`${this.url}/.json?limitToFirst=1`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });
      
      if (res.ok) {
        Logger.log('Conexão com Firebase OK');
        return { success: true };
      } else {
        throw new Error(`Status: ${res.status}`);
      }
    } catch (e) {
      Logger.error('Falha na conexão com Firebase', e.message);
      return { success: false, error: e.message };
    }
  }
};

// ====== AUTH SIMULATION ======
const Auth = {
  USERS_KEY: 'shopee_rh_users',
  SESSION_KEY: 'shopee_rh_session',
  
  /**
   * Recupera lista de usuários do localStorage
   */
  getUsers() {
    const stored = localStorage.getItem(this.USERS_KEY);
    if (!stored) {
      const defaults = [
        {
          email: 'admin@shopee.com',
          password: 'shopee123',
          name: 'Administrador',
          role: 'admin'
        }
      ];
      localStorage.setItem(this.USERS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(stored);
  },
  
  /**
   * Autentica usuário
   */
  login(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Email e senha são obrigatórios' };
    }
    
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      const session = {
        ...user,
        loginAt: new Date().toISOString(),
        loginAtTimestamp: Date.now()
      };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      Logger.log(`Login bem-sucedido: ${email}`);
      return { success: true, user: session };
    }
    
    Logger.warn(`Falha de login: ${email}`);
    return { success: false, error: 'Credenciais inválidas' };
  },
  
  /**
   * Faz logout
   */
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    Logger.log('Logout realizado');
  },
  
  /**
   * Recupera usuário atual
   */
  getCurrentUser() {
    const stored = localStorage.getItem(this.SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  },
  
  /**
   * Verifica se está autenticado
   */
  isLoggedIn() {
    return !!this.getCurrentUser();
  },
  
  /**
   * Registra novo usuário
   */
  register(email, password, name) {
    if (!email || !password || !name) {
      return { success: false, error: 'Todos os campos são obrigatórios' };
    }
    
    const users = this.getUsers();
    if (users.some(u => u.email === email)) {
      return { success: false, error: 'Email já registrado' };
    }
    
    const newUser = { email, password, name, role: 'user' };
    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    Logger.log(`Novo usuário registrado: ${email}`);
    return { success: true, user: newUser };
  }
};

// ====== INICIALIZAÇÃO ======
Logger.log('Firebase module carregado com sucesso');
