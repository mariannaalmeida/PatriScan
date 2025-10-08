/** Interfaces e tipos compartilhados */

// Base para timestamps
export interface IBaseTimestamps {
  created_at?: string;
  updated_at?: string;
}

// Enums
export enum EstadoConservacao {
  EXCELENTE = "EXCELENTE",
  BOM = "BOM",
  REGULAR = "REGULAR",
  RUIM = "RUIM",
  PESSIMO = "PESSIMO",
}

export enum StatusBem {
  LOCALIZADO = "LOCALIZADO",
  NAO_LOCALIZADO = "NAO_LOCALIZADO",
}
