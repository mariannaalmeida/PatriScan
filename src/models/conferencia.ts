import { IBaseTimestamps, EstadoConservacao, StatusBem } from "./index";

export interface IConferencia extends IBaseTimestamps {
  id_conferencia?: number;
  data_conferencia: string;
  estado_conservacao?: EstadoConservacao;
  status_bem: StatusBem;
  id_bem: number;
  id_servidor_conferente: number;
  id_inventario?: number;
  observacoes?: string;
}
