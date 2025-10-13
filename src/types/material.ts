export type MovementType = "entrada" | "saida" | "emprestimo" | "devolucao";

export interface Material {
  id: string;
  codigo: string;
  descricao: string;
  quantidadeAtual: number;
  localizacao: string;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  unidadeMedida: string;
  dataCadastro: string;
  fotoUrl?: string;
  tipo: "estoque" | "emprestimo";
  valorUnitario?: number;
  categoria?: string;
}

export interface Movimentacao {
  id: string;
  materialId: string;
  tipo: MovementType;
  quantidade: number;
  data: string;
  responsavel: string;
  observacao?: string;
}
