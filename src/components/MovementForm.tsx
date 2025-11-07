import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Material, MovementType } from "@/types/material";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MovementFormProps {
  materials: Material[];
  type: MovementType;
  onSubmit: (movement: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
    isManualEntry?: boolean;
    descricao?: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
  };
}

export function MovementForm({ materials, type, onSubmit, onCancel, initialData }: MovementFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [formData, setFormData] = useState({
    materialId: initialData?.materialId || "",
    quantidade: initialData?.quantidade?.toString() || "",
    responsavel: initialData?.responsavel || "",
    observacao: initialData?.observacao || "",
    descricao: "",
  });

  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials;
    return materials.filter((material) =>
      material.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.descricao.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [materials, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      materialId: formData.materialId,
      quantidade: Number(formData.quantidade),
      responsavel: formData.responsavel,
      observacao: formData.observacao || undefined,
      isManualEntry: isManualEntry,
      descricao: isManualEntry ? formData.descricao : undefined,
    });
  };

  const selectedMaterial = materials.find((m) => m.id === formData.materialId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type === "saida" && (
        <div className="space-y-2">
          <Label>Tipo de Saída</Label>
          <Select 
            value={isManualEntry ? "manual" : "cadastrado"} 
            onValueChange={(value) => {
              setIsManualEntry(value === "manual");
              if (value === "manual") {
                setFormData({ ...formData, materialId: "" });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cadastrado">Material Cadastrado</SelectItem>
              <SelectItem value="manual">Material Obsoleto ou de Consumo</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Materiais obsoletos ou de consumo não precisam ter estoque mínimo/máximo
          </p>
        </div>
      )}

      {!isManualEntry ? (
        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar material por código ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 mb-2"
            />
          </div>
          <Select value={formData.materialId} onValueChange={(value) => setFormData({ ...formData, materialId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um material" />
            </SelectTrigger>
            <SelectContent>
              {filteredMaterials.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Nenhum material encontrado
                </div>
              ) : (
                filteredMaterials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.codigo} - {material.descricao}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedMaterial && (
            <div className="flex gap-3 items-start p-3 bg-muted rounded-lg">
              {selectedMaterial.fotoUrl && (
                <img
                  src={selectedMaterial.fotoUrl}
                  alt={selectedMaterial.descricao}
                  className="w-16 h-16 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/64?text=Sem+Foto";
                  }}
                />
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">{selectedMaterial.codigo} - {selectedMaterial.descricao}</p>
                <p className="text-muted-foreground">
                  Estoque: {selectedMaterial.quantidadeAtual} {selectedMaterial.unidadeMedida} | 
                  Local: {selectedMaterial.localizacao}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição do Material</Label>
          <Input
            id="descricao"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Ex: Papel A4, Caneta azul, etc."
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="quantidade">Quantidade</Label>
        <Input
          id="quantidade"
          type="number"
          min="1"
          max={(type === "saida" || type === "emprestimo") && selectedMaterial ? selectedMaterial.quantidadeAtual : undefined}
          value={formData.quantidade}
          onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsavel">Responsável</Label>
        <Input
          id="responsavel"
          value={formData.responsavel}
          onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacao">Observação (opcional)</Label>
        <Textarea
          id="observacao"
          value={formData.observacao}
          onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1" 
          variant={
            type === "entrada" || type === "devolucao" 
              ? "default" 
              : type === "emprestimo" 
                ? "secondary" 
                : "destructive"
          }
          disabled={!isManualEntry && !formData.materialId}
        >
          {initialData ? "Atualizar" : "Registrar"}{" "}
          {type === "entrada" 
            ? "Entrada" 
            : type === "saida" 
              ? isManualEntry ? "Saída de Consumo" : "Saída"
              : type === "emprestimo" 
                ? "Empréstimo" 
                : "Devolução"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
