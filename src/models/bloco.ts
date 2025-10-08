import { IBaseTimestamps } from "./index";

export interface IBloco extends IBaseTimestamps {
  id_bloco?: number;
  nome: string;
  codigo: string;
  ativo?: string;
  id_campus: number;
}
