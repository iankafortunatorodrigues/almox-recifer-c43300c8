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
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

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

  const filteredMaterials = materials.filter((m) => {
    if (!searchQuery) return true;
    return (
      m.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.descricao.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
        <Input
          placeholder="Buscar material..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

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
