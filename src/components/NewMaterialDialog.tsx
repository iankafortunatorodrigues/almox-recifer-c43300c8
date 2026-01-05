import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    codigo: string;
    descricao: string;
    quantidade_atual: number;
    localizacao: string;
    estoque_minimo: number;
    estoque_maximo: number | null;
    unidade_medida: string;
    categoria: string | null;
    valor_unitario: number | null;
    tipo: string;
    obsoleto: boolean;
  }) => void;
  isLoading?: boolean;
}

export function NewMaterialDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: NewMaterialDialogProps) {
  const [formData, setFormData] = useState({
    tipo: "estoque",
    codigo: "",
    descricao: "",
    quantidade_atual: "",
    localizacao: "",
    estoque_minimo: "0",
    estoque_maximo: "",
    unidade_medida: "UN",
    categoria: "",
    valor_unitario: "",
    obsoleto: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const estoqueMinimo = formData.tipo === "estoque" 
      ? Number(formData.estoque_minimo) || 0 
      : 0;
    const estoqueMaximo = formData.tipo === "estoque" && formData.estoque_maximo 
      ? Number(formData.estoque_maximo) 
      : null;

    onSubmit({
      codigo: formData.codigo,
      descricao: formData.descricao,
      quantidade_atual: Number(formData.quantidade_atual) || 0,
      localizacao: formData.localizacao,
      estoque_minimo: estoqueMinimo,
      estoque_maximo: estoqueMaximo,
      unidade_medida: formData.unidade_medida,
      categoria: formData.categoria || null,
      valor_unitario: formData.valor_unitario ? Number(formData.valor_unitario) : null,
      tipo: formData.tipo,
      obsoleto: formData.obsoleto,
    });

    // Reset form
    setFormData({
      tipo: "estoque",
      codigo: "",
      descricao: "",
      quantidade_atual: "",
      localizacao: "",
      estoque_minimo: "0",
      estoque_maximo: "",
      unidade_medida: "UN",
      categoria: "",
      valor_unitario: "",
      obsoleto: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Material</DialogTitle>
          <DialogDescription>
            Cadastre um novo material no sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Material</Label>
            <RadioGroup
              value={formData.tipo}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  tipo: value,
                  estoque_minimo: value === "estoque" ? formData.estoque_minimo : "0",
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="estoque" id="estoque" />
                <Label htmlFor="estoque" className="font-normal cursor-pointer">
                  Material de Estoque
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="emprestimo" id="emprestimo" />
                <Label htmlFor="emprestimo" className="font-normal cursor-pointer">
                  Material de Empréstimo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="consumivel" id="consumivel" />
                <Label htmlFor="consumivel" className="font-normal cursor-pointer">
                  Material Consumível
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) =>
                  setFormData({ ...formData, codigo: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                value={formData.unidade_medida}
                onChange={(e) =>
                  setFormData({ ...formData, unidade_medida: e.target.value })
                }
                placeholder="UN, KG, M, L"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade Inicial</Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                value={formData.quantidade_atual}
                onChange={(e) =>
                  setFormData({ ...formData, quantidade_atual: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) =>
                  setFormData({ ...formData, localizacao: e.target.value })
                }
                placeholder="Prateleira A1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              value={formData.categoria}
              onChange={(e) =>
                setFormData({ ...formData, categoria: e.target.value.toUpperCase() })
              }
              placeholder="Ex: EPI, ELÉTRICO, QUÍMICOS"
            />
          </div>

          {formData.tipo === "estoque" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimo">Estoque Mínimo</Label>
                <Input
                  id="minimo"
                  type="number"
                  min="0"
                  value={formData.estoque_minimo}
                  onChange={(e) =>
                    setFormData({ ...formData, estoque_minimo: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximo">Estoque Máximo</Label>
                <Input
                  id="maximo"
                  type="number"
                  min="0"
                  value={formData.estoque_maximo}
                  onChange={(e) =>
                    setFormData({ ...formData, estoque_maximo: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="valor">Valor Unitário (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_unitario}
              onChange={(e) =>
                setFormData({ ...formData, valor_unitario: e.target.value })
              }
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="obsoleto">Marcar como Obsoleto</Label>
              <p className="text-xs text-muted-foreground">
                Material não será mais usado
              </p>
            </div>
            <Switch
              id="obsoleto"
              checked={formData.obsoleto}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, obsoleto: checked })
              }
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Cadastrando..." : "Cadastrar Material"}
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
      </DialogContent>
    </Dialog>
  );
}
