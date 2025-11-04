import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Material, Movimentacao } from "@/types/material";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { StatsCard } from "@/components/StatsCard";
import { MaterialForm } from "@/components/MaterialForm";
import { MovementForm } from "@/components/MovementForm";
import { MaterialsTable } from "@/components/MaterialsTable";
import { HistoryTable } from "@/components/HistoryTable";
import { LoansTable } from "@/components/LoansTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package, TrendingDown, TrendingUp, AlertTriangle, Plus, ArrowDownCircle, ArrowUpCircle, HandHelping, Undo2, LogOut, Settings2, ShoppingBag } from "lucide-react";
import logo from "@/assets/logo.jpg";

const Index = () => {
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();
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

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isEntradaOpen, setIsEntradaOpen] = useState(false);
  const [isSaidaOpen, setIsSaidaOpen] = useState(false);
  const [isEmprestimoOpen, setIsEmprestimoOpen] = useState(false);
  const [isDevolucaoOpen, setIsDevolucaoOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingMovement, setEditingMovement] = useState<Movimentacao | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<Movimentacao | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [quickActionMaterial, setQuickActionMaterial] = useState<Material | null>(null);
  const [quickActionType, setQuickActionType] = useState<"entrada" | "saida" | "emprestimo" | "devolucao" | null>(null);

  // Carregar materiais do banco de dados
  const loadMaterials = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar materiais");
      return;
    }

    // Converter snake_case para camelCase
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
      obsoleto: m.obsoleto || false
    }));

    setMaterials(materialsData);
  };

  // Carregar movimentações do banco de dados
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

    // Converter snake_case para camelCase
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
        categoria: materialData.categoria
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("Já existe um material com este código");
      } else {
        toast.error("Erro ao cadastrar material");
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
        categoria: materialData.categoria
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
    }
  ) => {
    if (!user) return;

    // O trigger do banco de dados agora valida e atualiza o estoque automaticamente
    const material = materials.find(m => m.id === movementData.materialId);
    const { error: movementError } = await supabase
      .from("movimentacoes")
      .insert({
        user_id: user.id,
        material_id: movementData.materialId,
        tipo: type,
        quantidade: movementData.quantidade,
        responsavel: movementData.responsavel,
        observacao: movementData.observacao
      });

    if (movementError) {
      // Mostrar erro específico do banco de dados
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
      case "emprestimo":
        setIsEmprestimoOpen(false);
        break;
      case "devolucao":
        setIsDevolucaoOpen(false);
        break;
    }

    // Recarregar material para verificar estoque atualizado
    const { data: updatedMaterials } = await supabase
      .from("materials")
      .select("*")
      .eq("id", movementData.materialId)
      .eq("user_id", user.id)
      .single();

    if (updatedMaterials && updatedMaterials.quantidade_atual <= material!.estoqueMinimo) {
      toast.warning(
        `⚠️ Material ${material!.codigo} está abaixo do estoque mínimo (atual: ${updatedMaterials.quantidade_atual}, mínimo: ${material!.estoqueMinimo})`
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

    // O trigger do banco de dados gerencia toda a lógica de estoque
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
      } else if (movementError.message.includes("Material não encontrado")) {
        toast.error("Material não encontrado");
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

    // O trigger do banco de dados reverte automaticamente o estoque ao deletar
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

    // Verificar se há movimentações associadas
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

    const statusLabels = {
      "pendente": "pendente",
      "em_cotacao": "em cotação",
      "comprado": "comprado"
    };
    toast.success(`Material marcado como ${statusLabels[newStatus]}!`);
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

  const filteredMaterials = materials.filter(
    m =>
      m.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.descricao.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stockMaterials = filteredMaterials.filter(m => m.tipo === "estoque");
  const loanMaterials = filteredMaterials.filter(m => m.tipo === "emprestimo");
  const lowStockMaterials = materials.filter(m => m.quantidadeAtual <= m.estoqueMinimo);
  const totalItems = materials.reduce((acc, m) => acc + m.quantidadeAtual, 0);

  const activeLoans = movements.filter(m => {
    if (m.tipo !== "emprestimo") return false;
    const hasReturn = movements.some(
      mov =>
        mov.tipo === "devolucao" &&
        mov.materialId === m.materialId &&
        mov.responsavel === m.responsavel &&
        new Date(mov.data) > new Date(m.data)
    );
    return !hasReturn;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Recifer Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Almoxarifado</h1>
                <p className="text-sm text-muted-foreground">Gestão de estoque e materiais</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button onClick={() => setIsAddMaterialOpen(true)} size="sm" className="gap-2 flex-1 sm:flex-none">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Material</span>
                <span className="sm:hidden">Novo</span>
              </Button>
              <Button onClick={() => setIsEntradaOpen(true)} variant="success" size="sm" className="gap-2 flex-1 sm:flex-none">
                <ArrowDownCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Entrada</span>
              </Button>
              <Button onClick={() => setIsSaidaOpen(true)} variant="destructive" size="sm" className="gap-2 flex-1 sm:flex-none">
                <ArrowUpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Saída</span>
              </Button>
              <Button onClick={() => setIsEmprestimoOpen(true)} variant="destructive" size="sm" className="gap-2 flex-1 sm:flex-none">
                <HandHelping className="h-4 w-4" />
                <span className="hidden sm:inline">Empréstimo</span>
              </Button>
              <Button onClick={() => setIsDevolucaoOpen(true)} variant="success" size="sm" className="gap-2 flex-1 sm:flex-none">
                <Undo2 className="h-4 w-4" />
                <span className="hidden sm:inline">Devolução</span>
              </Button>
              {isAdmin && (
                <>
                  <Button onClick={() => navigate("/purchases")} variant="outline" size="sm" className="gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Compras</span>
                  </Button>
                  <Button onClick={() => navigate("/settings")} variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Config</span>
                  </Button>
                </>
              )}
              <Button onClick={signOut} variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard title="Total de Itens" value={totalItems} icon={Package} variant="default" />
          <StatsCard title="Materiais Cadastrados" value={materials.length} icon={TrendingUp} variant="success" />
          <StatsCard
            title="Alertas de Estoque"
            value={lowStockMaterials.length}
            icon={AlertTriangle}
            variant={lowStockMaterials.length > 0 ? "warning" : "default"}
          />
          <StatsCard title="Movimentações (mês)" value={movements.length} icon={TrendingDown} variant="default" />
        </div>

        <Tabs defaultValue="stock-materials" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="stock-materials" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Materiais de Estoque</span>
              <span className="sm:hidden">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="loan-materials" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Materiais de Empréstimo</span>
              <span className="sm:hidden">Empréstimo</span>
            </TabsTrigger>
            <TabsTrigger value="loans" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Empréstimos Ativos</span>
              <span className="sm:hidden">Ativos</span>
              {activeLoans.length > 0 && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                  {activeLoans.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm py-2">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="stock-materials" className="space-y-6">
            <MaterialsTable
              materials={stockMaterials}
              onViewLocation={material => {
                toast.info(`📍 ${material.descricao} está em: ${material.localizacao}`);
              }}
              onEdit={material => setEditingMaterial(material)}
              onDelete={material => setDeletingMaterial(material)}
              onQuickAction={handleQuickAction}
              onTogglePurchase={handleTogglePurchaseStatus}
              onToggleObsolete={handleToggleObsolete}
              tipo="estoque"
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={stockStatusFilter}
              onStatusFilterChange={setStockStatusFilter}
              locationFilter={stockLocationFilter}
              onLocationFilterChange={setStockLocationFilter}
              categoryFilter={stockCategoryFilter}
              onCategoryFilterChange={setStockCategoryFilter}
              onClearFilters={() => {
                setSearchQuery("");
                setStockStatusFilter("all");
                setStockLocationFilter("all");
                setStockCategoryFilter("all");
              }}
              userRole={role}
            />
          </TabsContent>

          <TabsContent value="loan-materials" className="space-y-6">
            <MaterialsTable
              materials={loanMaterials}
              onViewLocation={material => {
                toast.info(`📍 ${material.descricao} está em: ${material.localizacao}`);
              }}
              onEdit={material => setEditingMaterial(material)}
              onDelete={material => setDeletingMaterial(material)}
              onQuickAction={handleQuickAction}
              onTogglePurchase={handleTogglePurchaseStatus}
              onToggleObsolete={handleToggleObsolete}
              tipo="emprestimo"
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={loanStatusFilter}
              onStatusFilterChange={setLoanStatusFilter}
              locationFilter={loanLocationFilter}
              onLocationFilterChange={setLoanLocationFilter}
              categoryFilter={loanCategoryFilter}
              onCategoryFilterChange={setLoanCategoryFilter}
              onClearFilters={() => {
                setSearchQuery("");
                setLoanStatusFilter("all");
                setLoanLocationFilter("all");
                setLoanCategoryFilter("all");
              }}
              userRole={role}
            />
          </TabsContent>

          <TabsContent value="loans" className="space-y-6">
            <LoansTable
              loans={activeLoans}
              materials={materials}
              onReturn={loan => {
                setQuickActionMaterial(materials.find(m => m.id === loan.materialId) || null);
                setQuickActionType("devolucao");
                setIsDevolucaoOpen(true);
              }}
              onEdit={loan => setEditingMovement(loan)}
              onDelete={loan => setDeletingMovement(loan)}
              userRole={role}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HistoryTable
              movements={movements}
              materials={materials}
              onEdit={movement => setEditingMovement(movement)}
              onDelete={movement => setDeletingMovement(movement)}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Material</DialogTitle>
            <DialogDescription>Preencha as informações do material que será adicionado ao estoque</DialogDescription>
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
            <DialogDescription>Registre a entrada de materiais no almoxarifado</DialogDescription>
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
                ? {
                    materialId: quickActionMaterial.id,
                    quantidade: 1,
                    responsavel: "",
                    observacao: ""
                  }
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
            <DialogDescription>Registre a retirada de materiais do almoxarifado</DialogDescription>
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
                ? {
                    materialId: quickActionMaterial.id,
                    quantidade: 1,
                    responsavel: "",
                    observacao: ""
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEmprestimoOpen || (quickActionType === "emprestimo" && !!quickActionMaterial)}
        onOpenChange={open => {
          setIsEmprestimoOpen(open);
          if (!open) {
            setQuickActionMaterial(null);
            setQuickActionType(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Empréstimo</DialogTitle>
            <DialogDescription>Registre o empréstimo de ferramentas/materiais</DialogDescription>
          </DialogHeader>
          <MovementForm
            materials={materials}
            type="emprestimo"
            onSubmit={data => {
              handleMovement("emprestimo", data);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            onCancel={() => {
              setIsEmprestimoOpen(false);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            initialData={
              quickActionMaterial && quickActionType === "emprestimo"
                ? {
                    materialId: quickActionMaterial.id,
                    quantidade: 1,
                    responsavel: "",
                    observacao: ""
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDevolucaoOpen || (quickActionType === "devolucao" && !!quickActionMaterial)}
        onOpenChange={open => {
          setIsDevolucaoOpen(open);
          if (!open) {
            setQuickActionMaterial(null);
            setQuickActionType(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>Registre a devolução de ferramentas/materiais emprestados</DialogDescription>
          </DialogHeader>
          <MovementForm
            materials={materials}
            type="devolucao"
            onSubmit={data => {
              handleMovement("devolucao", data);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            onCancel={() => {
              setIsDevolucaoOpen(false);
              setQuickActionMaterial(null);
              setQuickActionType(null);
            }}
            initialData={
              quickActionMaterial && quickActionType === "devolucao"
                ? {
                    materialId: quickActionMaterial.id,
                    quantidade: 1,
                    responsavel: "",
                    observacao: ""
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMaterial} onOpenChange={open => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>Atualize as informações do material, incluindo a foto</DialogDescription>
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
            <DialogDescription>Atualize as informações da movimentação</DialogDescription>
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
              Tem certeza que deseja excluir esta movimentação? Esta ação reverterá a quantidade no estoque e não pode
              ser desfeita.
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
              Tem certeza que deseja excluir o material "{deletingMaterial?.descricao}"? Esta ação não pode ser desfeita.
              {movements.some(m => m.materialId === deletingMaterial?.id) && (
                <span className="block mt-2 text-destructive font-semibold">
                  ⚠️ Este material possui movimentações registradas e não pode ser excluído.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaterial}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
