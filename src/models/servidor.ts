import { IBaseTimestamps } from "./index";

export interface IServidor extends IBaseTimestamps {
  id_servidor?: number;
  nome: string;
  matricula: string;
  email?: string;
  ativo?: boolean;
}
