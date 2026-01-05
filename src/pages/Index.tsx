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

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package, TrendingDown, TrendingUp, AlertTriangle, Plus, ArrowDownCircle, ArrowUpCircle, LogOut, Settings2, ShoppingBag, FileBarChart } from "lucide-react";
import logo from "@/assets/logo.jpg";

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
    
    // Compras pode ver todos os materiais de estoque (RLS permite via policy)
    // Outros usuários veem apenas seus próprios materiais
    if (!isCompras) {
      query = query.eq("user_id", user.id);
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.log("Erro ao carregar materiais:", error);
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
      obsoleto: m.obsoleto || false,
      dataCompra: m.data_compra,
      dataEntrega: m.data_entrega
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
  }, [user, isCompras]);

  // Configurar atualização em tempo real dos materiais
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
          console.log('Realtime update:', payload);
          
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
            toast.success('Material adicionado em tempo real');
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
            toast.info('Material atualizado em tempo real');
          } 
          else if (payload.eventType === 'DELETE') {
            setMaterials(prev => prev.filter(m => m.id !== payload.old.id));
            toast.info('Material removido em tempo real');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Configurar atualização em tempo real das movimentações
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
          console.log('Realtime movement update:', payload);
          
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
            toast.success('Movimentação registrada em tempo real');
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
            toast.info('Movimentação atualizada em tempo real');
          } 
          else if (payload.eventType === 'DELETE') {
            setMovements(prev => prev.filter(m => m.id !== payload.old.id));
            toast.info('Movimentação removida em tempo real');
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
      console.error("Erro ao cadastrar material:", error);
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

    // Se for entrada manual de consumível, criar o material primeiro
    if (movementData.isManualEntry && movementData.descricao && type === "saida") {
      // Criar material temporário de consumo com código único
      const codigo = `CONS-${Date.now()}`;
      const { data: newMaterial, error: createError } = await supabase
        .from("materials")
        .insert({
          user_id: user.id,
          codigo: codigo,
          descricao: movementData.descricao,
          quantidade_atual: 0, // Começa com 0 pois é saída direta
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

    // O trigger do banco de dados agora valida e atualiza o estoque automaticamente
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
  const consumableMaterials = filteredMaterials.filter(m => m.tipo === "consumivel");
  const lowStockMaterials = materials.filter(m => m.quantidadeAtual <= m.estoqueMinimo);
  const totalItems = materials.reduce((acc, m) => acc + m.quantidadeAtual, 0);

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
              <img src={logo} alt="Recifer Logo" className="h-20 w-20 object-contain" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Almoxarifado</h1>
                <p className="text-sm text-muted-foreground">Gestão de estoque e materiais</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button onClick={() => setIsAddMaterialOpen(true)} className="gap-2 flex-1 sm:flex-none" disabled={role === "compras" || role === "diretor"}>
                <Plus className="h-4 w-4" />
                Novo Material
              </Button>
              <Button 
                onClick={() => setIsEntradaOpen(true)} 
                variant="default" 
                className="gap-2 flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                disabled={role === "compras" || role === "diretor"}
              >
                <ArrowDownCircle className="h-4 w-4" />
                Entrada
              </Button>
              <Button 
                onClick={() => setIsSaidaOpen(true)} 
                variant="destructive" 
                className="gap-2 flex-1 sm:flex-none"
                disabled={role === "compras" || role === "diretor"}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Saída
              </Button>
              <Button onClick={() => navigate("/reports")} variant="outline" className="gap-2 flex-1 sm:flex-none">
                <FileBarChart className="h-4 w-4" />
                Relatórios
              </Button>
              <Button onClick={() => navigate("/settings")} variant="outline" className="gap-2 flex-1 sm:flex-none">
                <Settings2 className="h-4 w-4" />
                Configurações
              </Button>
              <Button onClick={signOut} variant="outline" className="gap-2 flex-1 sm:flex-none">
                <LogOut className="h-4 w-4" />
                Sair
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
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="stock-materials" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Materiais de Estoque</span>
              <span className="sm:hidden">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="loan-materials" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Materiais de Empréstimo</span>
              <span className="sm:hidden">Empréstimo</span>
            </TabsTrigger>
            <TabsTrigger value="consumables" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Consumíveis</span>
              <span className="sm:hidden">Consumíveis</span>
            </TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs sm:text-sm py-2">
              <ShoppingBag className="h-4 w-4 mr-1" />
              Compras
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

          <TabsContent value="consumables" className="space-y-6">
            <MaterialsTable
              materials={consumableMaterials}
              onViewLocation={material => {
                toast.info(`📍 ${material.descricao} está em: ${material.localizacao}`);
              }}
              onEdit={material => setEditingMaterial(material)}
              onDelete={material => setDeletingMaterial(material)}
              onQuickAction={handleQuickAction}
              onTogglePurchase={handleTogglePurchaseStatus}
              onToggleObsolete={handleToggleObsolete}
              tipo="consumivel"
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={consumableStatusFilter}
              onStatusFilterChange={setConsumableStatusFilter}
              locationFilter={consumableLocationFilter}
              onLocationFilterChange={setConsumableLocationFilter}
              categoryFilter={consumableCategoryFilter}
              onCategoryFilterChange={setConsumableCategoryFilter}
              onClearFilters={() => {
                setSearchQuery("");
                setConsumableStatusFilter("all");
                setConsumableLocationFilter("all");
                setConsumableCategoryFilter("all");
              }}
              userRole={role}
            />
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Pedidos de Compras</h2>
              <p className="text-muted-foreground">
                Materiais com estoque baixo ou crítico que necessitam de compra
              </p>
              
              <div className="grid gap-4">
                {lowStockMaterials.map((material) => (
                  <div key={material.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{material.codigo} - {material.descricao}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant={material.quantidadeAtual === 0 ? "destructive" : "secondary"}>
                            Estoque: {material.quantidadeAtual} {material.unidadeMedida}
                          </Badge>
                          <Badge variant="outline">
                            Mínimo: {material.estoqueMinimo} {material.unidadeMedida}
                          </Badge>
                          <Badge 
                            variant={
                              material.statusCompra === "comprado" ? "default" :
                              material.statusCompra === "em_cotacao" ? "secondary" :
                              "outline"
                            }
                          >
                            {material.statusCompra === "comprado" ? "Comprado" :
                             material.statusCompra === "em_cotacao" ? "Em Cotação" :
                             "Pendente"}
                          </Badge>
                        </div>
                        {material.dataCompra && (
                          <p className="text-sm text-muted-foreground mt-2">
                            📅 Data de Compra: {new Date(material.dataCompra).toLocaleDateString()}
                          </p>
                        )}
                        {material.dataEntrega && (
                          <p className="text-sm text-muted-foreground">
                            🚚 Data de Entrega: {new Date(material.dataEntrega).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {(role === "compras" || role === "admin" || role === "almoxarife") && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!user) return;
                            
                            const { error } = await supabase
                              .from("materials")
                              .update({ 
                                status_compra: "comprado",
                                data_compra: new Date().toISOString(),
                                data_entrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                              })
                              .eq("id", material.id)
                              .eq("user_id", user.id);

                            if (error) {
                              toast.error("Erro ao atualizar status");
                              return;
                            }

                            toast.success("Material marcado como comprado!");
                            await loadMaterials();
                          }}
                          disabled={material.statusCompra === "comprado"}
                        >
                          ✓ Marcar como Comprado
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {lowStockMaterials.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum material precisa de compra no momento
                  </div>
                )}
              </div>
            </div>
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

      <footer className="border-t bg-card mt-8 py-4">
        <div className="px-3 sm:px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Criado por <span className="font-semibold">Ianka Fortunato</span> - 15/09/2025
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
