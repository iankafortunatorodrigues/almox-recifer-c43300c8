import { useState, useEffect } from "react";
import { Material, Movimentacao } from "@/types/material";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { StatsCard } from "@/components/StatsCard";
import { MaterialForm } from "@/components/MaterialForm";
import { MovementForm } from "@/components/MovementForm";
import { MaterialsTable } from "@/components/MaterialsTable";
import { HistoryTable } from "@/components/HistoryTable";
import { LoansTable } from "@/components/LoansTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package, TrendingDown, TrendingUp, AlertTriangle, Search, Plus, ArrowDownCircle, ArrowUpCircle, HandHelping, Undo2 } from "lucide-react";
const Index = () => {
  const [materials, setMaterials] = useLocalStorage<Material[]>("materials", []);
  const [movements, setMovements] = useLocalStorage<Movimentacao[]>("movements", []);

  // Migrate old materials to include new fields
  useEffect(() => {
    const migratedMaterials = materials.map((material: any) => ({
      ...material,
      estoqueMaximo: material.estoqueMaximo ?? material.estoqueMinimo * 10,
      unidadeMedida: material.unidadeMedida ?? "UN",
      tipo: material.tipo ?? "estoque",
      categoria: material.categoria ?? undefined
    }));
    if (JSON.stringify(migratedMaterials) !== JSON.stringify(materials)) {
      setMaterials(migratedMaterials);
    }
  }, []);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtros para materiais de estoque
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [stockLocationFilter, setStockLocationFilter] = useState("all");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");

  // Filtros para materiais de empréstimo
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
  const [quickActionMaterial, setQuickActionMaterial] = useState<Material | null>(null);
  const [quickActionType, setQuickActionType] = useState<"entrada" | "saida" | "emprestimo" | "devolucao" | null>(null);
  const handleAddMaterial = (materialData: Omit<Material, "id" | "dataCadastro">) => {
    const newMaterial: Material = {
      ...materialData,
      id: crypto.randomUUID(),
      dataCadastro: new Date().toISOString()
    };
    setMaterials([...materials, newMaterial]);
    setIsAddMaterialOpen(false);
    toast.success("Material cadastrado com sucesso!");
  };
  const handleUpdateMaterial = (materialData: Omit<Material, "id" | "dataCadastro">) => {
    if (!editingMaterial) return;
    const updatedMaterials = materials.map(m => m.id === editingMaterial.id ? {
      ...m,
      ...materialData
    } : m);
    setMaterials(updatedMaterials);
    setEditingMaterial(null);
    toast.success("Material atualizado com sucesso!");
  };
  const handleMovement = (type: "entrada" | "saida" | "emprestimo" | "devolucao", movementData: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
  }) => {
    const material = materials.find(m => m.id === movementData.materialId);
    if (!material) return;

    // Para empréstimo e saída, reduz a quantidade
    // Para entrada e devolução, aumenta a quantidade
    const shouldDecrease = type === "saida" || type === "emprestimo";
    const newQuantity = shouldDecrease ? material.quantidadeAtual - movementData.quantidade : material.quantidadeAtual + movementData.quantidade;
    if (newQuantity < 0) {
      toast.error("Quantidade insuficiente em estoque!");
      return;
    }
    const newMovement: Movimentacao = {
      id: crypto.randomUUID(),
      materialId: movementData.materialId,
      tipo: type,
      quantidade: movementData.quantidade,
      data: new Date().toISOString(),
      responsavel: movementData.responsavel,
      observacao: movementData.observacao
    };
    const updatedMaterials = materials.map(m => m.id === movementData.materialId ? {
      ...m,
      quantidadeAtual: newQuantity
    } : m);
    setMaterials(updatedMaterials);
    setMovements([newMovement, ...movements]);

    // Close the appropriate dialog
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

    // Check for low stock warning
    const updatedMaterial = updatedMaterials.find(m => m.id === movementData.materialId);
    if (updatedMaterial && updatedMaterial.quantidadeAtual <= updatedMaterial.estoqueMinimo) {
      toast.warning(`⚠️ Material ${updatedMaterial.codigo} está abaixo do estoque mínimo (atual: ${updatedMaterial.quantidadeAtual}, mínimo: ${updatedMaterial.estoqueMinimo})`);
    }
    const typeLabels = {
      entrada: "Entrada",
      saida: "Saída",
      emprestimo: "Empréstimo",
      devolucao: "Devolução"
    };
    toast.success(`${typeLabels[type]} registrada com sucesso!`);
  };
  const handleUpdateMovement = (movementData: {
    materialId: string;
    quantidade: number;
    responsavel: string;
    observacao?: string;
  }) => {
    if (!editingMovement) return;
    const oldMovement = editingMovement;
    const oldMaterial = materials.find(m => m.id === oldMovement.materialId);
    const newMaterial = materials.find(m => m.id === movementData.materialId);
    if (!oldMaterial || !newMaterial) return;

    // Reverter o movimento antigo
    let revertedQuantity = oldMaterial.quantidadeAtual;
    const oldShouldDecrease = oldMovement.tipo === "saida" || oldMovement.tipo === "emprestimo";
    if (oldShouldDecrease) {
      revertedQuantity += oldMovement.quantidade;
    } else {
      revertedQuantity -= oldMovement.quantidade;
    }

    // Aplicar o novo movimento
    let newQuantity = movementData.materialId === oldMovement.materialId ? revertedQuantity : newMaterial.quantidadeAtual;
    const newShouldDecrease = oldMovement.tipo === "saida" || oldMovement.tipo === "emprestimo";
    if (newShouldDecrease) {
      newQuantity -= movementData.quantidade;
    } else {
      newQuantity += movementData.quantidade;
    }
    if (newQuantity < 0) {
      toast.error("Quantidade insuficiente em estoque!");
      return;
    }
    const updatedMovement: Movimentacao = {
      ...oldMovement,
      materialId: movementData.materialId,
      quantidade: movementData.quantidade,
      responsavel: movementData.responsavel,
      observacao: movementData.observacao
    };
    let updatedMaterials = [...materials];

    // Atualizar material antigo se mudou de material
    if (oldMovement.materialId !== movementData.materialId) {
      updatedMaterials = updatedMaterials.map(m => m.id === oldMovement.materialId ? {
        ...m,
        quantidadeAtual: revertedQuantity
      } : m);
    }

    // Atualizar novo material
    updatedMaterials = updatedMaterials.map(m => m.id === movementData.materialId ? {
      ...m,
      quantidadeAtual: newQuantity
    } : m);
    const updatedMovements = movements.map(m => m.id === oldMovement.id ? updatedMovement : m);
    setMaterials(updatedMaterials);
    setMovements(updatedMovements);
    setEditingMovement(null);
    toast.success("Movimentação atualizada com sucesso!");
  };
  const handleDeleteMovement = () => {
    if (!deletingMovement) return;
    const material = materials.find(m => m.id === deletingMovement.materialId);
    if (!material) return;

    // Reverter o movimento
    let revertedQuantity = material.quantidadeAtual;
    const shouldDecrease = deletingMovement.tipo === "saida" || deletingMovement.tipo === "emprestimo";
    if (shouldDecrease) {
      revertedQuantity += deletingMovement.quantidade;
    } else {
      revertedQuantity -= deletingMovement.quantidade;
    }
    if (revertedQuantity < 0) {
      toast.error("Não é possível excluir: resultaria em quantidade negativa!");
      setDeletingMovement(null);
      return;
    }
    const updatedMaterials = materials.map(m => m.id === deletingMovement.materialId ? {
      ...m,
      quantidadeAtual: revertedQuantity
    } : m);
    const updatedMovements = movements.filter(m => m.id !== deletingMovement.id);
    setMaterials(updatedMaterials);
    setMovements(updatedMovements);
    setDeletingMovement(null);
    toast.success("Movimentação excluída com sucesso!");
  };
  const filteredMaterials = materials.filter(m => m.codigo.toLowerCase().includes(searchQuery.toLowerCase()) || m.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
  const stockMaterials = filteredMaterials.filter(m => m.tipo === "estoque");
  const loanMaterials = filteredMaterials.filter(m => m.tipo === "emprestimo");
  const lowStockMaterials = materials.filter(m => m.quantidadeAtual <= m.estoqueMinimo);
  const totalItems = materials.reduce((acc, m) => acc + m.quantidadeAtual, 0);
  const recentMovements = movements.slice(0, 5);
  const activeLoans = movements.filter(m => {
    if (m.tipo !== "emprestimo") return false;
    // Check if there's a corresponding return
    const hasReturn = movements.some(mov => mov.tipo === "devolucao" && mov.materialId === m.materialId && mov.responsavel === m.responsavel && new Date(mov.data) > new Date(m.data));
    return !hasReturn;
  });
  const handleQuickAction = (material: Material, action: "entrada" | "saida" | "emprestimo" | "devolucao") => {
    setQuickActionMaterial(material);
    setQuickActionType(action);
  };
  return <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold"> Almoxarifado</h1>
              <p className="text-muted-foreground">Gestão de estoque e materiais</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAddMaterialOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Material
              </Button>
              <Button onClick={() => setIsEntradaOpen(true)} variant="success" className="gap-2">
                <ArrowDownCircle className="h-4 w-4" />
                Entrada
              </Button>
              <Button onClick={() => setIsSaidaOpen(true)} variant="destructive" className="gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                Saída
              </Button>
              <Button onClick={() => setIsAddMaterialOpen(true)} variant="secondary" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Ferramenta
              </Button>
              <Button onClick={() => setIsEmprestimoOpen(true)} variant="destructive" className="gap-2">
                <HandHelping className="h-4 w-4" />
                Empréstimo
              </Button>
              <Button onClick={() => setIsDevolucaoOpen(true)} variant="success" className="gap-2">
                <Undo2 className="h-4 w-4" />
                Devolução
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total de Itens" value={totalItems} icon={Package} variant="default" />
          <StatsCard title="Materiais Cadastrados" value={materials.length} icon={TrendingUp} variant="success" />
          <StatsCard title="Alertas de Estoque" value={lowStockMaterials.length} icon={AlertTriangle} variant={lowStockMaterials.length > 0 ? "warning" : "default"} />
          <StatsCard title="Movimentações (mês)" value={movements.length} icon={TrendingDown} variant="default" />
        </div>

        <Tabs defaultValue="stock-materials" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stock-materials">Materiais de Estoque</TabsTrigger>
            <TabsTrigger value="loan-materials">Materiais de Empréstimo</TabsTrigger>
            <TabsTrigger value="loans">
              Empréstimos Ativos
              {activeLoans.length > 0 && <Badge variant="secondary" className="ml-2">
                  {activeLoans.length}
                </Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="stock-materials" className="space-y-6">
            <MaterialsTable materials={stockMaterials} onViewLocation={material => {
            toast.info(`📍 ${material.descricao} está em: ${material.localizacao}`);
          }} onEdit={material => setEditingMaterial(material)} onQuickAction={handleQuickAction} tipo="estoque" searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={stockStatusFilter} onStatusFilterChange={setStockStatusFilter} locationFilter={stockLocationFilter} onLocationFilterChange={setStockLocationFilter} categoryFilter={stockCategoryFilter} onCategoryFilterChange={setStockCategoryFilter} onClearFilters={() => {
            setSearchQuery("");
            setStockStatusFilter("all");
            setStockLocationFilter("all");
            setStockCategoryFilter("all");
          }} />
          </TabsContent>

          <TabsContent value="loan-materials" className="space-y-6">
            <MaterialsTable materials={loanMaterials} onViewLocation={material => {
            toast.info(`📍 ${material.descricao} está em: ${material.localizacao}`);
          }} onEdit={material => setEditingMaterial(material)} onQuickAction={handleQuickAction} tipo="emprestimo" searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={loanStatusFilter} onStatusFilterChange={setLoanStatusFilter} locationFilter={loanLocationFilter} onLocationFilterChange={setLoanLocationFilter} categoryFilter={loanCategoryFilter} onCategoryFilterChange={setLoanCategoryFilter} onClearFilters={() => {
            setSearchQuery("");
            setLoanStatusFilter("all");
            setLoanLocationFilter("all");
            setLoanCategoryFilter("all");
          }} />
          </TabsContent>

          <TabsContent value="loans" className="space-y-6">
            <LoansTable loans={activeLoans} materials={materials} onReturn={loan => {
            setQuickActionMaterial(materials.find(m => m.id === loan.materialId) || null);
            setQuickActionType("devolucao");
            setIsDevolucaoOpen(true);
          }} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HistoryTable movements={movements} materials={materials} onEdit={movement => setEditingMovement(movement)} onDelete={movement => setDeletingMovement(movement)} />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Material</DialogTitle>
            <DialogDescription>
              Preencha as informações do material que será adicionado ao estoque
            </DialogDescription>
          </DialogHeader>
          <MaterialForm onSubmit={handleAddMaterial} onCancel={() => setIsAddMaterialOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEntradaOpen || quickActionType === "entrada" && !!quickActionMaterial} onOpenChange={open => {
      setIsEntradaOpen(open);
      if (!open) {
        setQuickActionMaterial(null);
        setQuickActionType(null);
      }
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Entrada</DialogTitle>
            <DialogDescription>
              Registre a entrada de materiais no almoxarifado
            </DialogDescription>
          </DialogHeader>
          <MovementForm materials={materials} type="entrada" onSubmit={data => {
          handleMovement("entrada", data);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} onCancel={() => {
          setIsEntradaOpen(false);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} initialData={quickActionMaterial && quickActionType === "entrada" ? {
          materialId: quickActionMaterial.id,
          quantidade: 1,
          responsavel: "",
          observacao: ""
        } : undefined} />
        </DialogContent>
      </Dialog>

      <Dialog open={isSaidaOpen || quickActionType === "saida" && !!quickActionMaterial} onOpenChange={open => {
      setIsSaidaOpen(open);
      if (!open) {
        setQuickActionMaterial(null);
        setQuickActionType(null);
      }
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Saída</DialogTitle>
            <DialogDescription>
              Registre a retirada de materiais do almoxarifado
            </DialogDescription>
          </DialogHeader>
          <MovementForm materials={materials} type="saida" onSubmit={data => {
          handleMovement("saida", data);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} onCancel={() => {
          setIsSaidaOpen(false);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} initialData={quickActionMaterial && quickActionType === "saida" ? {
          materialId: quickActionMaterial.id,
          quantidade: 1,
          responsavel: "",
          observacao: ""
        } : undefined} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEmprestimoOpen || quickActionType === "emprestimo" && !!quickActionMaterial} onOpenChange={open => {
      setIsEmprestimoOpen(open);
      if (!open) {
        setQuickActionMaterial(null);
        setQuickActionType(null);
      }
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Empréstimo</DialogTitle>
            <DialogDescription>
              Registre o empréstimo de ferramentas/materiais
            </DialogDescription>
          </DialogHeader>
          <MovementForm materials={materials} type="emprestimo" onSubmit={data => {
          handleMovement("emprestimo", data);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} onCancel={() => {
          setIsEmprestimoOpen(false);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} initialData={quickActionMaterial && quickActionType === "emprestimo" ? {
          materialId: quickActionMaterial.id,
          quantidade: 1,
          responsavel: "",
          observacao: ""
        } : undefined} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDevolucaoOpen || quickActionType === "devolucao" && !!quickActionMaterial} onOpenChange={open => {
      setIsDevolucaoOpen(open);
      if (!open) {
        setQuickActionMaterial(null);
        setQuickActionType(null);
      }
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>
              Registre a devolução de ferramentas/materiais emprestados
            </DialogDescription>
          </DialogHeader>
          <MovementForm materials={materials} type="devolucao" onSubmit={data => {
          handleMovement("devolucao", data);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} onCancel={() => {
          setIsDevolucaoOpen(false);
          setQuickActionMaterial(null);
          setQuickActionType(null);
        }} initialData={quickActionMaterial && quickActionType === "devolucao" ? {
          materialId: quickActionMaterial.id,
          quantidade: 1,
          responsavel: "",
          observacao: ""
        } : undefined} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMaterial} onOpenChange={open => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
            <DialogDescription>
              Atualize as informações do material, incluindo a foto
            </DialogDescription>
          </DialogHeader>
          <MaterialForm initialData={editingMaterial || undefined} onSubmit={handleUpdateMaterial} onCancel={() => setEditingMaterial(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMovement} onOpenChange={open => !open && setEditingMovement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Movimentação</DialogTitle>
            <DialogDescription>
              Atualize as informações da movimentação
            </DialogDescription>
          </DialogHeader>
          <MovementForm materials={materials} type={editingMovement?.tipo || "entrada"} onSubmit={handleUpdateMovement} onCancel={() => setEditingMovement(null)} initialData={editingMovement || undefined} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMovement} onOpenChange={open => !open && setDeletingMovement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação? Esta ação reverterá a quantidade no estoque e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMovement}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default Index;