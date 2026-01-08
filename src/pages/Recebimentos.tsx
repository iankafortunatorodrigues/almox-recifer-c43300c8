import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  FileImage,
  Package,
  Search,
  Calendar,
  Eye,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecebimentoItem {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  observacao?: string;
}

interface Recebimento {
  id: string;
  fornecedor: string;
  tipo_recebimento: string;
  data_recebimento: string;
  foto_nota_url?: string;
  observacao?: string;
  created_at: string;
  itens?: RecebimentoItem[];
}

interface Filters {
  search: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
}

export default function Recebimentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecebimento, setSelectedRecebimento] = useState<Recebimento | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    search: "",
    tipo: "todos",
    dataInicio: "",
    dataFim: "",
  });

  const [formData, setFormData] = useState({
    fornecedor: "",
    tipo_recebimento: "consumiveis",
    data_recebimento: format(new Date(), "yyyy-MM-dd"),
    foto_nota_url: "",
    observacao: "",
  });

  const [itens, setItens] = useState<RecebimentoItem[]>([
    { descricao: "", quantidade: 1, unidade: "UN", observacao: "" },
  ]);

  useEffect(() => {
    if (user) {
      fetchRecebimentos();
    }
  }, [user]);

  const fetchRecebimentos = async () => {
    try {
      const { data, error } = await supabase
        .from("recebimentos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecebimentos(data || []);
    } catch (error) {
      console.error("Erro ao buscar recebimentos:", error);
      toast.error("Erro ao carregar recebimentos");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("notas-fiscais")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("notas-fiscais")
        .getPublicUrl(fileName);

      setFormData({ ...formData, foto_nota_url: urlData.publicUrl });
      toast.success("Foto enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addItem = () => {
    setItens([...itens, { descricao: "", quantidade: 1, unidade: "UN", observacao: "" }]);
  };

  const removeItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof RecebimentoItem, value: string | number) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setItens(newItens);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validItens = itens.filter((item) => item.descricao.trim());
    if (validItens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    try {
      // Criar recebimento
      const { data: recebimento, error: recebimentoError } = await supabase
        .from("recebimentos")
        .insert({
          user_id: user.id,
          fornecedor: formData.fornecedor,
          tipo_recebimento: formData.tipo_recebimento,
          data_recebimento: formData.data_recebimento,
          foto_nota_url: formData.foto_nota_url || null,
          observacao: formData.observacao || null,
        })
        .select()
        .single();

      if (recebimentoError) throw recebimentoError;

      // Criar itens
      const itensToInsert = validItens.map((item) => ({
        recebimento_id: recebimento.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        observacao: item.observacao || null,
      }));

      const { error: itensError } = await supabase
        .from("recebimento_itens")
        .insert(itensToInsert);

      if (itensError) throw itensError;

      toast.success("Recebimento registrado com sucesso!");
      setDialogOpen(false);
      resetForm();
      fetchRecebimentos();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao registrar recebimento");
    }
  };

  const resetForm = () => {
    setFormData({
      fornecedor: "",
      tipo_recebimento: "consumiveis",
      data_recebimento: format(new Date(), "yyyy-MM-dd"),
      foto_nota_url: "",
      observacao: "",
    });
    setItens([{ descricao: "", quantidade: 1, unidade: "UN", observacao: "" }]);
  };

  const viewRecebimento = async (recebimento: Recebimento) => {
    try {
      const { data: itensData } = await supabase
        .from("recebimento_itens")
        .select("*")
        .eq("recebimento_id", recebimento.id);

      setSelectedRecebimento({ ...recebimento, itens: itensData || [] });
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    }
  };

  const deleteRecebimento = async (id: string) => {
    if (!confirm("Deseja realmente excluir este recebimento?")) return;

    try {
      const { error } = await supabase.from("recebimentos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Recebimento excluído!");
      fetchRecebimentos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir recebimento");
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "consumiveis": return "Consumíveis";
      case "materia_prima": return "Matéria Prima";
      case "vendas": return "Vendas";
      default: return tipo;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "consumiveis": return "secondary";
      case "materia_prima": return "default";
      case "vendas": return "outline";
      default: return "secondary";
    }
  };

  // Filtrar recebimentos
  const filteredRecebimentos = recebimentos.filter((r) => {
    const matchSearch =
      r.fornecedor.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.observacao?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchTipo = filters.tipo === "todos" || r.tipo_recebimento === filters.tipo;
    
    const matchDataInicio = !filters.dataInicio || r.data_recebimento >= filters.dataInicio;
    const matchDataFim = !filters.dataFim || r.data_recebimento <= filters.dataFim;

    return matchSearch && matchTipo && matchDataInicio && matchDataFim;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Recebimento de Materiais</h1>
              </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Recebimento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Recebimento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Foto da Nota Fiscal */}
                  <div className="space-y-2">
                    <Label>Foto da Nota Fiscal</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="fotoFile" className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 h-10 px-4 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">
                            <FileImage className="h-4 w-4" />
                            {uploadingPhoto ? "Enviando..." : "Arquivo"}
                          </div>
                        </Label>
                        <Input
                          id="fotoFile"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e)}
                          className="hidden"
                          disabled={uploadingPhoto}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="fotoCamera" className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                            <Camera className="h-4 w-4" />
                            {uploadingPhoto ? "Enviando..." : "Câmera"}
                          </div>
                        </Label>
                        <Input
                          id="fotoCamera"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handlePhotoUpload(e, true)}
                          className="hidden"
                          disabled={uploadingPhoto}
                        />
                      </div>
                    </div>
                    {formData.foto_nota_url && (
                      <div className="relative">
                        <img
                          src={formData.foto_nota_url}
                          alt="Nota Fiscal"
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setFormData({ ...formData, foto_nota_url: "" })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fornecedor">Fornecedor *</Label>
                      <Input
                        id="fornecedor"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                        placeholder="Nome do fornecedor"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Recebimento *</Label>
                      <Select
                        value={formData.tipo_recebimento}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tipo_recebimento: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consumiveis">Consumíveis</SelectItem>
                          <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                          <SelectItem value="vendas">Vendas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data">Data de Recebimento *</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data_recebimento}
                      onChange={(e) =>
                        setFormData({ ...formData, data_recebimento: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Itens */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Itens Recebidos *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Item
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {itens.map((item, index) => (
                        <Card key={index} className="p-3">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-12 sm:col-span-5">
                              <Input
                                placeholder="Descrição do item"
                                value={item.descricao}
                                onChange={(e) => updateItem(index, "descricao", e.target.value)}
                              />
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                              <Input
                                type="number"
                                min="1"
                                placeholder="Qtd"
                                value={item.quantidade}
                                onChange={(e) =>
                                  updateItem(index, "quantidade", parseInt(e.target.value) || 1)
                                }
                              />
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                              <Input
                                placeholder="UN"
                                value={item.unidade}
                                onChange={(e) => updateItem(index, "unidade", e.target.value)}
                              />
                            </div>
                            <div className="col-span-3 sm:col-span-2">
                              <Input
                                placeholder="Obs"
                                value={item.observacao || ""}
                                onChange={(e) => updateItem(index, "observacao", e.target.value)}
                              />
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                disabled={itens.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacao">Observação Geral</Label>
                    <Textarea
                      id="observacao"
                      value={formData.observacao}
                      onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                      placeholder="Observações sobre o recebimento..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      Registrar Recebimento
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Fornecedor ou observação..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={filters.tipo}
                  onValueChange={(value) => setFilters({ ...filters, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="consumiveis">Consumíveis</SelectItem>
                    <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
            </div>
            {(filters.search || filters.tipo !== "todos" || filters.dataInicio || filters.dataFim) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() =>
                  setFilters({ search: "", tipo: "todos", dataInicio: "", dataFim: "" })
                }
              >
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Lista de Recebimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recebimentos</span>
              <Badge variant="outline">{filteredRecebimentos.length} registros</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredRecebimentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum recebimento encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead className="text-center">Nota</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecebimentos.map((recebimento) => (
                      <TableRow key={recebimento.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(recebimento.data_recebimento), "dd/MM/yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{recebimento.fornecedor}</TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadgeVariant(recebimento.tipo_recebimento) as any}>
                            {getTipoLabel(recebimento.tipo_recebimento)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {recebimento.observacao || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {recebimento.foto_nota_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(recebimento.foto_nota_url, "_blank")}
                            >
                              <FileImage className="h-4 w-4 text-primary" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewRecebimento(recebimento)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecebimento(recebimento.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Recebimento</DialogTitle>
          </DialogHeader>
          {selectedRecebimento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Fornecedor</Label>
                  <p className="font-medium">{selectedRecebimento.fornecedor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRecebimento.data_recebimento), "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo</Label>
                  <Badge variant={getTipoBadgeVariant(selectedRecebimento.tipo_recebimento) as any}>
                    {getTipoLabel(selectedRecebimento.tipo_recebimento)}
                  </Badge>
                </div>
              </div>

              {selectedRecebimento.observacao && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observação</Label>
                  <p>{selectedRecebimento.observacao}</p>
                </div>
              )}

              {selectedRecebimento.foto_nota_url && (
                <div>
                  <Label className="text-muted-foreground text-xs">Nota Fiscal</Label>
                  <img
                    src={selectedRecebimento.foto_nota_url}
                    alt="Nota Fiscal"
                    className="w-full h-48 object-cover rounded-md mt-1 cursor-pointer"
                    onClick={() => window.open(selectedRecebimento.foto_nota_url, "_blank")}
                  />
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs">Itens Recebidos</Label>
                <div className="mt-2 space-y-2">
                  {selectedRecebimento.itens?.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span>{item.descricao}</span>
                      <Badge variant="outline">
                        {item.quantidade} {item.unidade}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
