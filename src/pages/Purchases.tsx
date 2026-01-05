import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Material } from "@/types/material";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ShoppingCart, CheckCircle, Clock, FileDown, X, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Purchases() {
  const { user } = useAuth();
  const { isAdmin, isCompras, loading } = useUserRole();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const hasAccess = isAdmin || isCompras;

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");

  // Helper para determinar status do estoque
  const getStockStatus = (material: Material) => {
    if (material.quantidadeAtual === 0) return { label: "CRÍTICO", color: "bg-red-600 text-white", value: "critical" };
    if (material.quantidadeAtual <= material.estoqueMinimo) return { label: "BAIXO", color: "bg-orange-500 text-white", value: "low" };
    return { label: "NORMAL", color: "bg-green-600 text-white", value: "normal" };
  };

  useEffect(() => {
    if (!loading && !hasAccess) {
      toast.error("Acesso negado - Apenas Admin ou Compras");
      navigate("/");
    }
  }, [hasAccess, loading, navigate]);

  useEffect(() => {
    if (hasAccess && !loading) {
      loadMaterials();
    }
  }, [hasAccess, loading, isAdmin, isCompras]);

  const loadMaterials = async () => {
    if (!user) return;

    // Compras vê TODOS materiais de estoque, Admin vê apenas os seus
    let query = supabase
      .from("materials")
      .select("*")
      .eq("tipo", "estoque")
      .eq("obsoleto", false)
      .order("created_at", { ascending: false });

    // Admin filtra por user_id, Compras vê todos
    if (isAdmin && !isCompras) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar materiais:", error);
      toast.error("Erro ao carregar materiais");
      return;
    }

    // Filtrar apenas materiais com estoque crítico (0) ou baixo (<= mínimo)
    const filteredData = (data || []).filter((m: any) => 
      m.quantidade_atual === 0 || m.quantidade_atual <= m.estoque_minimo
    );

    const materialsData: Material[] = filteredData.map((m: any) => ({
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

  const handleToggleStatus = async (material: Material, newStatus: "pendente" | "em_cotacao" | "comprado") => {
    if (!user) return;

    // Compras pode atualizar qualquer material de estoque via RLS policy
    const { error } = await supabase
      .from("materials")
      .update({ status_compra: newStatus })
      .eq("id", material.id);

    if (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }

    const statusLabels: Record<string, string> = {
      pendente: "Pendente",
      em_cotacao: "Em Cotação", 
      comprado: "Comprado"
    };

    toast.success(`Status atualizado para ${statusLabels[newStatus]}`);
    loadMaterials();
  };

  // Obter categorias únicas
  const uniqueCategories = [...new Set(materials.filter(m => m.categoria).map(m => m.categoria!))].sort();

  // Aplicar filtros
  const applyFilters = (materialsList: Material[]) => {
    return materialsList.filter(material => {
      // Filtro de busca
      const matchesSearch = searchQuery === "" || 
        material.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.descricao.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro de categoria
      const matchesCategory = categoryFilter === "all" || material.categoria === categoryFilter;

      // Filtro de status do estoque
      const stockStatus = getStockStatus(material).value;
      const matchesStockStatus = stockStatusFilter === "all" || stockStatus === stockStatusFilter;

      return matchesSearch && matchesCategory && matchesStockStatus;
    });
  };

  const hasActiveFilters = searchQuery !== "" || categoryFilter !== "all" || stockStatusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStockStatusFilter("all");
  };

  const comprados = applyFilters(materials.filter(m => m.statusCompra === "comprado" && !m.obsoleto));
  const emCotacao = applyFilters(materials.filter(m => m.statusCompra === "em_cotacao" && !m.obsoleto));
  const pendentes = applyFilters(materials.filter(m => m.statusCompra === "pendente" && !m.obsoleto));

  // Exportar para PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const allFilteredMaterials = [...pendentes, ...emCotacao, ...comprados];
    
    doc.setFontSize(18);
    doc.text("Relatório de Compras", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 30);
    doc.text(`Total: ${allFilteredMaterials.length} materiais | Pendentes: ${pendentes.length} | Em Cotação: ${emCotacao.length} | Comprados: ${comprados.length}`, 14, 36);

    const tableData = allFilteredMaterials.map(m => [
      m.codigo,
      m.descricao.substring(0, 40) + (m.descricao.length > 40 ? "..." : ""),
      m.quantidadeAtual.toString(),
      m.estoqueMinimo.toString(),
      getStockStatus(m).label,
      m.categoria || "-",
      m.statusCompra === "pendente" ? "Pendente" : m.statusCompra === "em_cotacao" ? "Em Cotação" : "Comprado"
    ]);

    autoTable(doc, {
      head: [["Código", "Descrição", "Qtd", "Mín", "Status Est.", "Categoria", "Status Compra"]],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`relatorio-compras-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const allFilteredMaterials = [...pendentes, ...emCotacao, ...comprados];
    
    const excelData = allFilteredMaterials.map(m => ({
      "Código": m.codigo,
      "Descrição": m.descricao,
      "Quantidade Atual": m.quantidadeAtual,
      "Estoque Mínimo": m.estoqueMinimo,
      "Status Estoque": getStockStatus(m).label,
      "Categoria": m.categoria || "-",
      "Localização": m.localizacao,
      "Status Compra": m.statusCompra === "pendente" ? "Pendente" : m.statusCompra === "em_cotacao" ? "Em Cotação" : "Comprado",
      "Valor Unitário": m.valorUnitario ? `R$ ${m.valorUnitario.toFixed(2)}` : "-"
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    XLSX.writeFile(wb, `relatorio-compras-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-3xl font-bold">Gestão de Compras</h1>
        </div>

        {/* Filtros */}
        <Card className="p-3 sm:p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status do estoque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="critical">Estoque Crítico</SelectItem>
                  <SelectItem value="low">Estoque Baixo</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Botões de exportação */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span> Excel
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-2 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pendentes</p>
                <p className="text-lg sm:text-2xl font-bold">{pendentes.length}</p>
              </div>
              <ShoppingCart className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-2 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Em Cotação</p>
                <p className="text-lg sm:text-2xl font-bold">{emCotacao.length}</p>
              </div>
              <Clock className="h-5 w-5 sm:h-8 sm:w-8 text-warning" />
            </div>
          </Card>

          <Card className="p-2 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Comprados</p>
                <p className="text-lg sm:text-2xl font-bold">{comprados.length}</p>
              </div>
              <CheckCircle className="h-5 w-5 sm:h-8 sm:w-8 text-success" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="pendentes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="pendentes" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <span className="hidden sm:inline">Pendentes</span>
              <span className="sm:hidden">Pend.</span>
              <span className="ml-1">({pendentes.length})</span>
            </TabsTrigger>
            <TabsTrigger value="cotacao" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <span className="hidden sm:inline">Em Cotação</span>
              <span className="sm:hidden">Cotação</span>
              <span className="ml-1">({emCotacao.length})</span>
            </TabsTrigger>
            <TabsTrigger value="comprados" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <span className="hidden sm:inline">Comprados</span>
              <span className="sm:hidden">Compr.</span>
              <span className="ml-1">({comprados.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-4">
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead>Descrição e Status</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum material pendente
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendentes.map((material) => (
                      <TableRow key={material.id} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-sm sm:text-lg">{material.codigo}</TableCell>
                        <TableCell>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="font-medium text-sm sm:text-base">{material.descricao}</div>
                            <div className="flex gap-1 sm:gap-2 flex-wrap">
                              <Badge className={`${getStockStatus(material).color} font-bold text-xs`}>
                                🚨 {getStockStatus(material).label}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                                Est: {material.quantidadeAtual}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800 text-xs">
                                Mín: {material.estoqueMinimo}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {material.categoria ? (
                            <Badge variant="outline" className="font-medium">{material.categoria}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleToggleStatus(material, "em_cotacao")}
                              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm px-2 sm:px-4"
                            >
                              📋 Cotação
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleToggleStatus(material, "comprado")}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm px-2 sm:px-4"
                            >
                              ✓ Comprado
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="cotacao" className="space-y-4">
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead>Descrição e Status</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emCotacao.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum material em cotação
                      </TableCell>
                    </TableRow>
                  ) : (
                    emCotacao.map((material) => (
                      <TableRow key={material.id} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-sm sm:text-lg">{material.codigo}</TableCell>
                        <TableCell>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="font-medium text-sm sm:text-base">{material.descricao}</div>
                            <div className="flex gap-1 sm:gap-2 flex-wrap">
                              <Badge className={`${getStockStatus(material).color} font-bold text-xs`}>
                                🚨 {getStockStatus(material).label}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                                Est: {material.quantidadeAtual}
                              </Badge>
                              <Badge className="bg-yellow-600 text-white font-semibold text-xs">
                                📋 COTAÇÃO
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {material.categoria ? (
                            <Badge variant="outline" className="font-medium">{material.categoria}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(material, "pendente")}
                              className="text-xs sm:text-sm px-2 sm:px-4"
                            >
                              ⏱ Pendente
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleToggleStatus(material, "comprado")}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm px-2 sm:px-4"
                            >
                              ✓ Comprado
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="comprados" className="space-y-4">
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead>Descrição e Status</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum material comprado
                      </TableCell>
                    </TableRow>
                  ) : (
                    comprados.map((material) => (
                      <TableRow key={material.id} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-sm sm:text-lg">{material.codigo}</TableCell>
                        <TableCell>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="font-medium text-sm sm:text-base">{material.descricao}</div>
                            <div className="flex gap-1 sm:gap-2 flex-wrap">
                              <Badge className={`${getStockStatus(material).color} font-bold text-xs`}>
                                🚨 {getStockStatus(material).label}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                                Est: {material.quantidadeAtual}
                              </Badge>
                              <Badge className="bg-green-600 text-white font-semibold text-xs">
                                ✓ COMPRADO
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {material.categoria ? (
                            <Badge variant="outline" className="font-medium">{material.categoria}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(material, "pendente")}
                              className="text-xs sm:text-sm px-2 sm:px-4"
                            >
                              ⏱ Pendente
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
