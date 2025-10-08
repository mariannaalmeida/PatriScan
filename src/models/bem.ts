import { IBaseTimestamps, EstadoConservacao } from "./index";

export interface IBem extends IBaseTimestamps {
  id_bem?: number;
  classificacao: string;
  numero_patrimonio: string;
  descricao_bem: string;
  data_aquisicao: string;
  valor_aquisicao: number;
  empenho_siafi?: string;
  nota_fiscal?: string;
  br_code: string;
  estado_conservacao?: EstadoConservacao;
  conferido?: boolean;
  data_conferencia?: string;
  id_servidor_responsavel?: number;
  id_ambiente_atual?: number;

  // Campos de relacionamento (para JOINs)
  servidor_nome?: string;
  ambiente_nome?: string;
  bloco_nome?: string;
  campus_nome?: string;
}
