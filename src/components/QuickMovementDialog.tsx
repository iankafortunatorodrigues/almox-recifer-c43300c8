import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface MaterialInfo {
  id: string;
  codigo: string;
  descricao: string;
  quantidade_atual: number;
  unidade_medida: string;
}

interface QuickMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialInfo | null;
  tipo: "entrada" | "saida";
  onSubmit: (data: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
  }) => void;
  isLoading?: boolean;
}

export function QuickMovementDialog({
  open,
  onOpenChange,
  material,
  tipo,
  onSubmit,
  isLoading,
}: QuickMovementDialogProps) {
  const [quantidade, setQuantidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!material) return;
    
    onSubmit({
      materialId: material.id,
      quantidade: Number(quantidade),
      responsavel,
      observacao: observacao || undefined,
    });
    
    // Reset form
    setQuantidade("");
    setResponsavel("");
    setObservacao("");
  };

  const maxQuantidade = tipo === "saida" ? material?.quantidade_atual : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tipo === "entrada" ? (
              <>
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
                Registrar Entrada
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
                Registrar Saída
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {material ? `${material.codigo} - ${material.descricao}` : ""}
          </DialogDescription>
        </DialogHeader>

        {material && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>
                <strong>Estoque atual:</strong> {material.quantidade_atual}{" "}
                {material.unidade_medida}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                max={maxQuantidade}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Digite a quantidade"
                required
              />
              {tipo === "saida" && (
                <p className="text-xs text-muted-foreground">
                  Máximo disponível: {material.quantidade_atual}{" "}
                  {material.unidade_medida}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do responsável"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione uma observação..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1"
                variant={tipo === "entrada" ? "default" : "destructive"}
                disabled={isLoading}
              >
                {isLoading
                  ? "Registrando..."
                  : tipo === "entrada"
                  ? "Registrar Entrada"
                  : "Registrar Saída"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
