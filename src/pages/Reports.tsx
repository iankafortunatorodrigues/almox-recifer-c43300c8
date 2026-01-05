import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Material, Movimentacao } from "@/types/material";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Package, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  ArrowUpDown,
  Truck
} from "lucide-react";
import logo from "@/assets/logo.jpg";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";

type PeriodFilter = "today" | "week" | "month" | "year" | "all";

interface ABCItem {
  material: Material;
  totalValue: number;
  percentageValue: number;
  cumulativePercentage: number;
  classification: "A" | "B" | "C";
}

const Reports = () => {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);

      const [materialsRes, movementsRes] = await Promise.all([
        supabase.from("materials").select("*").eq("user_id", user.id),
        supabase.from("movimentacoes").select("*").eq("user_id", user.id).order("data", { ascending: false })
      ]);

      if (materialsRes.data) {
        const materialsData: Material[] = materialsRes.data.map((m: any) => ({
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
      }

      if (movementsRes.data) {
        const movementsData: Movimentacao[] = movementsRes.data.map((m: any) => ({
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
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  // Filtrar movimentações por período
  const getDateRange = (period: PeriodFilter) => {
    const now = new Date();
    switch (period) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: subWeeks(now, 1), end: now };
      case "month":
        return { start: subMonths(now, 1), end: now };
      case "year":
        return { start: subYears(now, 1), end: now };
      default:
        return null;
    }
  };

  const filteredMovements = useMemo(() => {
    const dateRange = getDateRange(periodFilter);
    if (!dateRange) return movements;
    
    return movements.filter(m => {
      const movementDate = parseISO(m.data);
      return isWithinInterval(movementDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [movements, periodFilter]);

  // Relatório de Estoque
  const stockReport = useMemo(() => {
    const stockMaterials = materials.filter(m => m.tipo === "estoque");
    const total = stockMaterials.length;
    const critical = stockMaterials.filter(m => m.quantidadeAtual <= m.estoqueMinimo && !m.obsoleto).length;
    const obsolete = stockMaterials.filter(m => m.obsoleto).length;
    const normal = total - critical - obsolete;

    return { total, critical, obsolete, normal, materials: stockMaterials };
  }, [materials]);

  // Relatório de Movimentações
  const movementsReport = useMemo(() => {
    const entries = filteredMovements.filter(m => m.tipo === "entrada");
    const exits = filteredMovements.filter(m => m.tipo === "saida");
    const loans = filteredMovements.filter(m => m.tipo === "emprestimo");
    const returns = filteredMovements.filter(m => m.tipo === "devolucao");

    const totalEntryQty = entries.reduce((acc, m) => acc + m.quantidade, 0);
    const totalExitQty = exits.reduce((acc, m) => acc + m.quantidade, 0);
    const totalLoanQty = loans.reduce((acc, m) => acc + m.quantidade, 0);
    const totalReturnQty = returns.reduce((acc, m) => acc + m.quantidade, 0);

    return {
      entries: { count: entries.length, qty: totalEntryQty },
      exits: { count: exits.length, qty: totalExitQty },
      loans: { count: loans.length, qty: totalLoanQty },
      returns: { count: returns.length, qty: totalReturnQty },
      movements: filteredMovements
    };
  }, [filteredMovements]);

  // Relatório de Empréstimos
  const loansReport = useMemo(() => {
    const loanMaterials = materials.filter(m => m.tipo === "emprestimo");
    const loanMovements = movements.filter(m => m.tipo === "emprestimo" || m.tipo === "devolucao");
    
    // Calcular empréstimos ativos (empréstimos - devoluções por material)
    const activeLoansMap = new Map<string, number>();
    loanMovements.forEach(m => {
      const current = activeLoansMap.get(m.materialId) || 0;
      if (m.tipo === "emprestimo") {
        activeLoansMap.set(m.materialId, current + m.quantidade);
      } else {
        activeLoansMap.set(m.materialId, current - m.quantidade);
      }
    });

    const activeLoans = Array.from(activeLoansMap.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([materialId, qty]) => ({
        material: materials.find(m => m.id === materialId),
        quantidade: qty,
        lastMovement: movements.find(m => m.materialId === materialId && m.tipo === "emprestimo")
      }));

    return {
      totalMaterials: loanMaterials.length,
      activeLoans: activeLoans.length,
      totalLoanMovements: loanMovements.filter(m => m.tipo === "emprestimo").length,
      totalReturns: loanMovements.filter(m => m.tipo === "devolucao").length,
      activeLoansDetails: activeLoans
    };
  }, [materials, movements]);

  // Relatório Financeiro
  const financialReport = useMemo(() => {
    const stockMaterials = materials.filter(m => m.tipo === "estoque" && m.valorUnitario);
    const totalValue = stockMaterials.reduce((acc, m) => acc + (m.valorUnitario || 0) * m.quantidadeAtual, 0);
    
    // Agrupar por categoria
    const byCategory = stockMaterials.reduce((acc, m) => {
      const cat = m.categoria || "Sem categoria";
      if (!acc[cat]) {
        acc[cat] = { qty: 0, value: 0 };
      }
      acc[cat].qty += m.quantidadeAtual;
      acc[cat].value += (m.valorUnitario || 0) * m.quantidadeAtual;
      return acc;
    }, {} as Record<string, { qty: number; value: number }>);

    return { totalValue, byCategory, materials: stockMaterials };
  }, [materials]);

  // Curva ABC
  const abcAnalysis = useMemo((): ABCItem[] => {
    const stockMaterials = materials.filter(m => m.tipo === "estoque" && m.valorUnitario && m.quantidadeAtual > 0);
    
    // Calcular valor total de cada material
    const itemsWithValue = stockMaterials.map(m => ({
      material: m,
      totalValue: (m.valorUnitario || 0) * m.quantidadeAtual
    }));

    // Ordenar por valor decrescente
    itemsWithValue.sort((a, b) => b.totalValue - a.totalValue);

    const grandTotal = itemsWithValue.reduce((acc, item) => acc + item.totalValue, 0);

    // Calcular percentuais e classificação ABC
    let cumulativePercentage = 0;
    return itemsWithValue.map(item => {
      const percentageValue = grandTotal > 0 ? (item.totalValue / grandTotal) * 100 : 0;
      cumulativePercentage += percentageValue;

      let classification: "A" | "B" | "C" = "C";
      if (cumulativePercentage <= 80) {
        classification = "A";
      } else if (cumulativePercentage <= 95) {
        classification = "B";
      }

      return {
        ...item,
        percentageValue,
        cumulativePercentage,
        classification
      };
    });
  }, [materials]);

  // Funções de exportação
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getPeriodLabel = () => {
    const labels: Record<PeriodFilter, string> = {
      today: "Hoje",
      week: "Última Semana",
      month: "Último Mês",
      year: "Último Ano",
      all: "Todo o Período"
    };
    return labels[periodFilter];
  };

  const getMaterialName = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? `${material.codigo} - ${material.descricao}` : "Material não encontrado";
  };

  const exportStockToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Estoque", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [["Código", "Descrição", "Qtd Atual", "Mín", "Máx", "Status", "Localização"]],
      body: stockReport.materials.map(m => [
        m.codigo,
        m.descricao,
        m.quantidadeAtual,
        m.estoqueMinimo,
        m.estoqueMaximo || "-",
        m.obsoleto ? "Obsoleto" : m.quantidadeAtual <= m.estoqueMinimo ? "Crítico" : "Normal",
        m.localizacao
      ]),
      styles: { fontSize: 8 }
    });

    doc.save("relatorio-estoque.pdf");
    toast.success("PDF de estoque exportado!");
  };

  const exportMovementsToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Movimentações", 14, 22);
    doc.setFontSize(10);
    doc.text(`Período: ${getPeriodLabel()} | Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [["Data", "Material", "Tipo", "Qtd", "Responsável", "Observação"]],
      body: movementsReport.movements.map(m => [
        formatDate(m.data),
        getMaterialName(m.materialId),
        m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
        m.quantidade,
        m.responsavel,
        m.observacao || "-"
      ]),
      styles: { fontSize: 8 }
    });

    doc.save("relatorio-movimentacoes.pdf");
    toast.success("PDF de movimentações exportado!");
  };

  const exportLoansToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Empréstimos", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [["Material", "Qtd Emprestada", "Responsável", "Data Empréstimo"]],
      body: loansReport.activeLoansDetails.map(loan => [
        loan.material ? `${loan.material.codigo} - ${loan.material.descricao}` : "N/A",
        loan.quantidade,
        loan.lastMovement?.responsavel || "N/A",
        loan.lastMovement ? formatDate(loan.lastMovement.data) : "N/A"
      ]),
      styles: { fontSize: 8 }
    });

    doc.save("relatorio-emprestimos.pdf");
    toast.success("PDF de empréstimos exportado!");
  };

  const exportFinancialToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);
    doc.text(`Valor Total do Estoque: ${formatCurrency(financialReport.totalValue)}`, 14, 38);

    autoTable(doc, {
      startY: 48,
      head: [["Código", "Descrição", "Qtd", "Valor Unit.", "Valor Total", "Categoria"]],
      body: financialReport.materials.map(m => [
        m.codigo,
        m.descricao,
        m.quantidadeAtual,
        formatCurrency(m.valorUnitario || 0),
        formatCurrency((m.valorUnitario || 0) * m.quantidadeAtual),
        m.categoria || "-"
      ]),
      styles: { fontSize: 8 }
    });

    doc.save("relatorio-financeiro.pdf");
    toast.success("PDF financeiro exportado!");
  };

  const exportABCToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Curva ABC", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

    const aCount = abcAnalysis.filter(i => i.classification === "A").length;
    const bCount = abcAnalysis.filter(i => i.classification === "B").length;
    const cCount = abcAnalysis.filter(i => i.classification === "C").length;
    doc.text(`Classificação: A (${aCount} itens) | B (${bCount} itens) | C (${cCount} itens)`, 14, 38);

    autoTable(doc, {
      startY: 48,
      head: [["Classe", "Código", "Descrição", "Valor Total", "% Individual", "% Acumulado"]],
      body: abcAnalysis.map(item => [
        item.classification,
        item.material.codigo,
        item.material.descricao,
        formatCurrency(item.totalValue),
        `${item.percentageValue.toFixed(2)}%`,
        `${item.cumulativePercentage.toFixed(2)}%`
      ]),
      styles: { fontSize: 8 }
    });

    doc.save("curva-abc.pdf");
    toast.success("PDF Curva ABC exportado!");
  };

  const exportToExcel = (type: "stock" | "movements" | "loans" | "financial" | "abc") => {
    let data: any[] = [];
    let filename = "";

    switch (type) {
      case "stock":
        filename = "relatorio-estoque.xlsx";
        data = stockReport.materials.map(m => ({
          Código: m.codigo,
          Descrição: m.descricao,
          "Qtd Atual": m.quantidadeAtual,
          "Est. Mínimo": m.estoqueMinimo,
          "Est. Máximo": m.estoqueMaximo || "",
          Status: m.obsoleto ? "Obsoleto" : m.quantidadeAtual <= m.estoqueMinimo ? "Crítico" : "Normal",
          Localização: m.localizacao,
          Categoria: m.categoria || ""
        }));
        break;
      case "movements":
        filename = "relatorio-movimentacoes.xlsx";
        data = movementsReport.movements.map(m => ({
          Data: formatDate(m.data),
          Material: getMaterialName(m.materialId),
          Tipo: m.tipo,
          Quantidade: m.quantidade,
          Responsável: m.responsavel,
          Observação: m.observacao || ""
        }));
        break;
      case "loans":
        filename = "relatorio-emprestimos.xlsx";
        data = loansReport.activeLoansDetails.map(loan => ({
          Material: loan.material ? `${loan.material.codigo} - ${loan.material.descricao}` : "N/A",
          "Qtd Emprestada": loan.quantidade,
          Responsável: loan.lastMovement?.responsavel || "N/A",
          "Data Empréstimo": loan.lastMovement ? formatDate(loan.lastMovement.data) : "N/A"
        }));
        break;
      case "financial":
        filename = "relatorio-financeiro.xlsx";
        data = financialReport.materials.map(m => ({
          Código: m.codigo,
          Descrição: m.descricao,
          Quantidade: m.quantidadeAtual,
          "Valor Unitário": m.valorUnitario || 0,
          "Valor Total": (m.valorUnitario || 0) * m.quantidadeAtual,
          Categoria: m.categoria || ""
        }));
        break;
      case "abc":
        filename = "curva-abc.xlsx";
        data = abcAnalysis.map(item => ({
          Classificação: item.classification,
          Código: item.material.codigo,
          Descrição: item.material.descricao,
          "Valor Total": item.totalValue,
          "% Individual": item.percentageValue,
          "% Acumulado": item.cumulativePercentage
        }));
        break;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, filename);
    toast.success("Excel exportado!");
  };

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
              <img src={logo} alt="Recifer Logo" className="h-16 w-16 object-contain" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Relatórios</h1>
                <p className="text-muted-foreground text-sm">Sistema de Almoxarifado</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Período:</span>
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="year">Último Ano</SelectItem>
                <SelectItem value="all">Todo Período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1">
            <TabsTrigger value="stock" className="text-xs sm:text-sm">
              <Package className="h-4 w-4 mr-1 hidden sm:inline" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="movements" className="text-xs sm:text-sm">
              <ArrowUpDown className="h-4 w-4 mr-1 hidden sm:inline" />
              Movimentações
            </TabsTrigger>
            <TabsTrigger value="loans" className="text-xs sm:text-sm">
              <Truck className="h-4 w-4 mr-1 hidden sm:inline" />
              Empréstimos
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs sm:text-sm">
              <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="abc" className="text-xs sm:text-sm col-span-2 sm:col-span-1">
              <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
              Curva ABC
            </TabsTrigger>
          </TabsList>

          {/* Relatório de Estoque */}
          <TabsContent value="stock" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stockReport.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Normal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stockReport.normal}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-destructive">Crítico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stockReport.critical}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Obsoleto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{stockReport.obsolete}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Materiais em Estoque</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportStockToPDF}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToExcel("stock")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-center">Mín</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Localização</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockReport.materials.slice(0, 20).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.codigo}</TableCell>
                          <TableCell>{m.descricao}</TableCell>
                          <TableCell className="text-center">{m.quantidadeAtual}</TableCell>
                          <TableCell className="text-center">{m.estoqueMinimo}</TableCell>
                          <TableCell className="text-center">
                            {m.obsoleto ? (
                              <Badge variant="secondary">Obsoleto</Badge>
                            ) : m.quantidadeAtual <= m.estoqueMinimo ? (
                              <Badge variant="destructive">Crítico</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-600">Normal</Badge>
                            )}
                          </TableCell>
                          <TableCell>{m.localizacao}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {stockReport.materials.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Exibindo 20 de {stockReport.materials.length} itens. Exporte para ver todos.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório de Movimentações */}
          <TabsContent value="movements" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Entradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{movementsReport.entries.count}</div>
                  <p className="text-xs text-muted-foreground">{movementsReport.entries.qty} unidades</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-destructive">Saídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{movementsReport.exits.count}</div>
                  <p className="text-xs text-muted-foreground">{movementsReport.exits.qty} unidades</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-600">Empréstimos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{movementsReport.loans.count}</div>
                  <p className="text-xs text-muted-foreground">{movementsReport.loans.qty} unidades</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-600">Devoluções</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{movementsReport.returns.count}</div>
                  <p className="text-xs text-muted-foreground">{movementsReport.returns.qty} unidades</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Histórico de Movimentações</CardTitle>
                  <CardDescription>Período: {getPeriodLabel()}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportMovementsToPDF}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToExcel("movements")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead>Responsável</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movementsReport.movements.slice(0, 20).map(m => (
                        <TableRow key={m.id}>
                          <TableCell>{formatDate(m.data)}</TableCell>
                          <TableCell>{getMaterialName(m.materialId)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              m.tipo === "entrada" ? "default" :
                              m.tipo === "saida" ? "destructive" :
                              m.tipo === "emprestimo" ? "secondary" : "outline"
                            }>
                              {m.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{m.quantidade}</TableCell>
                          <TableCell>{m.responsavel}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {movementsReport.movements.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Exibindo 20 de {movementsReport.movements.length} movimentações. Exporte para ver todas.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório de Empréstimos */}
          <TabsContent value="loans" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Materiais de Empréstimo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loansReport.totalMaterials}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-600">Empréstimos Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{loansReport.activeLoans}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Emprestado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loansReport.totalLoanMovements}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Total Devolvido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{loansReport.totalReturns}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Empréstimos Ativos</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportLoansToPDF}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToExcel("loans")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-center">Qtd Emprestada</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Data Empréstimo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loansReport.activeLoansDetails.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nenhum empréstimo ativo
                          </TableCell>
                        </TableRow>
                      ) : (
                        loansReport.activeLoansDetails.map((loan, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{loan.material ? `${loan.material.codigo} - ${loan.material.descricao}` : "N/A"}</TableCell>
                            <TableCell className="text-center">{loan.quantidade}</TableCell>
                            <TableCell>{loan.lastMovement?.responsavel || "N/A"}</TableCell>
                            <TableCell>{loan.lastMovement ? formatDate(loan.lastMovement.data) : "N/A"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório Financeiro */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="sm:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total do Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(financialReport.totalValue)}</div>
                </CardContent>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Valor por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(financialReport.byCategory).map(([cat, data]) => (
                      <Badge key={cat} variant="outline" className="text-sm">
                        {cat}: {formatCurrency(data.value)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento Financeiro</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportFinancialToPDF}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToExcel("financial")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead>Categoria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialReport.materials.slice(0, 20).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.codigo}</TableCell>
                          <TableCell>{m.descricao}</TableCell>
                          <TableCell className="text-center">{m.quantidadeAtual}</TableCell>
                          <TableCell className="text-right">{formatCurrency(m.valorUnitario || 0)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency((m.valorUnitario || 0) * m.quantidadeAtual)}
                          </TableCell>
                          <TableCell>{m.categoria || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {financialReport.materials.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Exibindo 20 de {financialReport.materials.length} itens. Exporte para ver todos.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curva ABC */}
          <TabsContent value="abc" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Classe A</CardTitle>
                  <CardDescription>80% do valor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {abcAnalysis.filter(i => i.classification === "A").length} itens
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Classe B</CardTitle>
                  <CardDescription>15% do valor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {abcAnalysis.filter(i => i.classification === "B").length} itens
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Classe C</CardTitle>
                  <CardDescription>5% do valor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {abcAnalysis.filter(i => i.classification === "C").length} itens
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Análise Curva ABC</CardTitle>
                  <CardDescription>
                    Classificação de materiais por valor de estoque (método 80-15-5)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportABCToPDF}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToExcel("abc")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Classe</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-right">% Individual</TableHead>
                        <TableHead className="text-right">% Acumulado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {abcAnalysis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum material com valor cadastrado para análise ABC
                          </TableCell>
                        </TableRow>
                      ) : (
                        abcAnalysis.slice(0, 30).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-center">
                              <Badge variant={
                                item.classification === "A" ? "destructive" :
                                item.classification === "B" ? "secondary" : "outline"
                              }>
                                {item.classification}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.material.codigo}</TableCell>
                            <TableCell>{item.material.descricao}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalValue)}</TableCell>
                            <TableCell className="text-right">{item.percentageValue.toFixed(2)}%</TableCell>
                            <TableCell className="text-right font-medium">{item.cumulativePercentage.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {abcAnalysis.length > 30 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Exibindo 30 de {abcAnalysis.length} itens. Exporte para ver todos.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reports;
