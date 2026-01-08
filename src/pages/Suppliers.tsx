import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Plus,
  Search,
  Building2,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  categoria: string | null;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
}

const emptySupplier = {
  nome: "",
  cnpj: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  contato_nome: "",
  contato_telefone: "",
  categoria: "",
  observacao: "",
};

export default function Suppliers() {
  const { user } = useAuth();
  const { isAdmin, isCompras, isDiretor, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState(emptySupplier);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const canManage = isCompras || isAdmin;

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar fornecedores:", error);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading && user) {
      loadSuppliers();
    }
  }, [roleLoading, user, loadSuppliers]);

  const filteredSuppliers = suppliers.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.nome.toLowerCase().includes(query) ||
      s.cnpj?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.cidade?.toLowerCase().includes(query) ||
      s.categoria?.toLowerCase().includes(query)
    );
  });

  const handleOpenNew = () => {
    setEditingSupplier(null);
    setFormData(emptySupplier);
    setShowDialog(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      nome: supplier.nome,
      cnpj: supplier.cnpj || "",
      email: supplier.email || "",
      telefone: supplier.telefone || "",
      endereco: supplier.endereco || "",
      cidade: supplier.cidade || "",
      estado: supplier.estado || "",
      cep: supplier.cep || "",
      contato_nome: supplier.contato_nome || "",
      contato_telefone: supplier.contato_telefone || "",
      categoria: supplier.categoria || "",
      observacao: supplier.observacao || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const dataToSave = {
        nome: formData.nome,
        cnpj: formData.cnpj || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep || null,
        contato_nome: formData.contato_nome || null,
        contato_telefone: formData.contato_telefone || null,
        categoria: formData.categoria || null,
        observacao: formData.observacao || null,
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(dataToSave)
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast.success("Fornecedor atualizado!");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert(dataToSave);

        if (error) throw error;
        toast.success("Fornecedor cadastrado!");
      }

      setShowDialog(false);
      loadSuppliers();
    } catch (error: any) {
      console.error("Erro ao salvar fornecedor:", error);
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplierToDelete.id);

      if (error) throw error;
      toast.success("Fornecedor excluído!");
      setShowDeleteConfirm(false);
      setSupplierToDelete(null);
      loadSuppliers();
    } catch (error: any) {
      console.error("Erro ao excluir fornecedor:", error);
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const confirmDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteConfirm(true);
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")} className="shrink-0 h-9 w-9">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-xl font-bold truncate">Fornecedores</h1>
              </div>
            </div>
            {canManage && (
              <Button onClick={handleOpenNew} size="sm" className="gap-1.5 shrink-0 h-8 sm:h-9">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Fornecedor</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ, email, cidade ou categoria..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{suppliers.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {suppliers.filter((s) => s.ativo).length}
            </div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {new Set(suppliers.map((s) => s.categoria).filter(Boolean)).size}
            </div>
            <div className="text-sm text-muted-foreground">Categorias</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(suppliers.map((s) => s.cidade).filter(Boolean)).size}
            </div>
            <div className="text-sm text-muted-foreground">Cidades</div>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <ScrollArea className="h-[calc(100vh-380px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.nome}</div>
                          {supplier.cnpj && (
                            <div className="text-xs text-muted-foreground">{supplier.cnpj}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.telefone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {supplier.telefone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.cidade && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {supplier.cidade}
                            {supplier.estado && ` - ${supplier.estado}`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.categoria && (
                          <Badge variant="secondary">{supplier.categoria}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.ativo ? "default" : "secondary"}>
                          {supplier.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(supplier)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => confirmDelete(supplier)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </main>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@fornecedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  maxLength={2}
                  placeholder="UF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contato_nome">Nome do Contato</Label>
                <Input
                  id="contato_nome"
                  value={formData.contato_nome}
                  onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                  placeholder="Pessoa de contato"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato_telefone">Telefone do Contato</Label>
                <Input
                  id="contato_telefone"
                  value={formData.contato_telefone}
                  onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="Ex: Material de escritório, Eletrônicos, Serviços..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Informações adicionais sobre o fornecedor..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSupplier ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o fornecedor "{supplierToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
