import { IBaseTimestamps } from "./index";

export interface ICampus extends IBaseTimestamps {
  id_campus?: number;
  nome: string;
  codigo: string;
  endereco?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  ativo?: boolean;
}
