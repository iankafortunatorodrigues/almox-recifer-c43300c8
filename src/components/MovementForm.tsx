import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Material, MovementType } from "@/types/material";
import { Search, Plus, Trash2, Package } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MovementItem {
  id: string;
  materialId: string;
  quantidade: number;
  materialInfo?: Material;
}

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
  onSubmitBatch?: (movements: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
  }[]) => void;
  onCancel: () => void;
  initialData?: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
  };
}

export function MovementForm({ materials, type, onSubmit, onSubmitBatch, onCancel, initialData }: MovementFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [movementItems, setMovementItems] = useState<MovementItem[]>([]);
  const [formData, setFormData] = useState({
    materialId: initialData?.materialId || "",
    quantidade: initialData?.quantidade?.toString() || "",
    responsavel: initialData?.responsavel || "",
    observacao: initialData?.observacao || "",
    descricao: "",
  });

  const isBatchMode = (type === "entrada" || type === "saida") && !initialData && !isManualEntry;

  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials;
    return materials.filter((material) =>
      material.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.descricao.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [materials, searchQuery]);

  // Filter out materials already added to batch
  const availableMaterials = useMemo(() => {
    if (!isBatchMode) return filteredMaterials;
    const addedIds = movementItems.map(item => item.materialId);
    return filteredMaterials.filter(m => !addedIds.includes(m.id));
  }, [filteredMaterials, movementItems, isBatchMode]);

  const handleAddToBatch = () => {
    if (!formData.materialId || !formData.quantidade) return;
    
    const material = materials.find(m => m.id === formData.materialId);
    const quantidade = Number(formData.quantidade);
    
    // For saida, validate stock
    if (type === "saida" && material && material.tipo !== "consumivel") {
      if (quantidade > material.quantidadeAtual) {
        return; // Cannot add more than available stock
      }
    }
    
    const newItem: MovementItem = {
      id: crypto.randomUUID(),
      materialId: formData.materialId,
      quantidade: quantidade,
      materialInfo: material,
    };
    
    setMovementItems([...movementItems, newItem]);
    setFormData({ ...formData, materialId: "", quantidade: "" });
    setSearchQuery("");
  };

  const handleRemoveFromBatch = (id: string) => {
    setMovementItems(movementItems.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, quantidade: number) => {
    setMovementItems(movementItems.map(item => 
      item.id === id ? { ...item, quantidade } : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBatchMode && movementItems.length > 0 && onSubmitBatch) {
      // Submit batch
      const batchMovements = movementItems.map(item => ({
        materialId: item.materialId,
        quantidade: item.quantidade,
        responsavel: formData.responsavel,
        observacao: formData.observacao || undefined,
      }));
      onSubmitBatch(batchMovements);
    } else {
      // Single submission
      onSubmit({
        materialId: formData.materialId,
        quantidade: Number(formData.quantidade),
        responsavel: formData.responsavel,
        observacao: formData.observacao || undefined,
        isManualEntry: isManualEntry,
        descricao: isManualEntry ? formData.descricao : undefined,
      });
    }
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

      {/* Batch mode list */}
      {isBatchMode && movementItems.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Materiais {type === "saida" ? "para saída" : "adicionados"} ({movementItems.length})
          </Label>
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {movementItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50">
                {item.materialInfo?.fotoUrl && (
                  <img
                    src={item.materialInfo.fotoUrl}
                    alt={item.materialInfo.descricao}
                    className="w-10 h-10 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.materialInfo?.codigo} - {item.materialInfo?.descricao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Local: {item.materialInfo?.localizacao}
                    {type === "saida" && item.materialInfo?.tipo !== "consumivel" && (
                      <span className="ml-2">| Estoque: {item.materialInfo?.quantidadeAtual}</span>
                    )}
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max={type === "saida" && item.materialInfo?.tipo !== "consumivel" ? item.materialInfo?.quantidadeAtual : undefined}
                  value={item.quantidade}
                  onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                  className="w-20 h-8"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {item.materialInfo?.unidadeMedida}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleRemoveFromBatch(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isManualEntry ? (
        <div className="space-y-2">
          <Label htmlFor="material">
            {isBatchMode ? "Adicionar Material" : "Material"}
          </Label>
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
              {availableMaterials.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Nenhum material encontrado
                </div>
              ) : (
                availableMaterials.map((material) => (
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
                  Estoque: {selectedMaterial.tipo === "consumivel" ? "∞" : selectedMaterial.quantidadeAtual} {selectedMaterial.unidadeMedida} | 
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
        <div className="flex gap-2">
          <Input
            id="quantidade"
            type="number"
            min="1"
            max={(type === "saida" || type === "emprestimo") && selectedMaterial && selectedMaterial.tipo !== "consumivel" ? selectedMaterial.quantidadeAtual : undefined}
            value={formData.quantidade}
            onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
            required={!isBatchMode || movementItems.length === 0}
            className="flex-1"
          />
          {isBatchMode && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddToBatch}
              disabled={!formData.materialId || !formData.quantidade}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
        {selectedMaterial?.tipo === "consumivel" && (
          <p className="text-xs text-muted-foreground">Material consumível - quantidade infinita disponível</p>
        )}
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
          disabled={
            isBatchMode 
              ? movementItems.length === 0 
              : (!isManualEntry && !formData.materialId)
          }
        >
          {initialData ? "Atualizar" : "Registrar"}{" "}
          {type === "entrada" 
            ? isBatchMode && movementItems.length > 0 
              ? `Entrada (${movementItems.length} ${movementItems.length === 1 ? 'item' : 'itens'})`
              : "Entrada"
            : type === "saida" 
              ? isBatchMode && movementItems.length > 0
                ? `Saída (${movementItems.length} ${movementItems.length === 1 ? 'item' : 'itens'})`
                : isManualEntry ? "Saída de Consumo" : "Saída"
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
