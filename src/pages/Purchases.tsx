import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Material } from "@/types/material";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, CheckCircle, Clock } from "lucide-react";
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

export default function Purchases() {
  const { user } = useAuth();
  const { isAdmin, isCompras, loading } = useUserRole();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const hasAccess = isAdmin || isCompras;

  // Helper para determinar status do estoque
  const getStockStatus = (material: Material) => {
    if (material.quantidadeAtual === 0) return { label: "CRÍTICO", color: "bg-red-600 text-white" };
    if (material.quantidadeAtual <= material.estoqueMinimo) return { label: "BAIXO", color: "bg-orange-500 text-white" };
    return { label: "NORMAL", color: "bg-green-600 text-white" };
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

  const comprados = materials.filter(m => m.statusCompra === "comprado" && !m.obsoleto);
  const emCotacao = materials.filter(m => m.statusCompra === "em_cotacao" && !m.obsoleto);
  const pendentes = materials.filter(m => m.statusCompra === "pendente" && !m.obsoleto);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Gestão de Compras</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendentes.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Cotação</p>
                <p className="text-2xl font-bold">{emCotacao.length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comprados</p>
                <p className="text-2xl font-bold">{comprados.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="pendentes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendentes">
              Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger value="cotacao">
              Em Cotação ({emCotacao.length})
            </TabsTrigger>
            <TabsTrigger value="comprados">
              Comprados ({comprados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição e Status</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Ações Rápidas</TableHead>
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
                        <TableCell className="font-bold text-lg">{material.codigo}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="font-medium text-base">{material.descricao}</div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={`${getStockStatus(material).color} font-bold`}>
                                🚨 {getStockStatus(material).label}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                Estoque: {material.quantidadeAtual} {material.unidadeMedida}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                                Mínimo: {material.estoqueMinimo} {material.unidadeMedida}
                              </Badge>
                              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold">
                                ⏱ PENDENTE
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {material.categoria ? (
                            <Badge variant="outline" className="font-medium">{material.categoria}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-3 justify-center flex-wrap">
                            <Button
                              size="lg"
                              onClick={() => handleToggleStatus(material, "em_cotacao")}
                              className="bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-600 font-bold min-w-[160px] h-12 text-base shadow-lg"
                            >
                              📋 COTAÇÃO
                            </Button>
                            <Button
                              size="lg"
                              onClick={() => handleToggleStatus(material, "comprado")}
                              className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-700 font-bold min-w-[160px] h-12 text-base shadow-lg"
                            >
                              ✓ COMPRADO
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
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição e Status</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Ações Rápidas</TableHead>
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
                        <TableCell className="font-bold text-lg">{material.codigo}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="font-medium text-base">{material.descricao}</div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={`${getStockStatus(material).color} font-bold`}>
                                🚨 {getStockStatus(material).label}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                Estoque: {material.quantidadeAtual} {material.unidadeMedida}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                                Mínimo: {material.estoqueMinimo} {material.unidadeMedida}
                              </Badge>
                              <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold">
                                📋 EM COTAÇÃO
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {material.categoria ? (
                            <Badge variant="outline" className="font-medium">{material.categoria}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-3 justify-center flex-wrap">
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => handleToggleStatus(material, "pendente")}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-900 border-2 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 font-bold min-w-[140px] h-12 text-base"
                            >
                              ⏱ Pendente
                            </Button>
                            <Button
                              size="lg"
                              onClick={() => handleToggleStatus(material, "comprado")}
                              className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-700 font-bold min-w-[160px] h-12 text-base shadow-lg"
                            >
                              ✓ COMPRADO
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
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição e Status</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Ações Rápidas</TableHead>
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
                        <TableCell className="font-bold text-lg">{material.codigo}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="font-medium text-base">{material.descricao}</div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={`${getStockStatus(material).color} font-bold`}>
                                🚨 {getStockStatus(material).label}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                Estoque: {material.quantidadeAtual} {material.unidadeMedida}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                                Mínimo: {material.estoqueMinimo} {material.unidadeMedida}
                              </Badge>
                              <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                                ✓ COMPRADO
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {material.categoria ? (
                            <Badge variant="outline" className="font-medium">{material.categoria}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => handleToggleStatus(material, "pendente")}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 font-bold min-w-[160px]"
                            >
                              ⏱ Marcar Pendente
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
