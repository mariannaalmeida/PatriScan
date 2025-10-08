import { IBaseTimestamps, EstadoConservacao } from "./index";

export interface IAmbiente extends IBaseTimestamps {
  id_ambiente?: number;
  nome: string;
  codigo: string;
  ativo?: boolean;
  id_bloco: number;
  id_servidor_responsavel: number;
}
