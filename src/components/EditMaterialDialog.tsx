import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MaterialData {
  id: string;
  codigo: string;
  descricao: string;
  quantidade_atual: number;
  localizacao: string;
  estoque_minimo: number;
  estoque_maximo: number | null;
  unidade_medida: string;
  categoria: string | null;
  obsoleto: boolean | null;
  tipo: string;
  valor_unitario: number | null;
}

interface EditMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialData | null;
  onSubmit: (data: Partial<MaterialData>) => void;
  isLoading?: boolean;
}

export function EditMaterialDialog({
  open,
  onOpenChange,
  material,
  onSubmit,
  isLoading,
}: EditMaterialDialogProps) {
  const [formData, setFormData] = useState({
    codigo: "",
    descricao: "",
    localizacao: "",
    estoque_minimo: "",
    estoque_maximo: "",
    unidade_medida: "",
    categoria: "",
    valor_unitario: "",
    obsoleto: false,
  });

  useEffect(() => {
    if (material) {
      setFormData({
        codigo: material.codigo,
        descricao: material.descricao,
        localizacao: material.localizacao,
        estoque_minimo: material.estoque_minimo.toString(),
        estoque_maximo: material.estoque_maximo?.toString() || "",
        unidade_medida: material.unidade_medida,
        categoria: material.categoria || "",
        valor_unitario: material.valor_unitario?.toString() || "",
        obsoleto: material.obsoleto || false,
      });
    }
  }, [material]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!material) return;

    onSubmit({
      id: material.id,
      codigo: formData.codigo,
      descricao: formData.descricao,
      localizacao: formData.localizacao,
      estoque_minimo: Number(formData.estoque_minimo),
      estoque_maximo: formData.estoque_maximo ? Number(formData.estoque_maximo) : null,
      unidade_medida: formData.unidade_medida,
      categoria: formData.categoria || null,
      valor_unitario: formData.valor_unitario ? Number(formData.valor_unitario) : null,
      obsoleto: formData.obsoleto,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Material</DialogTitle>
          <DialogDescription>
            Atualize as informações do material
          </DialogDescription>
        </DialogHeader>

        {material && (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) =>
                  setFormData({ ...formData, localizacao: e.target.value })
                }
                required
              />
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
                {isLoading ? "Salvando..." : "Salvar Alterações"}
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
