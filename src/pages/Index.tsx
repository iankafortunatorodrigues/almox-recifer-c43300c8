import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Material, Movimentacao } from "@/types/material";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MaterialForm } from "@/components/MaterialForm";
import { MovementForm } from "@/components/MovementForm";
import { MaterialsTable } from "@/components/MaterialsTable";
import { HistoryTable } from "@/components/HistoryTable";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, DollarSign, Search, Plus, ArrowDownCircle, ArrowUpCircle, Calendar } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const { role, isAdmin, isCompras } = useUserRole();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [stockLocationFilter, setStockLocationFilter] = useState("all");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");
  const [loanStatusFilter, setLoanStatusFilter] = useState("all");
  const [loanLocationFilter, setLoanLocationFilter] = useState("all");
  const [loanCategoryFilter, setLoanCategoryFilter] = useState("all");
  const [consumableStatusFilter, setConsumableStatusFilter] = useState("all");
  const [consumableLocationFilter, setConsumableLocationFilter] = useState("all");
  const [consumableCategoryFilter, setConsumableCategoryFilter] = useState("all");

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingMovement, setEditingMovement] = useState<Movimentacao | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<Movimentacao | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [quickActionMaterial, setQuickActionMaterial] = useState<Material | null>(null);
  const [quickActionType, setQuickActionType] = useState<"entrada" | "saida" | "emprestimo" | "devolucao" | null>(null);

  // Carregar materiais do banco de dados
  const loadMaterials = async () => {
    if (!user) return;

    let query = supabase.from("materials").select("*");
    
    if (!isCompras) {
      query = query.eq("user_id", user.id);
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.log("Erro ao carregar materiais:", error);
      toast.error("Erro ao carregar materiais");
      return;
    }

    const materialsData: Material[] = (data || []).map((m: any) => ({
      id: m.id,
      codigo: m.codigo,
      descricao: m.descricao,
      quantidadeAtual: m.quantidade_atual,
      localizacao: m.localizacao,
      estoqueMinimo: m.estoque_minimo,
      estoqueMaximo: m.estoque_maximo,
      unidadeMedida: m.unidade_medida,
      dataCadastro: m.created_at,
      fotoUrl: m.foto_url,
      tipo: m.tipo,
      valorUnitario: m.valor_unitario ? parseFloat(m.valor_unitario) : undefined,
      categoria: m.categoria,
      statusCompra: m.status_compra || "pendente",
      obsoleto: m.obsoleto || false,
      dataCompra: m.data_compra,
      dataEntrega: m.data_entrega
    }));

    setMaterials(materialsData);
  };

  const loadMovements = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("movimentacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("data", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar movimentações");
      return;
    }

    const movementsData: Movimentacao[] = (data || []).map((m: any) => ({
      id: m.id,
      materialId: m.material_id,
      tipo: m.tipo,
      quantidade: m.quantidade,
      data: m.data,
      responsavel: m.responsavel,
      observacao: m.observacao,
      fotoUrl: m.foto_url
    }));

    setMovements(movementsData);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadMaterials(), loadMovements()]);
      setLoading(false);
    };

    loadData();
  }, [user, isCompras]);

  // Realtime updates for materials
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('materials-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMaterial: Material = {
              id: payload.new.id,
              codigo: payload.new.codigo,
              descricao: payload.new.descricao,
              quantidadeAtual: payload.new.quantidade_atual,
              localizacao: payload.new.localizacao,
              estoqueMinimo: payload.new.estoque_minimo,
              estoqueMaximo: payload.new.estoque_maximo,
              unidadeMedida: payload.new.unidade_medida,
              dataCadastro: payload.new.created_at,
              fotoUrl: payload.new.foto_url,
              tipo: payload.new.tipo,
              valorUnitario: payload.new.valor_unitario ? parseFloat(payload.new.valor_unitario) : undefined,
              categoria: payload.new.categoria,
              statusCompra: payload.new.status_compra || "pendente",
              obsoleto: payload.new.obsoleto || false,
              dataCompra: payload.new.data_compra,
              dataEntrega: payload.new.data_entrega
            };
            setMaterials(prev => [newMaterial, ...prev]);
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedMaterial: Material = {
              id: payload.new.id,
              codigo: payload.new.codigo,
              descricao: payload.new.descricao,
              quantidadeAtual: payload.new.quantidade_atual,
              localizacao: payload.new.localizacao,
              estoqueMinimo: payload.new.estoque_minimo,
              estoqueMaximo: payload.new.estoque_maximo,
              unidadeMedida: payload.new.unidade_medida,
              dataCadastro: payload.new.created_at,
              fotoUrl: payload.new.foto_url,
              tipo: payload.new.tipo,
              valorUnitario: payload.new.valor_unitario ? parseFloat(payload.new.valor_unitario) : undefined,
              categoria: payload.new.categoria,
              statusCompra: payload.new.status_compra || "pendente",
              obsoleto: payload.new.obsoleto || false,
              dataCompra: payload.new.data_compra,
              dataEntrega: payload.new.data_entrega
            };
            setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
          } 
          else if (payload.eventType === 'DELETE') {
            setMaterials(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Realtime updates for movements
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('movements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movimentacoes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMovement: Movimentacao = {
              id: payload.new.id,
              materialId: payload.new.material_id,
              tipo: payload.new.tipo,
              quantidade: payload.new.quantidade,
              data: payload.new.data,
              responsavel: payload.new.responsavel,
              observacao: payload.new.observacao,
              fotoUrl: payload.new.foto_url
            };
            setMovements(prev => [newMovement, ...prev]);
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedMovement: Movimentacao = {
              id: payload.new.id,
              materialId: payload.new.material_id,
              tipo: payload.new.tipo,
              quantidade: payload.new.quantidade,
              data: payload.new.data,
              responsavel: payload.new.responsavel,
              observacao: payload.new.observacao,
              fotoUrl: payload.new.foto_url
            };
            setMovements(prev => prev.map(m => m.id === updatedMovement.id ? updatedMovement : m));
          } 
          else if (payload.eventType === 'DELETE') {
            setMovements(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAddMaterial = async (materialData: Omit<Material, "id" | "dataCadastro">) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("materials")
      .insert({
        user_id: user.id,
        codigo: materialData.codigo,
        descricao: materialData.descricao,
        quantidade_atual: materialData.quantidadeAtual,
        localizacao: materialData.localizacao,
        estoque_minimo: materialData.estoqueMinimo,
        estoque_maximo: materialData.estoqueMaximo,
        unidade_medida: materialData.unidadeMedida,
        foto_url: materialData.fotoUrl,
        tipo: materialData.tipo,
        valor_unitario: materialData.valorUnitario,
        categoria: materialData.categoria,
        obsoleto: materialData.obsoleto
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("Já existe um material com este código");
      } else {
        toast.error(`Erro ao cadastrar material: ${error.message || "Erro desconhecido"}`);
      }
      return;
    }

    await loadMaterials();
    setIsAddMaterialOpen(false);
    toast.success("Material cadastrado com sucesso!");
  };

  const handleUpdateMaterial = async (materialData: Omit<Material, "id" | "dataCadastro">) => {
    if (!editingMaterial || !user) return;

    const { error } = await supabase
      .from("materials")
      .update({
        codigo: materialData.codigo,
        descricao: materialData.descricao,
        quantidade_atual: materialData.quantidadeAtual,
        localizacao: materialData.localizacao,
        estoque_minimo: materialData.estoqueMinimo,
        estoque_maximo: materialData.estoqueMaximo,
        unidade_medida: materialData.unidadeMedida,
        foto_url: materialData.fotoUrl,
        tipo: materialData.tipo,
        valor_unitario: materialData.valorUnitario,
        categoria: materialData.categoria,
        obsoleto: materialData.obsoleto
      })
      .eq("id", editingMaterial.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao atualizar material");
      return;
    }

    await loadMaterials();
    setEditingMaterial(null);
    toast.success("Material atualizado com sucesso!");
  };

  const handleMovement = async (
    type: "entrada" | "saida" | "emprestimo" | "devolucao",
    movementData: {
      materialId: string;
      quantidade: number;
      responsavel: string;
      observacao?: string;
      isManualEntry?: boolean;
      descricao?: string;
    }
  ) => {
    if (!user) return;

    let finalMaterialId = movementData.materialId;

    if (movementData.isManualEntry && movementData.descricao && type === "saida") {
      const codigo = `CONS-${Date.now()}`;
      const { data: newMaterial, error: createError } = await supabase
        .from("materials")
        .insert({
          user_id: user.id,
          codigo: codigo,
          descricao: movementData.descricao,
          quantidade_atual: 0,
          localizacao: "Consumível",
          estoque_minimo: 0,
          unidade_medida: "UN",
          tipo: "consumivel"
        })
        .select()
        .single();

      if (createError || !newMaterial) {
        toast.error("Erro ao criar material de consumo");
        return;
      }

      finalMaterialId = newMaterial.id;
    }

    const material = materials.find(m => m.id === finalMaterialId);
    const { error: movementError } = await supabase
      .from("movimentacoes")
      .insert({
        user_id: user.id,
        material_id: finalMaterialId,
        tipo: type,
        quantidade: movementData.quantidade,
        responsavel: movementData.responsavel,
        observacao: movementData.observacao
      });

    if (movementError) {
      if (movementError.message.includes("Estoque insuficiente")) {
        toast.error("Estoque insuficiente para esta operação");
      } else if (movementError.message.includes("Material não encontrado")) {
        toast.error("Material não encontrado");
      } else {
        toast.error("Erro ao registrar movimentação");
      }
      return;
    }

    await Promise.all([loadMaterials(), loadMovements()]);

    switch (type) {
      case "entrada":
        setIsEntradaOpen(false);
        break;
      case "saida":
        setIsSaidaOpen(false);
        break;
    }

    const { data: updatedMaterials } = await supabase
      .from("materials")
      .select("*")
      .eq("id", movementData.materialId)
      .eq("user_id", user.id)
      .single();

    if (updatedMaterials && material && updatedMaterials.quantidade_atual <= material.estoqueMinimo) {
      toast.warning(
        `⚠️ Material ${material.codigo} está abaixo do estoque mínimo`
      );
    }

    const typeLabels = {
      entrada: "Entrada",
      saida: "Saída",
      emprestimo: "Empréstimo",
      devolucao: "Devolução"
    };
    toast.success(`${typeLabels[type]} registrada com sucesso!`);
  };

  const handleUpdateMovement = async (movementData: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
  }) => {
    if (!editingMovement || !user) return;

    const { error: movementError } = await supabase
      .from("movimentacoes")
      .update({
        material_id: movementData.materialId,
        quantidade: movementData.quantidade,
        responsavel: movementData.responsavel,
        observacao: movementData.observacao
      })
      .eq("id", editingMovement.id)
      .eq("user_id", user.id);

    if (movementError) {
      if (movementError.message.includes("Estoque insuficiente")) {
        toast.error("Estoque insuficiente para esta operação");
      } else {
        toast.error("Erro ao atualizar movimentação");
      }
      return;
    }

    await Promise.all([loadMaterials(), loadMovements()]);
    setEditingMovement(null);
    toast.success("Movimentação atualizada com sucesso!");
  };

  const handleDeleteMovement = async () => {
    if (!deletingMovement || !user) return;

    const { error: movementError } = await supabase
      .from("movimentacoes")
      .delete()
      .eq("id", deletingMovement.id)
      .eq("user_id", user.id);

    if (movementError) {
      toast.error("Erro ao excluir movimentação");
      return;
    }

    await Promise.all([loadMaterials(), loadMovements()]);
    setDeletingMovement(null);
    toast.success("Movimentação excluída com sucesso!");
  };

  const handleDeleteMaterial = async () => {
    if (!deletingMaterial || !user) return;

    const materialMovements = movements.filter(m => m.materialId === deletingMaterial.id);
    if (materialMovements.length > 0) {
      toast.error("Não é possível excluir um material com movimentações registradas");
      setDeletingMaterial(null);
      return;
    }

    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", deletingMaterial.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao excluir material");
      return;
    }

    await loadMaterials();
    setDeletingMaterial(null);
    toast.success("Material excluído com sucesso!");
  };

  const handleTogglePurchaseStatus = async (material: Material, newStatus: "pendente" | "em_cotacao" | "comprado") => {
    if (!user) return;
    
    const { error } = await supabase
      .from("materials")
      .update({ status_compra: newStatus })
      .eq("id", material.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao atualizar status de compra");
      return;
    }

    toast.success(`Status atualizado!`);
    await loadMaterials();
  };

  const handleToggleObsolete = async (material: Material) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("materials")
      .update({ obsoleto: !material.obsoleto })
      .eq("id", material.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao atualizar material");
      return;
    }

    toast.success(material.obsoleto ? "Material reativado!" : "Material marcado como obsoleto!");
    await loadMaterials();
  };

  const handleQuickAction = (material: Material, action: "entrada" | "saida" | "emprestimo" | "devolucao") => {
    setQuickActionMaterial(material);
    setQuickActionType(action);
  };

  // Filtered data
  const filteredMaterials = materials.filter(
    m =>
      m.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.descricao.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stockMaterials = filteredMaterials.filter(m => m.tipo === "estoque");
  const loanMaterials = filteredMaterials.filter(m => m.tipo === "emprestimo");
  const lowStockMaterials = materials.filter(m => m.tipo === "estoque" && m.quantidadeAtual <= m.estoqueMinimo);
  const totalItems = materials.reduce((acc, m) => acc + m.quantidadeAtual, 0);

  // Monthly movements
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyMovements = movements.filter(m => {
    const date = new Date(m.data);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const entriesThisMonth = monthlyMovements.filter(m => m.tipo === "entrada").reduce((acc, m) => acc + m.quantidade, 0);
  const exitsThisMonth = monthlyMovements.filter(m => m.tipo === "saida").reduce((acc, m) => acc + m.quantidade, 0);

  // Stock value
  const stockValue = materials.reduce((acc, m) => acc + (m.quantidadeAtual * (m.valorUnitario || 0)), 0);

  // Purchases pending
  const purchasesPending = lowStockMaterials.filter(m => m.statusCompra === "pendente").length;

  const userName = user?.email?.split("@")[0] || "Usuário";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Bem-vindo, ${userName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsAddMaterialOpen(true)} 
            disabled={role === "compras" || role === "diretor"}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Material
          </Button>
          <Button 
            onClick={() => setIsEntradaOpen(true)} 
            variant="outline"
            className="border-success text-success hover:bg-success hover:text-success-foreground"
            disabled={role === "compras" || role === "diretor"}
            size="sm"
          >
            <ArrowDownCircle className="h-4 w-4 mr-1" />
            Entrada
          </Button>
          <Button 
            onClick={() => setIsSaidaOpen(true)} 
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            disabled={role === "compras" || role === "diretor"}
            size="sm"
          >
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Saída
          </Button>
        </div>
      }
    >
      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{totalItems.toLocaleString('pt-BR')}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-warning">{lowStockMaterials.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Empréstimos Pendentes</p>
                <p className="text-2xl font-bold">{loanMaterials.filter(m => m.quantidadeAtual > 0).length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compras Pendentes</p>
                <p className="text-2xl font-bold">{purchasesPending}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Entradas (Mês)</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xl font-bold">{entriesThisMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Saídas (Mês)</p>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xl font-bold">{exitsThisMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Valor em Estoque</p>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold">
                {stockValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Movimentações (Mês)</p>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xl font-bold">{monthlyMovements.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Materials List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Materiais Disponíveis</CardTitle>
                <span className="text-sm text-muted-foreground">{stockMaterials.length} itens</span>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código ou categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {stockMaterials.slice(0, 10).map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setEditingMaterial(material)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{material.descricao}</span>
                        <Badge variant={material.quantidadeAtual > material.estoqueMinimo ? "default" : "destructive"} className="text-xs">
                          {material.quantidadeAtual > material.estoqueMinimo ? "Ativo" : "Baixo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {material.codigo} • {material.categoria || "Sem categoria"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{material.quantidadeAtual} {material.unidadeMedida}</p>
                      <p className="text-xs text-muted-foreground">Min: {material.estoqueMinimo}</p>
                    </div>
                  </div>
                ))}
                {stockMaterials.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum material encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Alertas de Estoque</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {lowStockMaterials.slice(0, 5).map((material) => (
                  <div key={material.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{material.descricao}</p>
                        <p className="text-xs text-muted-foreground">{material.codigo}</p>
                      </div>
                      <Badge variant="outline" className="text-warning border-warning text-xs">
                        Baixo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estoque: {material.quantidadeAtual} / Mín: {material.estoqueMinimo}
                    </p>
                  </div>
                ))}
                {lowStockMaterials.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Nenhum alerta
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[200px] overflow-y-auto">
                {movements.slice(0, 5).map((movement) => {
                  const material = materials.find(m => m.id === movement.materialId);
                  return (
                    <div key={movement.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          movement.tipo === 'entrada' ? 'bg-success' : 
                          movement.tipo === 'saida' ? 'bg-destructive' : 
                          'bg-warning'
                        }`} />
                        <span className="text-sm font-medium capitalize">{movement.tipo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {material?.descricao || 'Material removido'} - {movement.quantidade} un
                      </p>
                    </div>
                  );
                })}
                {movements.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Nenhuma atividade
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Material</DialogTitle>
            <DialogDescription>Preencha as informações do material</DialogDescription>
          </DialogHeader>
          <MaterialForm onSubmit={handleAddMaterial} onCancel={() => setIsAddMaterialOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEntradaOpen || (quickActionType === "entrada" && !!quickActionMaterial)}
        onOpenChange={open => {
          setIsEntradaOpen(open);
          if (!open) {
            setQuickActionMaterial(null);
            setQuickActionType(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Entrada</DialogTitle>
            <DialogDescription>Registre a entrada de materiais</DialogDescription>
          </DialogHeader>
          <MovementForm
            materials={materials}
            type="entrada"
            onSubmit={data => {
              handleMovement("entrada", data);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            onCancel={() => {
              setIsEntradaOpen(false);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            initialData={
              quickActionMaterial && quickActionType === "entrada"
                ? { materialId: quickActionMaterial.id, quantidade: 1, responsavel: "", observacao: "" }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSaidaOpen || (quickActionType === "saida" && !!quickActionMaterial)}
        onOpenChange={open => {
          setIsSaidaOpen(open);
          if (!open) {
            setQuickActionMaterial(null);
            setQuickActionType(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Saída</DialogTitle>
            <DialogDescription>Registre a saída de materiais</DialogDescription>
          </DialogHeader>
          <MovementForm
            materials={materials}
            type="saida"
            onSubmit={data => {
              handleMovement("saida", data);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            onCancel={() => {
              setIsSaidaOpen(false);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            initialData={
              quickActionMaterial && quickActionType === "saida"
                ? { materialId: quickActionMaterial.id, quantidade: 1, responsavel: "", observacao: "" }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMaterial} onOpenChange={open => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>Atualize as informações do material</DialogDescription>
          </DialogHeader>
          <MaterialForm
            initialData={editingMaterial || undefined}
            onSubmit={handleUpdateMaterial}
            onCancel={() => setEditingMaterial(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMovement} onOpenChange={open => !open && setEditingMovement(null)}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Movimentação</DialogTitle>
            <DialogDescription>Atualize as informações</DialogDescription>
          </DialogHeader>
          <MovementForm
            materials={materials}
            type={editingMovement?.tipo || "entrada"}
            onSubmit={handleUpdateMovement}
            onCancel={() => setEditingMovement(null)}
            initialData={editingMovement || undefined}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMovement} onOpenChange={open => !open && setDeletingMovement(null)}>
        <AlertDialogContent className="w-[95vw] sm:w-full max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMovement}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingMaterial} onOpenChange={open => !open && setDeletingMaterial(null)}>
        <AlertDialogContent className="w-[95vw] sm:w-full max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão do material</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o material "{deletingMaterial?.descricao}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaterial}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Index;
