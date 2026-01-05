import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  History,
  BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Define interface for Supabase material data
interface DbMaterial {
  id: string;
  codigo: string;
  descricao: string;
  quantidade_atual: number;
  localizacao: string;
  estoque_minimo: number;
  estoque_maximo: number | null;
  unidade_medida: string;
  created_at: string | null;
  foto_url: string | null;
  tipo: string;
  valor_unitario: number | null;
  categoria: string | null;
  status_compra: string | null;
  obsoleto: boolean | null;
  data_compra: string | null;
  data_entrega: string | null;
  user_id: string;
}

interface DbMovement {
  id: string;
  material_id: string;
  tipo: string;
  quantidade: number;
  data: string | null;
  responsavel: string;
  observacao: string | null;
  created_at: string | null;
  materials?: {
    descricao: string;
    codigo: string;
  };
}

export default function Reports() {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("descricao");
      if (error) throw error;
      return data as DbMaterial[];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["movements-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*, materials(descricao, codigo)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbMovement[];
    },
  });

  // Calculate stats
  const stockMaterials = materials.filter(m => m.tipo === "estoque" && !m.obsoleto);
  const totalItems = stockMaterials.reduce((acc, m) => acc + m.quantidade_atual, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthMovements = movements.filter(m => {
    const date = new Date(m.data || m.created_at || new Date());
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const entriesThisMonth = monthMovements.filter(m => m.tipo === "entrada").reduce((acc, m) => acc + m.quantidade, 0);
  const exitsThisMonth = monthMovements.filter(m => m.tipo === "saida").reduce((acc, m) => acc + m.quantidade, 0);
  
  const purchasesThisMonth = stockMaterials
    .filter(m => m.data_compra && new Date(m.data_compra).getMonth() === currentMonth)
    .reduce((acc, m) => acc + (m.valor_unitario || 0) * m.quantidade_atual, 0);

  const lowStockItems = stockMaterials.filter(m => m.quantidade_atual < m.estoque_minimo);

  const exportToPDF = (data: DbMaterial[], title: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [["Código", "Material", "Categoria", "Quantidade", "Mínimo", "Localização", "Status"]],
      body: data.map(m => [
        m.codigo,
        m.descricao,
        m.categoria || "-",
        `${m.quantidade_atual} ${m.unidade_medida}`,
        m.estoque_minimo.toString(),
        m.localizacao || "-",
        m.quantidade_atual < m.estoque_minimo ? "Crítico" : m.obsoleto ? "Obsoleto" : "Ativo"
      ]),
    });
    
    doc.save(`${title.toLowerCase().replace(/\s/g, '-')}.pdf`);
  };

  const exportToExcel = (data: DbMaterial[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data.map(m => ({
      Código: m.codigo,
      Material: m.descricao,
      Categoria: m.categoria || "-",
      Quantidade: m.quantidade_atual,
      Unidade: m.unidade_medida,
      Mínimo: m.estoque_minimo,
      Máximo: m.estoque_maximo || "-",
      Localização: m.localizacao || "-",
      "Valor Unitário": m.valor_unitario || 0,
      "Valor Total": (m.valor_unitario || 0) * m.quantidade_atual,
      Status: m.quantidade_atual < m.estoque_minimo ? "Crítico" : m.obsoleto ? "Obsoleto" : "Ativo"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const getStatusBadge = (material: DbMaterial) => {
    if (material.obsoleto) {
      return <Badge variant="secondary">Obsoleto</Badge>;
    }
    if (material.quantidade_atual < material.estoque_minimo) {
      return <Badge variant="destructive">Crítico</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativo</Badge>;
  };

  return (
    <DashboardLayout
      title="Relatórios"
      subtitle="Visualize e exporte dados do sistema"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToExcel(stockMaterials, "relatorio-estoque")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => exportToPDF(stockMaterials, "Posição de Estoque")}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="stock" className="data-[state=active]:bg-sidebar data-[state=active]:text-sidebar-foreground gap-2">
            <Package className="h-4 w-4" />
            Posição de Estoque
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">
            <History className="h-4 w-4" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="low-stock" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Itens Abaixo Mínimo
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Histórico de Compras
          </TabsTrigger>
          <TabsTrigger value="abc" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Curva ABC
          </TabsTrigger>
        </TabsList>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Itens em Estoque</p>
                  <p className="text-2xl font-bold">{totalItems.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600">Entradas (Mês)</p>
                  <p className="text-2xl font-bold">{entriesThisMonth.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600">Saídas (Mês)</p>
                  <p className="text-2xl font-bold">{exitsThisMonth.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compras (Mês)</p>
                  <p className="text-2xl font-bold">
                    {purchasesThisMonth.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Position Tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Posição de Estoque</h3>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CÓDIGO</TableHead>
                      <TableHead>MATERIAL</TableHead>
                      <TableHead>CATEGORIA</TableHead>
                      <TableHead>QUANTIDADE</TableHead>
                      <TableHead>MÍNIMO</TableHead>
                      <TableHead>LOCALIZAÇÃO</TableHead>
                      <TableHead>STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMaterials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-mono text-sm">{material.codigo}</TableCell>
                        <TableCell>{material.descricao}</TableCell>
                        <TableCell>{material.categoria || "-"}</TableCell>
                        <TableCell>{material.quantidade_atual} {material.unidade_medida}</TableCell>
                        <TableCell>{material.estoque_minimo}</TableCell>
                        <TableCell>{material.localizacao || "-"}</TableCell>
                        <TableCell>{getStatusBadge(material)}</TableCell>
                      </TableRow>
                    ))}
                    {stockMaterials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum material encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Movimentações</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DATA</TableHead>
                    <TableHead>MATERIAL</TableHead>
                    <TableHead>TIPO</TableHead>
                    <TableHead>QUANTIDADE</TableHead>
                    <TableHead>RESPONSÁVEL</TableHead>
                    <TableHead>OBSERVAÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, 50).map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        {new Date(mov.data || mov.created_at || new Date()).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{mov.materials?.descricao || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo === "entrada" ? "default" : "secondary"}>
                          {mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.quantidade}</TableCell>
                      <TableCell>{mov.responsavel}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{mov.observacao || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma movimentação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Itens Abaixo do Estoque Mínimo</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CÓDIGO</TableHead>
                    <TableHead>MATERIAL</TableHead>
                    <TableHead>QUANTIDADE ATUAL</TableHead>
                    <TableHead>ESTOQUE MÍNIMO</TableHead>
                    <TableHead>DIFERENÇA</TableHead>
                    <TableHead>LOCALIZAÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-mono text-sm">{material.codigo}</TableCell>
                      <TableCell>{material.descricao}</TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {material.quantidade_atual} {material.unidade_medida}
                      </TableCell>
                      <TableCell>{material.estoque_minimo}</TableCell>
                      <TableCell className="text-red-600 font-medium">
                        -{material.estoque_minimo - material.quantidade_atual}
                      </TableCell>
                      <TableCell>{material.localizacao || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {lowStockItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum item abaixo do mínimo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Histórico de Compras</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CÓDIGO</TableHead>
                    <TableHead>MATERIAL</TableHead>
                    <TableHead>DATA COMPRA</TableHead>
                    <TableHead>DATA ENTREGA</TableHead>
                    <TableHead>VALOR UNITÁRIO</TableHead>
                    <TableHead>STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMaterials.filter(m => m.data_compra).map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-mono text-sm">{material.codigo}</TableCell>
                      <TableCell>{material.descricao}</TableCell>
                      <TableCell>
                        {material.data_compra 
                          ? new Date(material.data_compra).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {material.data_entrega 
                          ? new Date(material.data_entrega).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {material.valor_unitario?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={material.status_compra === "entregue" ? "default" : "secondary"}>
                          {material.status_compra || "pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABC Curve Tab */}
        <TabsContent value="abc" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Curva ABC</h3>
              <p className="text-muted-foreground mb-4">
                Classificação dos materiais por valor em estoque
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CÓDIGO</TableHead>
                    <TableHead>MATERIAL</TableHead>
                    <TableHead>VALOR EM ESTOQUE</TableHead>
                    <TableHead>% ACUMULADO</TableHead>
                    <TableHead>CLASSE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const sorted = [...stockMaterials]
                      .map(m => ({
                        ...m,
                        valorEstoque: (m.valor_unitario || 0) * m.quantidade_atual
                      }))
                      .sort((a, b) => b.valorEstoque - a.valorEstoque);
                    
                    const totalValue = sorted.reduce((acc, m) => acc + m.valorEstoque, 0);
                    let accumulated = 0;
                    
                    return sorted.map((material) => {
                      accumulated += material.valorEstoque;
                      const percentage = totalValue > 0 ? (accumulated / totalValue) * 100 : 0;
                      const classification = percentage <= 80 ? "A" : percentage <= 95 ? "B" : "C";
                      
                      return (
                        <TableRow key={material.id}>
                          <TableCell className="font-mono text-sm">{material.codigo}</TableCell>
                          <TableCell>{material.descricao}</TableCell>
                          <TableCell>
                            {material.valorEstoque.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                          <TableCell>{percentage.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                classification === "A" 
                                  ? "bg-green-100 text-green-700" 
                                  : classification === "B"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-700"
                              }
                            >
                              Classe {classification}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
