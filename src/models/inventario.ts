import { IBaseTimestamps } from "./index";

export interface IInventario extends IBaseTimestamps {
  id_inventario?: number;
  ano: number;
  data_inicio: string;
  data_fim?: string;
  total_bens?: number;
  bens_conferidos?: number;
  percentual_conclusao?: number;
  id_servidor_responsavel?: number;
}
