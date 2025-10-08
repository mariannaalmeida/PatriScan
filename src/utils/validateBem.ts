import { IBem } from "../models/bem";

export const validateBem = (
  data: any
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.numero_patrimonio) errors.push("Número de patrimônio ausente");
  if (!data.descricao_bem) errors.push("Descrição ausente");
  if (!data.br_code) errors.push("Código de barras ausente");
  if (!data.data_aquisicao || isNaN(Date.parse(data.data_aquisicao))) {
    errors.push("Data de aquisição inválida");
  }
  if (isNaN(Number(data.valor_aquisicao))) {
    errors.push("Valor de aquisição inválido");
  }
  if (
    !["EXCELENTE", "BOM", "REGULAR", "RUIM"].includes(data.estado_conservacao)
  ) {
    errors.push("Estado de conservação inválido");
  }

  const valid = errors.length === 0;
  return { valid, errors };
};
