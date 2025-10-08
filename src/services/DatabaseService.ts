import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";

import {
  IAmbiente,
  IBem,
  IBloco,
  ICampus,
  IConferencia,
  IServidor,
  IInventario,
  IBensResult,
  IFiltroBens,
  IImportResult,
  IPaginacao,
} from "../models";

class DatabaseService {
  private static sqlite = new SQLiteConnection(CapacitorSQLite);
  private static db: SQLiteDBConnection | null = null;
  private static isInitialized = false;

  // Método para obter a conexão com o banco
  static async getDB(): Promise<SQLiteDBConnection> {
    try {
      if (!this.db) {
        this.db = await this.sqlite.createConnection(
          "inventario",
          false,
          "no-encryption",
          1,
          false
        );
        await this.db.open();

        // Verificar se as tabelas existem e inicializar se necessário
        const tableCheck = await this.db.query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='BEM'"
        );

        if (tableCheck.values?.length === 0) {
          await this.createTables();
          await this.createIndexes();
          await this.createTriggers();
          this.isInitialized = true;
        }
      }
      return this.db;
    } catch (error) {
      console.error("Erro ao obter conexão com o banco:", error);
      throw error;
    }
  }

  // Método para fechar a conexão
  static async closeDB(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection("inventario", false);
      this.db = null;
      this.isInitialized = false;
    }
  }

  // Inicialização do banco de dados
  static async initialize(): Promise<SQLiteDBConnection> {
    if (this.isInitialized && this.db) return this.db;

    try {
      const db = await this.getDB();
      await this.createTables();
      await this.createIndexes();
      await this.createTriggers();
      this.isInitialized = true;
      console.log("Sucesso ao iniciar o banco");
      return db;
    } catch (error) {
      console.error("Erro ao inicializar banco:", error);
      throw error;
    }
  }

  // Criação das tabelas
  static async createTables(): Promise<void> {
    const sql = `   
    -- CAMPUS
    CREATE TABLE IF NOT EXISTS CAMPUS (
       id_campus INTEGER PRIMARY KEY AUTOINCREMENT, 
      nome TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      endereco TEXT,
      cep TEXT,
      cidade TEXT,
      estado TEXT,
      ativo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
--BLOCO
    CREATE TABLE IF NOT EXISTS BLOCO (
      id_bloco INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      ativo BOOLEAN DEFAULT 1,
      id_campus INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_campus) REFERENCES CAMPUS(id_campus) ON DELETE CASCADE           
    );
  --SERVIDOR
    CREATE TABLE IF NOT EXISTS SERVIDOR (
      id_servidor INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      matricula TEXT UNIQUE NOT NULL,
      email TEXT,
      ativo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  
);
--AMBIENTE
  CREATE TABLE IF NOT EXISTS AMBIENTE (
  id_ambiente INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT 1,
  id_bloco INTEGER NOT NULL,
  id_servidor_responsavel INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
  FOREIGN KEY (id_bloco) REFERENCES BLOCO(id_bloco) ON DELETE CASCADE, 
  FOREIGN KEY (id_servidor_responsavel) REFERENCES SERVIDOR(id_servidor) ON DELETE CASCADE       
);
  -- BENS PATRIMONIAIS
    CREATE TABLE IF NOT EXISTS BEM (
      id_bem INTEGER PRIMARY KEY AUTOINCREMENT,
      classificacao TEXT NOT NULL,
      numero_patrimonio TEXT UNIQUE NOT NULL,
      descricao_bem TEXT NOT NULL,
      data_aquisicao DATE NOT NULL,
      valor_aquisicao DECIMAL(15,2) NOT NULL,
      empenho_siafi TEXT,
      nota_fiscal TEXT,
      br_code TEXT UNIQUE,
      estado_conservacao TEXT CHECK(estado_conservacao IN ('EXCELENTE', 'BOM', 'REGULAR', 'RUIM', 'PESSIMO')) DEFAULT 'BOM',
      conferido BOOLEAN DEFAULT 0,
      data_conferencia DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_servidor_responsavel INTEGER,
      id_ambiente_atual INTEGER,
      FOREIGN KEY (id_servidor_responsavel) REFERENCES SERVIDOR(id_servidor) ON DELETE SET NULL,
      FOREIGN KEY (id_ambiente_atual) REFERENCES AMBIENTE(id_ambiente) ON DELETE SET NULL
    );

    -- INVENTÁRIOS 
    CREATE TABLE IF NOT EXISTS INVENTARIO (
        id_inventario INTEGER PRIMARY KEY AUTOINCREMENT,
        ano INTEGER NOT NULL,
        data_inicio DATE NOT NULL,
        data_fim DATE,
        total_bens INTEGER DEFAULT 0,
        bens_conferidos INTEGER DEFAULT 0,
        percentual_conclusao DECIMAL(5,2) DEFAULT 0.00,
        id_servidor_responsavel INTEGER ,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_servidor_responsavel) REFERENCES SERVIDOR(id_servidor) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS CONFERENCIA  (
        id_conferencia INTEGER PRIMARY KEY AUTOINCREMENT,
        data_conferencia DATE NOT NULL,
        estado_conservacao TEXT CHECK(estado_conservacao IN ('EXCELENTE', 'BOM', 'REGULAR', 'RUIM')),
        status_bem TEXT CHECK(status_bem IN ('LOCALIZADO', 'NAO LOCALIZADO')) NOT NULL,
        id_bem INTEGER NOT NULL, 
        id_servidor_conferente INTEGER,
        id_inventario INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_bem) REFERENCES BEM(id_bem),
        FOREIGN KEY (id_servidor_conferente) REFERENCES SERVIDOR(id_servidor),
        FOREIGN KEY (id_inventario) REFERENCES INVENTARIO(id_inventario) ON DELETE SET NULL
);

-- TABELA DE LEITURAS 
  CREATE TABLE IF NOT EXISTS LEITURAS (
    id_leitura INTEGER PRIMARY KEY AUTOINCREMENT,
    br_code TEXT NOT NULL,
    data_leitura DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_bem) REFERENCES BEM(id_bem) ON DELETE CASCADE
  );


`;
    try {
      await this.db!.execute(sql);
      console.log("Tables created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
  }

  // Criação de índices para melhor performance
  static async createIndexes(): Promise<void> {
    const indexesSQL = `
CREATE INDEX IF NOT EXISTS idx_bem_patrimonio ON BEM(numero_patrimonio);
CREATE INDEX IF NOT EXISTS idx_bem_ambiente_atual ON BEM(id_ambiente_atual);
CREATE INDEX IF NOT EXISTS idx_bem_estado ON BEM(estado_conservacao);
CREATE INDEX IF NOT EXISTS idx_bem_br_code ON BEM(br_code);
CREATE INDEX  IF NOT EXISTS idx_bem_responsavel ON BEM(id_servidor_responsavel);

-- Indices de conferencia
CREATE INDEX IF NOT EXISTS idx_conf_bem ON CONFERENCIA(id_bem);
    CREATE INDEX IF NOT EXISTS idx_conf_inventario ON CONFERENCIA(id_inventario);
    CREATE INDEX IF NOT EXISTS idx_conf_data ON CONFERENCIA(data_conferencia);
    CREATE INDEX IF NOT EXISTS idx_conf_status ON CONFERENCIA(status_bem);

-- Índices para estrutura organizacional
CREATE INDEX IF NOT EXISTS idx_ambiente_bloco ON AMBIENTE(id_bloco);
    CREATE INDEX IF NOT EXISTS idx_ambiente_responsavel ON AMBIENTE(id_servidor_responsavel);
    CREATE INDEX IF NOT EXISTS idx_bloco_campus ON BLOCO(id_campus);
    CREATE INDEX IF NOT EXISTS idx_campus_codigo ON CAMPUS(codigo);
    CREATE INDEX IF NOT EXISTS idx_bloco_codigo ON BLOCO(codigo);
    CREATE INDEX IF NOT EXISTS idx_ambiente_codigo ON AMBIENTE(codigo);

`;
    try {
      await this.db!.execute(indexesSQL);
      console.log("Indexes created successfully");
    } catch (error) {
      console.error("Error creating indexes:", error);
      throw error;
    }
  }

  // Criação de triggers para automatizar processos
  static async createTriggers(): Promise<void> {
    const triggersSQL = `
    -- Trigger para atualizar updated_at automaticamente
    CREATE TRIGGER IF NOT EXISTS trg_bem_updated_at
      BEFORE UPDATE ON BEM
      FOR EACH ROW
    BEGIN
      -- Só atualiza se o updated_at não foi explicitamente modificado  
      IF NEW.updated_at = OLD.updated_at THEN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END IF;

    CREATE TRIGGER IF NOT EXISTS trg_servidor_updated_at
      BEFORE UPDATE ON SERVIDOR
      FOR EACH ROW
    BEGIN
      -- Só atualiza se o updated_at não foi explicitamente modificado  
      IF NEW.updated_at = OLD.updated_at THEN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END IF;

    CREATE TRIGGER IF NOT EXISTS trg_ambiente_updated_at
      BEFORE UPDATE ON AMBIENTE
      FOR EACH ROW
      BEGIN
    -- Só atualiza se o updated_at não foi explicitamente modificado  
      IF NEW.updated_at = OLD.updated_at THEN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END IF;
      
    CREATE TRIGGER IF NOT EXISTS trg_campus_updated_at
      BEFORE UPDATE ON CAMPUS
      FOR EACH ROW
    BEGIN
      -- Só atualiza se o updated_at não foi explicitamente modificado  
      IF NEW.updated_at = OLD.updated_at THEN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END IF;

    CREATE TRIGGER IF NOT EXISTS trg_bloco_updated_at
      BEFORE UPDATE ON BLOCO
      FOR EACH ROW
    BEGIN
      -- Só atualiza se o updated_at não foi explicitamente modificado  
      IF NEW.updated_at = OLD.updated_at THEN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END IF;

    CREATE TRIGGER IF NOT EXISTS trg_inventario_updated_at
      BEFORE UPDATE ON INVENTARIO
      FOR EACH ROW
    BEGIN
      -- Só atualiza se o updated_at não foi explicitamente modificado  
      IF NEW.updated_at = OLD.updated_at THEN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END IF;
    
   -- Trigger após inserir uma conferência
    CREATE TRIGGER IF NOT EXISTS trg_conferencia_after_insert
    A

    -- Trigger para atualizar status de conferência do bem
    CREATE TRIGGER IF NOT EXISTS trg_conferencia_update_bem
      BEFORE INSERT ON CONFERENCIA
      FOR EACH ROW
    BEGIN
      UPDATE BEM
      SET conferido = CASE
                       WHEN NEW.status_bem = 'LOCALIZADO' THEN 1
                       ELSE 0
                      END,
          data_conferencia = NEW.data_conferencia,
          estado_conservacao = COALESCE(NEW.estado_conservacao, estado_conservacao),
          updated_at = CURRENT_TIMESTAMP
      WHERE id_bem = NEW.id_bem;
    END;

    -- Trigger para atualizar contadores do inventário
    CREATE TRIGGER IF NOT EXISTS trg_inventario_update_contadores
      AFTER INSERT ON CONFERENCIA
      FOR EACH ROW
      WHEN NEW.id_inventario IS NOT NULL
    BEGIN 
      UPDATE INVENTARIO
      SET bens_conferidos = (
          SELECT COUNT(*)
          FROM CONFERENCIA
          WHERE id_inventario = NEW.id_inventario 
        ),
        percentual_conclusao = CASE
                                WHEN total_bens > 0 THEN
                                  ROUND((SELECT COUNT(*) FROM CONFERENCIA WHERE id_inventario = NEW.id_inventario) * 100.0 / total_bens, 2)
                                ELSE 0
                              END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_inventario = NEW.id_inventario;
    END;

    -- Trigger para atualizar total_bens quando um bem é adicionado/removido
    CREATE TRIGGER IF NOT EXISTS trg_inventario_update_total_bens
      AFTER INSERT ON BEM
      FOR EACH ROW
    BEGIN
      UPDATE INVENTARIO
      SET total_bens = (SELECT COUNT(*) FROM BEM),
          updated_at = CURRENT_TIMESTAMP
      WHERE data_fim IS NULL;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_inventario_update_total_bens_delete
      AFTER DELETE ON BEM
      FOR EACH ROW
    BEGIN
      UPDATE INVENTARIO
      SET total_bens = (SELECT COUNT(*) FROM BEM),
          updated_at = CURRENT_TIMESTAMP
      WHERE data_fim IS NULL;
    END;
    `;

    try {
      await this.db!.execute(triggersSQL);
      console.log("Triggers created successfully");
    } catch (error) {
      console.error("Error creating triggers:", error);
      throw error;
    }
  }

  // MÉTODOS PARA BENS

  static async getBens(offset = 0, limit = 50): Promise<IBensResult> {
    try {
      const countSql = `SELECT COUNT(*) as total FROM BEM`;
      const countResult = await this.db!.query(countSql);
      const total = countResult.values?.[0]?.total || 0;

      const sql = `
        SELECT b.*, s.nome AS servidor_nome, a.nome AS ambiente_nome,
               bl.nome AS bloco_nome, c.nome AS campus_nome
        FROM BEM b
        LEFT JOIN SERVIDOR s ON b.id_servidor_responsavel = s.id_servidor
        LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
        LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
        LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
        ORDER BY b.numero_patrimonio
        LIMIT ? OFFSET ?
      `;

      const result = await this.db!.query(sql, [limit, offset]);
      const bens = (result.values as IBem[]) || [];

      return {
        bens,
        total,
        hasMore: offset + bens.length < total,
      };
    } catch (error) {
      console.error("Error getting bens:", error);
      throw error;
    }
  }

  static async getBemById(id: number): Promise<IBem | null> {
    try {
      const sql = `
        SELECT b.*, s.nome AS servidor_nome, a.nome AS ambiente_nome,
               bl.nome AS bloco_nome, c.nome AS campus_nome
        FROM BEM b
        LEFT JOIN SERVIDOR s ON b.id_servidor_responsavel = s.id_servidor
        LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
        LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
        LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
        WHERE b.id_bem = ?
      `;

      const result = await this.db!.query(sql, [id]);
      return result.values?.[0] || null;
    } catch (error) {
      console.error("Error getting bem by id:", error);
      throw error;
    }
  }

  static async getBemByPatrimonio(
    numero_patrimonio: string
  ): Promise<IBem | null> {
    try {
      const sql = `
        SELECT b.*, s.nome AS servidor_nome, a.nome AS ambiente_nome,
               bl.nome AS bloco_nome, c.nome AS campus_nome
        FROM BEM b
        LEFT JOIN SERVIDOR s ON b.id_servidor_responsavel = s.id_servidor
        LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
        LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
        LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
        WHERE b.numero_patrimonio = ?
      `;

      const result = await this.db!.query(sql, [numero_patrimonio]);
      return result.values?.[0] || null;
    } catch (error) {
      console.error("Error getting bem by patrimonio:", error);
      throw error;
    }
  }

  // Corrigir estes métodos para serem estáticos:
  static async getBemByBrCode(br_code: string): Promise<IBem | null> {
    try {
      const sql = `
      SELECT b.*, s.nome AS servidor_nome, a.nome AS ambiente_nome,
             bl.nome AS bloco_nome, c.nome AS campus_nome
      FROM BEM b
      LEFT JOIN SERVIDOR s ON b.id_servidor_responsavel = s.id_servidor
      LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
      LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
      LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
      WHERE b.br_code = ?
    `;

      const result = await this.db!.query(sql, [br_code]);
      return result.values?.[0] || null;
    } catch (error) {
      console.error("Error getting bem by br_code:", error);
      throw error;
    }
  }

  static async addBem(bem: IBem): Promise<number> {
    try {
      const sql = `
        INSERT INTO BEM (
          classificacao, numero_patrimonio, descricao_bem, data_aquisicao,
          valor_aquisicao, empenho_siafi, nota_fiscal, br_code,
          estado_conservacao, conferido, data_conferencia,
          id_servidor_responsavel, id_ambiente_atual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        bem.classificacao,
        bem.numero_patrimonio,
        bem.descricao_bem,
        bem.data_aquisicao,
        bem.valor_aquisicao,
        bem.empenho_siafi || null,
        bem.nota_fiscal || null,
        bem.br_code || null,
        bem.estado_conservacao || "BOM",
        bem.conferido ? 1 : 0,
        bem.data_conferencia || null,
        bem.id_servidor_responsavel || null,
        bem.id_ambiente_atual || null,
      ];

      const res = await this.db!.run(sql, values);
      return res.changes?.lastId ?? 0;
    } catch (error) {
      console.error("Error adding bem:", error);
      throw error;
    }
  }

  static async updateBem(bem: IBem): Promise<void> {
    try {
      const sql = `
        UPDATE BEM SET
          classificacao = ?, descricao_bem = ?, data_aquisicao = ?, valor_aquisicao = ?,
          empenho_siafi = ?, nota_fiscal = ?, br_code = ?, estado_conservacao = ?,
          conferido = ?, data_conferencia = ?, id_servidor_responsavel = ?, id_ambiente_atual = ?
        WHERE id_bem = ?
      `;

      const values = [
        bem.classificacao,
        bem.descricao_bem,
        bem.data_aquisicao,
        bem.valor_aquisicao,
        bem.empenho_siafi || null,
        bem.nota_fiscal || null,
        bem.br_code || null,
        bem.estado_conservacao || "BOM",
        bem.conferido ? 1 : 0,
        bem.data_conferencia || null,
        bem.id_servidor_responsavel || null,
        bem.id_ambiente_atual || null,
        bem.id_bem,
      ];

      await this.db!.run(sql, values);
    } catch (error) {
      console.error("Error updating bem:", error);
      throw error;
    }
  }

  static async deleteBem(id: number): Promise<void> {
    try {
      const sql = `DELETE FROM BEM WHERE id_bem = ?`;
      await this.db!.run(sql, [id]);
    } catch (error) {
      console.error("Error deleting bem:", error);
      throw error;
    }
  }

  static async importBens(bens: IBem[]): Promise<IImportResult> {
    let imported = 0;
    const errorDetails: { patrimonio: string; error: string }[] = [];

    for (const bem of bens) {
      try {
        // Verificar se já existe
        const existing = await this.getBemByPatrimonio(bem.numero_patrimonio);
        if (existing) {
          await this.updateBem({ ...bem, id_bem: existing.id_bem });
        } else {
          await this.addBem(bem);
        }
        imported++;
      } catch (err: any) {
        errorDetails.push({
          patrimonio: bem.numero_patrimonio || "N/A",
          error: err?.message || "Erro desconhecido",
        });
      }
    }

    return {
      success: errorDetails.length === 0,
      imported,
      errors: errorDetails.length,
      errorDetails,
    };
  }

  // MÉTODOS PARA CAMPUS
  static async getCampus(): Promise<ICampus[]> {
    try {
      const sql = `SELECT * FROM CAMPUS WHERE ativo = 1 ORDER BY nome`;
      const result = await this.db!.query(sql);
      return result.values || [];
    } catch (error) {
      console.error("Error getting campus:", error);
      throw error;
    }
  }

  static async addCampus(campus: ICampus): Promise<number> {
    try {
      const sql = `
        INSERT INTO CAMPUS (nome, codigo, endereco, cep, cidade, estado, ativo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        campus.nome,
        campus.codigo,
        campus.endereco || null,
        campus.cep || null,
        campus.cidade || null,
        campus.estado || null,
        campus.ativo !== undefined ? (campus.ativo ? 1 : 0) : 1,
      ];

      const res = await this.db!.run(sql, values);
      return res.changes?.lastId ?? 0;
    } catch (error) {
      console.error("Error adding campus:", error);
      throw error;
    }
  }

  // MÉTODOS PARA BLOCOS
  static async getBlocos(campusId?: number): Promise<IBloco[]> {
    try {
      let sql = `SELECT b.*, c.nome as campus_nome FROM BLOCO b 
                 JOIN CAMPUS c ON b.id_campus = c.id_campus 
                 WHERE b.ativo = 1`;
      const params: any[] = [];

      if (campusId) {
        sql += ` AND b.id_campus = ?`;
        params.push(campusId);
      }

      sql += ` ORDER BY b.nome`;

      const result = await this.db!.query(sql, params);
      return result.values || [];
    } catch (error) {
      console.error("Error getting blocos:", error);
      throw error;
    }
  }

  static async addBloco(bloco: IBloco): Promise<number> {
    try {
      const sql = `
        INSERT INTO BLOCO (nome, codigo, ativo, id_campus)
        VALUES (?, ?, ?, ?)
      `;

      const values = [
        bloco.nome,
        bloco.codigo,
        bloco.ativo !== undefined ? (bloco.ativo ? 1 : 0) : 1,
        bloco.id_campus,
      ];

      const res = await this.db!.run(sql, values);
      return res.changes?.lastId ?? 0;
    } catch (error) {
      console.error("Error adding bloco:", error);
      throw error;
    }
  }

  // MÉTODOS PARA SERVIDORES
  static async getServidores(): Promise<IServidor[]> {
    try {
      const sql = `SELECT * FROM SERVIDOR WHERE ativo = 1 ORDER BY nome`;
      const result = await this.db!.query(sql);
      return result.values || [];
    } catch (error) {
      console.error("Error getting servidores:", error);
      throw error;
    }
  }

  static async addServidor(servidor: IServidor): Promise<number> {
    try {
      const sql = `
        INSERT INTO SERVIDOR (nome, matricula, email, ativo)
        VALUES (?, ?, ?, ?)
      `;

      const values = [
        servidor.nome,
        servidor.matricula,
        servidor.email || null,
        servidor.ativo !== undefined ? (servidor.ativo ? 1 : 0) : 1,
      ];

      const res = await this.db!.run(sql, values);
      return res.changes?.lastId ?? 0;
    } catch (error) {
      console.error("Error adding servidor:", error);
      throw error;
    }
  }

  // MÉTODOS PARA AMBIENTES
  static async getAmbientes(): Promise<IAmbiente[]> {
    try {
      const sql = `
        SELECT a.*, b.nome AS bloco_nome, c.nome AS campus_nome, s.nome AS servidor_nome
        FROM AMBIENTE a
        LEFT JOIN BLOCO b ON a.id_bloco = b.id_bloco
        LEFT JOIN CAMPUS c ON b.id_campus = c.id_campus
        LEFT JOIN SERVIDOR s ON a.id_servidor_responsavel = s.id_servidor
        WHERE a.ativo = 1
        ORDER BY a.nome
      `;
      const result = await this.db!.query(sql);
      return result.values || [];
    } catch (error) {
      console.error("Error getting ambientes:", error);
      throw error;
    }
  }

  static async addAmbiente(ambiente: IAmbiente): Promise<number> {
    try {
      const sql = `
        INSERT INTO AMBIENTE (nome, codigo, ativo, id_bloco, id_servidor_responsavel)
        VALUES (?, ?, ?, ?, ?)
      `;

      const values = [
        ambiente.nome,
        ambiente.codigo,
        ambiente.ativo !== undefined ? (ambiente.ativo ? 1 : 0) : 1,
        ambiente.id_bloco,
        ambiente.id_servidor_responsavel,
      ];

      const res = await this.db!.run(sql, values);
      return res.changes?.lastId ?? 0;
    } catch (error) {
      console.error("Error adding ambiente:", error);
      throw error;
    }
  }

  // MÉTODOS PARA CONSULTAS AVANÇADAS
  static async searchBens(
    filtros: IFiltroBens,
    paginacao: IPaginacao = { page: 1, pageSize: 50 }
  ): Promise<IBensResult> {
    try {
      const offset = (paginacao.page - 1) * paginacao.pageSize;

      let whereClause = `WHERE 1=1`;
      const params: any[] = [];

      if (filtros.search) {
        whereClause += ` AND (b.descricao_bem LIKE ? OR b.numero_patrimonio LIKE ? OR b.br_code LIKE ? OR b.classificacao LIKE ?)`;
        const searchPattern = `%${filtros.search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (filtros.classificacao) {
        whereClause += ` AND b.classificacao LIKE ?`;
        params.push(`${filtros.classificacao}%`);
      }

      if (filtros.estado_conservacao) {
        whereClause += ` AND b.estado_conservacao = ?`;
        params.push(filtros.estado_conservacao);
      }

      if (filtros.id_campus) {
        whereClause += ` AND c.id_campus = ?`;
        params.push(filtros.id_campus);
      }

      if (filtros.id_bloco) {
        whereClause += ` AND bl.id_bloco = ?`;
        params.push(filtros.id_bloco);
      }

      if (filtros.id_ambiente) {
        whereClause += ` AND b.id_ambiente_atual = ?`;
        params.push(filtros.id_ambiente);
      }

      if (filtros.id_servidor_responsavel) {
        whereClause += ` AND b.id_servidor_responsavel = ?`;
        params.push(filtros.id_servidor_responsavel);
      }

      // Query para contar o total
      const countSql = `
        SELECT COUNT(*) as total
        FROM BEM b
        LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
        LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
        LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
        ${whereClause}
      `;

      const countResult = await this.db!.query(countSql, params);
      const total = countResult.values?.[0]?.total || 0;

      // Query para obter os dados
      const sql = `
        SELECT b.*, s.nome AS servidor_nome, a.nome AS ambiente_nome,
               bl.nome AS bloco_nome, c.nome AS campus_nome
        FROM BEM b
        LEFT JOIN SERVIDOR s ON b.id_servidor_responsavel = s.id_servidor
        LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
        LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
        LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
        ${whereClause}
        ORDER BY b.numero_patrimonio
        LIMIT ? OFFSET ?
      `;

      const result = await this.db!.query(sql, [
        ...params,
        paginacao.pageSize,
        offset,
      ]);
      const bens = (result.values as IBem[]) || [];

      return {
        bens,
        total,
        hasMore: offset + bens.length < total,
      };
    } catch (error) {
      console.error("Error searching bens:", error);
      throw error;
    }
  }

  static async getInventarioStats(): Promise<{
    total: number;
    conferidos: number;
    valorTotal: number;
    percentualConferido: number;
  }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN conferido = 1 THEN 1 ELSE 0 END) AS conferidos,
          COALESCE(SUM(valor_aquisicao), 0) AS valorTotal
        FROM BEM
      `;
      const result = await this.db!.query(sql);
      const stats = result.values?.[0] || {
        total: 0,
        conferidos: 0,
        valorTotal: 0,
      };

      const percentualConferido =
        stats.total > 0
          ? Math.round((stats.conferidos / stats.total) * 100)
          : 0;

      return {
        ...stats,
        percentualConferido,
      };
    } catch (error) {
      console.error("Error getting inventario stats:", error);
      throw error;
    }
  }

  // MÉTODOS PARA CONFERÊNCIA
  static async addConferencia(conferencia: IConferencia): Promise<number> {
    try {
      const sql = `
        INSERT INTO CONFERENCIA (
          data_conferencia, estado_conservacao, status_bem,
          id_bem, id_servidor_conferente, id_inventario
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        conferencia.data_conferencia,
        conferencia.estado_conservacao || null,
        conferencia.status_bem,
        conferencia.id_bem,
        conferencia.id_servidor_conferente,
        conferencia.id_inventario || null,
      ];

      const res = await this.db!.run(sql, values);
      return res.changes?.lastId ?? 0;
    } catch (error) {
      console.error("Error adding conferencia:", error);
      throw error;
    }
  }

  static async getConferenciasByBem(bemId: number): Promise<IConferencia[]> {
    try {
      const sql = `
        SELECT c.*, s.nome AS servidor_nome
        FROM CONFERENCIA c
        LEFT JOIN SERVIDOR s ON c.id_servidor_conferente = s.id_servidor
        WHERE c.id_bem = ?
        ORDER BY c.data_conferencia DESC
      `;

      const result = await this.db!.query(sql, [bemId]);
      return result.values || [];
    } catch (error) {
      console.error("Error getting conferencias by bem:", error);
      throw error;
    }
  }

  // MÉTODOS PARA INVENTÁRIO
  static async getInventarios(): Promise<IInventario[]> {
    try {
      const sql = `
        SELECT i.*, s.nome AS servidor_nome
        FROM INVENTARIO i
        LEFT JOIN SERVIDOR s ON i.id_servidor_responsavel = s.id_servidor
        ORDER BY i.ano DESC, i.data_inicio DESC
      `;

      const result = await this.db!.query(sql);
      return result.values || [];
    } catch (error) {
      console.error("Error getting inventarios:", error);
      throw error;
    }
  }

  static async addInventario(inventario: IInventario): Promise<number> {
    try {
      const sql = `
        INSERT INTO INVENTARIO (ano, data_inicio, id_servidor_responsavel)
        VALUES (?, ?, ?)
      `;

      const values = [
        inventario.ano,
        inventario.data_inicio,
        inventario.id_servidor_responsavel,
      ];

      const res = await this.db!.run(sql, values);
      return res.changes?.lastId ?? 0;
    } catch (error) {
      console.error("Error adding inventario:", error);
      throw error;
    }
  }

  static async finalizarInventario(
    inventarioId: number,
    dataFim: string
  ): Promise<void> {
    try {
      const sql = `
        UPDATE INVENTARIO 
        SET data_fim = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id_inventario = ?
      `;

      await this.db!.run(sql, [dataFim, inventarioId]);
    } catch (error) {
      console.error("Error finalizing inventario:", error);
      throw error;
    }
  }

  static async addLeitura(br_code: string): Promise<void> {
    try {
      const sql = `
      INSERT INTO LEITURAS (br_code, data_leitura)
      VALUES (?, datetime('now'))
    `;
      await this.db!.run(sql, [br_code]);
    } catch (error) {
      console.error("Error adding leitura:", error);
      throw error;
    }
  }

  static async getEstadosConservacao(): Promise<string[]> {
    return ["EXCELENTE", "BOM", "REGULAR", "RUIM", "PESSIMO"];
  }

  /**
   * Obtém bens filtrados com paginação
   */
  static async getBensFiltrados(
    filtros: IFiltroBens,
    paginacao: IPaginacao = { page: 1, pageSize: 50 }
  ): Promise<IBensResult> {
    try {
      const db = await this.getDB();
      const offset = (paginacao.page - 1) * paginacao.pageSize;

      let whereClause = `WHERE 1=1`;
      const params: any[] = [];

      // Aplicar filtros
      if (filtros.search) {
        whereClause += ` AND (
        b.numero_patrimonio LIKE ? OR 
        b.descricao_bem LIKE ? OR 
        b.classificacao LIKE ? OR
        a.nome LIKE ? OR
        b.br_code LIKE ?
      )`;
        const searchTerm = `%${filtros.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filtros.classificacao) {
        whereClause += ` AND b.classificacao = ?`;
        params.push(filtros.classificacao);
      }

      if (filtros.estado_conservacao) {
        whereClause += ` AND b.estado_conservacao = ?`;
        params.push(filtros.estado_conservacao);
      }

      if (filtros.id_campus) {
        whereClause += ` AND c.id_campus = ?`;
        params.push(filtros.id_campus);
      }

      if (filtros.id_bloco) {
        whereClause += ` AND bl.id_bloco = ?`;
        params.push(filtros.id_bloco);
      }

      if (filtros.id_ambiente) {
        whereClause += ` AND b.id_ambiente_atual = ?`;
        params.push(filtros.id_ambiente);
      }

      if (filtros.id_servidor_responsavel) {
        whereClause += ` AND b.id_servidor_responsavel = ?`;
        params.push(filtros.id_servidor_responsavel);
      }

      // Query para contar o total
      const countSql = `
      SELECT COUNT(*) as total
      FROM BEM b
      LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
      LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
      LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
      ${whereClause}
    `;

      const countResult = await db.query(countSql, params);
      const total = countResult.values?.[0]?.total || 0;

      // Query para obter os dados
      const sql = `
      SELECT 
        b.id_bem,
        b.classificacao,
        b.numero_patrimonio,
        b.descricao_bem,
        b.data_aquisicao,
        b.valor_aquisicao,
        b.empenho_siafi,
        b.nota_fiscal,
        b.br_code,
        b.estado_conservacao,
        b.conferido,
        b.data_conferencia,
        b.id_servidor_responsavel,
        b.id_ambiente_atual,
        b.created_at,
        b.updated_at,
        s.nome AS servidor_nome, 
        a.nome AS ambiente_nome,
        bl.nome AS bloco_nome, 
        c.nome AS campus_nome
      FROM BEM b
      LEFT JOIN SERVIDOR s ON b.id_servidor_responsavel = s.id_servidor
      LEFT JOIN AMBIENTE a ON b.id_ambiente_atual = a.id_ambiente
      LEFT JOIN BLOCO bl ON a.id_bloco = bl.id_bloco
      LEFT JOIN CAMPUS c ON bl.id_campus = c.id_campus
      ${whereClause}
      ORDER BY b.numero_patrimonio
      LIMIT ? OFFSET ?
    `;

      const result = await db.query(sql, [
        ...params,
        paginacao.pageSize,
        offset,
      ]);

      const bens = (result.values as IBem[]) || [];

      return {
        bens,
        total,
        hasMore: offset + bens.length < total,
      };
    } catch (error) {
      console.error("Error in getBensFiltrados:", error);
      throw error;
    }
  }
}

export default DatabaseService;
