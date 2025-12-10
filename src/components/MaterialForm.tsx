import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Material } from "@/types/material";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

interface MaterialFormProps {
  onSubmit: (material: Omit<Material, "id" | "dataCadastro">) => void;
  onCancel: () => void;
  initialData?: Material;
}

export function MaterialForm({ onSubmit, onCancel, initialData }: MaterialFormProps) {
  const [formData, setFormData] = useState({
    codigo: initialData?.codigo || "",
    descricao: initialData?.descricao || "",
    quantidadeAtual: initialData?.quantidadeAtual.toString() || "",
    localizacao: initialData?.localizacao || "",
    estoqueMinimo: initialData?.estoqueMinimo.toString() || "0",
    estoqueMaximo: initialData?.estoqueMaximo?.toString() || "",
    unidadeMedida: initialData?.unidadeMedida || "",
    fotoUrl: initialData?.fotoUrl || "",
    tipo: initialData?.tipo || "estoque",
    valorUnitario: initialData?.valorUnitario?.toString() || "",
    categoria: initialData?.categoria || "",
    obsoleto: initialData?.obsoleto || false,
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Imagem muito grande. Tamanho máximo: 5MB");
      return;
    }

    setUploadingImage(true);
    
    try {
      // Converter para base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, fotoUrl: reader.result as string });
        setUploadingImage(false);
      };
      reader.onerror = () => {
        alert("Erro ao carregar imagem");
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Erro ao processar imagem");
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Para consumível e empréstimo, usar 0 como estoque mínimo e máximo
    const estoqueMinimo = formData.tipo === "estoque" 
      ? (formData.estoqueMinimo ? Number(formData.estoqueMinimo) : 0)
      : 0;
    
    const estoqueMaximo = formData.tipo === "estoque" && formData.estoqueMaximo 
      ? Number(formData.estoqueMaximo) 
      : undefined;
    
    // Quantidade para todos os tipos de materiais
    const quantidadeAtual = Number(formData.quantidadeAtual) || 0;

    onSubmit({
      codigo: formData.codigo,
      descricao: formData.descricao,
      quantidadeAtual,
      localizacao: formData.localizacao,
      estoqueMinimo,
      estoqueMaximo,
      unidadeMedida: formData.unidadeMedida,
      fotoUrl: formData.fotoUrl || undefined,
      tipo: formData.tipo as "estoque" | "emprestimo" | "consumivel",
      valorUnitario: formData.valorUnitario ? Number(formData.valorUnitario) : undefined,
      categoria: formData.categoria || undefined,
      obsoleto: formData.obsoleto,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Material</Label>
        <RadioGroup
          value={formData.tipo}
          onValueChange={(value) => {
            // Quando mudar tipo para consumível ou empréstimo, definir estoque mínimo como 0
            const newTipo = value as "estoque" | "emprestimo" | "consumivel";
            setFormData({ 
              ...formData, 
              tipo: newTipo,
              estoqueMinimo: newTipo === "estoque" ? formData.estoqueMinimo : "0"
            });
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="estoque" id="estoque" />
            <Label htmlFor="estoque" className="font-normal cursor-pointer">Material de Estoque</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="emprestimo" id="emprestimo" />
            <Label htmlFor="emprestimo" className="font-normal cursor-pointer">Material de Empréstimo</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="consumivel" id="consumivel" />
            <Label htmlFor="consumivel" className="font-normal cursor-pointer">Material Consumível</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="codigo">Código do Material</Label>
        <Input
          id="codigo"
          value={formData.codigo}
          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          required
        />
      </div>

      {formData.tipo === "consumivel" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade Existente</Label>
            <Input
              id="quantidade"
              type="number"
              min="0"
              value={formData.quantidadeAtual}
              onChange={(e) => setFormData({ ...formData, quantidadeAtual: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unidadeMedida">Unidade de Medida</Label>
            <Input
              id="unidadeMedida"
              placeholder="Ex: UN, KG, M, L"
              value={formData.unidadeMedida}
              onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
              required
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade Inicial</Label>
            <Input
              id="quantidade"
              type="number"
              min="0"
              value={formData.quantidadeAtual}
              onChange={(e) => setFormData({ ...formData, quantidadeAtual: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidadeMedida">Unidade de Medida</Label>
            <Input
              id="unidadeMedida"
              placeholder="Ex: UN, KG, M, L"
              value={formData.unidadeMedida}
              onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
              required
            />
          </div>
        </div>
      )}

      {formData.tipo === "estoque" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minimo">Estoque Mínimo</Label>
            <Input
              id="minimo"
              type="number"
              min="0"
              value={formData.estoqueMinimo}
              onChange={(e) => setFormData({ ...formData, estoqueMinimo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maximo">Estoque Máximo (opcional)</Label>
            <Input
              id="maximo"
              type="number"
              min="0"
              value={formData.estoqueMaximo}
              onChange={(e) => setFormData({ ...formData, estoqueMaximo: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="localizacao">Localização</Label>
        <Input
          id="localizacao"
          placeholder="Ex: Prateleira A1, Caixa 5"
          value={formData.localizacao}
          onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoria de Utilização (opcional)</Label>
        <Input
          id="categoria"
          placeholder="Ex: EPI, ELÉTRICO, QUÍMICOS, HIDRÁULICO"
          value={formData.categoria}
          onChange={(e) => setFormData({ ...formData, categoria: e.target.value.toUpperCase() })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fotoUrl">Foto do Material (opcional)</Label>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="fotoFile" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 h-10 px-2 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-xs sm:text-sm">
                  {uploadingImage ? "Carregando..." : "📁 Arquivo"}
                </div>
              </Label>
              <Input
                id="fotoFile"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
            </div>
            <div>
              <Label htmlFor="fotoCamera" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 h-10 px-2 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors text-xs sm:text-sm">
                  {uploadingImage ? "Carregando..." : "📷 Câmera"}
                </div>
              </Label>
              <Input
                id="fotoCamera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fotoUrlInput">Ou insira o link da imagem</Label>
            <Input
              id="fotoUrlInput"
              type="url"
              placeholder="https://exemplo.com/imagem.jpg"
              value={formData.fotoUrl.startsWith('data:') ? '' : formData.fotoUrl}
              onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
              disabled={uploadingImage}
            />
          </div>

          {formData.fotoUrl && (
            <div className="relative">
              <img 
                src={formData.fotoUrl} 
                alt="Preview" 
                className="w-full h-32 object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setFormData({ ...formData, fotoUrl: "" })}
                className="absolute top-2 right-2"
              >
                Remover
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Tamanho máximo: 5MB. Formatos: JPG, PNG, WEBP ou URL de imagem
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="valorUnitario">Valor Unitário (R$) (opcional)</Label>
        <Input
          id="valorUnitario"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={formData.valorUnitario}
          onChange={(e) => setFormData({ ...formData, valorUnitario: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between space-x-2 p-4 border rounded-md">
        <div className="space-y-0.5">
          <Label htmlFor="obsoleto" className="text-base">
            Marcar como Obsoleto
          </Label>
          <p className="text-sm text-muted-foreground">
            Material não será mais usado e aparecerá com status "Obsoleto"
          </p>
        </div>
        <Switch
          id="obsoleto"
          checked={formData.obsoleto}
          onCheckedChange={(checked) => setFormData({ ...formData, obsoleto: checked })}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {initialData ? "Atualizar Material" : "Cadastrar Material"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
