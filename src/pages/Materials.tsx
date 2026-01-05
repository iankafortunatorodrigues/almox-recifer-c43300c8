import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, ArrowDownCircle, ArrowUpCircle, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DbMaterial {
  id: string;
  codigo: string;
  descricao: string;
  quantidade_atual: number;
  localizacao: string;
  estoque_minimo: number;
  estoque_maximo: number | null;
  unidade_medida: string;
  categoria: string | null;
  obsoleto: boolean | null;
  tipo: string;
  valor_unitario: number | null;
}

export default function Materials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [localizacaoFilter, setLocalizacaoFilter] = useState("");
  const { role } = useUserRole();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials", "estoque"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("tipo", "estoque")
        .order("descricao");
      if (error) throw error;
      return data as DbMaterial[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir material");
    },
  });

  const categorias = useMemo(() => {
    const unique = [...new Set(materials.map((m) => m.categoria).filter(Boolean))];
    return unique.sort() as string[];
  }, [materials]);

  const localizacoes = useMemo(() => {
    const unique = [...new Set(materials.map((m) => m.localizacao).filter(Boolean))];
    return unique.sort();
  }, [materials]);

  const getStatus = (material: DbMaterial) => {
    if (material.obsoleto) return "obsoleto";
    if (material.quantidade_atual < material.estoque_minimo) return "critico";
    if (material.quantidade_atual <= material.estoque_minimo * 1.2) return "baixo";
    return "normal";
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.descricao.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || statusFilter === "all" || getStatus(m) === statusFilter;
      const matchesCategoria = !categoriaFilter || categoriaFilter === "all" || m.categoria === categoriaFilter;
      const matchesLocalizacao = !localizacaoFilter || localizacaoFilter === "all" || m.localizacao === localizacaoFilter;

      return matchesSearch && matchesStatus && matchesCategoria && matchesLocalizacao;
    });
  }, [materials, searchQuery, statusFilter, categoriaFilter, localizacaoFilter]);

  const hasActiveFilters = searchQuery || statusFilter || categoriaFilter || localizacaoFilter;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setCategoriaFilter("");
    setLocalizacaoFilter("");
  };

  const getStatusBadge = (material: DbMaterial) => {
    if (material.obsoleto) {
      return <Badge variant="secondary">Obsoleto</Badge>;
    }
    if (material.quantidade_atual < material.estoque_minimo) {
      return <Badge variant="destructive">Crítico</Badge>;
    }
    if (material.quantidade_atual <= material.estoque_minimo * 1.2) {
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Baixo</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Normal</Badge>;
  };

  return (
    <DashboardLayout
      title="Materiais de Estoque"
      subtitle="Gerencie os materiais do almoxarifado"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Material
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="baixo">Baixo</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="obsoleto">Obsoleto</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={localizacaoFilter} onValueChange={setLocalizacaoFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Localização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {localizacoes.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CÓDIGO</TableHead>
                    <TableHead>DESCRIÇÃO</TableHead>
                    <TableHead>CATEGORIA</TableHead>
                    <TableHead>QUANTIDADE</TableHead>
                    <TableHead>MÍNIMO</TableHead>
                    <TableHead>LOCALIZAÇÃO</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-center">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-mono text-sm">{material.codigo}</TableCell>
                      <TableCell>{material.descricao}</TableCell>
                      <TableCell>{material.categoria || "-"}</TableCell>
                      <TableCell>
                        {material.quantidade_atual} {material.unidade_medida}
                      </TableCell>
                      <TableCell>{material.estoque_minimo}</TableCell>
                      <TableCell>{material.localizacao || "-"}</TableCell>
                      <TableCell>{getStatusBadge(material)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Entrada"
                          >
                            <ArrowDownCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Saída"
                          >
                            <ArrowUpCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {role === "admin" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteMutation.mutate(material.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum material encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
