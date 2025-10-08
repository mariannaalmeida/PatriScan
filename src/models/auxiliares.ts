import { IBem, EstadoConservacao } from "./index";

/** Resultado de importação de bens */
export interface IImportResult {
  success: boolean;
  imported: number;
  errors: number;
  errorDetails?: { patrimonio: string; error: string }[];
}

/** Resultado de listagem de bens com paginação */
export interface IBensResult {
  bens: IBem[];
  total: number;
  hasMore: boolean;
}

/** Filtros para busca de bens */
export interface IFiltroBens {
  search?: string;
  classificacao?: string;
  estado_conservacao?: EstadoConservacao;
  id_campus?: number;
  id_bloco?: number;
  id_ambiente?: number;
  id_servidor_responsavel?: number;
}

/** Paginação genérica */
export interface IPaginacao {
  page: number;
  pageSize: number;
}
