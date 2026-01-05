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
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DbMaterial {
  id: string;
  codigo: string;
  descricao: string;
  quantidade_atual: number;
  localizacao: string;
  estoque_minimo: number;
  unidade_medida: string;
  categoria: string | null;
  obsoleto: boolean | null;
  tipo: string;
}

export default function Consumables() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials", "consumivel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("tipo", "consumivel")
        .order("descricao");
      if (error) throw error;
      return data as DbMaterial[];
    },
  });

  const filteredMaterials = materials.filter((m) => {
    if (!searchQuery) return true;
    return (
      m.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.descricao.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <DashboardLayout
      title="Consumíveis"
      subtitle="Materiais de consumo contínuo"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Consumível
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          placeholder="Buscar consumível..."
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
                    <TableHead>LOCALIZAÇÃO</TableHead>
                    <TableHead>STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-mono text-sm">{material.codigo}</TableCell>
                      <TableCell>{material.descricao}</TableCell>
                      <TableCell>{material.categoria || "-"}</TableCell>
                      <TableCell>
                        {material.quantidade_atual > 0 
                          ? `${material.quantidade_atual} ${material.unidade_medida}`
                          : "∞"
                        }
                      </TableCell>
                      <TableCell>{material.localizacao || "-"}</TableCell>
                      <TableCell>
                        {material.obsoleto ? (
                          <Badge variant="secondary">Obsoleto</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Consumível
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum consumível encontrado
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
